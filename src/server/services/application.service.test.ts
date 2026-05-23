import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { ApplicationService } from './application.service';

import { AppError } from '../utils/AppError';

vi.mock('../lib/prisma');

vi.mock('./storage.service', () => ({
  StorageService: {
    uploadFile: vi.fn(),
  },
}));

vi.mock('../socket', () => ({
  emitToAdmins: vi.fn(),
}));

describe('ApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getApplication', () => {
    it('returns nulls when profile is not found', async () => {
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce(null);
      const result = await ApplicationService.getApplication('user-1');
      expect(result).toEqual({ application: null, group: null, profile: null });
    });

    it('returns active app and profile data when profile exists', async () => {
      const date1 = new Date('2026-01-01');
      const date2 = new Date('2026-02-01');
      const mockProfile = {
        course: 2,
        faculty: 'IT',
        dormitory: { id: 'd1', name: 'Dorm 1', address: 'Addr' },
        room: { id: 'r1', roomNumber: '101' },
        applications: [
          { id: 'app-1', submittedAt: date1 },
          { id: 'app-2', submittedAt: date2 }
        ],
        group: { id: 'g1', members: [] },
      } as any;
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce(mockProfile);

      const result = await ApplicationService.getApplication('user-1');
      expect(result.application?.id).toBe('app-2'); // Should pick latest
      expect(result.group?.id).toBe('g1');
      expect(result.profile?.course).toBe(2);
    });
  });

  describe('submitApplication', () => {
    it('throws 404 if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      await expect(ApplicationService.submitApplication('u1', 1, 'IT', null, {}, undefined))
        .rejects.toThrow(new AppError('Користувача не знайдено', 404));
    });

    it('throws error if type is CHECK_OUT and no room', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'u1', firstName: 'A', lastName: 'B' } as any);
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 'p1', roomId: null } as any);
      vi.mocked(prisma.studentProfile.update).mockResolvedValueOnce({ id: 'p1', roomId: null } as any);
      
      await expect(ApplicationService.submitApplication('u1', 1, 'IT', null, {}, undefined, 'CHECK_OUT'))
        .rejects.toThrow(new AppError('Ви повинні бути поселені для подачі заяви на виселення', 400));
    });

    it('throws error if type is CHECK_IN and already in room', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'u1', firstName: 'A', lastName: 'B' } as any);
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce({ id: 'p1', roomId: 'r1' } as any);
      vi.mocked(prisma.studentProfile.update).mockResolvedValueOnce({ id: 'p1', roomId: 'r1' } as any);
      
      await expect(ApplicationService.submitApplication('u1', 1, 'IT', null, {}, undefined, 'CHECK_IN'))
        .rejects.toThrow(new AppError('Ви вже поселені в гуртожиток. Подача нової заяви на поселення неможлива.', 400));
    });

    it('successfully submits application', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'u1', firstName: 'John', lastName: 'Doe', email: 'a@b.c' } as any);
      vi.mocked(prisma.studentProfile.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.studentProfile.create).mockResolvedValueOnce({ id: 'p1', studentIdNumber: 'KB-123456', roomId: null, fullName: 'Doe John' } as any);
      vi.mocked(prisma.application.create).mockResolvedValueOnce({ id: 'app1' } as any);
      
      const result = await ApplicationService.submitApplication('u1', 1, 'IT', null, {}, undefined, 'CHECK_IN');
      expect(result.id).toBe('app1');
      expect(prisma.studentProfile.create).toHaveBeenCalled();
      expect(prisma.application.create).toHaveBeenCalled();
    });
  });
});
