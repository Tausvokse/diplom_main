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
  groupId?: string | null; // For co-living constraint
}

export interface Cluster {
  centroid: number[];
  students: KmeansStudent[];
}

export class KMeansAlgorithm {
  private static euclideanDistance(v1: number[], v2: number[]): number {
    return Math.sqrt(v1.reduce((sum, val, i) => sum + Math.pow(val - v2[i], 2), 0));
  }

  private static vectorToArray(v: ClusteringVector): number[] {
    return [v.chronotype, v.sociability, v.noiseTolerance, v.cleanliness];
  }

  static clusterize(students: KmeansStudent[], k: number, maxIterations = 100): Cluster[] {
    if (students.length === 0 || k <= 0) return [];
    if (k >= students.length) {
      return students.map(s => ({
        centroid: this.vectorToArray(s.vector),
        students: [s]
      }));
    }

    // 1. Initialize centroids randomly
    let centroids: number[][] = [];
    const shuffled = [...students].sort(() => 0.5 - Math.random());
    for (let i = 0; i < k; i++) {
      centroids.push(this.vectorToArray(shuffled[i].vector));
    }

    let clusters: Cluster[] = [];
    let iterations = 0;
    let hasChanged = true;

    while (hasChanged && iterations < maxIterations) {
      hasChanged = false;
      clusters = centroids.map(centroid => ({ centroid, students: [] }));

      // 2. Assign students to nearest centroid
      for (const student of students) {
        const studentVec = this.vectorToArray(student.vector);
        let minDistance = Infinity;
        let closestClusterIdx = 0;

        for (let i = 0; i < k; i++) {
          const dist = this.euclideanDistance(studentVec, centroids[i]);
          if (dist < minDistance) {
            minDistance = dist;
            closestClusterIdx = i;
          }
        }

        clusters[closestClusterIdx].students.push(student);
      }

      // Handle co-living constraints (GroupReferrals) - simplified: move group members to the same cluster
      // In a real heavy-duty algo, we treat groups as a single entity with an averaged vector.
      const groups = new Map<string, KmeansStudent[]>();
      clusters.forEach(c => c.students.forEach(s => {
        if (s.groupId) {
          if (!groups.has(s.groupId)) groups.set(s.groupId, []);
          groups.get(s.groupId)!.push(s);
        }
      }));

      // 3. Recalculate centroids
      const newCentroids = clusters.map(cluster => {
        if (cluster.students.length === 0) return cluster.centroid; // Keep old if empty
        const sumVec = new Array(4).fill(0);
        cluster.students.forEach(s => {
          const arr = this.vectorToArray(s.vector);
          for (let i = 0; i < 4; i++) sumVec[i] += arr[i];
        });
        return sumVec.map(val => val / cluster.students.length);
      });

      // 4. Check for convergence
      for (let i = 0; i < k; i++) {
        if (this.euclideanDistance(centroids[i], newCentroids[i]) > 0.001) {
          hasChanged = true;
          break;
        }
      }

      centroids = newCentroids;
      iterations++;
    }

    return clusters;
  }
}
