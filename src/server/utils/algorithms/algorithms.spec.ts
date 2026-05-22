import { describe, it, expect } from 'vitest';
import { KMeansAlgorithm, KmeansStudent } from './kmeans.util';
import { AhpAlgorithm, AhpStudent, DEFAULT_CRITERIA_MATRIX } from './ahp.util';

describe('Allocation Algorithms', () => {
  describe('AHP Algorithm', () => {
    it('should calculate priority scores correctly', () => {
      const students: AhpStudent[] = [
        { id: '1', course: 1, privilegeMultiplier: 1.5, baseScore: 100 },
        { id: '2', course: 4, privilegeMultiplier: 1.0, baseScore: 100 },
        { id: '3', course: 2, privilegeMultiplier: 1.2, baseScore: 100 },
      ];

      const results = AhpAlgorithm.calculatePriorityScores(students, DEFAULT_CRITERIA_MATRIX);
      
      expect(results).toHaveLength(3);
      expect(results[0].priorityScore).toBeGreaterThan(results[1].priorityScore || 0);
      // Student 1 (Privilege 1.5) should be top
      expect(results.find(r => r.id === '1')?.priorityScore).toBeGreaterThan(results.find(r => r.id === '2')?.priorityScore || 0);
    });
  });

  describe('K-means Algorithm', () => {
    it('should group similar students into clusters', () => {
      const students: KmeansStudent[] = [
        { id: '1', vector: { chronotype: 1, sociability: 2, noiseTolerance: 1, cleanliness: 9 }, faculty: 'FI' },
        { id: '2', vector: { chronotype: 9, sociability: 8, noiseTolerance: 9, cleanliness: 3 }, faculty: 'FI' },
        { id: '3', vector: { chronotype: 2, sociability: 1, noiseTolerance: 2, cleanliness: 8 }, faculty: 'FI' },
        { id: '4', vector: { chronotype: 8, sociability: 9, noiseTolerance: 8, cleanliness: 4 }, faculty: 'FI' },
        { id: '5', vector: { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 }, faculty: 'FI' }
      ];

      const k = 2;
      const clusters = KMeansAlgorithm.clusterize(students, k);

      expect(clusters).toHaveLength(k);
      // Student 1 and 3 are similar (early bird, clean)
      const clusterWith1 = clusters.find(c => c.students.some(s => s.id === '1'));
      expect(clusterWith1?.students.some(s => s.id === '3')).toBe(true);
    });

    it('should respect co-living group constraints', () => {
      const students: KmeansStudent[] = [
        { id: '1', groupId: 'group_A', vector: { chronotype: 1, sociability: 1, noiseTolerance: 1, cleanliness: 1 }, faculty: 'FI' },
        { id: '2', groupId: 'group_A', vector: { chronotype: 9, sociability: 9, noiseTolerance: 9, cleanliness: 9 }, faculty: 'FI' },
        { id: '3', vector: { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 }, faculty: 'FI' }
      ];

      const clusters = KMeansAlgorithm.clusterize(students, 2);
      
      // Students 1 and 2 MUST be in the same cluster regardless of vector distance
      const clusterWith1 = clusters.find(c => c.students.some(s => s.id === '1'));
      expect(clusterWith1?.students.some(s => s.id === '2')).toBe(true);
    });
  });
});
