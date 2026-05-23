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

    const profilesWithVectors = await prisma.studentProfile.findMany({
      where: { clusteringVector: { not: null } },
      select: { clusteringVector: true }
    });

    // 5 global psychotypes
    const psychotypeCounts = [0, 0, 0, 0, 0];
    
    if (profilesWithVectors.length > 0) {
      // Define 5 predefined centroids for stable analytics
      const predefinedCentroids = [
        [2, 5, 5, 5], // 0: Сови (Пізній хронотип)
        [8, 5, 5, 5], // 1: Жайворонки (Ранній хронотип)
        [5, 5, 5, 5], // 2: Збалансовані
        [5, 2, 2, 8], // 3: Любителі тиші та чистоти
        [5, 8, 8, 3]  // 4: Шумні екстраверти
      ];

      profilesWithVectors.forEach(p => {
        try {
          const vStr = p.clusteringVector as string;
          const vec = JSON.parse(vStr);
          const studentVec = [vec.chronotype || 5, vec.sociability || 5, vec.noiseTolerance || 5, vec.cleanliness || 5];
          
          let bestIdx = 0;
          let minDistance = Infinity;
          
          for (let i = 0; i < 5; i++) {
            const dist = predefinedCentroids[i].reduce((sum, val, idx) => sum + Math.pow(val - studentVec[idx], 2), 0);
            if (dist < minDistance) {
              minDistance = dist;
              bestIdx = i;
            }
          }
          psychotypeCounts[bestIdx]++;
        } catch (e) {
          // ignore parsing errors
        }
      });
    }

    const clusterStats = psychotypeCounts.map((count, index) => ({
      clusterId: index,
      _count: { clusterId: count }
    })).filter(c => c._count.clusterId > 0);

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
