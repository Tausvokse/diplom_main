import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class StudentService {
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

      if (app.type === 'CHECK_IN' && app.student.roomId) {
        await tx.studentProfile.update({
          where: { id: app.studentId },
          data: { roomId: null, dormitoryId: null }
        });
      }

      return updatedApp;
    });

    if (app.type === 'CHECK_OUT' && app.student.roomId) {
      const { AllocationService } = await import('./allocation.service');
      await AllocationService.evictStudent(app.studentId);
    }

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

    const { NotificationService } = await import('./notification.service');
    await NotificationService.createApplicationStatusNotification(appId, 'REJECTED', reason);

    return updated;
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

    const formattedProfile = {
      ...profile,
      applications: profile.applications.map(app => ({
        ...app,
        scanDocumentsUrl: app.scanDocumentsUrl ? app.scanDocumentsUrl.split(',').filter(Boolean) : []
      }))
    };

    return formattedProfile;
  }
}
