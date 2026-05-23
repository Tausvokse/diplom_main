import { prisma } from '../lib/prisma';

export class StudentProfileService {
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
}
