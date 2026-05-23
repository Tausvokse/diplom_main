import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export class MessageController {
  static async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
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

  static async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const senderId = req.user!.id;
      const { receiverId, content } = req.body;

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

  static async getAdmins(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: [Role.ADMIN, Role.ADMIN_CAMPUS, Role.ADMIN_COMMANDANT] } },
        select: { id: true, firstName: true, lastName: true, role: true, email: true }
      });
      res.json(admins);
    } catch (error) {
      next(error);
    }
  }

  static async getStudents(req: AuthRequest, res: Response, next: NextFunction) {
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

  static async getConversations(req: AuthRequest, res: Response, next: NextFunction) {
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
          sender: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
          receiver: { select: { id: true, firstName: true, lastName: true, role: true, email: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      const conversationMap = new Map<string, {
        contact: any;
        lastMessage: any;
        firstMessageAt: Date;
        unreadCount: number;
      }>();

      for (const msg of messages) {
        const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
        const existing = conversationMap.get(otherUser.id);
        
        const isUnread = msg.receiverId === userId && !msg.isRead;
        
        if (!existing) {
          conversationMap.set(otherUser.id, {
            contact: otherUser,
            lastMessage: msg,
            firstMessageAt: new Date(msg.createdAt),
            unreadCount: isUnread ? 1 : 0
          });
        } else {
          existing.lastMessage = msg;
          if (isUnread) existing.unreadCount++;
        }
      }

      const conversations = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

      // If student, ensure all admins are in the list
      if (req.user!.role === Role.STUDENT) {
        const admins = await prisma.user.findMany({
          where: { role: { in: [Role.ADMIN, Role.ADMIN_CAMPUS, Role.ADMIN_COMMANDANT] } },
          select: { id: true, firstName: true, lastName: true, role: true, email: true }
        });

        for (const admin of admins) {
          if (!conversationMap.has(admin.id)) {
            conversations.push({
              contact: admin,
              lastMessage: { content: 'Напишіть перше повідомлення...', createdAt: new Date() },
              firstMessageAt: new Date(),
              unreadCount: 0
            });
          }
        }
      }

      res.json(conversations);
    } catch (error) {
      next(error);
    }
  }

  static async markMessageRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await prisma.message.update({
        where: { id },
        data: { isRead: true }
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async markConversationRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { contactId } = req.params;
      await prisma.message.updateMany({
        where: {
          senderId: contactId,
          receiverId: userId,
          isRead: false
        },
        data: { isRead: true }
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
