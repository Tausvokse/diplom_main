import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudentService } from './student.service';
import { prisma } from '../lib/prisma';

vi.mock('../lib/prisma', () => ({
  prisma: {
    studentProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    groupReferral: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    jar: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    jarTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}));

describe('StudentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('joinGroup', () => {
    it('should throw an error if genders do not match', async () => {
      // Mock the joiner
      vi.mocked(prisma.studentProfile.findUnique)
        .mockResolvedValueOnce({ id: 'joiner-1', groupId: null, user: { gender: 'FEMALE' } } as any);
      
      // Mock the group
      vi.mocked(prisma.groupReferral.findUnique).mockResolvedValueOnce({
        id: 'group-1', creatorId: 'creator-1', currentMembers: 1, maxMembers: 4, expiresAt: new Date(Date.now() + 100000)
      } as any);

      // Mock the creator
      vi.mocked(prisma.studentProfile.findUnique)
        .mockResolvedValueOnce({ id: 'creator-1', user: { gender: 'MALE' } } as any);

      await expect(StudentService.joinGroup('user-2', 'CODE')).rejects.toThrow('До групи можуть приєднуватися лише студенти тієї ж статі');
    });

    it('should allow join if genders match', async () => {
      // Mock the joiner
      vi.mocked(prisma.studentProfile.findUnique)
        .mockResolvedValueOnce({ id: 'joiner-1', groupId: null, user: { gender: 'MALE' } } as any);
      
      // Mock the group
      const mockGroup = {
        id: 'group-1', creatorId: 'creator-1', currentMembers: 1, maxMembers: 4, expiresAt: new Date(Date.now() + 100000)
      };
      vi.mocked(prisma.groupReferral.findUnique).mockResolvedValueOnce(mockGroup as any);

      // Mock the creator
      vi.mocked(prisma.studentProfile.findUnique)
        .mockResolvedValueOnce({ id: 'creator-1', user: { gender: 'MALE' } } as any);

      vi.mocked(prisma.$transaction).mockResolvedValueOnce([] as any);
      
      // Mock the final return
      vi.mocked(prisma.groupReferral.findUnique).mockResolvedValueOnce({ ...mockGroup, currentMembers: 2 } as any);

      const result = await StudentService.joinGroup('user-2', 'CODE');
      expect(result!.currentMembers).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
