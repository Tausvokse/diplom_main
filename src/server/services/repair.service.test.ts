import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { RepairService } from './repair.service';

vi.mock('../lib/prisma');
vi.mock('./notification.service', () => ({
  NotificationService: {
    create: vi.fn()
  }
}));

describe('RepairService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitRepairRequest', () => {
    it('should throw if profile not found', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue(null);
      await expect(RepairService.submitRepairRequest('u1', 'Desc')).rejects.toThrow('Профіль не знайдено');
    });

    it('should throw if not in room', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'p1', roomId: null });
      await expect(RepairService.submitRepairRequest('u1', 'Desc')).rejects.toThrow('Ви не поселені в кімнату');
    });

    it('should create request', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'p1', roomId: 'r1' });
      (prisma.repairRequest.create as any).mockResolvedValue({ id: 'req1' });
      await RepairService.submitRepairRequest('u1', 'Desc', 'm1');
      expect(prisma.repairRequest.create).toHaveBeenCalledWith({
        data: { roomId: 'r1', description: 'Desc', status: 'PENDING', masterId: 'm1' }
      });
    });
  });

  describe('getRepairRequests', () => {
    it('should return empty if user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      const res = await RepairService.getRepairRequests('u1');
      expect(res).toEqual([]);
    });

    it('should return master requests if user is a master', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'm1', role: 'MASTER_SLESAR' });
      (prisma.repairRequest.findMany as any).mockResolvedValue([{ id: 'req1' }]);
      const res = await RepairService.getRepairRequests('m1');
      expect(prisma.repairRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { masterId: 'm1' }
      }));
      expect(res).toHaveLength(1);
    });

    it('should return student requests if user is a student', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', role: 'STUDENT' });
      (prisma.studentProfile.findUnique as any).mockResolvedValue({ id: 'p1', roomId: 'r1' });
      (prisma.repairRequest.findMany as any).mockResolvedValue([{ id: 'req1' }]);
      const res = await RepairService.getRepairRequests('u1');
      expect(prisma.repairRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { roomId: 'r1' }
      }));
      expect(res).toHaveLength(1);
    });
  });

  describe('updateRepairStatus', () => {
    it('should throw if not master', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', role: 'STUDENT' });
      await expect(RepairService.updateRepairStatus('u1', 'req1', 'IN_PROGRESS')).rejects.toThrow('Оновлювати ремонтні заявки може лише майстер');
    });

    it('should throw if repair not found for master', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'm1', role: 'MASTER_SLESAR' });
      (prisma.repairRequest.findFirst as any).mockResolvedValue(null);
      await expect(RepairService.updateRepairStatus('m1', 'req1', 'IN_PROGRESS')).rejects.toThrow('Заявку не знайдено або вона не призначена вам');
    });

    it('should update and notify', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'm1', role: 'MASTER_SLESAR' });
      (prisma.repairRequest.findFirst as any).mockResolvedValue({
        id: 'req1', masterId: 'm1', room: { roomNumber: '101', studentProfiles: [{ id: 's1' }] }
      });
      (prisma.repairRequest.update as any).mockResolvedValue({ id: 'req1' });

      const { NotificationService } = await import('./notification.service');

      await RepairService.updateRepairStatus('m1', 'req1', 'IN_PROGRESS');

      expect(prisma.repairRequest.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'req1' },
        data: { status: 'IN_PROGRESS' }
      }));
      expect(NotificationService.create).toHaveBeenCalled();
    });
  });
});
