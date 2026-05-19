import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MessageController {
  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
          receiver: { select: { id: true, firstName: true, lastName: true, role: true } }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      res.json(messages);
    } catch (error) {
      next(error);
    }
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const senderId = req.user!.id;
      const { receiverId, content } = req.body;

      if (!receiverId || !content) {
        res.status(400).json({ message: 'Отримувач та текст повідомлення обов\'язкові' });
        return;
      }

      const message = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          content
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
          receiver: { select: { id: true, firstName: true, lastName: true, role: true } }
        }
      });

      res.json(message);
    } catch (error) {
      next(error);
    }
  }

  static async getAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN_CAMPUS', 'ADMIN_COMMANDANT'] } },
        select: { id: true, firstName: true, lastName: true, role: true, email: true }
      });
      res.json(admins);
    } catch (error) {
      next(error);
    }
  }

  static async getStudents(req: Request, res: Response, next: NextFunction) {
    try {
      // Admins fetching students they have talked to or all students
      const students = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { id: true, firstName: true, lastName: true, email: true }
      });
      res.json(students);
    } catch (error) {
      next(error);
    }
  }
}
