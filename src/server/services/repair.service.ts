import { RepairStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class RepairService {
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
}
