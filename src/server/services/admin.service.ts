import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AdminService {
  static async getDormitories() {
    return prisma.dormitory.findMany({
      include: {
        floors: {
          include: {
            rooms: true
          }
        }
      }
    });
  }

  static async updateRoomStatus(roomId: string, status: string) {
    return prisma.room.update({
      where: { id: roomId },
      data: { status }
    });
  }

  static async getApplications() {
    return prisma.application.findMany({
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
  }

  static async approveApplication(appId: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { status: 'APPROVED', reviewedAt: new Date() }
    });
  }

  static async rejectApplication(appId: string, reason: string) {
    return prisma.application.update({
      where: { id: appId },
      data: { status: 'REJECTED', rejectionReason: reason, reviewedAt: new Date() }
    });
  }

  static async getAdmins() {
    return prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'ADMIN_CAMPUS', 'ADMIN_COMMANDANT']
        }
      },
      include: {
        dormitory: true
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
}
