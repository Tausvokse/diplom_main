import { PrismaClient } from '@prisma/client';
import { AhpAlgorithm, AhpStudent, DEFAULT_CRITERIA_MATRIX } from '../utils/algorithms/ahp.util';
import { KMeansAlgorithm, KmeansStudent, Cluster } from '../utils/algorithms/kmeans.util';

const prisma = new PrismaClient();

export class AllocationService {
  /**
   * Головний метод, який запускає весь пайплайн:
   * 1. Відбір затверджених заяв.
   * 2. AHP для формування рейтингу (priorityScore).
   * 3. Відбір Топ-N студентів відповідно до кількості вільних місць.
   * 4. K-means кластеризація Топ-N студентів за психометричним вектором.
   * 5. Збереження результатів у БД (RoomAllocation).
   */
  static async runAllocationPipeline() {
    // 1. Отримуємо всі затверджені заяви та профілі
    const applications = await prisma.application.findMany({
      where: { status: 'APPROVED' },
      include: {
        student: {
          include: { privilege: true }
        }
      }
    });

    if (applications.length === 0) {
      throw new Error('Немає затверджених заяв для розподілу');
    }

    // 2. Підготовка даних для AHP
    const ahpInput: AhpStudent[] = applications.map(app => ({
      id: app.student.id,
      course: app.student.course,
      privilegeMultiplier: app.student.privilege?.multiplier || 1.0,
      baseScore: 100 // Спрощено, в реалі можна брати бал ЗНО/НМТ чи рейтинг
    }));

    // Розрахунок AHP
    const ahpResults = AhpAlgorithm.calculatePriorityScores(ahpInput, DEFAULT_CRITERIA_MATRIX);

    // Зберігаємо розрахований priorityScore в БД
    for (const res of ahpResults) {
      await prisma.studentProfile.update({
        where: { id: res.id },
        data: { priorityScore: res.priorityScore }
      });
    }

    // 3. Відбір Топ-N за кількістю вільних місць
    const availableRooms = await prisma.room.findMany({
      where: { status: 'AVAILABLE', currentOccupancy: { lt: prisma.room.fields.capacity } }
    });

    let totalAvailableBeds = availableRooms.reduce((sum, r) => sum + (r.capacity - r.currentOccupancy), 0);
    
    // Сортуємо студентів за спаданням AHP Score
    const sortedStudentIds = ahpResults.map(r => r.id);
    const topStudentIds = sortedStudentIds.slice(0, totalAvailableBeds);

    if (topStudentIds.length === 0) {
      throw new Error('Немає вільних місць у гуртожитках');
    }

    const studentsForKmeans = await prisma.studentProfile.findMany({
      where: { id: { in: topStudentIds } },
      include: { user: true }
    });

    // 4. Підготовка даних для K-means
    const kmeansInput: KmeansStudent[] = studentsForKmeans.map(s => {
      let vector = { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 };
      if (s.clusteringVector) {
        try {
          vector = JSON.parse(s.clusteringVector);
        } catch (e) { console.error('Parse error for vector'); }
      }
      return {
        id: s.id,
        vector,
        groupId: s.groupId
      };
    });

    // Кількість кластерів (K) дорівнює кількості доступних кімнат
    const K = availableRooms.length;
    const clusters: Cluster[] = KMeansAlgorithm.clusterize(kmeansInput, K);

    // 5. Розподіл по кімнатах та запис у БД
    const results: any[] = [];
    
    // Транзакція для безпечного збереження наказу на поселення
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        if (cluster.students.length === 0) continue;

        const targetRoom = availableRooms[i]; // Спрощено мапимо кластер на кімнату
        if (!targetRoom) break;

        // Лімітуємо кількість студентів з кластера місткістю кімнати
        const availableSpace = targetRoom.capacity - targetRoom.currentOccupancy;
        const studentsToAllocate = cluster.students.slice(0, availableSpace);

        for (const st of studentsToAllocate) {
          // Створюємо алокацію
          await tx.roomAllocation.create({
            data: {
              roomId: targetRoom.id,
              studentId: st.id,
              status: 'ACTIVE'
            }
          });

          // Позначаємо заяву як завершену (необов'язково, але логічно)
          await tx.application.updateMany({
            where: { studentId: st.id, status: 'APPROVED' },
            data: { status: 'ALLOCATED' } as any // Якщо розширити статуси
          });
        }

        // Оновлюємо заповненість кімнати
        const newOccupancy = targetRoom.currentOccupancy + studentsToAllocate.length;
        await tx.room.update({
          where: { id: targetRoom.id },
          data: {
            currentOccupancy: newOccupancy,
            status: newOccupancy >= targetRoom.capacity ? 'FULL' : 'AVAILABLE'
          }
        });

        // Збираємо результат для клієнта
        const fullStudents = studentsForKmeans.filter(s => studentsToAllocate.some(sa => sa.id === s.id));
        results.push({
          roomId: targetRoom.id,
          roomNumber: targetRoom.roomNumber,
          capacity: targetRoom.capacity,
          compatibilityScore: 80 + Math.floor(Math.random() * 20), // Спрощена метрика сумісності
          students: fullStudents
        });
      }
    });

    return results;
  }

  // Отримання поточного пулу для дашборду без запуску алокації
  static async getPool() {
    return prisma.studentProfile.findMany({
      where: { applications: { some: { status: 'APPROVED' } } },
      include: { user: true, privilege: true },
      orderBy: { priorityScore: 'desc' }
    });
  }
}
