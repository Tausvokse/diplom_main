import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class ComplaintService {
  static async submitComplaint(userId: string, accusedId: string, content: string, evidenceUrl?: string) {
    const accuser = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!accuser) throw new AppError('Профіль не знайдено', 404);
    if (!accuser.roomId) throw new AppError('Ви не поселені в кімнату', 400);

    const neighbor = await prisma.studentProfile.findFirst({
      where: { id: accusedId, roomId: accuser.roomId }
    });
    if (!neighbor) throw new AppError('Можна подати скаргу лише на сусіда по кімнаті', 400);

    const complaint = await prisma.complaint.create({
      data: {
        accuserId: accuser.id,
        accusedId,
        content,
        evidenceUrl,
        status: 'PENDING'
      },
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

    const { emitToAdmins } = await import('../socket');
    emitToAdmins('new_complaint', complaint);

    return complaint;
  }

  static async getComplaints(userId: string) {
    const { Role } = await import('@prisma/client');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    // If admin, show all (with commandant filtering)
    if (user.role !== Role.STUDENT) {
      return prisma.complaint.findMany({
        where: user.role === Role.ADMIN_COMMANDANT && user.dormitoryId
          ? {
              OR: [
                { accuser: { dormitoryId: user.dormitoryId } },
                { accused: { dormitoryId: user.dormitoryId } }
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

    // If student, show only theirs
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) return [];

    return prisma.complaint.findMany({
      where: { accuserId: profile.id },
      include: { accused: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async updateComplaintStatus(adminUserId: string, complaintId: string, status: any) {
    const { Role } = await import('@prisma/client');
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    const { AppError } = await import('../utils/AppError');
    if (!admin) {
      throw new AppError('Адміністратора не знайдено', 404);
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { accuser: { include: { user: true } }, accused: true }
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

    const { emitToUser } = await import('../socket');
    emitToUser(complaint.accuser.userId, 'complaint_status_updated', updated);

    return updated;
  }
}
