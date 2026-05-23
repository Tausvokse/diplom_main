import { PrismaClient, Role, ApplicationStatus, ApplicationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Production-Grade Seeding (KAI) ---');

  // 1. Clean up
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

  // Common password hash
  const defaultPassword = bcrypt.hashSync('password123', 10);

  // 2. Create University & Dormitories
  const uni = await prisma.university.create({
    data: { name: 'Київський авіаційний інститут', city: 'Київ' }
  });

  const dorm1 = await prisma.dormitory.create({
    data: {
      name: 'Гуртожиток №1',
      address: 'вул. Ніжинська, 29',
      universityId: uni.id,
      totalCapacity: 150
    }
  });

  const dorm2 = await prisma.dormitory.create({
    data: {
      name: 'Гуртожиток №3',
      address: 'вул. Ніжинська, 29Б',
      universityId: uni.id,
      totalCapacity: 200
    }
  });

  const floors = [];
  for (let i = 1; i <= 5; i++) {
    const floor1 = await prisma.floor.create({ data: { dormitoryId: dorm1.id, floorNumber: i } });
    const floor2 = await prisma.floor.create({ data: { dormitoryId: dorm2.id, floorNumber: i } });
    floors.push(floor1, floor2);
  }

  // 3. Create Rooms
  console.log('Generating rooms...');
  const rooms: any[] = [];
  for (const floor of floors) {
    for (let j = 1; j <= 5; j++) {
      const room = await prisma.room.create({
        data: {
          floorId: floor.id,
          roomNumber: `${floor.floorNumber}${j.toString().padStart(2, '0')}`,
          capacity: Math.floor(Math.random() * 2) + 2, // 2-3 beds
          status: 'AVAILABLE'
        }
      });
      rooms.push({ ...room, floor });
    }
  }

  // 4. Create Privilege Categories
  const privileges = [
    { id: 'id_orphans', name: 'Сирота', multiplier: 1.5, description: 'Пріоритетне заселення' },
    { id: 'id_disabled', name: 'Особи з інвалідністю', multiplier: 1.4, description: 'Студенти з особливими потребами' },
    { id: 'id_combat', name: 'Учасник бойових дій', multiplier: 1.4, description: 'Пільга для ветеранів' },
    { id: 'id_vpo', name: 'ВПО', multiplier: 1.3, description: 'Внутрішньо переміщені особи' }
  ];

  const privilegeList = [];
  for (const p of privileges) {
    privilegeList.push(await prisma.privilegeCategory.upsert({
      where: { id: p.id },
      update: p,
      create: p
    }));
  }

  // 5. Create Roles (Admins, Masters, Commandant)
  console.log('Generating staff users...');
  
  // Super Admin
  await prisma.user.create({
    data: {
      email: 'admin@npp.kai.edu.ua',
      password: defaultPassword,
      role: Role.ADMIN,
      gender: 'OTHER' as any,
      firstName: 'Головний',
      lastName: 'Адміністратор'
    }
  });

  // Commandant Dorm 1
  await prisma.user.create({
    data: {
      email: 'commandant1@kai.edu.ua',
      password: defaultPassword,
      role: Role.ADMIN_COMMANDANT,
      gender: 'FEMALE' as any,
      firstName: 'Олена',
      lastName: 'Степанівна',
      dormitoryId: dorm1.id
    }
  });

  // Master Slesar
  const master = await prisma.user.create({
    data: {
      email: 'slesar@kai.edu.ua',
      password: defaultPassword,
      role: Role.MASTER_SLESAR,
      gender: 'MALE' as any,
      firstName: 'Василь',
      lastName: 'Петрович'
    }
  });

  // 6. Create Students (Pool for Allocation)
  console.log('Generating 50 unallocated realistic students...');
  const faculties = ['АКФ', 'ФКНТ', 'ФЕБА', 'ФЛСК', 'ЮФ', 'ФНСА', 'ФЕБ'];
  const genders = ['MALE', 'FEMALE'];
  
  const maleFirstNames = ['Олександр', 'Максим', 'Артем', 'Дмитро', 'Іван'];
  const maleLastNames = ['Коваленко', 'Мельник', 'Шевченко', 'Поліщук', 'Бондаренко'];
  const femaleFirstNames = ['Марія', 'Анна', 'Анастасія', 'Вікторія', 'Олена'];
  const femaleLastNames = ['Шевченко', 'Коваленко', 'Бондар', 'Мельник', 'Лисенко'];

  for (let i = 0; i < 50; i++) {
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
        email: `pool${i + 1}@kai.edu.ua`,
        password: defaultPassword,
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
    
    const course = Math.floor(Math.random() * 4) + 1;
    const basePriority = 60 + (course * 5);
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

  // 7. Create Allocated Students & Interactive Data
  console.log('Generating 10 allocated students, complaints, repairs and jars...');
  const allocatedStudents = [];
  
  for (let i = 0; i < 10; i++) {
    const gender = 'MALE';
    const firstName = maleFirstNames[i % maleFirstNames.length];
    const lastName = maleLastNames[i % maleLastNames.length];
    const targetRoom = rooms[i]; // Put them in different rooms

    const user = await prisma.user.create({
      data: {
        email: `resident${i + 1}@kai.edu.ua`,
        password: defaultPassword,
        role: Role.STUDENT,
        gender: gender as any,
        firstName,
        lastName,
      }
    });

    const student = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        fullName: `${lastName} ${firstName}`,
        email: user.email,
        phone: `+38050${Math.floor(1000000 + Math.random() * 9000000)}`,
        studentIdNumber: `KA${30000000 + i}`,
        course: 2,
        faculty: 'ФКНТ',
        priorityScore: 80,
        isVerifiedByDiia: true,
        roomId: targetRoom.id,
        dormitoryId: targetRoom.floor.dormitoryId
      }
    });

    await prisma.roomAllocation.create({
      data: {
        studentId: student.id,
        roomId: targetRoom.id,
        status: 'ACTIVE'
      }
    });

    await prisma.room.update({
      where: { id: targetRoom.id },
      data: { currentOccupancy: 1 }
    });

    allocatedStudents.push(student);
  }

  await prisma.dormitory.update({
    where: { id: dorm1.id },
    data: { currentOccupancy: 10 }
  });

  // 8. Add Repairs & Complaints
  await prisma.repairRequest.create({
    data: {
      roomId: allocatedStudents[0].roomId!,
      description: 'Тече кран: Сильно протікає кран у вмивальнику',
      status: 'PENDING'
    }
  });

  await prisma.repairRequest.create({
    data: {
      roomId: allocatedStudents[1].roomId!,
      description: 'Немає світла: Згоріла розетка',
      status: 'IN_PROGRESS',
      masterId: master.id
    }
  });

  await prisma.complaint.create({
    data: {
      accuserId: allocatedStudents[2].id,
      accusedId: allocatedStudents[3].id,
      content: 'Шум після 23:00. Постійно грає на гітарі вночі',
      status: 'PENDING'
    }
  });

  // 9. Create Jars (Global and Local)
  await prisma.jar.create({
    data: {
      title: 'На дрон для 3 ОШБр',
      description: 'Збираємо на Mavic 3T',
      goalAmount: 100000,
      currentAmount: 45000,
      monobankUrl: 'https://send.monobank.ua/jar/123456789'
    }
  });

  await prisma.jar.create({
    data: {
      title: 'Пральна машина',
      description: 'Нова пралка на 3-й поверх',
      goalAmount: 15000,
      currentAmount: 2000,
      dormitoryId: dorm1.id // Local to Dorm 1
    }
  });

  console.log('--- Seeding Complete ---');
  console.log('Test Accounts:');
  console.log('Admin: admin@npp.kai.edu.ua / password123');
  console.log('Commandant: commandant1@kai.edu.ua / password123');
  console.log('Master: slesar@kai.edu.ua / password123');
  console.log('Student (in pool): pool1@kai.edu.ua / password123');
  console.log('Resident (allocated): resident1@kai.edu.ua / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
