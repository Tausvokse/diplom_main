import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.message.deleteMany();
  await prisma.roomAllocation.deleteMany();
  await prisma.application.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.dormitory.deleteMany();
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

  console.log('Seeding Dormitories...');
  const dormsData = [
    { name: 'Гуртожиток №1 НАУ', address: 'вул. Ніжинська, 29Б' },
    { name: 'Гуртожиток №3 НАУ', address: 'вул. Ніжинська, 29Г' },
    { name: 'Гуртожиток №4 НАУ', address: 'вул. Ніжинська, 29Д' },
    { name: 'Гуртожиток №5 НАУ', address: 'вул. Ніжинська, 29Є' },
    { name: 'Гуртожиток №6 НАУ', address: 'вул. Ніжинська, 29Ж' }
  ];

  const createdDorms = [];
  for (const d of dormsData) {
    const dorm = await prisma.dormitory.create({
      data: {
        name: d.name,
        address: d.address,
        totalCapacity: 0 // Will update later
      }
    });
    createdDorms.push(dorm);
    
    let dormTotalCapacity = 0;
    // Create 5 floors per dorm
    for (let f = 1; f <= 5; f++) {
      const floor = await prisma.floor.create({
        data: {
          dormitoryId: dorm.id,
          floorNumber: f
        }
      });

      // Create 15 rooms per floor
      for (let r = 1; r <= 15; r++) {
        const capacity = Math.random() > 0.5 ? 2 : 4; // 2 or 4 bed rooms
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

  console.log('Seeding Admins...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // 1. Адмін-студмістечка (має доступ до всіх)
  await prisma.user.create({
    data: {
      email: 'campus@nau.edu',
      password: hashedPassword,
      role: 'ADMIN_CAMPUS',
      firstName: 'Головний',
      lastName: 'Директор Студмістечка'
    }
  });

  // 2. Два Адміни-коменданти (прив'язані до гуртожитків №1 і №3)
  await prisma.user.create({
    data: {
      email: 'dorm1@nau.edu',
      password: hashedPassword,
      role: 'ADMIN_COMMANDANT',
      firstName: 'Комендант',
      lastName: 'Першого',
      dormitoryId: createdDorms[0].id
    }
  });

  await prisma.user.create({
    data: {
      email: 'dorm3@nau.edu',
      password: hashedPassword,
      role: 'ADMIN_COMMANDANT',
      firstName: 'Комендант',
      lastName: 'Третього',
      dormitoryId: createdDorms[1].id
    }
  });

  console.log('Seeding Students and Allocating Rooms (80% occupancy)...');
  
  const faculties = ['ФКНТ', 'ФЕБА', 'ФЛ', 'ФАЕТ'];
  let studentCounter = 1;

  for (const dorm of createdDorms) {
    const floors = await prisma.floor.findMany({ where: { dormitoryId: dorm.id }, include: { rooms: true } });
    
    for (const floor of floors) {
      for (const room of floor.rooms) {
        const targetOccupancy = Math.floor(room.capacity * 0.8);
        const toFill = targetOccupancy > 0 ? targetOccupancy : (Math.random() > 0.2 ? 1 : 0); // Fill some 80%

        for (let i = 0; i < toFill; i++) {
          const sPassword = await bcrypt.hash(`student${studentCounter}`, 10);
          const studentUser = await prisma.user.create({
            data: {
              email: `student${studentCounter}@nau.edu`,
              password: sPassword,
              role: 'STUDENT',
              firstName: `Студент`,
              lastName: `${studentCounter}`
            }
          });

          const clusteringVectorStr = JSON.stringify({
            chronotype: Math.floor(Math.random() * 10) + 1,
            sociability: Math.floor(Math.random() * 10) + 1,
            noiseTolerance: Math.floor(Math.random() * 10) + 1,
            cleanliness: Math.floor(Math.random() * 10) + 1
          });

          const profile = await prisma.studentProfile.create({
            data: {
              userId: studentUser.id,
              studentIdNumber: `KB-${100000 + studentCounter}`,
              course: Math.floor(Math.random() * 4) + 1,
              faculty: faculties[Math.floor(Math.random() * faculties.length)],
              clusteringVector: clusteringVectorStr,
              isVerifiedByDiia: true
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
          
          studentCounter++;
        }
        
        // Update room status if full
        const updatedRoom = await prisma.room.findUnique({ where: { id: room.id }});
        if (updatedRoom && updatedRoom.currentOccupancy >= updatedRoom.capacity) {
          await prisma.room.update({
            where: { id: room.id },
            data: { status: 'FULL' }
          });
        }
      }
    }
  }

  console.log(`Database seeded successfully! Created ${studentCounter - 1} students.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
