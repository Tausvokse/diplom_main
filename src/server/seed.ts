import { PrismaClient, Role, Gender, ApplicationStatus, ApplicationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Production-Grade Seeding ---');

  // 1. Clean up
  await prisma.roomAllocation.deleteMany();
  await prisma.application.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.dormitory.deleteMany();
  await prisma.university.deleteMany();
  await prisma.privilegeCategory.deleteMany();

  // 2. Create University & Dormitories
  const uni = await prisma.university.create({
    data: { name: 'Київський Політехнічний Інститут', city: 'Київ' }
  });

  const dorm = await prisma.dormitory.create({
    data: {
      name: 'Гуртожиток №15',
      address: 'вул. Металістів, 5',
      universityId: uni.id,
      totalCapacity: 150
    }
  });

  const floors = [];
  for (let i = 1; i <= 5; i++) {
    const floor = await prisma.floor.create({
      data: { dormitoryId: dorm.id, floorNumber: i }
    });
    floors.push(floor);
  }

  // 3. Create Rooms (Mixed capacities)
  console.log('Generating 50 rooms...');
  for (const floor of floors) {
    for (let j = 1; j <= 10; j++) {
      await prisma.room.create({
        data: {
          floorId: floor.id,
          roomNumber: `${floor.floorNumber}${j.toString().padStart(2, '0')}`,
          capacity: Math.floor(Math.random() * 2) + 2, // 2-3 beds
          status: 'AVAILABLE'
        }
      });
    }
  }

  // 4. Create Privilege Categories
  const privileges = [
    { name: 'Сирота', multiplier: 1.5, description: 'Пріоритетне заселення' },
    { name: 'ВПО', multiplier: 1.3, description: 'Внутрішньо переміщені особи' },
    { name: 'Учасник бойових дій', multiplier: 1.4, description: 'Пільга для ветеранів' }
  ];

  for (const p of privileges) {
    await prisma.privilegeCategory.create({ data: p });
  }
  const privilegeList = await prisma.privilegeCategory.findMany();

  // 5. Create Students (Stress Test: 120 students)
  console.log('Generating 120 diverse students...');
  const faculties = ['ФІОТ', 'ІПСА', 'ФЕА', 'ТЕФ', 'РТФ'];
  const genders = [Gender.MALE, Gender.FEMALE];

  for (let i = 0; i < 120; i++) {
    const gender = genders[i % 2];
    const faculty = faculties[Math.floor(Math.random() * faculties.length)];
    
    const user = await prisma.user.create({
      data: {
        email: `student${i}@kpi.ua`,
        password: 'password123', // In real life hash this
        role: Role.STUDENT,
        gender: gender,
        firstName: gender === Gender.MALE ? `Олександр${i}` : `Марія${i}`,
        lastName: gender === Gender.MALE ? `Коваленко${i}` : `Шевченко${i}`,
      }
    });

    const vector = {
      chronotype: Math.floor(Math.random() * 10) + 1,
      sociability: Math.floor(Math.random() * 10) + 1,
      noiseTolerance: Math.floor(Math.random() * 10) + 1,
      cleanliness: Math.floor(Math.random() * 10) + 1
    };

    const hasPrivilege = Math.random() > 0.8;

    const student = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        fullName: `${user.lastName} ${user.firstName}`,
        email: user.email,
        phone: `+38067${Math.floor(1000000 + Math.random() * 9000000)}`,
        studentIdNumber: `KB${10000000 + i}`,
        course: Math.floor(Math.random() * 4) + 1,
        faculty: faculty,
        clusteringVector: JSON.stringify(vector),
        privilegeCategoryId: hasPrivilege ? privilegeList[Math.floor(Math.random() * privilegeList.length)].id : null,
        isVerifiedByDiia: true
      }
    });

    // Create approved application for each student
    await prisma.application.create({
      data: {
        studentId: student.id,
        type: ApplicationType.CHECK_IN,
        status: ApplicationStatus.APPROVED,
        scanDocumentsUrl: '/uploads/id_card.pdf',
        reviewedAt: new Date()
      }
    });
  }

  // 6. Create Admin
  await prisma.user.create({
    data: {
      email: 'admin@dorm.kpi.ua',
      password: 'admin-password',
      role: Role.ADMIN,
      gender: Gender.OTHER,
      firstName: 'Головний',
      lastName: 'Адміністратор'
    }
  });

  console.log('--- Seeding Complete: 120 Students, 50 Rooms, 1 Admin ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
