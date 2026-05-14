/**
 * Метод аналізу ієрархій (AHP - Analytic Hierarchy Process)
 */

export interface AhpStudent {
  id: string;
  course: number;
  privilegeMultiplier: number;
  baseScore: number;
  priorityScore?: number;
}

// Матриця попарних порівнянь критеріїв (Курс, Пільга, Базовий бал)
// Наприклад: Пільга важливіша за Курс в 3 рази, Базовий бал важливіший за Курс в 2 рази
export const DEFAULT_CRITERIA_MATRIX = [
  [1,   1/3, 1/2], // Курс
  [3,   1,   2],   // Пільга
  [2,   1/2, 1]    // Базовий бал
];

const RI = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];

export class AhpAlgorithm {
  static calculatePriorityScores(students: AhpStudent[], criteriaMatrix: number[][] = DEFAULT_CRITERIA_MATRIX): AhpStudent[] {
    if (students.length === 0) return [];

    const n = criteriaMatrix.length;
    
    // 1. Нормалізація матриці та обчислення власного вектора (ваги критеріїв)
    const colSums = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        colSums[j] += criteriaMatrix[i][j];
      }
    }

    const weights = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        weights[i] += criteriaMatrix[i][j] / colSums[j];
      }
      weights[i] /= n;
    }

    // 2. Перевірка індексу узгодженості (Consistency Ratio)
    let lambdaMax = 0;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += criteriaMatrix[i][j] * weights[j];
      }
      lambdaMax += sum / weights[i];
    }
    lambdaMax /= n;

    const CI = (lambdaMax - n) / (n - 1);
    const CR = n > 2 ? CI / RI[n - 1] : 0;

    if (CR > 0.1) {
      console.warn(`[AHP] Увага: Матриця критеріїв неузгоджена (CR = ${CR.toFixed(3)} > 0.1). Результати можуть бути неточними.`);
    }

    // 3. Нормалізація показників студентів
    const maxCourse = Math.max(...students.map(s => s.course), 1);
    const maxPrivilege = Math.max(...students.map(s => s.privilegeMultiplier), 1);
    const maxBaseScore = Math.max(...students.map(s => s.baseScore), 1);

    // 4. Розрахунок фінального priorityScore
    const scoredStudents = students.map(student => {
      // Нормалізовані значення (0..1). Для курсу чим менше, тим вище пріоритет (першокурсники)
      const normCourse = 1 - (student.course / (maxCourse + 1)); 
      const normPrivilege = student.privilegeMultiplier / maxPrivilege;
      const normBaseScore = student.baseScore / maxBaseScore;

      const priorityScore = (
        normCourse * weights[0] +
        normPrivilege * weights[1] +
        normBaseScore * weights[2]
      ) * 100; // Шкала 0-100

      return {
        ...student,
        priorityScore
      };
    });

    // 5. Сортування за спаданням пріоритету
    return scoredStudents.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }
}
