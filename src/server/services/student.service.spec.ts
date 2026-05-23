import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudentService } from './student.service';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

vi.mock('../lib/prisma', () => ({
  prisma: {
    studentProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    roomAllocation: {
      findFirst: vi.fn(),
    }
  }
}));

describe('StudentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return profile if found', async () => {
      const mockProfile = { id: '1', fullName: 'Doe John' };
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue(mockProfile as any);

      const result = await StudentService.getProfile('user-1');
      expect(result).toEqual(mockProfile);
    });

    it('should throw if profile not found', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue(null);
      await expect(StudentService.getProfile('user-unknown')).rejects.toThrow('Профіль студента не знайдено');
    });
  });

  describe('updateClusteringVector', () => {
    it('should update and return profile with new vector', async () => {
      const mockProfile = { id: '1', clusteringVector: JSON.stringify({ chronotype: 1 }) };
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue(mockProfile as any);
      
      const newVector = { chronotype: 10, sociability: 5, noiseTolerance: 5, cleanliness: 5 };
      vi.mocked(prisma.studentProfile.update).mockResolvedValue({ ...mockProfile, clusteringVector: JSON.stringify(newVector) } as any);

      const result = await StudentService.updateClusteringVector('user-1', newVector);
      expect(JSON.parse(result.clusteringVector)).toEqual(newVector);
      expect(prisma.studentProfile.update).toHaveBeenCalled();
    });
  });
});
