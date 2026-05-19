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

    const activeApp = profile.applications.length > 0 ? profile.applications[profile.applications.length - 1] : null;
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
    // 1. Управління профілем студента
    let profile = await prisma.studentProfile.findUnique({ where: { userId } });
    
    // SQLite: Зберігаємо вектор як рядок
    const clusteringVectorString = typeof clusteringVectorRaw === 'string' 
      ? clusteringVectorRaw 
      : JSON.stringify(clusteringVectorRaw);

    const parsedPrivilegeId = (privilegeCategoryId === 'null' || privilegeCategoryId === 'undefined' || !privilegeCategoryId) ? null : privilegeCategoryId;

    if (!profile) {
      // Імітація номеру квитка для нового профілю
      const studentIdNumber = `KB-${Math.floor(100000 + Math.random() * 900000)}`;
      profile = await prisma.studentProfile.create({
        data: {
          userId,
          studentIdNumber,
          fullName: 'Невідомо', // Placeholder if not provided by Diia/registration
          email: 'unknown@example.com',
          phone: '+380000000000',
          course: Number(course),
          faculty,
          privilegeCategoryId: parsedPrivilegeId,
          clusteringVector: clusteringVectorString,
          isVerifiedByDiia: false // Відбувається через вебхук Дії
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

    // 2. Збереження документів (імітація завантаження в S3)
    const fileUrls = files.map(file => `/uploads/${file.filename}`);

    // 3. Створення заяви
    const application = await prisma.application.create({
      data: {
        studentId: profile.id,
        status: 'SUBMITTED',
        scanDocumentsUrl: fileUrls.join(','), // SQLite обмеження: масив через кому
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

  static async submitRepairRequest(userId: string, description: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Профіль не знайдено');
    if (!profile.roomId) throw new Error('Ви не поселені в кімнату');

    return prisma.repairRequest.create({
      data: {
        roomId: profile.roomId,
        description,
        status: 'PENDING'
      }
    });
  }

  static async getRepairRequests(userId: string) {
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
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error('Профіль не знайдено');

    const jar = await prisma.jar.findUnique({ where: { id: jarId } });
    if (!jar) throw new Error('Банку не знайдено');

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
    // Імітація оплати
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
