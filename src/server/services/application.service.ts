import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { StorageService } from './storage.service';

export class ApplicationService {
  static async getApplication(userId: string) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: { 
        applications: { include: { student: { include: { room: true } } } }, 
        group: { include: { members: { include: { user: true } } } },
        dormitory: { select: { id: true, name: true, address: true } },
        room: { select: { id: true, roomNumber: true } }
      }
    });

    if (!profile) return { application: null, group: null, profile: null };

    const activeApp = profile.applications.length > 0 
      ? profile.applications.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]
      : null;
      
    return { 
      application: activeApp, 
      group: profile.group,
      profile: {
        course: profile.course,
        faculty: profile.faculty,
        dormitory: profile.dormitory,
        room: profile.room
      }
    };
  }

  static async submitApplication(
    userId: string,
    course: number,
    faculty: string,
    privilegeCategoryId: string | null,
    clusteringVectorRaw: any,
    filesInput: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[] | undefined,
    type: string = 'CHECK_IN',
    previousRoom?: string,
    checkoutReason?: string
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
          phone: '+380000000000',
          course: Number(course),
          faculty: faculty || 'Unknown',
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
          course: course ? Number(course) : profile.course,
          faculty: faculty || profile.faculty,
          privilegeCategoryId: parsedPrivilegeId !== undefined ? parsedPrivilegeId : profile.privilegeCategoryId,
          clusteringVector: clusteringVectorString
        },
        include: { room: true }
      });
    }

    if (type === 'CHECK_OUT') {
      if (!profile.roomId) {
        throw new AppError('Ви повинні бути поселені для подачі заяви на виселення', 400);
      }
    } else if (type === 'CHECK_IN') {
      if (profile.roomId) {
        throw new AppError('Ви вже поселені в гуртожиток. Подача нової заяви на поселення неможлива.', 400);
      }
    }

    let allFiles: { file: Express.Multer.File, category: string }[] = [];
    if (filesInput) {
      if (Array.isArray(filesInput)) {
        allFiles = filesInput.map(f => ({ file: f, category: 'documents' }));
      } else {
        Object.entries(filesInput).forEach(([category, fileArray]) => {
          fileArray.forEach(file => {
            allFiles.push({ file, category });
          });
        });
      }
    }

    // Upload files to Supabase
    const fileUrls = await Promise.all(allFiles.map(async ({ file, category }) => {
      const folder = `applications/${profile!.id}/${category}`;
      return await StorageService.uploadFile(file, folder);
    }));

    const application = await prisma.application.create({
      data: {
        studentId: profile.id,
        type: type as any,
        status: 'SUBMITTED',
        scanDocumentsUrl: fileUrls.join(','),
        previousRoom,
        checkoutReason
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            privilege: true
          }
        }
      }
    });

    const { emitToAdmins } = await import('../socket');
    emitToAdmins('new_application', application);

    return application;
  }
}
