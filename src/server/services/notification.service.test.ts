import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { NotificationService } from './notification.service';
import { emitToUser } from '../socket';

vi.mock('../lib/prisma');
vi.mock('../socket', () => ({
  emitToUser: vi.fn()
}));

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create notification and emit socket event', async () => {
      const mockNotification = {
        id: 'n1',
        student: { userId: 'u1' }
      };
      (prisma.notification.create as any).mockResolvedValue(mockNotification);

      await NotificationService.create('s1', 'Title', 'Message', 'INFO');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          studentId: 's1',
          title: 'Title',
          message: 'Message',
          type: 'INFO',
          isRead: false
        },
        include: { student: { select: { userId: true } } }
      });
      expect(emitToUser).toHaveBeenCalledWith('u1', 'new_notification', mockNotification);
    });
  });

  describe('createApplicationStatusNotification', () => {
    it('should return undefined if app not found', async () => {
      (prisma.application.findUnique as any).mockResolvedValue(null);
      const result = await NotificationService.createApplicationStatusNotification('app1', 'APPROVED');
      expect(result).toBeUndefined();
    });

    it('should handle APPROVED status', async () => {
      (prisma.application.findUnique as any).mockResolvedValue({
        id: 'app1',
        studentId: 's1',
        type: 'CHECK_IN'
      });
      (prisma.notification.create as any).mockResolvedValue({ student: { userId: 'u1' } });

      await NotificationService.createApplicationStatusNotification('app1', 'APPROVED');

      expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          title: 'Заяву схвалено',
          type: 'APPLICATION_UPDATE'
        })
      }));
    });

    it('should handle REJECTED status', async () => {
      (prisma.application.findUnique as any).mockResolvedValue({
        id: 'app1',
        studentId: 's1',
        type: 'CHECK_OUT'
      });
      (prisma.notification.create as any).mockResolvedValue({ student: { userId: 'u1' } });

      await NotificationService.createApplicationStatusNotification('app1', 'REJECTED', 'No space');

      expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          title: 'Заяву відхилено',
          message: expect.stringContaining('No space')
        })
      }));
    });
  });

  describe('createAllocationNotification', () => {
    it('should create allocation notification', async () => {
      (prisma.notification.create as any).mockResolvedValue({ student: { userId: 'u1' } });

      await NotificationService.createAllocationNotification('s1', 'Dorm 1', '101');

      expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          title: 'Вас поселено!',
          type: 'ALLOCATION_RESULT'
        })
      }));
    });
  });

  describe('createEvictionNotification', () => {
    it('should create eviction notification', async () => {
      (prisma.notification.create as any).mockResolvedValue({ student: { userId: 'u1' } });

      await NotificationService.createEvictionNotification('s1');

      expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          title: 'Виселення',
          type: 'ALLOCATION_RESULT'
        })
      }));
    });
  });

  describe('markAllRead', () => {
    it('should update notifications to isRead: true', async () => {
      (prisma.notification.updateMany as any).mockResolvedValue({ count: 2 });
      await NotificationService.markAllRead('s1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { studentId: 's1', isRead: false },
        data: { isRead: true }
      });
    });
  });
});
