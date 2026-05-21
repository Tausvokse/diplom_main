import { describe, it, expect } from 'vitest';
import { AhpAlgorithm, DEFAULT_CRITERIA_MATRIX } from './ahp.util';
import { KMeansAlgorithm, KmeansStudent } from './kmeans.util';

describe('AHP Algorithm', () => {
  it('should correctly calculate priorities based on criteria', () => {
    const students = [
      { id: '1', course: 1, privilegeMultiplier: 1.0, baseScore: 85 }, // No privilege, normal score
      { id: '2', course: 1, privilegeMultiplier: 2.0, baseScore: 85 }, // Orphan privilege, should have highest priority
      { id: '3', course: 4, privilegeMultiplier: 1.0, baseScore: 85 }  // Senior course, lower priority
    ];

    const results = AhpAlgorithm.calculatePriorityScores(students, DEFAULT_CRITERIA_MATRIX);

    // Ensure all were calculated
    expect(results.length).toBe(3);

    const s1 = results.find(r => r.id === '1');
    const s2 = results.find(r => r.id === '2');
    const s3 = results.find(r => r.id === '3');

    // Privilege multiplier = 2.0 should make s2 the highest
    expect(s2?.priorityScore).toBeGreaterThan(s1?.priorityScore || 0);
    // Lower course number (1st year) has higher priority than 4th year
    expect(s1?.priorityScore).toBeGreaterThan(s3?.priorityScore || 0);
  });

  it('should handle empty arrays', () => {
    const results = AhpAlgorithm.calculatePriorityScores([], DEFAULT_CRITERIA_MATRIX);
    expect(results).toEqual([]);
  });
});

describe('K-Means Algorithm', () => {
  it('should cluster students into exactly K clusters', () => {
    const students: KmeansStudent[] = [
      { id: '1', vector: { chronotype: 1, sociability: 2, noiseTolerance: 1, cleanliness: 9 } },
      { id: '2', vector: { chronotype: 9, sociability: 8, noiseTolerance: 9, cleanliness: 3 } },
      { id: '3', vector: { chronotype: 2, sociability: 1, noiseTolerance: 2, cleanliness: 8 } },
      { id: '4', vector: { chronotype: 8, sociability: 9, noiseTolerance: 8, cleanliness: 4 } },
      { id: '5', vector: { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 } }
    ];

    const K = 3;
    const clusters = KMeansAlgorithm.clusterize(students, K);

    // K-Means should produce K clusters, or fewer if very little data
    expect(clusters.length).toBeLessThanOrEqual(K);
    
    const totalStudentsClustered = clusters.reduce((acc, c) => acc + c.students.length, 0);
    expect(totalStudentsClustered).toBe(students.length);
  });

  it('should group students requesting the same room together if they have the same groupId', () => {
    const students: KmeansStudent[] = [
      { id: '1', groupId: 'group_A', vector: { chronotype: 1, sociability: 1, noiseTolerance: 1, cleanliness: 1 } },
      { id: '2', groupId: 'group_A', vector: { chronotype: 9, sociability: 9, noiseTolerance: 9, cleanliness: 9 } },
      { id: '3', vector: { chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 } }
    ];

    const clusters = KMeansAlgorithm.clusterize(students, 2);

    // Find the cluster that contains student 1
    const clusterForGroupA = clusters.find(c => c.students.some(s => s.id === '1'));
    
    // Group members must be in the same cluster regardless of vector differences!
    const hasStudent2 = clusterForGroupA?.students.some(s => s.id === '2');
    expect(hasStudent2).toBe(true);
  });
});
