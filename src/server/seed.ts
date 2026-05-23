import { PrismaClient, Role, ApplicationStatus, ApplicationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Production-Grade Seeding (KAI) ---');

  // 1. Clean up (Order matters due to Foreign Keys)
  console.log('Cleaning up database...');
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.repairRequest.deleteMany();
  await prisma.jarTransaction.deleteMany();
  await prisma.jar.deleteMany();
  await prisma.roomAllocation.deleteMany();
  await prisma.application.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.dormitory.deleteMany();
  await prisma.university.deleteMany();
  await prisma.privilegeCategory.deleteMany();
  await prisma.groupReferral.deleteMany();

  // 2. Create University & Dormitories
  const uni = await prisma.university.create({
    data: { name: 'Київський авіаційний інститут', city: 'Київ' }
  });

  const dorm = await prisma.dormitory.create({
    data: {
      name: 'Гуртожиток №1',
      address: 'вул. Ніжинська, 29',
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
  console.log('Generating 120 realistic students...');
  const faculties = ['АКФ', 'ФКНТ', 'ФЕБА', 'ФЛСК', 'ЮФ', 'ФНСА', 'ФЕБ'];
  const genders = ['MALE', 'FEMALE'];
  
  const maleFirstNames = ['Олександр', 'Максим', 'Артем', 'Дмитро', 'Іван', 'Андрій', 'Михайло', 'Ярослав', 'Сергій', 'Владислав'];
  const maleLastNames = ['Коваленко', 'Мельник', 'Шевченко', 'Поліщук', 'Бондаренко', 'Ткаченко', 'Ковальчук', 'Кравченко', 'Олійник', 'Мороз'];
  const femaleFirstNames = ['Марія', 'Анна', 'Анастасія', 'Вікторія', 'Олена', 'Дарина', 'Наталія', 'Юлія', 'Тетяна', 'Софія'];
  const femaleLastNames = ['Шевченко', 'Коваленко', 'Бондар', 'Мельник', 'Лисенко', 'Ткаченко', 'Кравчук', 'Павленко', 'Савченко', 'Романюк'];

  for (let i = 0; i < 120; i++) {
    const gender = genders[i % 2];
    const faculty = faculties[Math.floor(Math.random() * faculties.length)];
    
    const firstName = gender === 'MALE' 
      ? maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)]
      : femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)];
    const lastName = gender === 'MALE'
      ? maleLastNames[Math.floor(Math.random() * maleLastNames.length)]
      : femaleLastNames[Math.floor(Math.random() * femaleLastNames.length)];

    const user = await prisma.user.create({
      data: {
        email: `student${i + 100}@kai.edu.ua`,
        password: 'password123',
        role: Role.STUDENT,
        gender: gender as any,
        firstName,
        lastName,
      }
    });

    const vector = {
      chronotype: Math.floor(Math.random() * 10) + 1,
      sociability: Math.floor(Math.random() * 10) + 1,
      noiseTolerance: Math.floor(Math.random() * 10) + 1,
      cleanliness: Math.floor(Math.random() * 10) + 1
    };

    const hasPrivilege = Math.random() > 0.85;
    const selectedPrivilege = hasPrivilege ? privilegeList[Math.floor(Math.random() * privilegeList.length)] : null;
    
    // Simulate AHP Calculation for Seeding
    // Course weight (older = higher) + Privilege multiplier
    const course = Math.floor(Math.random() * 4) + 1;
    const basePriority = 60 + (course * 5); // 65-80
    const priorityScore = Math.min(100, basePriority * (selectedPrivilege?.multiplier || 1.0));

    const student = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        fullName: `${lastName} ${firstName}`,
        email: user.email,
        phone: `+38067${Math.floor(1000000 + Math.random() * 9000000)}`,
        studentIdNumber: `KA${20000000 + i}`,
        course,
        faculty: faculty,
        clusteringVector: JSON.stringify(vector),
        priorityScore,
        privilegeCategoryId: selectedPrivilege?.id || null,
        isVerifiedByDiia: true
      }
    });

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
      email: 'admin@npp.kai.edu.ua',
      password: 'admin-password',
      role: Role.ADMIN,
      gender: 'OTHER' as any,
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
