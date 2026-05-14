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
}
