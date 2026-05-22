import {
  ApplicationStatus,
  ApplicationType,
  ComplaintStatus,
  NotificationType,
  PaymentStatus,
  RepairStatus,
  Role,
  type Room,
  type StudentProfile,
  type User
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';
import { AhpAlgorithm, AhpStudent, DEFAULT_CRITERIA_MATRIX } from './utils/algorithms/ahp.util';
import { KMeansAlgorithm, KmeansStudent, ClusteringVector } from './utils/algorithms/kmeans.util';
import { getOccupancyStatus } from './utils/occupancy';

const ADMIN_PASSWORD = 'admin123';
const STUDENT_PASSWORD = 'student123';

type CreatedStudent = StudentProfile & { user: User };

type StudentSeed = {
  key: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  studentIdNumber: string;
  course: number;
  faculty: string;
  vector: ClusteringVector;
  roomKey?: string;
  privilegeCategoryId?: string;
  rating?: number;
  isVerifiedByDiia?: boolean;
};

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const requireMapValue = <T>(map: Map<string, T>, key: string): T => {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Seed reference not found: ${key}`);
  }
  return value;
};

async function clearDatabase() {
  await prisma.jarTransaction.deleteMany();
  await prisma.jar.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.repairRequest.deleteMany();
  await prisma.message.deleteMany();
  await prisma.roomAllocation.deleteMany();
  await prisma.application.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.dormitory.deleteMany();
  await prisma.university.deleteMany();
  await prisma.privilegeCategory.deleteMany();
  await prisma.groupReferral.deleteMany();
}

async function createUser(
  password: string,
  email: string,
  role: Role,
  firstName: string,
  lastName: string,
  dormitoryId?: string
) {
  return prisma.user.create({
    data: {
      email,
      password,
      role,
      firstName,
      lastName,
      dormitoryId
    }
  });
}

async function createApplication(
  student: CreatedStudent,
  type: ApplicationType,
  status: ApplicationStatus,
  submittedDaysAgo: number,
  rejectionReason?: string
) {
  const reviewedAt = status === ApplicationStatus.APPROVED || status === ApplicationStatus.REJECTED
    ? daysFromNow(Math.min(-1, -submittedDaysAgo + 2))
    : null;

  return prisma.application.create({
    data: {
      studentId: student.id,
      type,
      status,
      scanDocumentsUrl: `/uploads/demo/${student.studentIdNumber}-passport.pdf,/uploads/demo/${student.studentIdNumber}-diia.pdf`,
      rejectionReason,
      submittedAt: daysFromNow(-submittedDaysAgo),
      reviewedAt
    }
  });
}

async function syncOccupancy() {
  const rooms = await prisma.room.findMany({
    include: { floor: { select: { dormitoryId: true } } }
  });

  for (const room of rooms) {
    const activeCount = await prisma.roomAllocation.count({
      where: { roomId: room.id, status: 'ACTIVE' }
    });
    const status = room.status === 'MAINTENANCE'
      ? 'MAINTENANCE'
      : activeCount >= room.capacity
        ? 'FULL'
        : 'AVAILABLE';

    await prisma.room.update({
      where: { id: room.id },
      data: {
        currentOccupancy: activeCount,
        status
      }
    });
  }

  const dormitories = await prisma.dormitory.findMany({
    include: { floors: { include: { rooms: true } } }
  });

  for (const dormitory of dormitories) {
    const totalCapacity = dormitory.floors.reduce(
      (sum, floor) => sum + floor.rooms.reduce((roomSum, room) => roomSum + room.capacity, 0),
      0
    );
    const currentOccupancy = dormitory.floors.reduce(
      (sum, floor) => sum + floor.rooms.reduce((roomSum, room) => roomSum + room.currentOccupancy, 0),
      0
    );

    await prisma.dormitory.update({
      where: { id: dormitory.id },
      data: {
        totalCapacity,
        currentOccupancy,
        occupancyStatus: getOccupancyStatus(currentOccupancy, totalCapacity)
      }
    });
  }
}

async function recalculatePriorityScores() {
  const applicants = await prisma.studentProfile.findMany({
    where: {
      applications: {
        some: {
          type: { in: [ApplicationType.CHECK_IN, ApplicationType.TRANSFER] }
        }
      }
    },
    include: { privilege: true }
  });

  const ahpInput: AhpStudent[] = applicants.map(student => ({
    id: student.id,
    course: student.course,
    privilegeMultiplier: student.privilege?.multiplier || 1,
    baseScore: Math.round(70 + student.rating * 6)
  }));

  const scores = AhpAlgorithm.calculatePriorityScores(ahpInput, DEFAULT_CRITERIA_MATRIX);
  for (const score of scores) {
    await prisma.studentProfile.update({
      where: { id: score.id },
      data: { priorityScore: score.priorityScore || 0 }
    });
  }
}

async function clusterStudents() {
  const profiles = await prisma.studentProfile.findMany({
    select: { id: true, clusteringVector: true, groupId: true }
  });

  const input: KmeansStudent[] = profiles.map(profile => {
    const vector = profile.clusteringVector
      ? JSON.parse(profile.clusteringVector) as ClusteringVector
      : { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 };

    return {
      id: profile.id,
      vector,
      groupId: profile.groupId
    };
  });

  const clusters = KMeansAlgorithm.clusterize(input, Math.min(5, input.length));
  for (let clusterId = 0; clusterId < clusters.length; clusterId++) {
    const cluster = clusters[clusterId];
    for (const student of cluster.students) {
      await prisma.studentProfile.update({
        where: { id: student.id },
        data: {
          clusterId,
          clusterMetadata: {
            centroid: cluster.centroid,
            size: cluster.students.length
          }
        }
      });
    }
  }
}

async function main() {
  console.log('Clearing database...');
  await clearDatabase();

  const [adminPassword, studentPassword] = await Promise.all([
    bcrypt.hash(ADMIN_PASSWORD, 10),
    bcrypt.hash(STUDENT_PASSWORD, 10)
  ]);

  console.log('Seeding reference data...');
  const privileges = await Promise.all([
    prisma.privilegeCategory.create({
      data: {
        id: 'priv_orphan',
        name: 'Дитина-сирота',
        multiplier: 2,
        description: 'Першочергове поселення для дітей-сиріт та дітей, позбавлених батьківського піклування'
      }
    }),
    prisma.privilegeCategory.create({
      data: {
        id: 'priv_disability',
        name: 'Особа з інвалідністю',
        multiplier: 1.6,
        description: 'Пріоритет для студентів з інвалідністю I або II групи'
      }
    }),
    prisma.privilegeCategory.create({
      data: {
        id: 'priv_combat',
        name: 'Дитина учасника бойових дій',
        multiplier: 1.8,
        description: 'Пільга для учасників бойових дій та членів їхніх сімей'
      }
    }),
    prisma.privilegeCategory.create({
      data: {
        id: 'priv_idp',
        name: 'Внутрішньо переміщена особа',
        multiplier: 1.4,
        description: 'Пільга для студентів зі статусом ВПО'
      }
    })
  ]);

  const privilegeIds = Object.fromEntries(privileges.map(privilege => [privilege.id, privilege.id]));

  const university = await prisma.university.create({
    data: {
      name: 'Київський авіаційний інститут (КАІ)',
      city: 'Київ'
    }
  });

  console.log('Seeding dormitory structure...');
  const roomsByKey = new Map<string, Room>();
  const roomDormitoryByKey = new Map<string, string>();
  const dormitoriesByCode = new Map<string, string>();
  const maintenanceRooms = new Set(['1-102', '6-206', '8-305']);
  
  const dormSpecs = [
    { code: '1', name: 'Гуртожиток №1', address: 'вул. Ніжинська, 12', floors: 5, roomsPerFloor: 15 },
    { code: '3', name: 'Гуртожиток №3', address: 'вул. Гарматна, 51', floors: 5, roomsPerFloor: 15 },
    { code: '4', name: 'Гуртожиток №4', address: 'вул. Гарматна, 53', floors: 5, roomsPerFloor: 15 },
    { code: '5', name: 'Гуртожиток №5', address: 'вул. Борщагівська, 193', floors: 5, roomsPerFloor: 15 },
    { code: '6', name: 'Гуртожиток №6', address: 'вул. Ніжинська, 14', floors: 5, roomsPerFloor: 35 },
    { code: '7', name: 'Гуртожиток №7', address: 'вул. Ніжинська, 29-А', floors: 9, roomsPerFloor: 25 },
    { code: '8', name: 'Гуртожиток №8', address: 'вул. Ніжинська, 29-Б', floors: 9, roomsPerFloor: 28 },
    { code: '9', name: 'Гуртожиток №9', address: 'вул. Ніжинська, 29-В', floors: 5, roomsPerFloor: 20 },
    { code: '10', name: 'Гуртожиток №10', address: 'вул. Миколи Голего, 7-А', floors: 5, roomsPerFloor: 20 },
    { code: '11', name: 'Гуртожиток №11', address: 'вул. Ніжинська, 29-Д', floors: 5, roomsPerFloor: 20 },
    { code: '13', name: 'Гуртожиток №13', address: 'вул. Ніжинська, 29', floors: 5, roomsPerFloor: 20 }
  ];

  for (const dormSpec of dormSpecs) {
    const dormitory = await prisma.dormitory.create({
      data: {
        name: dormSpec.name,
        address: dormSpec.address,
        universityId: university.id,
        totalCapacity: 0,
        currentOccupancy: 0
      }
    });
    dormitoriesByCode.set(dormSpec.code, dormitory.id);

    for (let floorNumber = 1; floorNumber <= dormSpec.floors; floorNumber++) {
      const floor = await prisma.floor.create({
        data: {
          dormitoryId: dormitory.id,
          floorNumber
        }
      });

      for (let roomIndex = 1; roomIndex <= dormSpec.roomsPerFloor; roomIndex++) {
        const roomNumber = `${floorNumber}${roomIndex.toString().padStart(2, '0')}`;
        const key = `${dormSpec.code}-${roomNumber}`;
        const capacity = Math.floor(Math.random() * 3) + 2; // 2 to 4
        const room = await prisma.room.create({
          data: {
            floorId: floor.id,
            roomNumber,
            capacity,
            currentOccupancy: 0,
            status: maintenanceRooms.has(key) ? 'MAINTENANCE' : 'AVAILABLE'
          }
        });
        roomsByKey.set(key, room);
        roomDormitoryByKey.set(key, dormitory.id);
      }
    }
  }

  console.log('Seeding users and roles...');
  const campusAdmin = await createUser(adminPassword, 'campus@kai.edu.ua', Role.ADMIN_CAMPUS, 'Василь', 'Директор');
  const systemAdmin = await createUser(adminPassword, 'admin@kai.edu.ua', Role.ADMIN, 'Олена', 'Адміністратор');
  const commandant10 = await createUser(adminPassword, 'dorm10@kai.edu.ua', Role.ADMIN_COMMANDANT, 'Ганна', 'Комендант', requireMapValue(dormitoriesByCode, '10'));
  const commandant11 = await createUser(adminPassword, 'dorm11@kai.edu.ua', Role.ADMIN_COMMANDANT, 'Ірина', 'Комендант', requireMapValue(dormitoriesByCode, '11'));
  await createUser(adminPassword, 'dorm8@kai.edu.ua', Role.ADMIN_COMMANDANT, 'Микола', 'Комендант', requireMapValue(dormitoriesByCode, '8'));
  const locksmith = await createUser(adminPassword, 'slesar@kai.edu.ua', Role.MASTER_SLESAR, 'Іван', 'Слюсар');
  const plumber = await createUser(adminPassword, 'santeh@kai.edu.ua', Role.MASTER_SANTEKHNIK, 'Петро', 'Сантехнік');
  const electrician = await createUser(adminPassword, 'electro@kai.edu.ua', Role.MASTER_ELECTRIC, 'Олег', 'Електрик');

  console.log('Seeding students, residents and allocation pool...');
  const students = new Map<string, CreatedStudent>();
  const createStudent = async (seed: StudentSeed): Promise<CreatedStudent> => {
    const room = seed.roomKey ? requireMapValue(roomsByKey, seed.roomKey) : null;
    const dormitoryId = seed.roomKey ? requireMapValue(roomDormitoryByKey, seed.roomKey) : null;
    const user = await createUser(studentPassword, seed.email, Role.STUDENT, seed.firstName, seed.lastName);
    const profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        fullName: `${seed.lastName} ${seed.firstName}`,
        email: seed.email,
        phone: seed.phone,
        dormitoryId,
        roomId: room?.id || null,
        studentIdNumber: seed.studentIdNumber,
        course: seed.course,
        faculty: seed.faculty,
        privilegeCategoryId: seed.privilegeCategoryId || null,
        isVerifiedByDiia: seed.isVerifiedByDiia ?? true,
        rating: seed.rating ?? 5,
        clusteringVector: JSON.stringify(seed.vector)
      }
    });

    if (room) {
      await prisma.roomAllocation.create({
        data: {
          roomId: room.id,
          studentId: profile.id,
          allocatedAt: daysFromNow(-90),
          status: 'ACTIVE'
        }
      });
    }

    const created = { ...profile, user };
    students.set(seed.key, created);
    return created;
  };

  const studentSeeds: StudentSeed[] = [
    { key: 'ivan', email: 'ivan.melnyk@kai.edu.ua', firstName: 'Іван', lastName: 'Мельник', phone: '+380501110001', studentIdNumber: 'KB-240001', course: 2, faculty: 'ФКНТ', roomKey: '10-101', vector: { chronotype: 3, sociability: 4, noiseTolerance: 2, cleanliness: 8 } },
    { key: 'petro', email: 'petro.kovalenko@kai.edu.ua', firstName: 'Петро', lastName: 'Коваленко', phone: '+380501110002', studentIdNumber: 'KB-240002', course: 2, faculty: 'ФКНТ', roomKey: '10-101', rating: 4.3, vector: { chronotype: 4, sociability: 5, noiseTolerance: 3, cleanliness: 6 } },
    { key: 'mariia', email: 'mariia.shevchenko@kai.edu.ua', firstName: 'Марія', lastName: 'Шевченко', phone: '+380501110003', studentIdNumber: 'KB-240003', course: 1, faculty: 'ФАЕТ', roomKey: '10-102', privilegeCategoryId: privilegeIds.priv_idp, vector: { chronotype: 8, sociability: 7, noiseTolerance: 6, cleanliness: 7 } },
    { key: 'anastasiia', email: 'anastasiia.bondar@kai.edu.ua', firstName: 'Анастасія', lastName: 'Бондар', phone: '+380501110004', studentIdNumber: 'KB-240004', course: 1, faculty: 'ФАЕТ', roomKey: '10-102', vector: { chronotype: 9, sociability: 8, noiseTolerance: 7, cleanliness: 8 } },
    { key: 'bohdan', email: 'bohdan.kravchenko@kai.edu.ua', firstName: 'Богдан', lastName: 'Кравченко', phone: '+380501110005', studentIdNumber: 'KB-240005', course: 3, faculty: 'ФТЛ', roomKey: '10-102', vector: { chronotype: 7, sociability: 6, noiseTolerance: 7, cleanliness: 6 } },
    { key: 'dmytro', email: 'dmytro.tkachenko@kai.edu.ua', firstName: 'Дмитро', lastName: 'Ткаченко', phone: '+380501110006', studentIdNumber: 'KB-240006', course: 4, faculty: 'ФПМВ', roomKey: '10-103', vector: { chronotype: 2, sociability: 3, noiseTolerance: 2, cleanliness: 9 } },
    { key: 'solomiia', email: 'solomiia.havryliuk@kai.edu.ua', firstName: 'Соломія', lastName: 'Гаврилюк', phone: '+380501110007', studentIdNumber: 'KB-240007', course: 4, faculty: 'ФПМВ', roomKey: '10-103', vector: { chronotype: 2, sociability: 4, noiseTolerance: 3, cleanliness: 8 } },
    { key: 'serhii', email: 'serhii.savchenko@kai.edu.ua', firstName: 'Сергій', lastName: 'Савченко', phone: '+380501110008', studentIdNumber: 'KB-240008', course: 2, faculty: 'АКФ', roomKey: '10-104', vector: { chronotype: 5, sociability: 6, noiseTolerance: 5, cleanliness: 5 } },
    { key: 'olena', email: 'olena.moroz@kai.edu.ua', firstName: 'Олена', lastName: 'Мороз', phone: '+380501110009', studentIdNumber: 'KB-240009', course: 1, faculty: 'ФАБД', roomKey: '11-101', vector: { chronotype: 6, sociability: 7, noiseTolerance: 5, cleanliness: 9 } },
    { key: 'andrii', email: 'andrii.ryabokon@kai.edu.ua', firstName: 'Андрій', lastName: 'Рябоконь', phone: '+380501110010', studentIdNumber: 'KB-240010', course: 1, faculty: 'ФАБД', roomKey: '11-101', vector: { chronotype: 6, sociability: 6, noiseTolerance: 5, cleanliness: 8 } },
    { key: 'maksym', email: 'maksym.lysenko@kai.edu.ua', firstName: 'Максим', lastName: 'Лисенко', phone: '+380501110011', studentIdNumber: 'KB-240011', course: 3, faculty: 'ФМФМ', roomKey: '11-102', vector: { chronotype: 8, sociability: 4, noiseTolerance: 4, cleanliness: 6 } },
    { key: 'anna', email: 'anna.oliinyk@kai.edu.ua', firstName: 'Анна', lastName: 'Олійник', phone: '+380501110012', studentIdNumber: 'KB-240012', course: 3, faculty: 'ФМФМ', roomKey: '11-102', vector: { chronotype: 7, sociability: 5, noiseTolerance: 4, cleanliness: 7 } },
    { key: 'oleksandr', email: 'oleksandr.boiko@kai.edu.ua', firstName: 'Олександр', lastName: 'Бойко', phone: '+380501110013', studentIdNumber: 'KB-240013', course: 5, faculty: 'АКФ', roomKey: '11-102', vector: { chronotype: 5, sociability: 5, noiseTolerance: 6, cleanliness: 5 } },
    { key: 'kateryna', email: 'kateryna.marchenko@kai.edu.ua', firstName: 'Катерина', lastName: 'Марченко', phone: '+380501110014', studentIdNumber: 'KB-240014', course: 2, faculty: 'ГМФ', roomKey: '8-101', vector: { chronotype: 3, sociability: 8, noiseTolerance: 7, cleanliness: 4 } },
    { key: 'taras', email: 'taras.sydorenko@kai.edu.ua', firstName: 'Тарас', lastName: 'Сидоренко', phone: '+380501110015', studentIdNumber: 'KB-240015', course: 2, faculty: 'ГМФ', roomKey: '8-101', vector: { chronotype: 4, sociability: 7, noiseTolerance: 7, cleanliness: 5 } },
    { key: 'viktoriia', email: 'viktoriia.chumak@kai.edu.ua', firstName: 'Вікторія', lastName: 'Чумак', phone: '+380501110016', studentIdNumber: 'KB-240016', course: 1, faculty: 'ФНЗ', roomKey: '8-103', vector: { chronotype: 9, sociability: 9, noiseTolerance: 8, cleanliness: 6 } },
    { key: 'yurii', email: 'yurii.pavlenko@kai.edu.ua', firstName: 'Юрій', lastName: 'Павленко', phone: '+380501110017', studentIdNumber: 'KB-240017', course: 4, faculty: 'АКФ', roomKey: '8-103', vector: { chronotype: 8, sociability: 8, noiseTolerance: 8, cleanliness: 5 } },
    { key: 'nadiia', email: 'nadiia.kozak@kai.edu.ua', firstName: 'Надія', lastName: 'Козак', phone: '+380501110018', studentIdNumber: 'KB-240018', course: 1, faculty: 'ФКНТ', privilegeCategoryId: privilegeIds.priv_orphan, vector: { chronotype: 2, sociability: 3, noiseTolerance: 2, cleanliness: 9 } },
    { key: 'mykhailo', email: 'mykhailo.hrytsenko@kai.edu.ua', firstName: 'Михайло', lastName: 'Гриценко', phone: '+380501110019', studentIdNumber: 'KB-240019', course: 1, faculty: 'ФАЕТ', vector: { chronotype: 7, sociability: 7, noiseTolerance: 6, cleanliness: 7 } },
    { key: 'alina', email: 'alina.polishchuk@kai.edu.ua', firstName: 'Аліна', lastName: 'Поліщук', phone: '+380501110020', studentIdNumber: 'KB-240020', course: 2, faculty: 'ФТЛ', vector: { chronotype: 8, sociability: 8, noiseTolerance: 7, cleanliness: 8 } },
    { key: 'yevhen', email: 'yevhen.nazarenko@kai.edu.ua', firstName: 'Євген', lastName: 'Назаренко', phone: '+380501110021', studentIdNumber: 'KB-240021', course: 2, faculty: 'ФТЛ', vector: { chronotype: 8, sociability: 7, noiseTolerance: 7, cleanliness: 7 } },
    { key: 'dariia', email: 'dariia.kovalchuk@kai.edu.ua', firstName: 'Дарія', lastName: 'Ковальчук', phone: '+380501110022', studentIdNumber: 'KB-240022', course: 3, faculty: 'ФПМВ', privilegeCategoryId: privilegeIds.priv_disability, vector: { chronotype: 4, sociability: 4, noiseTolerance: 3, cleanliness: 9 } },
    { key: 'tetiana', email: 'tetiana.ivanchuk@kai.edu.ua', firstName: 'Тетяна', lastName: 'Іванчук', phone: '+380501110023', studentIdNumber: 'KB-240023', course: 1, faculty: 'ФНЗ', privilegeCategoryId: privilegeIds.priv_combat, vector: { chronotype: 8, sociability: 8, noiseTolerance: 6, cleanliness: 8 } },
    { key: 'roman', email: 'roman.klymenko@kai.edu.ua', firstName: 'Роман', lastName: 'Клименко', phone: '+380501110024', studentIdNumber: 'KB-240024', course: 1, faculty: 'АКФ', isVerifiedByDiia: false, vector: { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 } },
    { key: 'oksana', email: 'oksana.tkach@kai.edu.ua', firstName: 'Оксана', lastName: 'Ткач', phone: '+380501110025', studentIdNumber: 'KB-240025', course: 2, faculty: 'ФАБД', vector: { chronotype: 6, sociability: 5, noiseTolerance: 4, cleanliness: 7 } },
    { key: 'denys', email: 'denys.zakharchenko@kai.edu.ua', firstName: 'Денис', lastName: 'Захарченко', phone: '+380501110026', studentIdNumber: 'KB-240026', course: 4, faculty: 'ФКНТ', vector: { chronotype: 3, sociability: 3, noiseTolerance: 2, cleanliness: 6 } },
    { key: 'liliia', email: 'liliia.honchar@kai.edu.ua', firstName: 'Лілія', lastName: 'Гончар', phone: '+380501110027', studentIdNumber: 'KB-240027', course: 1, faculty: 'ГМФ', vector: { chronotype: 7, sociability: 6, noiseTolerance: 6, cleanliness: 6 } },
    { key: 'nataliia', email: 'nataliia.kushnir@kai.edu.ua', firstName: 'Наталія', lastName: 'Кушнір', phone: '+380501110028', studentIdNumber: 'KB-240028', course: 5, faculty: 'ФМФМ', vector: { chronotype: 5, sociability: 4, noiseTolerance: 5, cleanliness: 7 } }
  ];

  for (const seed of studentSeeds) {
    await createStudent(seed);
  }

  console.log('Mass generating students to ~60% capacity...');
  const firstNames = ['Андрій', 'Богдан', 'Василь', 'Григорій', 'Дмитро', 'Олександр', 'Максим', 'Роман', 'Сергій', 'Віктор', 'Олексій', 'Микола', 'Тарас', 'Юрій', 'Артем', 'Анна', 'Марія', 'Олена', 'Вікторія', 'Дарія', 'Катерина', 'Ірина', 'Наталія', 'Оксана', 'Тетяна', 'Софія', 'Аліна', 'Юлія', 'Анастасія'];
  const lastNames = ['Коваленко', 'Кравченко', 'Ткаченко', 'Мельник', 'Шевченко', 'Бондаренко', 'Ковальчук', 'Бойко', 'Олійник', 'Мороз', 'Савченко', 'Лисенко', 'Руденко', 'Марченко', 'Гриценко', 'Сидоренко', 'Павленко', 'Коваль', 'Гончаренко', 'Поліщук'];
  const faculties = ['АКФ', 'ГМФ', 'ФАЕТ', 'ФАБД', 'ФНЗ', 'ФМФМ', 'ФКНТ', 'ФТЛ', 'ФПМВ'];
  
  let massGeneratedCount = 0;
  // Doing it in chunks to not overwhelm the database
  const massStudentsToCreate: StudentSeed[] = [];

  for (const [key, room] of roomsByKey.entries()) {
    if (room.status === 'MAINTENANCE') continue;

    // Fill each room to roughly 60% of its capacity, randomly picking
    const targetOccupancy = Math.floor(room.capacity * 0.6);
    // Randomize slightly so not every room is exactly 60%
    const actualOccupancy = Math.max(0, targetOccupancy + Math.floor(Math.random() * 3) - 1); 

    for (let i = 0; i < Math.min(room.capacity, actualOccupancy); i++) {
      const isMale = Math.random() > 0.5;
      const firstName = firstNames[Math.floor(Math.random() * (isMale ? 15 : 14) + (isMale ? 0 : 15))];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const faculty = faculties[Math.floor(Math.random() * faculties.length)];
      const studentIdNumber = `KB-${(300000 + massGeneratedCount).toString().padStart(6, '0')}`;
      const email = `s${studentIdNumber.toLowerCase().replace('-', '')}@kai.edu.ua`;
      const vector: ClusteringVector = {
        chronotype: Math.floor(Math.random() * 10) + 1,
        sociability: Math.floor(Math.random() * 10) + 1,
        noiseTolerance: Math.floor(Math.random() * 10) + 1,
        cleanliness: Math.floor(Math.random() * 10) + 1
      };

      massStudentsToCreate.push({
        key: `mass_${massGeneratedCount}`,
        email,
        firstName,
        lastName,
        phone: `+380${Math.floor(500000000 + Math.random() * 499999999)}`,
        studentIdNumber,
        course: Math.floor(Math.random() * 4) + 1,
        faculty,
        vector,
        roomKey: key,
        rating: Math.floor(Math.random() * 20) / 10 + 3 // 3.0 to 5.0
      });
      massGeneratedCount++;
    }
  }

  // Insert sequentially to avoid pool exhaustion
  for (let i = 0; i < massStudentsToCreate.length; i++) {
    const seed = massStudentsToCreate[i];
    const createdStd = await createStudent(seed);
    
    // Add random applications to about 2% of the mass generated students to populate the review queue
    if (Math.random() < 0.02) {
      await createApplication(
        createdStd,
        ApplicationType.CHECK_IN,
        ApplicationStatus.SUBMITTED,
        Math.floor(Math.random() * 5) + 1
      );
    }
  }
  console.log(`Generated ${massGeneratedCount} additional students with random applications.`);

  const referral = await prisma.groupReferral.create({
    data: {
      code: 'KAI2026',
      creatorId: requireMapValue(students, 'alina').id,
      maxMembers: 4,
      currentMembers: 3,
      expiresAt: daysFromNow(14)
    }
  });
  await prisma.studentProfile.updateMany({
    where: {
      id: {
        in: [
          requireMapValue(students, 'alina').id,
          requireMapValue(students, 'yevhen').id,
          requireMapValue(students, 'tetiana').id
        ]
      }
    },
    data: { groupId: referral.id }
  });

  await prisma.roomAllocation.create({
    data: {
      roomId: requireMapValue(roomsByKey, '11-201').id,
      studentId: requireMapValue(students, 'dariia').id,
      allocatedAt: daysFromNow(-120),
      status: 'EVICTED'
    }
  });
  await prisma.roomAllocation.create({
    data: {
      roomId: requireMapValue(roomsByKey, '8-201').id,
      studentId: requireMapValue(students, 'nataliia').id,
      allocatedAt: daysFromNow(-210),
      status: 'EVICTED'
    }
  });

  console.log('Seeding application lifecycle...');
  await Promise.all([
    createApplication(requireMapValue(students, 'ivan'), ApplicationType.CHECK_IN, ApplicationStatus.APPROVED, 110),
    createApplication(requireMapValue(students, 'mariia'), ApplicationType.CHECK_IN, ApplicationStatus.APPROVED, 95),
    createApplication(requireMapValue(students, 'olena'), ApplicationType.CHECK_IN, ApplicationStatus.APPROVED, 80),
    createApplication(requireMapValue(students, 'nadiia'), ApplicationType.CHECK_IN, ApplicationStatus.APPROVED, 8),
    createApplication(requireMapValue(students, 'mykhailo'), ApplicationType.CHECK_IN, ApplicationStatus.APPROVED, 6),
    createApplication(requireMapValue(students, 'alina'), ApplicationType.CHECK_IN, ApplicationStatus.APPROVED, 5),
    createApplication(requireMapValue(students, 'yevhen'), ApplicationType.CHECK_IN, ApplicationStatus.APPROVED, 5),
    createApplication(requireMapValue(students, 'tetiana'), ApplicationType.CHECK_IN, ApplicationStatus.APPROVED, 4),
    createApplication(requireMapValue(students, 'dariia'), ApplicationType.TRANSFER, ApplicationStatus.APPROVED, 3),
    createApplication(requireMapValue(students, 'roman'), ApplicationType.CHECK_IN, ApplicationStatus.SUBMITTED, 1),
    createApplication(requireMapValue(students, 'oksana'), ApplicationType.CHECK_IN, ApplicationStatus.UNDER_REVIEW, 2),
    createApplication(requireMapValue(students, 'denys'), ApplicationType.CHECK_IN, ApplicationStatus.REJECTED, 10, 'Неякісна скан-копія документа. Завантажте чіткіший файл.'),
    createApplication(requireMapValue(students, 'liliia'), ApplicationType.CHECK_IN, ApplicationStatus.DRAFT, 0),
    createApplication(requireMapValue(students, 'bohdan'), ApplicationType.TRANSFER, ApplicationStatus.SUBMITTED, 1),
    createApplication(requireMapValue(students, 'nataliia'), ApplicationType.CHECK_OUT, ApplicationStatus.APPROVED, 15)
  ]);

  console.log('Calculating AHP and K-means demo data...');
  await recalculatePriorityScores();
  await clusterStudents();
  await syncOccupancy();

  console.log('Seeding complaints and repairs...');
  await Promise.all([
    prisma.complaint.create({
      data: {
        accuserId: requireMapValue(students, 'ivan').id,
        accusedId: requireMapValue(students, 'petro').id,
        content: 'Після 23:00 регулярно гучна музика в кімнаті.',
        evidenceUrl: '/uploads/demo/noise-evidence.jpg',
        status: ComplaintStatus.PENDING,
        createdAt: daysFromNow(-2)
      }
    }),
    prisma.complaint.create({
      data: {
        accuserId: requireMapValue(students, 'mariia').id,
        accusedId: requireMapValue(students, 'bohdan').id,
        content: 'Порушення графіка прибирання спільної зони.',
        status: ComplaintStatus.INVESTIGATING,
        createdAt: daysFromNow(-7)
      }
    }),
    prisma.complaint.create({
      data: {
        accuserId: requireMapValue(students, 'kateryna').id,
        accusedId: requireMapValue(students, 'taras').id,
        content: 'Скаргу вирішено після розмови з комендантом.',
        status: ComplaintStatus.RESOLVED,
        createdAt: daysFromNow(-20)
      }
    }),
    prisma.complaint.create({
      data: {
        accuserId: requireMapValue(students, 'maksym').id,
        accusedId: requireMapValue(students, 'anna').id,
        content: 'Недостатньо доказів для дисциплінарного рішення.',
        status: ComplaintStatus.DISMISSED,
        createdAt: daysFromNow(-12)
      }
    })
  ]);

  await Promise.all([
    prisma.repairRequest.create({
      data: {
        roomId: requireMapValue(roomsByKey, '10-101').id,
        masterId: locksmith.id,
        description: 'Заїдає замок у вхідних дверях.',
        status: RepairStatus.PENDING,
        createdAt: daysFromNow(-1)
      }
    }),
    prisma.repairRequest.create({
      data: {
        roomId: requireMapValue(roomsByKey, '6-206').id,
        masterId: plumber.id,
        description: 'Після аварії перекрили воду, кімната тимчасово на ремонті.',
        status: RepairStatus.IN_PROGRESS,
        createdAt: daysFromNow(-5)
      }
    }),
    prisma.repairRequest.create({
      data: {
        roomId: requireMapValue(roomsByKey, '11-102').id,
        masterId: electrician.id,
        description: 'Замінено розетку біля робочого столу.',
        status: RepairStatus.COMPLETED,
        createdAt: daysFromNow(-14)
      }
    }),
    prisma.repairRequest.create({
      data: {
        roomId: requireMapValue(roomsByKey, '8-103').id,
        description: 'Заявку скасовано, проблему вирішили самостійно.',
        status: RepairStatus.CANCELLED,
        createdAt: daysFromNow(-9)
      }
    })
  ]);

  console.log('Seeding payments, jars, notifications and messages...');
  await Promise.all([
    prisma.payment.create({
      data: {
        studentId: requireMapValue(students, 'ivan').id,
        amount: 950,
        status: PaymentStatus.PENDING,
        dueDate: daysFromNow(7),
        description: 'Оплата за проживання, травень'
      }
    }),
    prisma.payment.create({
      data: {
        studentId: requireMapValue(students, 'petro').id,
        amount: 950,
        status: PaymentStatus.OVERDUE,
        dueDate: daysFromNow(-12),
        description: 'Оплата за проживання, квітень'
      }
    }),
    prisma.payment.create({
      data: {
        studentId: requireMapValue(students, 'mariia').id,
        amount: 950,
        status: PaymentStatus.PAID,
        dueDate: daysFromNow(-20),
        paidAt: daysFromNow(-18),
        description: 'Оплата за проживання, квітень'
      }
    }),
    prisma.payment.create({
      data: {
        studentId: requireMapValue(students, 'nadiia').id,
        amount: 500,
        status: PaymentStatus.PENDING,
        dueDate: daysFromNow(14),
        description: 'Завдаток після поселення'
      }
    })
  ]);

  const sportsJar = await prisma.jar.create({
    data: {
      title: 'Спільний спортзал 10-го гуртожитку',
      description: 'Гантелі, килимки та ремонт тренажерної зони.',
      goalAmount: 12000,
      dormitoryId: requireMapValue(dormitoriesByCode, '10')
    }
  });
  const shelterJar = await prisma.jar.create({
    data: {
      title: 'Покращення укриття',
      description: 'Подовжувачі, питна вода, аптечки та додаткове освітлення.',
      goalAmount: 20000,
      dormitoryId: requireMapValue(dormitoriesByCode, '11')
    }
  });

  const donate = async (jarId: string, student: CreatedStudent, amount: number, comment: string) => {
    await prisma.jarTransaction.create({
      data: {
        jarId,
        studentId: student.id,
        amount,
        comment,
        createdAt: daysFromNow(-Math.max(1, Math.round(amount / 300)))
      }
    });
    await prisma.jar.update({
      where: { id: jarId },
      data: { currentAmount: { increment: amount } }
    });
  };

  await Promise.all([
    donate(sportsJar.id, requireMapValue(students, 'ivan'), 500, 'На новий інвентар'),
    donate(sportsJar.id, requireMapValue(students, 'mariia'), 750, 'Підтримую'),
    donate(sportsJar.id, requireMapValue(students, 'serhii'), 300, 'Для залу'),
    donate(shelterJar.id, requireMapValue(students, 'olena'), 1000, 'На аптечки'),
    donate(shelterJar.id, requireMapValue(students, 'maksym'), 450, 'На освітлення')
  ]);

  await Promise.all([
    prisma.notification.create({
      data: {
        studentId: requireMapValue(students, 'nadiia').id,
        title: 'Заявку схвалено',
        message: 'Вашу заявку на поселення схвалено. Очікуйте розподілу кімнати.',
        type: NotificationType.APPLICATION_UPDATE,
        isRead: false,
        createdAt: daysFromNow(-1)
      }
    }),
    prisma.notification.create({
      data: {
        studentId: requireMapValue(students, 'ivan').id,
        title: 'Нагадування про оплату',
        message: 'До сплати 950 грн за проживання. Термін оплати через 7 днів.',
        type: NotificationType.PAYMENT_REMINDER,
        isRead: false,
        createdAt: daysFromNow(-1)
      }
    }),
    prisma.notification.create({
      data: {
        studentId: requireMapValue(students, 'petro').id,
        title: 'Є прострочений платіж',
        message: 'Оплату за квітень прострочено. Зверніться до коменданта.',
        type: NotificationType.PAYMENT_REMINDER,
        isRead: false,
        createdAt: daysFromNow(-3)
      }
    }),
    prisma.notification.create({
      data: {
        studentId: requireMapValue(students, 'mariia').id,
        title: 'Оновлення ремонту',
        message: 'Заявку щодо розетки виконано майстром.',
        type: NotificationType.REPAIR_UPDATE,
        isRead: true,
        createdAt: daysFromNow(-10)
      }
    }),
    prisma.notification.create({
      data: {
        studentId: requireMapValue(students, 'ivan').id,
        title: 'Скаргу прийнято',
        message: 'Комендант отримав вашу скаргу та почав перевірку.',
        type: NotificationType.COMPLAINT_ALERT,
        isRead: true,
        createdAt: daysFromNow(-2)
      }
    }),
    prisma.notification.create({
      data: {
        studentId: requireMapValue(students, 'alina').id,
        title: 'Група співпоселення активна',
        message: 'Код KAI2026 діє ще 14 днів. У групі 3 з 4 учасників.',
        type: NotificationType.INFO,
        isRead: false,
        createdAt: daysFromNow(-1)
      }
    })
  ]);

  await Promise.all([
    prisma.message.create({
      data: {
        senderId: requireMapValue(students, 'ivan').user.id,
        receiverId: commandant10.id,
        content: 'Добрий день. Чи можна перевірити заявку на ремонт замка?',
        isRead: true,
        createdAt: daysFromNow(-2)
      }
    }),
    prisma.message.create({
      data: {
        senderId: commandant10.id,
        receiverId: requireMapValue(students, 'ivan').user.id,
        content: 'Так, заявку передано слюсарю. Очікуйте сьогодні після 16:00.',
        isRead: false,
        createdAt: daysFromNow(-1)
      }
    }),
    prisma.message.create({
      data: {
        senderId: campusAdmin.id,
        receiverId: commandant11.id,
        content: 'Перевірте, будь ласка, боржників по гуртожитку №11 до кінця тижня.',
        isRead: false,
        createdAt: daysFromNow(-1)
      }
    }),
    prisma.message.create({
      data: {
        senderId: systemAdmin.id,
        receiverId: electrician.id,
        content: 'Після завершення ремонту в 102 кімнаті оновіть статус заявки.',
        isRead: true,
        createdAt: daysFromNow(-4)
      }
    })
  ]);

  console.log('Demo database seeded successfully.');
  console.log('Admin logins: campus@kai.edu.ua / admin123, dorm10@kai.edu.ua / admin123, admin@kai.edu.ua / admin123');
  console.log('Student logins: ivan.melnyk@kai.edu.ua / student123, nadiia.kozak@kai.edu.ua / student123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
