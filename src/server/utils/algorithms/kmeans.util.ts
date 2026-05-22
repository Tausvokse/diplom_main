/**
 * K-means Clustering Algorithm
 */

export interface ClusteringVector {
  chronotype: number;
  sociability: number;
  noiseTolerance: number;
  cleanliness: number;
}

export interface KmeansStudent {
  id: string;
  vector: ClusteringVector;
  groupId?: string | null;
  faculty: string;
}

export interface Cluster {
  centroid: number[];
  students: KmeansStudent[];
  score: number; // Real compatibility score 0-100
}

export class KMeansAlgorithm {
  private static readonly FACULTY_PENALTY = 2.0; // Weight of being in different faculties

  private static euclideanDistance(v1: number[], v2: number[], s1?: KmeansStudent, s2?: KmeansStudent): number {
    let dist = v1.reduce((sum, val, i) => sum + Math.pow(val - v2[i], 2), 0);
    
    // Categorical constraint: Penalty if faculties are different
    if (s1 && s2 && s1.faculty !== s2.faculty) {
      dist += this.FACULTY_PENALTY;
    }
    
    return Math.sqrt(dist);
  }

  private static vectorToArray(v: ClusteringVector): number[] {
    return [v.chronotype, v.sociability, v.noiseTolerance, v.cleanliness];
  }

  static calculateCompatibilityScore(cluster: Cluster): number {
    if (cluster.students.length <= 1) return 100;
    
    let totalDist = 0;
    let pairs = 0;
    
    for (let i = 0; i < cluster.students.length; i++) {
      for (let j = i + 1; j < cluster.students.length; j++) {
        const v1 = this.vectorToArray(cluster.students[i].vector);
        const v2 = this.vectorToArray(cluster.students[j].vector);
        totalDist += this.euclideanDistance(v1, v2, cluster.students[i], cluster.students[j]);
        pairs++;
      }
    }
    
    const avgDist = totalDist / pairs;
    // Normalized score: 100 - (avgDist / maxPossibleDist * 100)
    // Max dist in 4D (1-10) is sqrt(4 * 9^2) = 18. Plus faculty penalty.
    return Math.max(0, Math.min(100, Math.round(100 - (avgDist * 15)))); 
  }

  static clusterize(students: KmeansStudent[], k: number, maxIterations = 100): Cluster[] {
    if (students.length === 0 || k <= 0) return [];
    
    // Initial clusters setup...
    let centroids: number[][] = [];
    const shuffled = [...students].sort(() => 0.5 - Math.random());
    for (let i = 0; i < Math.min(k, students.length); i++) {
      centroids.push(this.vectorToArray(shuffled[i].vector));
    }

    let clusters: Cluster[] = [];
    let iterations = 0;
    let hasChanged = true;

    while (hasChanged && iterations < maxIterations) {
      hasChanged = false;
      clusters = centroids.map(centroid => ({ centroid, students: [], score: 0 }));

      // Assignment phase
      for (const student of students) {
        const studentVec = this.vectorToArray(student.vector);
        let minDistance = Infinity;
        let closestIdx = 0;

        for (let i = 0; i < centroids.length; i++) {
          const dist = this.euclideanDistance(studentVec, centroids[i]);
          if (dist < minDistance) {
            minDistance = dist;
            closestIdx = i;
          }
        }
        clusters[closestIdx].students.push(student);
      }

      // Group co-living logic remains same...
      const groups = new Map<string, KmeansStudent[]>();
      students.forEach(s => {
        if (s.groupId) {
          if (!groups.has(s.groupId)) groups.set(s.groupId, []);
          groups.get(s.groupId)!.push(s);
        }
      });

      groups.forEach((members, groupId) => {
        const clusterCounts = new Map<number, number>();
        members.forEach(m => {
          const clusterIdx = clusters.findIndex(c => c.students.some(s => s.id === m.id));
          if (clusterIdx !== -1) {
            clusterCounts.set(clusterIdx, (clusterCounts.get(clusterIdx) || 0) + 1);
          }
        });

        let maxCount = -1;
        let targetClusterIdx = -1;
        clusterCounts.forEach((count, idx) => {
          if (count > maxCount) {
            maxCount = count;
            targetClusterIdx = idx;
          }
        });

        if (targetClusterIdx !== -1) {
          clusters.forEach((c, idx) => {
            if (idx !== targetClusterIdx) {
              c.students = c.students.filter(s => s.groupId !== groupId);
            }
          });
          members.forEach(m => {
            if (!clusters[targetClusterIdx].students.some(s => s.id === m.id)) {
              clusters[targetClusterIdx].students.push(m);
            }
          });
        }
      });

      // Recalculate centroids
      const newCentroids = clusters.map(cluster => {
        if (cluster.students.length === 0) return cluster.centroid;
        const sumVec = [0, 0, 0, 0];
        cluster.students.forEach(s => {
          const arr = this.vectorToArray(s.vector);
          for (let i = 0; i < 4; i++) sumVec[i] += arr[i];
        });
        return sumVec.map(val => val / cluster.students.length);
      });

      for (let i = 0; i < centroids.length; i++) {
        if (this.euclideanDistance(centroids[i], newCentroids[i]) > 0.001) {
          hasChanged = true;
          break;
        }
      }
      centroids = newCentroids;
      iterations++;
    }

    // Final touch: Calculate real scores
    clusters.forEach(c => {
      c.score = this.calculateCompatibilityScore(c);
    });

    return clusters;
  }
}
