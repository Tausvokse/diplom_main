import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { DormitoryService } from './dormitory.service';

vi.mock('../lib/prisma');

describe('DormitoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDormitories', () => {
    it('should return dormitories with totalCapacity and currentOccupancy', async () => {
      const mockDorms = [
        {
          id: '1',
          name: 'Dorm 1',
          floors: [
            {
              id: 'f1',
              rooms: [
                { id: 'r1', capacity: 2, currentOccupancy: 1 },
                { id: 'r2', capacity: 3, currentOccupancy: 3 }
              ]
            }
          ]
        }
      ];
      (prisma.dormitory.findMany as any).mockResolvedValue(mockDorms);

      const result = await DormitoryService.getDormitories();

      expect(prisma.dormitory.findMany).toHaveBeenCalledWith({
        include: { floors: { include: { rooms: true } } }
      });
      expect(result).toHaveLength(1);
      expect(result[0].totalCapacity).toBe(5);
      expect(result[0].currentOccupancy).toBe(4);
    });
  });

  describe('createDormitory', () => {
    it('should create a dormitory', async () => {
      const mockDorm = { id: '1', name: 'Dorm 1' };
      (prisma.dormitory.create as any).mockResolvedValue(mockDorm);

      const result = await DormitoryService.createDormitory('Dorm 1', 'Address', 'uni-1');

      expect(prisma.dormitory.create).toHaveBeenCalledWith({
        data: { name: 'Dorm 1', address: 'Address', universityId: 'uni-1', totalCapacity: 0, currentOccupancy: 0 }
      });
      expect(result).toEqual(mockDorm);
    });
  });

  describe('updateDormitory', () => {
    it('should update dormitory', async () => {
      (prisma.dormitory.update as any).mockResolvedValue({ id: '1', name: 'Updated' });
      const result = await DormitoryService.updateDormitory('1', { name: 'Updated' });
      expect(prisma.dormitory.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { name: 'Updated' } });
      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteDormitory', () => {
    it('should delete dormitory', async () => {
      (prisma.dormitory.delete as any).mockResolvedValue({ id: '1' });
      await DormitoryService.deleteDormitory('1');
      expect(prisma.dormitory.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('createFloor', () => {
    it('should create floor', async () => {
      (prisma.floor.create as any).mockResolvedValue({ id: '1' });
      await DormitoryService.createFloor('dorm-1', 1);
      expect(prisma.floor.create).toHaveBeenCalledWith({ data: { dormitoryId: 'dorm-1', floorNumber: 1 } });
    });
  });

  describe('updateFloor', () => {
    it('should update floor', async () => {
      (prisma.floor.update as any).mockResolvedValue({ id: '1' });
      await DormitoryService.updateFloor('1', 2);
      expect(prisma.floor.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { floorNumber: 2 } });
    });
  });

  describe('deleteFloor', () => {
    it('should delete floor', async () => {
      (prisma.floor.delete as any).mockResolvedValue({ id: '1' });
      await DormitoryService.deleteFloor('1');
      expect(prisma.floor.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('createRoom', () => {
    it('should create room', async () => {
      (prisma.room.create as any).mockResolvedValue({ id: '1' });
      await DormitoryService.createRoom('floor-1', '101', 3);
      expect(prisma.room.create).toHaveBeenCalledWith({
        data: { floorId: 'floor-1', roomNumber: '101', capacity: 3, currentOccupancy: 0, status: 'AVAILABLE' }
      });
    });
  });

  describe('updateRoom', () => {
    it('should update room', async () => {
      (prisma.room.update as any).mockResolvedValue({ id: '1' });
      await DormitoryService.updateRoom('1', { capacity: 4 });
      expect(prisma.room.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { capacity: 4 } });
    });
  });

  describe('deleteRoom', () => {
    it('should delete room', async () => {
      (prisma.room.delete as any).mockResolvedValue({ id: '1' });
      await DormitoryService.deleteRoom('1');
      expect(prisma.room.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('updateRoomStatus', () => {
    it('should update room status if room exists', async () => {
      (prisma.room.findUnique as any).mockResolvedValue({ id: '1' });
      (prisma.room.update as any).mockResolvedValue({ id: '1', status: 'MAINTENANCE' });

      await DormitoryService.updateRoomStatus('1', 'MAINTENANCE');

      expect(prisma.room.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(prisma.room.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { status: 'MAINTENANCE' } });
    });

    it('should throw if room not found', async () => {
      (prisma.room.findUnique as any).mockResolvedValue(null);

      await expect(DormitoryService.updateRoomStatus('1', 'MAINTENANCE')).rejects.toThrow('Кімнату не знайдено');
    });
  });

  describe('getRoomStudents', () => {
    it('should return students of a room', async () => {
      (prisma.studentProfile.findMany as any).mockResolvedValue([{ id: 's1' }]);
      const result = await DormitoryService.getRoomStudents('1');
      expect(prisma.studentProfile.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });
});
