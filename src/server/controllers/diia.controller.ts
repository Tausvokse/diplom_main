import { Request, Response, NextFunction } from 'express';
import { getIO } from '../socket';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

export class DiiaController {
  // 1. Клієнт просить згенерувати сесію та QR-дані для Дії
  static async requestVerification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = Math.random().toString(36).substring(2, 15);
      
      // Дані для формування Deeplink/QR в Дії
      const diiaData = {
        action: 'share',
        sessionId: sessionId,
        requestParams: ['passport', 'student_id'],
        webhookUrl: `${process.env.VITE_API_URL || 'http://localhost:4000/api'}/diia/webhook`
      };

      res.json({ sessionId, diiaData });
    } catch (error) {
      next(error);
    }
  }

  // 2. Вебхук від серверів Дії (Імітація)
  static async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, status, userId } = req.body;

      if (status === 'success' && userId) {
        // Оновлюємо статус студента в БД (для реального кейсу шукаємо по ІПН/userId)
        await prisma.studentProfile.updateMany({
          where: { userId },
          data: { isVerifiedByDiia: true }
        });

        // Сповіщаємо конкретний клієнт (кімнату sessionId) через Socket.io
        const io = getIO();
        io.to(`diia_${sessionId}`).emit('diia_verification_success', {
          message: 'Документи успішно верифіковано'
        });
      } else {
        const io = getIO();
        io.to(`diia_${sessionId}`).emit('diia_verification_failed', {
          message: 'Відмова у верифікації'
        });
      }

      res.status(200).send('OK');
    } catch (error) {
      next(error);
    }
  }
}
