import { prisma } from '../lib/prisma';

export class DormitoryService {
  static async getDormitories() {
    const dorms = await prisma.dormitory.findMany({
      include: {
        floors: {
          include: {
            rooms: true
          }
        }
      }
    });

    return dorms.map(dorm => {
      let totalCapacity = 0;
      let currentOccupancy = 0;
      dorm.floors.forEach(floor => {
        floor.rooms.forEach(room => {
          totalCapacity += room.capacity;
          currentOccupancy += room.currentOccupancy;
        });
      });
      return {
        ...dorm,
        totalCapacity,
        currentOccupancy
      };
    });
  }

  static async createDormitory(name: string, address: string, universityId: string) {
    return prisma.dormitory.create({
      data: { name, address, universityId, totalCapacity: 0, currentOccupancy: 0 }
    });
  }

  static async updateDormitory(id: string, data: { name?: string, address?: string }) {
    return prisma.dormitory.update({ where: { id }, data });
  }

  static async deleteDormitory(id: string) {
    return prisma.dormitory.delete({ where: { id } });
  }

  static async createFloor(dormitoryId: string, floorNumber: number) {
    return prisma.floor.create({
      data: { dormitoryId, floorNumber }
    });
  }

  static async updateFloor(id: string, floorNumber: number) {
    return prisma.floor.update({ where: { id }, data: { floorNumber } });
  }

  static async deleteFloor(id: string) {
    return prisma.floor.delete({ where: { id } });
  }

  static async createRoom(floorId: string, roomNumber: string, capacity: number) {
    return prisma.room.create({
      data: { floorId, roomNumber, capacity, currentOccupancy: 0, status: 'AVAILABLE' }
    });
  }

  static async updateRoom(roomId: string, data: { roomNumber?: string, capacity?: number, status?: string }) {
    return prisma.room.update({
      where: { id: roomId },
      data
    });
  }

  static async deleteRoom(roomId: string) {
    return prisma.room.delete({ where: { id: roomId } });
  }

  static async updateRoomStatus(roomId: string, status: string) {
    const { AppError } = await import('../utils/AppError');
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Кімнату не знайдено', 404);
    }
    return prisma.room.update({
      where: { id: roomId },
      data: { status }
    });
  }

  static async getRoomStudents(roomId: string) {
    return prisma.studentProfile.findMany({
      where: { roomId },
      select: {
        id: true,
        fullName: true,
        course: true,
        faculty: true,
        studentIdNumber: true,
        room: { select: { roomNumber: true } },
        dormitory: { select: { name: true } }
      }
    });
  }
}
