import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { GroupService } from './group.service';


vi.mock('../lib/prisma');
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: () => 'abcdef'
    }))
  }
}));

describe('GroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should throw if profile not found', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue(null);
      await expect(GroupService.createGroup('u1')).rejects.toThrow('Профіль студента не знайдено');
    });

    it('should throw if user already in group', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'p1', groupId: 'g1' });
      await expect(GroupService.createGroup('u1')).rejects.toThrow('Ви вже є учасником групи');
    });

    it('should create a group successfully', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'p1', groupId: null });
      (prisma.groupReferral.create as any).mockResolvedValue({ id: 'g1', code: 'ABCDEF' });
      (prisma.studentProfile.update as any).mockResolvedValue({ id: 'p1' });
      (prisma.groupReferral.findUnique as any).mockResolvedValue({ id: 'g1', members: [] });

      const result = await GroupService.createGroup('u1');

      expect(prisma.groupReferral.create).toHaveBeenCalled();
      expect(prisma.studentProfile.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { groupId: 'g1' }
      });
      expect(result).toBeDefined();
    });
  });

  describe('joinGroup', () => {
    it('should throw if group not found', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'p2', groupId: null, user: { gender: 'MALE' } });
      (prisma.groupReferral.findUnique as any).mockResolvedValue(null);

      await expect(GroupService.joinGroup('u2', 'CODE')).rejects.toThrow('Групу не знайдено');
    });

    it('should throw if group is full', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'p2', groupId: null, user: { gender: 'MALE' } });
      (prisma.groupReferral.findUnique as any).mockResolvedValue({ id: 'g1', currentMembers: 4, maxMembers: 4 });

      await expect(GroupService.joinGroup('u2', 'CODE')).rejects.toThrow('Група вже заповнена');
    });

    it('should throw if code expired', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'p2', groupId: null, user: { gender: 'MALE' } });
      (prisma.groupReferral.findUnique as any).mockResolvedValue({ 
        id: 'g1', 
        currentMembers: 1, 
        maxMembers: 4,
        expiresAt: new Date(Date.now() - 10000) 
      });

      await expect(GroupService.joinGroup('u2', 'CODE')).rejects.toThrow('Термін дії коду минув');
    });

    it('should throw if gender mismatch', async () => {
      (prisma.studentProfile.findUnique as any)
        .mockResolvedValueOnce({ id: 'p2', groupId: null, user: { gender: 'MALE' } }) // joining user
        .mockResolvedValueOnce({ id: 'p1', user: { gender: 'FEMALE' } }); // creator user

      (prisma.groupReferral.findUnique as any).mockResolvedValue({ 
        id: 'g1', 
        creatorId: 'p1',
        currentMembers: 1, 
        maxMembers: 4,
        expiresAt: new Date(Date.now() + 100000) 
      });

      await expect(GroupService.joinGroup('u2', 'CODE')).rejects.toThrow('До групи можуть приєднуватися лише студенти тієї ж статі');
    });

    it('should join group successfully', async () => {
      (prisma.studentProfile.findUnique as any)
        .mockResolvedValueOnce({ id: 'p2', groupId: null, user: { gender: 'MALE' } }) // joining user
        .mockResolvedValueOnce({ id: 'p1', user: { gender: 'MALE' } }); // creator user

      (prisma.groupReferral.findUnique as any)
        .mockResolvedValueOnce({ 
          id: 'g1', 
          creatorId: 'p1',
          currentMembers: 1, 
          maxMembers: 4,
          expiresAt: new Date(Date.now() + 100000) 
        })
        .mockResolvedValueOnce({ id: 'g1', members: [] }); // return on final findUnique

      (prisma.$transaction as any).mockResolvedValue([]);

      const result = await GroupService.joinGroup('u2', 'CODE');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
