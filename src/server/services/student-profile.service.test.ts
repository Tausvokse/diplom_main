import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { StudentProfileService } from './student-profile.service';

vi.mock('../lib/prisma');

describe('StudentProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNeighbors', () => {
    it('should return empty if profile not found or not in room', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue(null);
      const res = await StudentProfileService.getNeighbors('u1');
      expect(res).toEqual([]);
    });

    it('should return neighbors', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'p1', roomId: 'r1' });
      (prisma.studentProfile.findMany as any).mockResolvedValue([{ id: 'p2' }]);
      const res = await StudentProfileService.getNeighbors('u1');
      expect(prisma.studentProfile.findMany).toHaveBeenCalledWith({
        where: { roomId: 'r1', id: { not: 'p1' } },
        select: { id: true, fullName: true, course: true, faculty: true }
      });
      expect(res).toHaveLength(1);
    });
  });

  describe('getMasters', () => {
    it('should return users with master roles', async () => {
      (prisma.user.findMany as any).mockResolvedValue([{ id: 'm1' }]);
      const res = await StudentProfileService.getMasters();
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { role: { in: ['MASTER_SLESAR', 'MASTER_SANTEKHNIK', 'MASTER_ELECTRIC'] } }
      }));
      expect(res).toHaveLength(1);
    });
  });
});
