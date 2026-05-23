import { AhpAlgorithm, AhpStudent, DEFAULT_CRITERIA_MATRIX } from '../utils/algorithms/ahp.util';
import { KMeansAlgorithm, KmeansStudent } from '../utils/algorithms/kmeans.util';
import type { Dormitory, Room, StudentProfile, Application, RoomAllocation } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { getOccupancyStatus } from '../utils/occupancy';

export class AllocationService {
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

  // Helper to build smart room state including existing residents' vectors
  private static async getSmartRoomsState() {
    const availableRooms = await prisma.room.findMany({
      where: { status: 'AVAILABLE', currentOccupancy: { lt: prisma.room.fields.capacity } },
      include: { 
        floor: { select: { dormitoryId: true } },
        allocations: {
          where: { status: 'ACTIVE' },
          include: { student: { include: { user: true } } }
        }
      },
      orderBy: [{ floor: { floorNumber: 'asc' } }, { roomNumber: 'asc' }]
    });

    return availableRooms.map(r => {
      let gender: string | null = null;
      let centroid: number[] | null = null;
      let primaryFaculty: string | null = null;
      
      if (r.allocations.length > 0) {
        gender = r.allocations[0].student.user.gender;
        
        const facultyCounts = new Map<string, number>();
        const vectors = r.allocations.map(a => {
          const fac = a.student.faculty;
          facultyCounts.set(fac, (facultyCounts.get(fac) || 0) + 1);

          let vec = { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 };
          if (a.student.clusteringVector) {
            try { vec = JSON.parse(a.student.clusteringVector); } catch {}
          }
          return [vec.chronotype, vec.sociability, vec.noiseTolerance, vec.cleanliness];
        });

        // Most common faculty in the room
        let maxCount = 0;
        facultyCounts.forEach((count, fac) => {
          if (count > maxCount) { maxCount = count; primaryFaculty = fac; }
        });

        centroid = [0, 0, 0, 0];
        vectors.forEach(v => {
          for (let i = 0; i < 4; i++) centroid![i] += v[i];
        });
        for (let i = 0; i < 4; i++) centroid![i] /= vectors.length;
      }

      return {
        id: r.id,
        roomNumber: r.roomNumber,
        capacity: r.capacity,
        currentOccupancy: r.currentOccupancy,
        dormitoryId: r.floor.dormitoryId,
        gender,
        centroid,
        primaryFaculty
      };
    });
  }

  // Calculate Euclidean Distance including Faculty Penalty (2.0)
  private static calculateDistance(c1: number[], fac1: string, c2: number[], fac2: string | null) {
    let dist = c1.reduce((sum, val, i) => sum + Math.pow(val - c2[i], 2), 0);
    if (fac2 && fac1 !== fac2) dist += 2.0; 
    return Math.sqrt(dist);
  }

  // Recalculate room centroid after adding students
  private static updateRoomState(room: any, newStudents: KmeansStudent[]) {
    room.currentOccupancy += newStudents.length;
    
    const newVectors = newStudents.map(s => {
      return [s.vector.chronotype, s.vector.sociability, s.vector.noiseTolerance, s.vector.cleanliness];
    });

    if (!room.centroid) {
      room.centroid = [0, 0, 0, 0];
      newVectors.forEach(v => { for (let i = 0; i < 4; i++) room.centroid[i] += v[i]; });
      for (let i = 0; i < 4; i++) room.centroid[i] /= newVectors.length;
      room.primaryFaculty = newStudents[0].faculty; // rough approximation
    } else {
      // Weighted average
      const oldWeight = room.currentOccupancy - newStudents.length;
      const totalWeight = room.currentOccupancy;
      
      const newSum = [0, 0, 0, 0];
      newVectors.forEach(v => { for (let i = 0; i < 4; i++) newSum[i] += v[i]; });

      for (let i = 0; i < 4; i++) {
        room.centroid[i] = ((room.centroid[i] * oldWeight) + newSum[i]) / totalWeight;
      }
    }
  }

  static async runAllocationPipeline() {
    const rawProfiles = await prisma.studentProfile.findMany({
      where: { roomId: null },
      include: { user: true, privilege: true, applications: true, allocations: true }
    });
    const validProfiles = this.filterValidPool(rawProfiles);

    if (validProfiles.length === 0) throw new AppError('Немає схвалених заяв для розподілу', 400);

    const ahpInput: AhpStudent[] = validProfiles.map(p => ({
      id: p.id,
      course: p.course,
      privilegeMultiplier: p.privilege?.multiplier || 1.0,
      baseScore: 100
    }));

    const ahpResults = AhpAlgorithm.calculatePriorityScores(ahpInput, DEFAULT_CRITERIA_MATRIX);
    for (const res of ahpResults) {
      await prisma.studentProfile.update({ where: { id: res.id }, data: { priorityScore: res.priorityScore } });
    }

    const roomsState = await this.getSmartRoomsState();
    const totalAvailableBeds = roomsState.reduce((sum, room) => sum + (room.capacity - room.currentOccupancy), 0);
    const sortedStudentIds = ahpResults.map(result => result.id);
    const topStudentIds = sortedStudentIds.slice(0, totalAvailableBeds);

    if (topStudentIds.length === 0) throw new AppError('Немає вільних місць у гуртожитках', 400);

    const students = validProfiles.filter(p => topStudentIds.includes(p.id));

    const genderBlocks = {
      MALE: students.filter(s => s.user.gender === 'MALE'),
      FEMALE: students.filter(s => s.user.gender === 'FEMALE'),
      OTHER: students.filter(s => s.user.gender === 'OTHER')
    };

    const results: any[] = [];
    
    await prisma.$transaction(async (tx) => {
      for (const gender of ['MALE', 'FEMALE', 'OTHER'] as const) {
        const blockStudents = genderBlocks[gender];
        if (blockStudents.length === 0) continue;

        let availableGenderRooms = roomsState.filter(r => r.gender === gender || r.gender === null);

        const kmeansInput: KmeansStudent[] = blockStudents.map(student => {
          let vector = { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 };
          if (student.clusteringVector) {
            try { vector = JSON.parse(student.clusteringVector); } catch {}
          }
          return { id: student.id, vector, groupId: student.groupId, faculty: student.faculty };
        });

        const k = Math.min(Math.ceil(blockStudents.length / 3), availableGenderRooms.length);
        if (k <= 0) break;
        
        const clusters = KMeansAlgorithm.clusterize(kmeansInput, k);

        for (const cluster of clusters) {
          let unassignedStudents = [...cluster.students];

          while (unassignedStudents.length > 0 && availableGenderRooms.length > 0) {
            // Find best room
            let bestRoomIdx = -1;
            let minDistance = Infinity;

            for (let i = 0; i < availableGenderRooms.length; i++) {
              const room = availableGenderRooms[i];
              if (room.currentOccupancy >= room.capacity) continue;

              if (room.centroid) {
                const dist = this.calculateDistance(cluster.centroid, cluster.students[0].faculty, room.centroid, room.primaryFaculty);
                if (dist < minDistance) {
                  minDistance = dist;
                  bestRoomIdx = i;
                }
              } else if (bestRoomIdx === -1) {
                // Pick the first empty room if no partially filled match found yet
                bestRoomIdx = i;
              }
            }

            if (bestRoomIdx === -1) break; // No rooms left with space

            const targetRoom = availableGenderRooms[bestRoomIdx];
            const availableSpace = targetRoom.capacity - targetRoom.currentOccupancy;
            const studentsToAllocate = unassignedStudents.slice(0, availableSpace);
            unassignedStudents = unassignedStudents.slice(availableSpace);

            const fullStudents = blockStudents.filter(s => studentsToAllocate.some(a => a.id === s.id));

            for (const student of fullStudents) {
              await tx.roomAllocation.create({
                data: { roomId: targetRoom.id, studentId: student.id, status: 'ACTIVE' }
              });
              await tx.studentProfile.update({
                where: { id: student.id },
                data: { roomId: targetRoom.id, dormitoryId: targetRoom.dormitoryId }
              });
            }

            await tx.room.update({
              where: { id: targetRoom.id },
              data: {
                currentOccupancy: targetRoom.currentOccupancy + studentsToAllocate.length,
                status: (targetRoom.currentOccupancy + studentsToAllocate.length) >= targetRoom.capacity ? 'FULL' : 'AVAILABLE'
              }
            });

            // Update dormitory stats
            const dormitory = await tx.dormitory.findUnique({
              where: { id: targetRoom.dormitoryId },
              select: { currentOccupancy: true, totalCapacity: true }
            });
            if (dormitory) {
              const updatedDormOccupancy = dormitory.currentOccupancy + studentsToAllocate.length;
              await tx.dormitory.update({
                where: { id: targetRoom.dormitoryId },
                data: {
                  currentOccupancy: updatedDormOccupancy,
                  occupancyStatus: getOccupancyStatus(updatedDormOccupancy, dormitory.totalCapacity)
                }
              });
            }

            // Update local state
            this.updateRoomState(targetRoom, studentsToAllocate);
            targetRoom.gender = gender; // Ensure gender is locked

            if (targetRoom.currentOccupancy >= targetRoom.capacity) {
              availableGenderRooms.splice(bestRoomIdx, 1);
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

    if (applications.length === 0) throw new AppError('Немає схвалених заяв для розподілу', 400);

    const ahpInput: AhpStudent[] = applications.map(app => ({
      id: app.id,
      course: app.course,
      privilegeMultiplier: app.privilege?.multiplier || 1.0,
      baseScore: 100
    }));
    const ahpResults = AhpAlgorithm.calculatePriorityScores(ahpInput, DEFAULT_CRITERIA_MATRIX);

    const roomsState = await this.getSmartRoomsState();
    const totalAvailableBeds = roomsState.reduce((sum, room) => sum + (room.capacity - room.currentOccupancy), 0);
    const topStudentIds = ahpResults.map(result => result.id).slice(0, totalAvailableBeds);
    const students = applications.filter(p => topStudentIds.includes(p.id));

    const genderBlocks = {
      MALE: students.filter(s => s.user.gender === 'MALE'),
      FEMALE: students.filter(s => s.user.gender === 'FEMALE'),
      OTHER: students.filter(s => s.user.gender === 'OTHER')
    };

    const results: any[] = [];

    for (const gender of ['MALE', 'FEMALE', 'OTHER'] as const) {
      const blockStudents = genderBlocks[gender];
      if (blockStudents.length === 0) continue;

      let availableGenderRooms = roomsState.filter(r => r.gender === gender || r.gender === null);

      const kmeansInput: KmeansStudent[] = blockStudents.map(student => {
        let vector = { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 };
        if (student.clusteringVector) {
          try { vector = JSON.parse(student.clusteringVector); } catch {}
        }
        return { id: student.id, vector, groupId: student.groupId, faculty: student.faculty };
      });

      const k = Math.min(Math.ceil(blockStudents.length / 3), availableGenderRooms.length);
      if (k <= 0 && blockStudents.length > 0) {
        throw new AppError(`Недостатньо вільних кімнат для розселення студентів статі: ${gender}`, 400);
      }
      
      const clusters = KMeansAlgorithm.clusterize(kmeansInput, k);

      for (const cluster of clusters) {
        let unassignedStudents = [...cluster.students];

        while (unassignedStudents.length > 0 && availableGenderRooms.length > 0) {
          let bestRoomIdx = -1;
          let minDistance = Infinity;

          for (let i = 0; i < availableGenderRooms.length; i++) {
            const room = availableGenderRooms[i];
            if (room.currentOccupancy >= room.capacity) continue;

            if (room.centroid) {
              const dist = this.calculateDistance(cluster.centroid, cluster.students[0].faculty, room.centroid, room.primaryFaculty);
              if (dist < minDistance) {
                minDistance = dist;
                bestRoomIdx = i;
              }
            } else if (bestRoomIdx === -1) {
              bestRoomIdx = i;
            }
          }

          if (bestRoomIdx === -1) break;

          const targetRoom = availableGenderRooms[bestRoomIdx];
          const availableSpace = targetRoom.capacity - targetRoom.currentOccupancy;
          const studentsToAllocate = unassignedStudents.slice(0, availableSpace);
          unassignedStudents = unassignedStudents.slice(availableSpace);

          const allocatedDetails = blockStudents.filter(s => studentsToAllocate.some(a => a.id === s.id));

          this.updateRoomState(targetRoom, studentsToAllocate);
          targetRoom.gender = gender;

          if (targetRoom.currentOccupancy >= targetRoom.capacity) {
            availableGenderRooms.splice(bestRoomIdx, 1);
          }

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
        }
      }
    }

    return results;
  }

  static async confirmAllocationPlan(plan: Array<{ roomId: string; students: Array<{ id: string }> }>) {
    if (!plan.length) throw new AppError('План поселення порожній', 400);

    const allocatedStudents: Array<{ studentId: string; dormitoryName: string; roomNumber: string }> = [];

    await prisma.$transaction(async (tx) => {
      for (const roomPlan of plan) {
        const room = await tx.room.findUnique({
          where: { id: roomPlan.roomId },
          include: { floor: { include: { dormitory: true } } }
        });
        if (!room) throw new AppError('Кімнату з плану не знайдено', 404);
        if (room.status === 'MAINTENANCE') throw new AppError(`Кімната ${room.roomNumber} перебуває на ремонті`, 400);

        const activeOccupancy = await tx.roomAllocation.count({
          where: { roomId: room.id, status: 'ACTIVE' }
        });
        const freeBeds = room.capacity - activeOccupancy;
        if (roomPlan.students.length > freeBeds) throw new AppError(`У кімнаті ${room.roomNumber} недостатньо вільних місць`, 400);

        for (const studentRef of roomPlan.students) {
          const profile = await tx.studentProfile.findUnique({ where: { id: studentRef.id } });
          if (!profile) throw new AppError('Студента з плану не знайдено', 404);
          if (profile.roomId) throw new AppError(`Студент ${profile.fullName} вже поселений`, 400);

          const approvedApplication = await tx.application.findFirst({
            where: { studentId: profile.id, status: 'APPROVED', type: 'CHECK_IN' },
            orderBy: { submittedAt: 'desc' }
          });
          if (!approvedApplication) throw new AppError(`У студента ${profile.fullName} немає схваленої заяви`, 400);

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

    if (!profile) throw new AppError('Профіль студента не знайдено', 404);
    if (adminUserId && !admin) throw new AppError('Адміністратора не знайдено', 404);
    if (admin?.role === 'ADMIN_COMMANDANT' && admin.dormitoryId !== profile.dormitoryId) {
      throw new AppError('Ви не маєте прав виселяти студентів з іншого гуртожитку', 403);
    }

    const allocation = await prisma.roomAllocation.findFirst({
      where: { studentId, status: 'ACTIVE' }
    });

    if (!allocation) throw new AppError('Студент не проживає в гуртожитку', 400);

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
    if (adminUserId && !admin) throw new AppError('Адміністратора не знайдено', 404);

    const profile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true }
    });
    if (!profile) throw new AppError('Профіль студента не знайдено', 404);
    if (profile.roomId) throw new AppError('Студент вже поселений', 400);

    const approvedApplication = await prisma.application.findFirst({
      where: { studentId, status: 'APPROVED', type: 'CHECK_IN' },
      orderBy: { reviewedAt: 'desc' }
    });
    if (!approvedApplication) throw new AppError('Немає схваленої заяви на поселення', 400);

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { floor: { select: { dormitoryId: true } } }
    });
    if (!room) throw new AppError('Кімнату не знайдено', 404);
    if (room.status === 'MAINTENANCE') throw new AppError('Кімната на ремонті', 400);
    if (room.currentOccupancy >= room.capacity) throw new AppError('Кімната заповнена', 400);

    if (admin?.role === 'ADMIN_COMMANDANT' && admin.dormitoryId !== room.floor.dormitoryId) {
      throw new AppError('Ви не маєте прав заселяти в інший гуртожиток', 403);
    }

    const dormitory = await prisma.dormitory.findUnique({
      where: { id: room.floor.dormitoryId },
      select: { id: true, name: true, currentOccupancy: true, totalCapacity: true }
    });
    if (!dormitory) throw new AppError('Гуртожиток не знайдено', 404);

    let updatedRoom: Room | null = null;
    let updatedDormitory: Dormitory | null = null;

    await prisma.$transaction(async (tx) => {
      const activeAllocation = await tx.roomAllocation.findFirst({
        where: { studentId: profile.id, status: 'ACTIVE' }
      });
      if (activeAllocation) throw new AppError('Студент вже має активне поселення', 400);

      await tx.roomAllocation.create({
        data: { roomId: room.id, studentId: profile.id, status: 'ACTIVE' }
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
