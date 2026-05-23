import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class AdminService {
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

  static async getAdmins() {
    return prisma.user.findMany({
      where: {
        role: {
          in: [
            Role.ADMIN, 
            Role.ADMIN_CAMPUS, 
            Role.ADMIN_COMMANDANT,
            Role.MASTER_SLESAR,
            Role.MASTER_SANTEKHNIK,
            Role.MASTER_ELECTRIC
          ]
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
}
