import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class GroupService {
  static async createGroup(userId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) throw new AppError('Профіль студента не знайдено', 404);
    if (profile.groupId) throw new AppError('Ви вже є учасником групи', 409);

    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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
    const profile = await prisma.studentProfile.findUnique({ where: { userId }, include: { user: true } });
    if (!profile) throw new AppError('Профіль студента не знайдено', 404);
    if (profile.groupId) throw new AppError('Ви вже є учасником групи', 409);

    const group = await prisma.groupReferral.findUnique({ where: { code } });
    if (!group) throw new AppError('Групу не знайдено', 404);
    if (group.currentMembers >= group.maxMembers) throw new AppError('Група вже заповнена', 409);
    if (new Date() > group.expiresAt) throw new AppError('Термін дії коду минув', 400);

    const creatorProfile = await prisma.studentProfile.findUnique({ where: { id: group.creatorId }, include: { user: true } });
    if (creatorProfile && (creatorProfile.user as any).gender !== (profile.user as any).gender) {
      throw new AppError('До групи можуть приєднуватися лише студенти тієї ж статі', 400);
    }

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
}
