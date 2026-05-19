import { prisma } from './lib/prisma';
import bcrypt from 'bcryptjs';
import { KMeansAlgorithm, KmeansStudent, ClusteringVector } from './utils/algorithms/kmeans.util';

const ukrainianFirstNamesMale = ['Олександр', 'Максим', 'Іван', 'Петро', 'Андрій', 'Дмитро', 'Сергій', 'Богдан', 'Володимир', 'Тарас', 'Євген', 'Михайло', 'Юрій', 'Артем', 'Денис'];
const ukrainianFirstNamesFemale = ['Анна', 'Марія', 'Анастасія', 'Олена', 'Вікторія', 'Катерина', 'Юлія', 'Дар\'я', 'Оксана', 'Наталія', 'Ірина', 'Тетяна', 'Софія', 'Аліна'];
const ukrainianLastNames = ['Шевченко', 'Коваленко', 'Бойко', 'Кравченко', 'Ковальчук', 'Мороз', 'Ткаченко', 'Олійник', 'Лисенко', 'Марченко', 'Рябоконь', 'Савченко', 'Мельник', 'Гаврилюк'];

function getRandomName() {
  const isMale = Math.random() > 0.5;
  const firstName = isMale 
    ? ukrainianFirstNamesMale[Math.floor(Math.random() * ukrainianFirstNamesMale.length)]
    : ukrainianFirstNamesFemale[Math.floor(Math.random() * ukrainianFirstNamesFemale.length)];
  const lastName = ukrainianLastNames[Math.floor(Math.random() * ukrainianLastNames.length)];
  return { firstName, lastName };
}

function generateCorporateEmail(firstName: string, lastName: string) {
  // Transliteration map for basic characters
  const transMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': 'kh', 'ю': 'yu', 'я': 'ya'
  };
  
  const trans = (str: string) => str.toLowerCase().split('').map(char => transMap[char] || char).join('').replace(/[^a-z]/g, '');
  
  return `${trans(firstName)}.${trans(lastName)}${Math.floor(Math.random() * 1000)}@kai.edu.ua`;
}

async function main() {
  console.log('Clearing database...');
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

  console.log('Seeding Privilege Categories...');
  const privileges = [
    { id: 'id_orphans', name: 'Діти-сироти', multiplier: 2.0, description: 'Діти-сироти та діти, позбавлені батьківського піклування' },
    { id: 'id_disabled', name: 'Особи з інвалідністю', multiplier: 1.5, description: 'Особи з інвалідністю I та II груп' },
    { id: 'id_combat', name: 'Учасники бойових дій', multiplier: 1.8, description: 'Учасники бойових дій та їхні діти' }
  ];

  for (const p of privileges) {
    await prisma.privilegeCategory.create({ data: p });
  }

  console.log('Seeding University...');
  const university = await prisma.university.create({
    data: {
      name: 'ХАІ (Національний аерокосмічний університет)',
      city: 'Харків'
    }
  });

  console.log('Seeding Dormitories...');
  const dormsData = [
    { name: 'Гуртожиток №10', address: 'вул. Чкалова, 17' },
    { name: 'Гуртожиток №11', address: 'вул. Чкалова, 19' },
    { name: 'Гуртожиток №12', address: 'вул. Лісопарківська, 2' }
  ];

  const createdDorms = [];
  for (const d of dormsData) {
    const dorm = await prisma.dormitory.create({
      data: {
        name: d.name,
        address: d.address,
        universityId: university.id,
        totalCapacity: 0 
      }
    });
    createdDorms.push(dorm);
    
    let dormTotalCapacity = 0;
    // 3 floors per dorm
    for (let f = 1; f <= 3; f++) {
      const floor = await prisma.floor.create({
        data: {
          dormitoryId: dorm.id,
          floorNumber: f
        }
      });

      // 10 rooms per floor
      for (let r = 1; r <= 10; r++) {
        const capacity = Math.random() > 0.5 ? 2 : 4; 
        dormTotalCapacity += capacity;
        await prisma.room.create({
          data: {
            floorId: floor.id,
            roomNumber: `${f}${r < 10 ? '0'+r : r}`,
            capacity: capacity,
            currentOccupancy: 0,
            status: 'AVAILABLE'
          }
        });
      }
    }
    
    await prisma.dormitory.update({
      where: { id: dorm.id },
      data: { totalCapacity: dormTotalCapacity }
    });
  }

  console.log('Seeding Masters and Admins...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.create({
    data: {
      email: 'campus@kai.edu.ua',
      password: hashedPassword,
      role: 'ADMIN_CAMPUS',
      firstName: 'Василь',
      lastName: 'Директор'
    }
  });

  await prisma.user.create({
    data: {
      email: 'dorm10@kai.edu.ua',
      password: hashedPassword,
      role: 'ADMIN_COMMANDANT',
      firstName: 'Ганна',
      lastName: 'Комендант',
      dormitoryId: createdDorms[0].id
    }
  });

  const slesar = await prisma.user.create({
    data: { email: 'slesar@kai.edu.ua', password: hashedPassword, role: 'MASTER_SLESAR', firstName: 'Іван', lastName: 'Слюсар' }
  });
  await prisma.user.create({
    data: { email: 'santeh@kai.edu.ua', password: hashedPassword, role: 'MASTER_SANTEKHNIK', firstName: 'Петро', lastName: 'Сантехнік' }
  });
  await prisma.user.create({
    data: { email: 'electro@kai.edu.ua', password: hashedPassword, role: 'MASTER_ELECTRIC', firstName: 'Олег', lastName: 'Електрик' }
  });

  console.log('Seeding Students and Allocating Rooms...');
  const faculties = ['ФАКС', 'ФРТ', 'ФЕ', 'ФПМ'];
  const groups = ['301', '302', '401', '505'];
  
  let studentCounter = 1;
  const kmeansStudents: KmeansStudent[] = [];
  const createdProfiles: any[] = [];

  for (const dorm of createdDorms) {
    const floors = await prisma.floor.findMany({ where: { dormitoryId: dorm.id }, include: { rooms: true } });
    
    for (const floor of floors) {
      for (const room of floor.rooms) {
        const targetOccupancy = Math.floor(room.capacity * 0.7);
        const toFill = targetOccupancy > 0 ? targetOccupancy : (Math.random() > 0.2 ? 1 : 0);

        for (let i = 0; i < toFill; i++) {
          const { firstName, lastName } = getRandomName();
          const email = generateCorporateEmail(firstName, lastName);
          const fullName = `${lastName} ${firstName}`;
          const phone = `+38050${Math.floor(1000000 + Math.random() * 9000000)}`;
          const sPassword = await bcrypt.hash('student123', 10);
          
          const faculty = faculties[Math.floor(Math.random() * faculties.length)];
          const groupName = groups[Math.floor(Math.random() * groups.length)];

          const studentUser = await prisma.user.create({
            data: {
              email,
              password: sPassword,
              role: 'STUDENT',
              firstName,
              lastName
            }
          });

          const vector: ClusteringVector = {
            chronotype: Math.floor(Math.random() * 10) + 1,
            sociability: Math.floor(Math.random() * 10) + 1,
            noiseTolerance: Math.floor(Math.random() * 10) + 1,
            cleanliness: Math.floor(Math.random() * 10) + 1
          };
          const clusteringVectorStr = JSON.stringify(vector);

          const profile = await prisma.studentProfile.create({
            data: {
              userId: studentUser.id,
              fullName,
              email,
              phone,
              dormitoryId: dorm.id,
              roomId: room.id,
              studentIdNumber: `KB-${100000 + studentCounter}`,
              course: Math.floor(Math.random() * 4) + 1,
              faculty: `${faculty}, гр. ${groupName}`,
              clusteringVector: clusteringVectorStr,
              isVerifiedByDiia: true,
              rating: 5.0
            }
          });

          await prisma.roomAllocation.create({
            data: {
              roomId: room.id,
              studentId: profile.id,
              status: 'ACTIVE'
            }
          });
          
          await prisma.room.update({
            where: { id: room.id },
            data: { currentOccupancy: { increment: 1 } }
          });
          
          kmeansStudents.push({ id: profile.id, vector });
          createdProfiles.push(profile);
          studentCounter++;
        }
        
        const updatedRoom = await prisma.room.findUnique({ where: { id: room.id }});
        if (updatedRoom && updatedRoom.currentOccupancy >= updatedRoom.capacity) {
          await prisma.room.update({ where: { id: room.id }, data: { status: 'FULL' } });
        }
      }
    }
  }

  console.log(`Applying K-Means Clustering for ${kmeansStudents.length} students...`);
  const numClusters = 5;
  const clusters = KMeansAlgorithm.clusterize(kmeansStudents, numClusters);
  
  for (let clusterIdx = 0; clusterIdx < clusters.length; clusterIdx++) {
    const cluster = clusters[clusterIdx];
    const metadata = JSON.stringify({ centroid: cluster.centroid });
    
    for (const student of cluster.students) {
      await prisma.studentProfile.update({
        where: { id: student.id },
        data: {
          clusterId: clusterIdx,
          clusterMetadata: metadata
        }
      });
    }
  }

  console.log('Seeding Applications...');
  // Create some students without rooms for active applications
  for (let i = 0; i < 5; i++) {
    const { firstName, lastName } = getRandomName();
    const email = generateCorporateEmail(firstName, lastName);
    const sPassword = await bcrypt.hash('student123', 10);
    const studentUser = await prisma.user.create({
      data: { email, password: sPassword, role: 'STUDENT', firstName, lastName }
    });

    const vector: ClusteringVector = {
      chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5
    };
    
    const profile = await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        fullName: `${lastName} ${firstName}`,
        email,
        phone: `+38099${Math.floor(1000000 + Math.random() * 9000000)}`,
        studentIdNumber: `KB-${200000 + i}`,
        course: 1,
        faculty: 'ФРТ, гр. 101',
        clusteringVector: JSON.stringify(vector),
        isVerifiedByDiia: true,
        rating: 5.0
      }
    });

    await prisma.application.create({
      data: {
        studentId: profile.id,
        status: i % 2 === 0 ? 'SUBMITTED' : 'UNDER_REVIEW',
        scanDocumentsUrl: 'https://example.com/scan.pdf',
        type: 'CHECK_IN'
      }
    });
  }

  console.log('Seeding Complaints, Repairs, Jars, Payments...');
  if (createdProfiles.length >= 2) {
    // 1 Complaint
    await prisma.complaint.create({
      data: {
        accuserId: createdProfiles[0].id,
        accusedId: createdProfiles[1].id,
        content: 'Постійно слухає голосну музику вночі!',
        status: 'PENDING'
      }
    });

    // Repair Request
    const room = await prisma.room.findFirst();
    if (room) {
      await prisma.repairRequest.create({
        data: {
          roomId: room.id,
          masterId: slesar.id,
          description: 'Зламаний замок у дверях',
          status: 'PENDING'
        }
      });
    }

    // Jar & Transactions
    const jar = await prisma.jar.create({
      data: {
        title: 'На новий тенісний стіл',
        goalAmount: 5000,
        currentAmount: 500,
        dormitoryId: createdDorms[0].id
      }
    });

    await prisma.jarTransaction.create({
      data: {
        jarId: jar.id,
        studentId: createdProfiles[0].id,
        amount: 500,
        comment: 'Хай щастить!'
      }
    });

    // Payments
    await prisma.payment.create({
      data: {
        studentId: createdProfiles[0].id,
        amount: 800,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        description: 'Оплата за проживання (Травень)'
      }
    });
    
    // Decrease rating for an accused student
    await prisma.studentProfile.update({
      where: { id: createdProfiles[1].id },
      data: { rating: 4.5 }
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });