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
          in: ['ADMIN_CAMPUS', 'ADMIN_COMMANDANT']
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

  static async getAnalytics() {
    const dormData = await prisma.dormitory.findMany({
      include: {
        floors: {
          include: { rooms: true }
        }
      }
    });

    const occupancyStats = dormData.map(d => {
      let currentOccupancy = 0;
      d.floors.forEach(f => {
        f.rooms.forEach(r => { currentOccupancy += r.currentOccupancy; });
      });
      return {
        name: d.name,
        totalCapacity: d.totalCapacity,
        currentOccupancy
      };
    });

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

    return {
      occupancy: occupancyStats,
      clusters: clusterStats.map(c => ({ clusterId: c.clusterId, count: c._count.clusterId })),
      complaints: complaintsStats.map(c => ({ status: c.status, count: c._count.status })),
      averageRating: ratingAgg._avg.rating || 5.0
    };
  }
}
