import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import { AllocationService } from './allocation.service';
import { AppError } from '../utils/AppError';

vi.mock('../lib/prisma');

// Mock dynamically imported NotificationService
vi.mock('./notification.service', () => ({
  NotificationService: {
    createAllocationNotification: vi.fn(),
    createEvictionNotification: vi.fn(),
  }
}));

describe('AllocationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default transaction mock to pass the prisma instance through
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });
  });

  describe('getPool', () => {
    it('should return valid profiles for allocation sorted by priorityScore', async () => {
      const mockDate = new Date();
      const mockProfiles = [
        {
          id: '1',
          fullName: 'Alice',
          priorityScore: 50,
          applications: [{ type: 'CHECK_IN', status: 'APPROVED', submittedAt: new Date(mockDate.getTime() - 10000) }],
          allocations: []
        },
        { // Invalid: pending check-in
          id: '2',
          fullName: 'Bob',
          priorityScore: 80,
          applications: [{ type: 'CHECK_IN', status: 'PENDING', submittedAt: new Date() }],
          allocations: []
        },
        {
          id: '3',
          fullName: 'Charlie',
          priorityScore: 100,
          applications: [{ type: 'CHECK_IN', status: 'APPROVED', submittedAt: new Date(mockDate.getTime() - 10000) }],
          allocations: []
        }
      ];

      (prisma.studentProfile.findMany as any).mockResolvedValue(mockProfiles);

      const result = await AllocationService.getPool();
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('3'); // Highest priority score
      expect(result[1].id).toBe('1');
    });

    it('should filter out students whose latest allocation is newer than latest application', async () => {
      const mockDate = new Date();
      const mockProfiles = [
        {
          id: '1',
          fullName: 'Test Student',
          priorityScore: 10,
          applications: [{ type: 'CHECK_IN', status: 'APPROVED', submittedAt: new Date(mockDate.getTime() - 10000) }],
          allocations: [{ allocatedAt: new Date(mockDate.getTime()) }] // allocated after application
        }
      ];

      (prisma.studentProfile.findMany as any).mockResolvedValue(mockProfiles);

      const result = await AllocationService.getPool();
      expect(result).toHaveLength(0);
    });
  });

  describe('evictStudent', () => {
    it('should evict student successfully', async () => {
      const mockProfile = { id: 's1', dormitoryId: 'd1' };
      const mockAdmin = { id: 'a1', role: 'ADMIN' };
      const mockAllocation = { id: 'alloc1', roomId: 'r1', studentId: 's1' };
      const mockRoom = { id: 'r1', currentOccupancy: 2, capacity: 3 };
      const mockDorm = { id: 'd1', currentOccupancy: 10, totalCapacity: 100 };

      (prisma.user.findUnique as any).mockResolvedValue(mockAdmin);
      (prisma.studentProfile.findUnique as any).mockResolvedValue(mockProfile);
      (prisma.roomAllocation.findFirst as any).mockResolvedValue(mockAllocation);
      (prisma.room.findUnique as any).mockResolvedValue(mockRoom);
      (prisma.room.update as any).mockResolvedValue({ ...mockRoom, currentOccupancy: 1, status: 'AVAILABLE' });
      (prisma.studentProfile.update as any).mockResolvedValue({});
      (prisma.dormitory.findUnique as any).mockResolvedValue(mockDorm);
      (prisma.dormitory.update as any).mockResolvedValue({ ...mockDorm, currentOccupancy: 9 });

      const result = await AllocationService.evictStudent('s1', 'a1');
      
      expect(result.success).toBe(true);
      expect(prisma.roomAllocation.update).toHaveBeenCalledWith({
        where: { id: 'alloc1' },
        data: { status: 'EVICTED' }
      });
      expect(prisma.room.update).toHaveBeenCalled();
      expect(prisma.studentProfile.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { roomId: null, dormitoryId: null }
      });
      expect(prisma.dormitory.update).toHaveBeenCalled();
    });

    it('should throw error if student not found', async () => {
      (prisma.studentProfile.findUnique as any).mockResolvedValue(null);
      
      await expect(AllocationService.evictStudent('s1')).rejects.toThrow(AppError);
    });

    it('should throw error if admin commandant tries to evict from another dorm', async () => {
      const mockProfile = { id: 's1', dormitoryId: 'd1' };
      const mockAdmin = { id: 'a1', role: 'ADMIN_COMMANDANT', dormitoryId: 'd2' };

      (prisma.user.findUnique as any).mockResolvedValue(mockAdmin);
      (prisma.studentProfile.findUnique as any).mockResolvedValue(mockProfile);

      await expect(AllocationService.evictStudent('s1', 'a1')).rejects.toThrow(/не маєте прав/);
    });
  });

  describe('allocateStudentToRoom', () => {
    it('should allocate student successfully', async () => {
      const mockProfile = { id: 's1', roomId: null, user: { gender: 'MALE' } };
      const mockApp = { id: 'app1', type: 'CHECK_IN', status: 'APPROVED' };
      const mockRoom = { 
        id: 'r1', 
        capacity: 3, 
        currentOccupancy: 1, 
        status: 'AVAILABLE',
        floor: { dormitoryId: 'd1' }
      };
      const mockDorm = { id: 'd1', name: 'Dorm 1', currentOccupancy: 10, totalCapacity: 100 };

      (prisma.studentProfile.findUnique as any).mockResolvedValue(mockProfile);
      (prisma.application.findFirst as any).mockResolvedValue(mockApp);
      (prisma.room.findUnique as any).mockResolvedValue(mockRoom);
      (prisma.dormitory.findUnique as any).mockResolvedValue(mockDorm);
      (prisma.roomAllocation.findFirst as any).mockResolvedValue(null); // No active allocation

      const result = await AllocationService.allocateStudentToRoom('s1', 'r1');

      expect(result.success).toBe(true);
      expect(prisma.roomAllocation.create).toHaveBeenCalled();
      expect(prisma.studentProfile.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { roomId: 'r1', dormitoryId: 'd1' }
      });
    });

    it('should throw error if room is full', async () => {
      const mockProfile = { id: 's1', roomId: null };
      const mockApp = { id: 'app1', type: 'CHECK_IN', status: 'APPROVED' };
      const mockRoom = { id: 'r1', capacity: 2, currentOccupancy: 2, floor: { dormitoryId: 'd1' } };

      (prisma.studentProfile.findUnique as any).mockResolvedValue(mockProfile);
      (prisma.application.findFirst as any).mockResolvedValue(mockApp);
      (prisma.room.findUnique as any).mockResolvedValue(mockRoom);

      await expect(AllocationService.allocateStudentToRoom('s1', 'r1')).rejects.toThrow(/заповнена/);
    });

    it('should throw error if student already has active allocation', async () => {
      const mockProfile = { id: 's1', roomId: null };
      const mockApp = { id: 'app1', type: 'CHECK_IN', status: 'APPROVED' };
      const mockRoom = { id: 'r1', capacity: 3, currentOccupancy: 1, floor: { dormitoryId: 'd1' } };
      const mockDorm = { id: 'd1' };

      (prisma.studentProfile.findUnique as any).mockResolvedValue(mockProfile);
      (prisma.application.findFirst as any).mockResolvedValue(mockApp);
      (prisma.room.findUnique as any).mockResolvedValue(mockRoom);
      (prisma.dormitory.findUnique as any).mockResolvedValue(mockDorm);
      (prisma.roomAllocation.findFirst as any).mockResolvedValue({ id: 'alloc1' });

      await expect(AllocationService.allocateStudentToRoom('s1', 'r1')).rejects.toThrow(/активне поселення/);
    });
  });

  describe('confirmAllocationPlan', () => {
    it('should confirm allocation plan successfully', async () => {
      const plan = [{ roomId: 'r1', students: [{ id: 's1' }] }];
      const mockRoom = { id: 'r1', roomNumber: '101', capacity: 2, floor: { dormitoryId: 'd1', dormitory: { name: 'Dorm' } } };
      const mockProfile = { id: 's1', fullName: 'Test', roomId: null };
      const mockApp = { id: 'app1', type: 'CHECK_IN', status: 'APPROVED' };

      (prisma.room.findUnique as any).mockResolvedValue(mockRoom);
      (prisma.studentProfile.count as any).mockResolvedValue(0); // active occupancy
      (prisma.studentProfile.findUnique as any).mockResolvedValue(mockProfile);
      (prisma.application.findFirst as any).mockResolvedValue(mockApp);

      const result = await AllocationService.confirmAllocationPlan(plan);

      expect(result.success).toBe(true);
      expect(result.allocatedCount).toBe(1);
      expect(prisma.roomAllocation.create).toHaveBeenCalled();
      expect(prisma.studentProfile.update).toHaveBeenCalled();
      expect(prisma.room.update).toHaveBeenCalled();
    });

    it('should throw error if not enough free beds', async () => {
      const plan = [{ roomId: 'r1', students: [{ id: 's1' }, { id: 's2' }] }];
      const mockRoom = { id: 'r1', roomNumber: '101', capacity: 2, floor: { dormitoryId: 'd1' } };
      
      (prisma.room.findUnique as any).mockResolvedValue(mockRoom);
      (prisma.studentProfile.count as any).mockResolvedValue(1); // active occupancy

      await expect(AllocationService.confirmAllocationPlan(plan)).rejects.toThrow(/недостатньо вільних місць/);
    });
  });
});
