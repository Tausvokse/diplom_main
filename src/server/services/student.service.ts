import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RepairStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class StudentService {
  static async getApplication(userId: string) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: { 
        applications: { include: { student: { include: { room: true } } } }, 
        group: { include: { members: { include: { user: true } } } } 
      }
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
    files: Express.Multer.File[],
    type: string = 'CHECK_IN'
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Користувача не знайдено', 404);

    let profile = await prisma.studentProfile.findUnique({ where: { userId }, include: { room: true } });
    
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
        },
        include: { room: true }
      });
    } else {
      profile = await prisma.studentProfile.update({
        where: { id: profile.id },
        data: {
          course: Number(course),
          faculty,
          privilegeCategoryId: parsedPrivilegeId,
          clusteringVector: clusteringVectorString
        },
        include: { room: true }
      });
    }

    // Validation for TRANSFER and CHECK_OUT
    if (type === 'TRANSFER' || type === 'CHECK_OUT') {
      if (!profile.roomId) {
        throw new AppError('Ви повинні бути поселені для подачі заяви на переселення або виселення', 400);
      }
    }

    const fileUrls = files.map((file, index) => {
      const ext = path.extname(file.originalname) || '.png';
      const docName = file.originalname.split('.')[0].substring(0, 20).replace(/[^a-zA-Z0-9А-Яа-яІіЇїЄєҐґ-]/g, '_');
      const fullName = profile!.fullName.replace(/\s+/g, '_');
      const roomNum = profile!.room?.roomNumber || 'новий';
      const newFilename = `${fullName}-${roomNum}-${docName}${ext}`;
      const oldPath = file.path;
      const newPath = path.join(path.dirname(file.path), newFilename);
      
      // If a file with the same name already exists, append a timestamp
      let finalPath = newPath;
      let finalUrl = newFilename;
      if (fs.existsSync(newPath)) {
        const timestamp = Date.now();
        finalUrl = `${fullName}-${roomNum}-${docName}_${timestamp}${ext}`;
        finalPath = path.join(path.dirname(file.path), finalUrl);
      }

      try {
        fs.renameSync(oldPath, finalPath);
      } catch (e) {
        console.error('File rename error:', e);
        return `/uploads/${file.filename}`;
      }
      return `/uploads/${finalUrl}`;
    });

    const application = await prisma.application.create({
      data: {
        studentId: profile.id,
        type: type as any,
        status: 'SUBMITTED',
        scanDocumentsUrl: fileUrls.join(','),
      }
    });

    return application;
  }

  static async createGroup(userId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('Профіль студента не знайдено', 404);
    if (profile.groupId) throw new AppError('Ви вже є учасником групи', 409);

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
    if (!profile) throw new AppError('Профіль студента не знайдено', 404);
    if (profile.groupId) throw new AppError('Ви вже є учасником групи', 409);

    const group = await prisma.groupReferral.findUnique({ where: { code } });
    if (!group) throw new AppError('Групу не знайдено', 404);
    if (group.currentMembers >= group.maxMembers) throw new AppError('Група вже заповнена', 409);
    if (new Date() > group.expiresAt) throw new AppError('Термін дії коду минув', 400);

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
    if (!accuser) throw new AppError('Профіль не знайдено', 404);
    if (!accuser.roomId) throw new AppError('Ви не поселені в кімнату', 400);

    const neighbor = await prisma.studentProfile.findFirst({
      where: { id: accusedId, roomId: accuser.roomId }
    });
    if (!neighbor) throw new AppError('Можна подати скаргу лише на сусіда по кімнаті', 400);

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
    if (!profile) throw new AppError('Профіль не знайдено', 404);
    if (!profile.roomId) throw new AppError('Ви не поселені в кімнату', 400);

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
        include: {
          room: {
            include: {
              floor: { include: { dormitory: { select: { name: true, address: true } } } }
            }
          }
        },
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

  static async updateRepairStatus(userId: string, repairId: string, status: RepairStatus) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.role.startsWith('MASTER_')) {
      throw new AppError('Оновлювати ремонтні заявки може лише майстер', 403);
    }

    const repair = await prisma.repairRequest.findFirst({
      where: { id: repairId, masterId: user.id },
      include: { room: { include: { studentProfiles: { select: { id: true } } } } }
    });
    if (!repair) {
      throw new AppError('Заявку не знайдено або вона не призначена вам', 404);
    }

    const updated = await prisma.repairRequest.update({
      where: { id: repairId },
      data: { status },
      include: {
        room: {
          include: {
            floor: { include: { dormitory: { select: { name: true, address: true } } } }
          }
        }
      }
    });

    const { NotificationService } = await import('./notification.service');
    await Promise.all(repair.room.studentProfiles.map(student =>
      NotificationService.create(
        student.id,
        'Оновлено ремонтну заявку',
        `Заявку для кімнати ${repair.room.roomNumber} змінено на статус: ${status}.`,
        'REPAIR_UPDATE'
      )
    ));

    return updated;
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
    if (amount <= 0) throw new AppError('Сума має бути більше 0', 400);
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile || !profile.dormitoryId) throw new AppError('Профіль не знайдено або ви не поселені', 404);

    const jar = await prisma.jar.findFirst({ where: { id: jarId, dormitoryId: profile.dormitoryId } });
    if (!jar) throw new AppError('Банку не знайдено у вашому гуртожитку', 404);

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
    if (!profile) throw new AppError('Профіль не знайдено', 404);

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, studentId: profile.id }
    });
    
    if (!payment) throw new AppError('Платіж не знайдено або не належить вам', 404);
    if (payment.status === 'PAID') throw new AppError('Платіж вже оплачено', 409);

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

  static async markAllNotificationsRead(userId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) return;
    const { NotificationService } = await import('./notification.service');
    return NotificationService.markAllRead(profile.id);
  }
}
