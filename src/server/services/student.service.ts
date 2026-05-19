import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class StudentService {
  static async getApplication(userId: string) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: { applications: true, group: { include: { members: { include: { user: true } } } } }
    });

    if (!profile) return { application: null, group: null };

    const activeApp = profile.applications.length > 0 
      ? profile.applications.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]
      : null;
      
    return { application: activeApp, group: profile.group };
  }

  static async submitApplication(
    userId: string, 
    course: number, 
    faculty: string, 
    privilegeCategoryId: string | null,
    clusteringVectorRaw: any, 
    files: Express.Multer.File[]
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Користувача не знайдено');

    let profile = await prisma.studentProfile.findUnique({ where: { userId } });
    
    const clusteringVectorString = typeof clusteringVectorRaw === 'string' 
      ? clusteringVectorRaw 
      : JSON.stringify(clusteringVectorRaw);

    const parsedPrivilegeId = (privilegeCategoryId === 'null' || privilegeCategoryId === 'undefined' || !privilegeCategoryId) ? null : privilegeCategoryId;

    if (!profile) {
      const studentIdNumber = `KB-${Math.floor(100000 + Math.random() * 900000)}`;
      profile = await prisma.studentProfile.create({
        data: {
          userId,
          studentIdNumber,
          fullName: `${user.lastName} ${user.firstName}`,
          email: user.email,
          phone: '+380000000000', // Still mocked, should come from registration in a real app
          course: Number(course),
          faculty,
          privilegeCategoryId: parsedPrivilegeId,
          clusteringVector: clusteringVectorString,
          isVerifiedByDiia: false
        }
      });
    } else {
      profile = await prisma.studentProfile.update({
        where: { id: profile.id },
        data: {
          course: Number(course),
          faculty,
          privilegeCategoryId: parsedPrivilegeId,
          clusteringVector: clusteringVectorString
        }
      });
    }

    const fileUrls = files.map(file => `/uploads/${file.filename}`);

    const application = await prisma.application.create({
      data: {
        studentId: profile.id,
        status: 'SUBMITTED',
        scanDocumentsUrl: fileUrls.join(','),
      }
    });

    return application;
  }

  static async createGroup(userId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Профіль студента не знайдено');
    if (profile.groupId) throw new Error('Ви вже є учасником групи');

    const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Діє 7 днів

    const group = await prisma.groupReferral.create({
      data: {
        code,
        creatorId: profile.id,
        expiresAt,
        maxMembers: 4,
        currentMembers: 1,
      }
    });

    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: { groupId: group.id }
    });

    return prisma.groupReferral.findUnique({
      where: { id: group.id },
      include: { members: { include: { user: true } } }
    });
  }

  static async joinGroup(userId: string, code: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Профіль студента не знайдено');
    if (profile.groupId) throw new Error('Ви вже є учасником групи');

    const group = await prisma.groupReferral.findUnique({ where: { code } });
    if (!group) throw new Error('Групу не знайдено');
    if (group.currentMembers >= group.maxMembers) throw new Error('Група вже заповнена');
    if (new Date() > group.expiresAt) throw new Error('Термін дії коду минув');

    await prisma.$transaction([
      prisma.studentProfile.update({
        where: { id: profile.id },
        data: { groupId: group.id }
      }),
      prisma.groupReferral.update({
        where: { id: group.id },
        data: { currentMembers: group.currentMembers + 1 }
      })
    ]);

    return prisma.groupReferral.findUnique({
      where: { id: group.id },
      include: { members: { include: { user: true } } }
    });
  }

  static async submitComplaint(userId: string, accusedId: string, content: string, evidenceUrl?: string) {
    const accuser = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!accuser) throw new Error('Профіль не знайдено');
    if (!accuser.roomId) throw new Error('Ви не поселені в кімнату');

    const neighbor = await prisma.studentProfile.findFirst({
      where: { id: accusedId, roomId: accuser.roomId }
    });
    if (!neighbor) throw new Error('Можна подати скаргу лише на сусіда по кімнаті');

    return prisma.complaint.create({
      data: {
        accuserId: accuser.id,
        accusedId,
        content,
        evidenceUrl,
        status: 'PENDING'
      }
    });
  }

  static async getComplaints(userId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) return [];

    return prisma.complaint.findMany({
      where: { accuserId: profile.id },
      include: { accused: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async submitRepairRequest(userId: string, description: string, masterId?: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Профіль не знайдено');
    if (!profile.roomId) throw new Error('Ви не поселені в кімнату');

    return prisma.repairRequest.create({
      data: {
        roomId: profile.roomId,
        description,
        status: 'PENDING',
        masterId: masterId || null
      }
    });
  }

  static async getRepairRequests(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    if (user.role.startsWith('MASTER_')) {
      return prisma.repairRequest.findMany({
        where: { masterId: user.id },
        include: { room: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile || !profile.roomId) return [];

    return prisma.repairRequest.findMany({
      where: { roomId: profile.roomId },
      include: { master: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getNeighbors(userId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile || !profile.roomId) return [];

    return prisma.studentProfile.findMany({
      where: { 
        roomId: profile.roomId,
        id: { not: profile.id } 
      },
      select: { id: true, fullName: true, course: true, faculty: true }
    });
  }

  static async getMasters() {
    return prisma.user.findMany({
      where: {
        role: {
          in: ['MASTER_SLESAR', 'MASTER_SANTEKHNIK', 'MASTER_ELECTRIC']
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });
  }

  static async getJars(userId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile || !profile.dormitoryId) return [];

    return prisma.jar.findMany({
      where: { dormitoryId: profile.dormitoryId },
      include: {
        transactions: {
          include: { student: { select: { fullName: true } } },
          orderBy: { amount: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async donateToJar(userId: string, jarId: string, amount: number, comment?: string) {
    if (amount <= 0) throw new Error('Сума має бути більше 0');
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile || !profile.dormitoryId) throw new Error('Профіль не знайдено або ви не поселені');

    const jar = await prisma.jar.findFirst({ where: { id: jarId, dormitoryId: profile.dormitoryId } });
    if (!jar) throw new Error('Банку не знайдено у вашому гуртожитку');

    await prisma.$transaction([
      prisma.jarTransaction.create({
        data: {
          jarId,
          studentId: profile.id,
          amount,
          comment
        }
      }),
      prisma.jar.update({
        where: { id: jarId },
        data: { currentAmount: { increment: amount } }
      })
    ]);

    return { success: true };
  }

  static async getPayments(userId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) return [];

    // Auto-update OVERDUE status
    await prisma.payment.updateMany({
      where: { 
        studentId: profile.id, 
        status: 'PENDING', 
        dueDate: { lt: new Date() } 
      },
      data: { status: 'OVERDUE' }
    });

    return prisma.payment.findMany({
      where: { studentId: profile.id },
      orderBy: { dueDate: 'asc' }
    });
  }

  static async payPayment(userId: string, paymentId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Профіль не знайдено');

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, studentId: profile.id }
    });
    
    if (!payment) throw new Error('Платіж не знайдено або не належить вам');
    if (payment.status === 'PAID') throw new Error('Платіж вже оплачено');

    return prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'PAID', paidAt: new Date() }
    });
  }

  static async getNotifications(userId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) return [];

    return prisma.notification.findMany({
      where: { studentId: profile.id },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async markNotificationRead(userId: string, notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }
}
