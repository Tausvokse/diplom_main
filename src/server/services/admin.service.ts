import { ComplaintStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class AdminService {
  static async getDormitories() {
    const dorms = await prisma.dormitory.findMany({
      include: {
        floors: {
          include: {
            rooms: true
          }
        }
      }
    });

    return dorms.map(dorm => {
      let totalCapacity = 0;
      let currentOccupancy = 0;
      dorm.floors.forEach(floor => {
        floor.rooms.forEach(room => {
          totalCapacity += room.capacity;
          currentOccupancy += room.currentOccupancy;
        });
      });
      return {
        ...dorm,
        totalCapacity,
        currentOccupancy
      };
    });
  }

  static async getAuditLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { firstName: true, lastName: true, email: true, role: true } }
        }
      }),
      prisma.auditLog.count()
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async createDormitory(name: string, address: string, universityId: string) {
    return prisma.dormitory.create({
      data: { name, address, universityId, totalCapacity: 0, currentOccupancy: 0 }
    });
  }

  static async updateDormitory(id: string, data: { name?: string, address?: string }) {
    return prisma.dormitory.update({ where: { id }, data });
  }

  static async deleteDormitory(id: string) {
    return prisma.dormitory.delete({ where: { id } });
  }

  static async createFloor(dormitoryId: string, floorNumber: number) {
    return prisma.floor.create({
      data: { dormitoryId, floorNumber }
    });
  }

  static async updateFloor(id: string, floorNumber: number) {
    return prisma.floor.update({ where: { id }, data: { floorNumber } });
  }

  static async deleteFloor(id: string) {
    return prisma.floor.delete({ where: { id } });
  }

  static async createRoom(floorId: string, roomNumber: string, capacity: number) {
    return prisma.room.create({
      data: { floorId, roomNumber, capacity, currentOccupancy: 0, status: 'AVAILABLE' }
    });
  }

  static async updateRoom(roomId: string, data: { roomNumber?: string, capacity?: number, status?: string }) {
    return prisma.room.update({
      where: { id: roomId },
      data
    });
  }

  static async deleteRoom(roomId: string) {
    return prisma.room.delete({ where: { id: roomId } });
  }

  static async updateRoomStatus(roomId: string, status: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Кімнату не знайдено', 404);
    }
    return prisma.room.update({
      where: { id: roomId },
      data: { status }
    });
  }

  static async getRoomStudents(roomId: string) {
    return prisma.studentProfile.findMany({
      where: { roomId },
      select: {
        id: true,
        fullName: true,
        course: true,
        faculty: true,
        studentIdNumber: true,
        room: { select: { roomNumber: true } },
        dormitory: { select: { name: true } }
      }
    });
  }

  static async getApplications() {
    const apps = await prisma.application.findMany({
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            privilege: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });
    
    return apps.map(app => ({
      ...app,
      scanDocumentsUrl: app.scanDocumentsUrl ? app.scanDocumentsUrl.split(',').filter(Boolean) : []
    }));
  }

  static async approveApplication(appId: string) {
    const app = await prisma.application.findUnique({
      where: { id: appId },
      include: { student: true }
    });
    if (!app) {
      throw new AppError('Заяву не знайдено', 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedApp = await tx.application.update({
        where: { id: appId },
        data: { status: 'APPROVED', reviewedAt: new Date() }
      });

      // Handle CHECK_IN: ensure student is ready for allocation by clearing any previous roomId
      if (app.type === 'CHECK_IN' && app.student.roomId) {
        await tx.studentProfile.update({
          where: { id: app.studentId },
          data: { roomId: null, dormitoryId: null }
        });
      }

      return updatedApp;
    });

    // Handle CHECK_OUT: auto-evict student (Eviction handles its own transaction)
    if (app.type === 'CHECK_OUT' && app.student.roomId) {
      const { AllocationService } = await import('./allocation.service');
      await AllocationService.evictStudent(app.studentId);
    }

    // Create notification
    const { NotificationService } = await import('./notification.service');
    await NotificationService.createApplicationStatusNotification(appId, 'APPROVED');

    return updated;
  }

  static async updateApplicationStatus(appId: string, status: any) {
    const app = await prisma.application.findUnique({ where: { id: appId } });
    if (!app) {
      throw new AppError('Заяву не знайдено', 404);
    }

    const updated = await prisma.application.update({
      where: { id: appId },
      data: { 
        status, 
        reviewedAt: (status === 'APPROVED' || status === 'REJECTED') ? new Date() : undefined 
      }
    });

    const { NotificationService } = await import('./notification.service');
    await NotificationService.createApplicationStatusNotification(appId, status);

    return updated;
  }

  static async rejectApplication(appId: string, reason: string) {
    const app = await prisma.application.findUnique({ where: { id: appId } });
    if (!app) {
      throw new AppError('Заяву не знайдено', 404);
    }
    const updated = await prisma.application.update({
      where: { id: appId },
      data: { status: 'REJECTED', rejectionReason: reason, reviewedAt: new Date() }
    });

    // Create notification
    const { NotificationService } = await import('./notification.service');
    await NotificationService.createApplicationStatusNotification(appId, 'REJECTED', reason);

    return updated;
  }

  static async getAdmins() {
    return prisma.user.findMany({
      where: {
        role: {
          in: [Role.ADMIN, Role.ADMIN_CAMPUS, Role.ADMIN_COMMANDANT]
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        dormitoryId: true,
        dormitory: true,
        createdAt: true
      }
    });
  }

  static async getAllStudents(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.studentProfile.findMany({
        skip,
        take: limit,
        include: {
          dormitory: { select: { name: true } },
          room: { select: { roomNumber: true } }
        },
        orderBy: { fullName: 'asc' }
      }),
      prisma.studentProfile.count()
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getStudentDetails(studentId: string) {
    const profile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true } },
        dormitory: { select: { id: true, name: true, address: true } },
        room: { select: { id: true, roomNumber: true, capacity: true, currentOccupancy: true } },
        privilege: true,
        group: { include: { members: { select: { id: true, fullName: true, studentIdNumber: true } } } },
        applications: {
          orderBy: { submittedAt: 'desc' },
          select: {
            id: true,
            type: true,
            status: true,
            scanDocumentsUrl: true,
            rejectionReason: true,
            submittedAt: true,
            reviewedAt: true
          }
        },
        allocations: {
          orderBy: { allocatedAt: 'desc' },
          include: { room: { select: { roomNumber: true } } }
        },
        complaintsFiled: {
          orderBy: { createdAt: 'desc' },
          include: { accused: { select: { fullName: true } } }
        },
        complaintsAgainst: {
          orderBy: { createdAt: 'desc' },
          include: { accuser: { select: { fullName: true } } }
        },
        payments: { orderBy: { dueDate: 'desc' } },
        notifications: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });

    if (!profile) {
      throw new AppError('Профіль студента не знайдено', 404);
    }

    // Parse scanDocumentsUrl for each application
    const formattedProfile = {
      ...profile,
      applications: profile.applications.map(app => ({
        ...app,
        scanDocumentsUrl: app.scanDocumentsUrl ? app.scanDocumentsUrl.split(',').filter(Boolean) : []
      }))
    };

    return formattedProfile;
  }

  static async getAnalytics() {
    const dorms = await prisma.dormitory.findMany({
      select: {
        id: true,
        name: true,
        totalCapacity: true
      }
    });

    const occupancyStats = await Promise.all(dorms.map(async d => {
      const agg = await prisma.room.aggregate({
        where: { floor: { dormitoryId: d.id } },
        _sum: { currentOccupancy: true }
      });
      return {
        name: d.name,
        totalCapacity: d.totalCapacity,
        currentOccupancy: agg._sum.currentOccupancy || 0
      };
    }));

    const clusterStats = await prisma.studentProfile.groupBy({
      by: ['clusterId'],
      _count: { clusterId: true },
      where: { clusterId: { not: null } }
    });

    const complaintsStats = await prisma.complaint.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    const ratingAgg = await prisma.studentProfile.aggregate({
      _avg: { rating: true }
    });

    const facultyStats = await prisma.studentProfile.groupBy({
      by: ['faculty'],
      _count: { faculty: true }
    });

    const paymentStats = await prisma.payment.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    const roomStatusStats = await prisma.room.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    return {
      occupancy: occupancyStats,
      clusters: clusterStats.map(c => ({ clusterId: c.clusterId, count: c._count.clusterId })),
      complaints: complaintsStats.map(c => ({ status: c.status, count: c._count.status })),
      averageRating: ratingAgg._avg.rating || 5.0,
      faculties: facultyStats.map(f => ({ faculty: f.faculty, count: f._count.faculty })),
      payments: paymentStats.map(p => ({ status: p.status, count: p._count.status })),
      roomStatuses: roomStatusStats.map(r => ({ status: r.status, count: r._count.status }))
    };
  }

  static async getComplaints(adminUserId: string) {
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin) {
      throw new AppError('Адміністратора не знайдено', 404);
    }

    return prisma.complaint.findMany({
      where: admin.role === Role.ADMIN_COMMANDANT && admin.dormitoryId
        ? {
            OR: [
              { accuser: { dormitoryId: admin.dormitoryId } },
              { accused: { dormitoryId: admin.dormitoryId } }
            ]
          }
        : undefined,
      include: {
        accuser: {
          select: {
            id: true,
            fullName: true,
            studentIdNumber: true,
            dormitory: { select: { name: true } },
            room: { select: { roomNumber: true } }
          }
        },
        accused: {
          select: {
            id: true,
            fullName: true,
            studentIdNumber: true,
            dormitory: { select: { name: true } },
            room: { select: { roomNumber: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async updateComplaintStatus(adminUserId: string, complaintId: string, status: ComplaintStatus) {
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin) {
      throw new AppError('Адміністратора не знайдено', 404);
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { accuser: true, accused: true }
    });
    if (!complaint) {
      throw new AppError('Скаргу не знайдено', 404);
    }
    if (
      admin.role === Role.ADMIN_COMMANDANT &&
      admin.dormitoryId &&
      complaint.accuser.dormitoryId !== admin.dormitoryId &&
      complaint.accused.dormitoryId !== admin.dormitoryId
    ) {
      throw new AppError('Ви не маєте прав обробляти скарги іншого гуртожитку', 403);
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: { status },
      include: {
        accuser: {
          select: {
            id: true,
            fullName: true,
            studentIdNumber: true,
            dormitory: { select: { name: true } },
            room: { select: { roomNumber: true } }
          }
        },
        accused: {
          select: {
            id: true,
            fullName: true,
            studentIdNumber: true,
            dormitory: { select: { name: true } },
            room: { select: { roomNumber: true } }
          }
        }
      }
    });

    const { NotificationService } = await import('./notification.service');
    await NotificationService.create(
      complaint.accuserId,
      'Статус скарги оновлено',
      `Вашу скаргу змінено на статус: ${status}.`,
      'COMPLAINT_ALERT'
    );

    return updated;
  }

  static async createInvoice(studentId: string, amount: number, dueDate: Date, description: string) {
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new AppError('Студента не знайдено', 404);
    }
    const payment = await prisma.payment.create({
      data: {
        studentId,
        amount,
        dueDate,
        description,
        status: 'PENDING'
      }
    });

    const { NotificationService } = await import('./notification.service');
    await NotificationService.create(
      studentId,
      'Новий рахунок',
      `Вам виставлено рахунок на суму ${amount} грн. Оплатити до ${dueDate.toLocaleDateString()}. Призначення: ${description}`,
      'PAYMENT_REMINDER'
    );

    return payment;
  }

  static async getDebts() {
    return prisma.payment.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] }
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            room: true,
            dormitory: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
  }

  static async createMassNotification(title: string, message: string) {
    const students = await prisma.studentProfile.findMany({ select: { id: true } });
    await prisma.notification.createMany({
      data: students.map(s => ({
        studentId: s.id,
        title,
        message,
        type: 'INFO'
      }))
    });
  }

  static async createJar(title: string, goalAmount: number, description: string | undefined, dormitoryId: string | null | undefined, monobankUrl?: string) {
    return prisma.jar.create({
      data: {
        title,
        goalAmount,
        description,
        dormitoryId: dormitoryId || null,
        currentAmount: 0,
        monobankUrl
      }
    });
  }

  static async getJars() {
    return prisma.jar.findMany({
      include: {
        dormitory: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async deleteJar(id: string) {
    return prisma.jar.delete({
      where: { id }
    });
  }
}
