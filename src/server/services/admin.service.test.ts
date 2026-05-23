import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { AdminService } from './admin.service';

vi.mock('../lib/prisma');

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [{ id: '1', action: 'TEST' }];
      (prisma.auditLog.findMany as any).mockResolvedValue(mockLogs);
      (prisma.auditLog.count as any).mockResolvedValue(1);

      const result = await AdminService.getAuditLogs(1, 10);
      
      expect(result.data).toEqual(mockLogs);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('getAdmins', () => {
    it('should return users with admin roles', async () => {
      const mockAdmins = [{ id: '1', role: 'ADMIN' }];
      (prisma.user.findMany as any).mockResolvedValue(mockAdmins);

      const result = await AdminService.getAdmins();
      expect(result).toEqual(mockAdmins);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data', async () => {
      (prisma.dormitory.findMany as any).mockResolvedValue([{ id: 'd1', name: 'Dorm 1', totalCapacity: 100 }]);
      (prisma.room.aggregate as any).mockResolvedValue({ _sum: { currentOccupancy: 50 } });
      (prisma.studentProfile.findMany as any).mockResolvedValue([
        { clusteringVector: JSON.stringify({ chronotype: 5, sociability: 5, noiseTolerance: 5, cleanliness: 5 }) }
      ]);
      (prisma.complaint.groupBy as any).mockResolvedValue([{ status: 'OPEN', _count: { status: 5 } }]);
      (prisma.studentProfile.aggregate as any).mockResolvedValue({ _avg: { rating: 4.5 } });
      (prisma.studentProfile.groupBy as any).mockResolvedValue([{ faculty: 'IT', _count: { faculty: 10 } }]);
      (prisma.payment.groupBy as any).mockResolvedValue([{ status: 'PAID', _count: { status: 20 } }]);
      (prisma.room.groupBy as any).mockResolvedValue([{ status: 'AVAILABLE', _count: { status: 15 } }]);

      const result = await AdminService.getAnalytics();
      
      expect(result.occupancy[0]).toEqual({ name: 'Dorm 1', totalCapacity: 100, currentOccupancy: 50 });
      expect(result.averageRating).toBe(4.5);
      expect(result.complaints).toEqual([{ status: 'OPEN', count: 5 }]);
      expect(result.faculties).toEqual([{ faculty: 'IT', count: 10 }]);
      expect(result.payments).toEqual([{ status: 'PAID', count: 20 }]);
      expect(result.roomStatuses).toEqual([{ status: 'AVAILABLE', count: 15 }]);
      expect(result.clusters.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle missing clustering vectors safely', async () => {
      (prisma.dormitory.findMany as any).mockResolvedValue([]);
      (prisma.room.aggregate as any).mockResolvedValue({ _sum: { currentOccupancy: 0 } });
      (prisma.studentProfile.findMany as any).mockResolvedValue([
        { clusteringVector: null },
        { clusteringVector: "invalid_json" }
      ]);
      (prisma.complaint.groupBy as any).mockResolvedValue([]);
      (prisma.studentProfile.aggregate as any).mockResolvedValue({ _avg: {} });
      (prisma.studentProfile.groupBy as any).mockResolvedValue([]);
      (prisma.payment.groupBy as any).mockResolvedValue([]);
      (prisma.room.groupBy as any).mockResolvedValue([]);

      const result = await AdminService.getAnalytics();
      expect(result.clusters).toEqual([]);
      expect(result.averageRating).toBe(5.0); // fallback
    });
  });

  describe('createMassNotification', () => {
    it('should create notifications for all students', async () => {
      (prisma.studentProfile.findMany as any).mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
      (prisma.notification.createMany as any).mockResolvedValue({ count: 2 });

      await AdminService.createMassNotification('Test Title', 'Test Message');
      
      expect(prisma.studentProfile.findMany).toHaveBeenCalled();
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          { studentId: 's1', title: 'Test Title', message: 'Test Message', type: 'INFO' },
          { studentId: 's2', title: 'Test Title', message: 'Test Message', type: 'INFO' }
        ]
      });
    });
  });
});
