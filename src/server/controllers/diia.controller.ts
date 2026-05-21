import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getIO } from '../socket';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { AppError } from '../utils/AppError';

export class DiiaController {
  // 1. Клієнт просить згенерувати сесію та QR-дані для Дії
  static async requestVerification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = crypto.randomUUID();
      
      // Дані для формування Deeplink/QR в Дії
      const diiaData = {
        action: 'share',
        sessionId: sessionId,
        requestParams: ['passport', 'student_id'],
        webhookUrl: `${config.apiUrl}/diia/webhook`
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
      const headerSecret = req.headers['x-diia-secret'];
      const providedSecret = Array.isArray(headerSecret) ? headerSecret[0] : headerSecret;

      if (!providedSecret || providedSecret !== config.diiaWebhookSecret) {
        throw new AppError('Недійсний підпис вебхуку', 401);
      }

      if (!sessionId || !status) {
        throw new AppError('Некоректний вебхук', 400);
      }

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
