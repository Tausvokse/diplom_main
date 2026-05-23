import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { ComplaintService } from './complaint.service';
import { AppError } from '../utils/AppError';

vi.mock('../lib/prisma');

vi.mock('../socket', () => ({
  emitToAdmins: vi.fn(),
  emitToUser: vi.fn(),
}));

vi.mock('./notification.service', () => ({
  NotificationService: { create: vi.fn() }
}));

describe('ComplaintService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitComplaint', () => {
    it('throws error if accuser profile not found', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce(null);
      await expect(ComplaintService.submitComplaint('u1', 'p2', 'content')).rejects.toThrow(AppError);
    });

    it('throws error if accuser has no room', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 'p1', roomId: null } as any);
      await expect(ComplaintService.submitComplaint('u1', 'p2', 'content')).rejects.toThrow(AppError);
    });

    it('throws error if neighbor not found in same room', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 'p1', roomId: 'r1' } as any);
      vi.mocked(prisma.studentProfile.findFirst).mockResolvedValueOnce(null);
      await expect(ComplaintService.submitComplaint('u1', 'p2', 'content')).rejects.toThrow(AppError);
    });

    it('creates complaint successfully', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 'p1', roomId: 'r1' } as any);
      vi.mocked(prisma.studentProfile.findFirst).mockResolvedValueOnce({ id: 'p2', roomId: 'r1' } as any);
      vi.mocked(prisma.complaint.create).mockResolvedValueOnce({ id: 'c1' } as any);

      const result = await ComplaintService.submitComplaint('u1', 'p2', 'content');
      expect(result.id).toBe('c1');
    });
  });

  describe('getComplaints', () => {
    it('returns empty array if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      const result = await ComplaintService.getComplaints('u1');
      expect(result).toEqual([]);
    });

    it('returns all complaints for admin', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'u1', role: 'ADMIN' } as any);
      vi.mocked(prisma.complaint.findMany).mockResolvedValueOnce([{ id: 'c1' }] as any);
      const result = await ComplaintService.getComplaints('u1');
      expect(result).toEqual([{ id: 'c1' }]);
    });
  });

  describe('updateComplaintStatus', () => {
    it('throws if admin not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      await expect(ComplaintService.updateComplaintStatus('admin', 'c1', 'RESOLVED')).rejects.toThrow(AppError);
    });

    it('throws if complaint not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'admin', role: 'ADMIN' } as any);
      vi.mocked(prisma.complaint.findUnique).mockResolvedValueOnce(null);
      await expect(ComplaintService.updateComplaintStatus('admin', 'c1', 'RESOLVED')).rejects.toThrow(AppError);
    });

    it('updates complaint successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'admin', role: 'ADMIN' } as any);
      vi.mocked(prisma.complaint.findUnique).mockResolvedValueOnce({
        id: 'c1', accuserId: 'p1', accuser: { userId: 'u1' }, accused: {}
      } as any);
      vi.mocked(prisma.complaint.update).mockResolvedValueOnce({ id: 'c1', status: 'RESOLVED' } as any);

      const result = await ComplaintService.updateComplaintStatus('admin', 'c1', 'RESOLVED');
      expect(result.status).toBe('RESOLVED');
    });
  });
});
