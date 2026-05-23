import { AhpAlgorithm, AhpStudent, DEFAULT_CRITERIA_MATRIX } from '../utils/algorithms/ahp.util';
import { KMeansAlgorithm, KmeansStudent } from '../utils/algorithms/kmeans.util';
import type { Dormitory, Room, StudentProfile, Application, RoomAllocation } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { getOccupancyStatus } from '../utils/occupancy';

export class AllocationService {
  // Helper to filter out already-fulfilled applications logically
  private static filterValidPool(
    profiles: (StudentProfile & { applications: Application[], allocations: RoomAllocation[], user?: any, privilege?: any })[]
  ) {
    return profiles.filter(p => {
      const checkInApps = p.applications.filter(a => a.type === 'CHECK_IN');
      const latestApp = checkInApps.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0];
      if (!latestApp || latestApp.status !== 'APPROVED') return false;

      const latestAllocation = p.allocations.sort((a, b) => b.allocatedAt.getTime() - a.allocatedAt.getTime())[0];
      if (latestAllocation && latestAllocation.allocatedAt > latestApp.submittedAt) {
        return false;
      }
      return true;
    }).sort((a, b) => b.priorityScore - a.priorityScore || a.fullName.localeCompare(b.fullName));
  }

  static async getPool() {
    const rawProfiles = await prisma.studentProfile.findMany({
      where: { roomId: null },
      include: { user: true, privilege: true, applications: true, allocations: true }
    });
    return this.filterValidPool(rawProfiles);
  }

  static async runAllocationPipeline() {
    const rawProfiles = await prisma.studentProfile.findMany({
      where: { roomId: null },
      include: { user: true, privilege: true, applications: true, allocations: true }
    });
    const validProfiles = this.filterValidPool(rawProfiles);

    if (validProfiles.length === 0) {
      throw new AppError('Немає схвалених заяв для розподілу', 400);
    }

    const ahpInput: AhpStudent[] = validProfiles.map(p => ({
      id: p.id,
      course: p.course,
      privilegeMultiplier: p.privilege?.multiplier || 1.0,
      baseScore: 100
    }));

    const ahpResults = AhpAlgorithm.calculatePriorityScores(ahpInput, DEFAULT_CRITERIA_MATRIX);

    for (const res of ahpResults) {
      await prisma.studentProfile.update({
        where: { id: res.id },
        data: { priorityScore: res.priorityScore }
      });
    }

    const availableRooms = await prisma.room.findMany({
      where: { status: 'AVAILABLE', currentOccupancy: { lt: prisma.room.fields.capacity } },
      include: { floor: { select: { dormitoryId: true } } },
      orderBy: [{ floor: { floorNumber: 'asc' } }, { roomNumber: 'asc' }]
    });

    const totalAvailableBeds = availableRooms.reduce((sum, room) => sum + (room.capacity - room.currentOccupancy), 0);
    const sortedStudentIds = ahpResults.map(result => result.id);
    const topStudentIds = sortedStudentIds.slice(0, totalAvailableBeds);

    if (topStudentIds.length === 0) {
      throw new AppError('Немає вільних місць у гуртожитках', 400);
    }

    const students = validProfiles.filter(p => topStudentIds.includes(p.id));

    const genderBlocks = {
      MALE: students.filter(s => s.user.gender === 'MALE'),
      FEMALE: students.filter(s => s.user.gender === 'FEMALE'),
      OTHER: students.filter(s => s.user.gender === 'OTHER')
    };

    const results: any[] = [];
    
    await prisma.$transaction(async (tx) => {
      let roomIdx = 0;
      const roomOccupancies = new Map<string, number>();
      availableRooms.forEach(r => roomOccupancies.set(r.id, r.currentOccupancy));

      for (const gender of ['MALE', 'FEMALE', 'OTHER'] as const) {
        const blockStudents = genderBlocks[gender];
        if (blockStudents.length === 0) continue;

        const kmeansInput: KmeansStudent[] = blockStudents.map(student => {
          let vector = { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 };
          if (student.clusteringVector) {
            try { vector = JSON.parse(student.clusteringVector); } catch { /* ignore */ }
          }
          return { id: student.id, vector, groupId: student.groupId, faculty: student.faculty };
        });

        const k = Math.min(Math.ceil(blockStudents.length / 3), availableRooms.length - roomIdx);
        if (k <= 0) break; // Not enough rooms for this gender
        
        const clusters = KMeansAlgorithm.clusterize(kmeansInput, k);

        for (const cluster of clusters) {
          let studentIdx = 0;
          while (studentIdx < cluster.students.length && roomIdx < availableRooms.length) {
            const targetRoom = availableRooms[roomIdx];
            const currentOcc = roomOccupancies.get(targetRoom.id) || 0;
            const availableSpace = targetRoom.capacity - currentOcc;

            if (availableSpace <= 0) {
              roomIdx++;
              continue;
            }

            const studentsToAllocate = cluster.students.slice(studentIdx, studentIdx + availableSpace);
            if (studentsToAllocate.length === 0) break;

            const fullStudents = blockStudents.filter(s => studentsToAllocate.some(a => a.id === s.id));

            for (const student of fullStudents) {
              await tx.roomAllocation.create({
                data: { roomId: targetRoom.id, studentId: student.id, status: 'ACTIVE' }
              });
              await tx.studentProfile.update({
                where: { id: student.id },
                data: { roomId: targetRoom.id, dormitoryId: targetRoom.floor.dormitoryId }
              });
            }

            const newOccupancy = currentOcc + studentsToAllocate.length;
            await tx.room.update({
              where: { id: targetRoom.id },
              data: {
                currentOccupancy: newOccupancy,
                status: newOccupancy >= targetRoom.capacity ? 'FULL' : 'AVAILABLE'
              }
            });

            // Update dormitory stats
            const dormitory = await tx.dormitory.findUnique({
              where: { id: targetRoom.floor.dormitoryId },
              select: { currentOccupancy: true, totalCapacity: true }
            });
            if (dormitory) {
              const updatedDormOccupancy = dormitory.currentOccupancy + studentsToAllocate.length;
              await tx.dormitory.update({
                where: { id: targetRoom.floor.dormitoryId },
                data: {
                  currentOccupancy: updatedDormOccupancy,
                  occupancyStatus: getOccupancyStatus(updatedDormOccupancy, dormitory.totalCapacity)
                }
              });
            }

            let existingResult = results.find(r => r.roomId === targetRoom.id);
            if (existingResult) {
              existingResult.students.push(...fullStudents);
            } else {
              results.push({
                roomId: targetRoom.id,
                roomNumber: targetRoom.roomNumber,
                capacity: targetRoom.capacity,
                gender,
                compatibilityScore: cluster.score,
                students: fullStudents
              });
            }

            studentIdx += studentsToAllocate.length;
            roomOccupancies.set(targetRoom.id, newOccupancy);

            if (newOccupancy >= targetRoom.capacity) {
              roomIdx++;
            }
          }
        }
        
        // Prevent next gender from mixing into a partially filled room
        if (roomIdx < availableRooms.length) {
            const currentRoomId = availableRooms[roomIdx].id;
            const currentRoomOcc = roomOccupancies.get(currentRoomId) || 0;
            if (currentRoomOcc > 0) {
              roomIdx++;
            }
        }
      }
    });

    const { NotificationService } = await import('./notification.service');
    for (const result of results) {
      const room = await prisma.room.findUnique({
        where: { id: result.roomId },
        include: { floor: { include: { dormitory: true } } }
      });
      if (!room) continue;

      for (const student of result.students) {
        await NotificationService.createAllocationNotification(
          student.id,
          room.floor.dormitory.name,
          room.roomNumber
        );
      }
    }

    return results;
  }

  static async previewAllocationPipeline() {
    const rawProfiles = await prisma.studentProfile.findMany({
      where: { roomId: null },
      include: { user: true, privilege: true, applications: true, allocations: true }
    });
    const applications = this.filterValidPool(rawProfiles);

    if (applications.length === 0) {
      throw new AppError('Немає схвалених заяв для розподілу', 400);
    }

    const ahpInput: AhpStudent[] = applications.map(app => ({
      id: app.id,
      course: app.course,
      privilegeMultiplier: app.privilege?.multiplier || 1.0,
      baseScore: 100
    }));
    const ahpResults = AhpAlgorithm.calculatePriorityScores(ahpInput, DEFAULT_CRITERIA_MATRIX);

    for (const result of ahpResults) {
      await prisma.studentProfile.update({
        where: { id: result.id },
        data: { priorityScore: result.priorityScore }
      });
    }

    const availableRooms = await prisma.room.findMany({
      where: { status: 'AVAILABLE', currentOccupancy: { lt: prisma.room.fields.capacity } },
      include: { floor: { select: { dormitoryId: true } } },
      orderBy: [{ floor: { floorNumber: 'asc' } }, { roomNumber: 'asc' }]
    });
    const totalAvailableBeds = availableRooms.reduce((sum, room) => sum + (room.capacity - room.currentOccupancy), 0);
    
    const topStudentIds = ahpResults.map(result => result.id).slice(0, totalAvailableBeds);
    const students = applications.filter(p => topStudentIds.includes(p.id));

    const genderBlocks = {
      MALE: students.filter(s => s.user.gender === 'MALE'),
      FEMALE: students.filter(s => s.user.gender === 'FEMALE'),
      OTHER: students.filter(s => s.user.gender === 'OTHER')
    };

    const results: any[] = [];
    let roomIdx = 0;
    const roomOccupancies = new Map<string, number>();

    for (const gender of ['MALE', 'FEMALE', 'OTHER'] as const) {
      const blockStudents = genderBlocks[gender];
      if (blockStudents.length === 0) continue;

      const kmeansInput: KmeansStudent[] = blockStudents.map(student => {
        let vector = { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 };
        if (student.clusteringVector) {
          try { vector = JSON.parse(student.clusteringVector); } catch { /* ignore */ }
        }
        return { id: student.id, vector, groupId: student.groupId, faculty: student.faculty };
      });

      const k = Math.min(Math.ceil(blockStudents.length / 3), availableRooms.length - roomIdx);
      if (k <= 0 && blockStudents.length > 0) {
        throw new AppError(`Недостатньо вільних кімнат для розселення студентів статі: ${gender}`, 400);
      }
      const clusters = KMeansAlgorithm.clusterize(kmeansInput, k);

      for (const cluster of clusters) {
        let studentIdx = 0;
        while (studentIdx < cluster.students.length && roomIdx < availableRooms.length) {
          const targetRoom = availableRooms[roomIdx];
          const currentOcc = roomOccupancies.get(targetRoom.id) || targetRoom.currentOccupancy;
          const availableSpace = targetRoom.capacity - currentOcc;

          if (availableSpace <= 0) {
            roomIdx++;
            continue;
          }

          const studentsToAllocate = cluster.students.slice(studentIdx, studentIdx + availableSpace);
          if (studentsToAllocate.length === 0) break;

          const allocatedDetails = blockStudents.filter(s => studentsToAllocate.some(a => a.id === s.id));

          let existingResult = results.find(r => r.roomId === targetRoom.id);
          if (existingResult) {
            existingResult.students.push(...allocatedDetails);
          } else {
            results.push({
              roomId: targetRoom.id,
              roomNumber: targetRoom.roomNumber,
              capacity: targetRoom.capacity,
              gender, 
              compatibilityScore: cluster.score,
              students: allocatedDetails
            });
          }

          studentIdx += studentsToAllocate.length;
          const newOcc = currentOcc + studentsToAllocate.length;
          roomOccupancies.set(targetRoom.id, newOcc);

          if (newOcc >= targetRoom.capacity) {
            roomIdx++;
          }
        }
      }

      // Prevent next gender from mixing
      if (roomIdx < availableRooms.length) {
          const currentRoomId = availableRooms[roomIdx].id;
          const currentRoomOcc = roomOccupancies.get(currentRoomId) || 0;
          if (currentRoomOcc > 0) {
            roomIdx++;
          }
      }
    }

    return results;
  }

  static async confirmAllocationPlan(plan: Array<{ roomId: string; students: Array<{ id: string }> }>) {
    if (!plan.length) {
      throw new AppError('План поселення порожній', 400);
    }

    const allocatedStudents: Array<{ studentId: string; dormitoryName: string; roomNumber: string }> = [];

    await prisma.$transaction(async (tx) => {
      for (const roomPlan of plan) {
        const room = await tx.room.findUnique({
          where: { id: roomPlan.roomId },
          include: { floor: { include: { dormitory: true } } }
        });
        if (!room) {
          throw new AppError('Кімнату з плану не знайдено', 404);
        }
        if (room.status === 'MAINTENANCE') {
          throw new AppError(`Кімната ${room.roomNumber} перебуває на ремонті`, 400);
        }

        const activeOccupancy = await tx.roomAllocation.count({
          where: { roomId: room.id, status: 'ACTIVE' }
        });
        const freeBeds = room.capacity - activeOccupancy;
        if (roomPlan.students.length > freeBeds) {
          throw new AppError(`У кімнаті ${room.roomNumber} недостатньо вільних місць`, 400);
        }

        for (const studentRef of roomPlan.students) {
          const profile = await tx.studentProfile.findUnique({ where: { id: studentRef.id } });
          if (!profile) {
            throw new AppError('Студента з плану не знайдено', 404);
          }
          if (profile.roomId) {
            throw new AppError(`Студент ${profile.fullName} вже поселений`, 400);
          }

          // Validation that they have an active app is handled by filterValidPool theoretically,
          // but let's double check they have one.
          const approvedApplication = await tx.application.findFirst({
            where: { studentId: profile.id, status: 'APPROVED', type: 'CHECK_IN' },
            orderBy: { submittedAt: 'desc' }
          });
          if (!approvedApplication) {
            throw new AppError(`У студента ${profile.fullName} немає схваленої заяви`, 400);
          }

          await tx.roomAllocation.create({
            data: { roomId: room.id, studentId: profile.id, status: 'ACTIVE' }
          });
          await tx.studentProfile.update({
            where: { id: profile.id },
            data: { roomId: room.id, dormitoryId: room.floor.dormitoryId }
          });

          allocatedStudents.push({
            studentId: profile.id,
            dormitoryName: room.floor.dormitory.name,
            roomNumber: room.roomNumber
          });
        }

        const newOccupancy = activeOccupancy + roomPlan.students.length;
        await tx.room.update({
          where: { id: room.id },
          data: {
            currentOccupancy: newOccupancy,
            status: newOccupancy >= room.capacity ? 'FULL' : 'AVAILABLE'
          }
        });

        const dormOccupancy = await tx.studentProfile.count({
          where: { dormitoryId: room.floor.dormitoryId, roomId: { not: null } }
        });
        await tx.dormitory.update({
          where: { id: room.floor.dormitoryId },
          data: {
            currentOccupancy: dormOccupancy,
            occupancyStatus: getOccupancyStatus(dormOccupancy, room.floor.dormitory.totalCapacity)
          }
        });
      }
    });

    const { NotificationService } = await import('./notification.service');
    await Promise.all(allocatedStudents.map(student =>
      NotificationService.createAllocationNotification(student.studentId, student.dormitoryName, student.roomNumber)
    ));

    return { success: true, allocatedCount: allocatedStudents.length };
  }

  static async evictStudent(studentId: string, adminUserId?: string) {
    const admin = adminUserId ? await prisma.user.findUnique({ where: { id: adminUserId } }) : null;
    const profile = await prisma.studentProfile.findUnique({ where: { id: studentId } });

    if (!profile) {
      throw new AppError('Профіль студента не знайдено', 404);
    }
    if (adminUserId && !admin) {
      throw new AppError('Адміністратора не знайдено', 404);
    }
    if (admin?.role === 'ADMIN_COMMANDANT' && admin.dormitoryId !== profile.dormitoryId) {
      throw new AppError('Ви не маєте прав виселяти студентів з іншого гуртожитку', 403);
    }

    const allocation = await prisma.roomAllocation.findFirst({
      where: { studentId, status: 'ACTIVE' }
    });

    if (!allocation) {
      throw new AppError('Студент не проживає в гуртожитку', 400);
    }

    const dormitoryId = profile.dormitoryId;
    let updatedRoom: Room | null = null;
    let updatedDormitory: Dormitory | null = null;

    await prisma.$transaction(async (tx) => {
      await tx.roomAllocation.update({
        where: { id: allocation.id },
        data: { status: 'EVICTED' }
      });

      const room = await tx.room.findUnique({ where: { id: allocation.roomId } });
      if (room) {
        const newOccupancy = Math.max(0, room.currentOccupancy - 1);
        updatedRoom = await tx.room.update({
          where: { id: room.id },
          data: {
            currentOccupancy: newOccupancy,
            status: newOccupancy < room.capacity ? 'AVAILABLE' : 'FULL'
          }
        });
      }

      await tx.studentProfile.update({
        where: { id: studentId },
        data: { roomId: null, dormitoryId: null }
      });

      if (dormitoryId) {
        const dormitory = await tx.dormitory.findUnique({
          where: { id: dormitoryId },
          select: { currentOccupancy: true, totalCapacity: true }
        });

        if (dormitory) {
          const updatedDormOccupancy = Math.max(0, dormitory.currentOccupancy - 1);
          updatedDormitory = await tx.dormitory.update({
            where: { id: dormitoryId },
            data: {
              currentOccupancy: updatedDormOccupancy,
              occupancyStatus: getOccupancyStatus(updatedDormOccupancy, dormitory.totalCapacity)
            }
          });
        }
      }
    });

    const { NotificationService } = await import('./notification.service');
    await NotificationService.createEvictionNotification(profile.id);

    return { success: true, room: updatedRoom, dormitory: updatedDormitory };
  }

  static async allocateStudentToRoom(studentId: string, roomId: string, adminUserId?: string) {
    const admin = adminUserId ? await prisma.user.findUnique({ where: { id: adminUserId } }) : null;
    if (adminUserId && !admin) {
      throw new AppError('Адміністратора не знайдено', 404);
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true }
    });
    if (!profile) {
      throw new AppError('Профіль студента не знайдено', 404);
    }
    if (profile.roomId) {
      throw new AppError('Студент вже поселений', 400);
    }

    const approvedApplication = await prisma.application.findFirst({
      where: {
        studentId,
        status: 'APPROVED',
        type: 'CHECK_IN'
      },
      orderBy: { reviewedAt: 'desc' }
    });
    if (!approvedApplication) {
      throw new AppError('Немає схваленої заяви на поселення', 400);
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { floor: { select: { dormitoryId: true } } }
    });
    if (!room) {
      throw new AppError('Кімнату не знайдено', 404);
    }
    if (room.status === 'MAINTENANCE') {
      throw new AppError('Кімната на ремонті', 400);
    }
    if (room.currentOccupancy >= room.capacity) {
      throw new AppError('Кімната заповнена', 400);
    }

    if (admin?.role === 'ADMIN_COMMANDANT' && admin.dormitoryId !== room.floor.dormitoryId) {
      throw new AppError('Ви не маєте прав заселяти в інший гуртожиток', 403);
    }

    const dormitory = await prisma.dormitory.findUnique({
      where: { id: room.floor.dormitoryId },
      select: { id: true, name: true, currentOccupancy: true, totalCapacity: true }
    });
    if (!dormitory) {
      throw new AppError('Гуртожиток не знайдено', 404);
    }

    let updatedRoom: Room | null = null;
    let updatedDormitory: Dormitory | null = null;

    await prisma.$transaction(async (tx) => {
      const activeAllocation = await tx.roomAllocation.findFirst({
        where: { studentId: profile.id, status: 'ACTIVE' }
      });
      if (activeAllocation) {
        throw new AppError('Студент вже має активне поселення', 400);
      }

      await tx.roomAllocation.create({
        data: {
          roomId: room.id,
          studentId: profile.id,
          status: 'ACTIVE'
        }
      });

      await tx.studentProfile.update({
        where: { id: profile.id },
        data: { roomId: room.id, dormitoryId: dormitory.id }
      });

      const newOccupancy = room.currentOccupancy + 1;
      updatedRoom = await tx.room.update({
        where: { id: room.id },
        data: {
          currentOccupancy: newOccupancy,
          status: newOccupancy >= room.capacity ? 'FULL' : 'AVAILABLE'
        }
      });

      const updatedDormOccupancy = dormitory.currentOccupancy + 1;
      updatedDormitory = await tx.dormitory.update({
        where: { id: dormitory.id },
        data: {
          currentOccupancy: updatedDormOccupancy,
          occupancyStatus: getOccupancyStatus(updatedDormOccupancy, dormitory.totalCapacity)
        }
      });
    });

    const { NotificationService } = await import('./notification.service');
    await NotificationService.createAllocationNotification(profile.id, dormitory.name, room.roomNumber);

    return {
      success: true,
      student: profile,
      room: updatedRoom,
      dormitory: updatedDormitory
    };
  }
}
