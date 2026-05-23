import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendVerificationEmail } from '../utils/mailer';
import { prisma } from '../lib/prisma';

// In-memory store for verification codes (for MVP). Maps email -> { code, expiresAt }
export const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

export class AuthController {
  static async sendVerificationCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Користувач з таким email вже існує. Будь ласка, увійдіть.' });
      }
      
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code with 10-minute expiration
      verificationCodes.set(email, {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
      });
      
      // Send email
      await sendVerificationEmail(email, code);
      
      res.json({ message: 'Код підтвердження надіслано на вашу електронну пошту.' });
    } catch (error) {
      next(error);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, phone, studentIdNumber, course, faculty, gender, verificationCode } = req.body;
      
      if (!email || !password || !firstName || !lastName || !phone || !studentIdNumber || !course || !faculty || !gender || !verificationCode) {
        return res.status(400).json({ error: 'Відсутні обов\'язкові поля.' });
      }

      if (gender !== 'MALE' && gender !== 'FEMALE') {
        return res.status(400).json({ error: 'Некоректне значення статі.' });
      }

      // Verify code
      const storedData = verificationCodes.get(email);
      if (!storedData) {
        return res.status(400).json({ error: 'Код підтвердження не знайдено або термін його дії минув. Запросіть новий код.' });
      }
      
      if (storedData.code !== verificationCode) {
        return res.status(400).json({ error: 'Невірний код підтвердження.' });
      }
      
      if (Date.now() > storedData.expiresAt) {
        verificationCodes.delete(email);
        return res.status(400).json({ error: 'Термін дії коду підтвердження минув. Запросіть новий код.' });
      }

      // Code is valid, remove it
      verificationCodes.delete(email);

      // Security Fix: Do not grant ADMIN role automatically upon public registration
      const isTeacher = false; 
      
      const result = await AuthService.register(email, password, firstName, lastName, phone, studentIdNumber, course, faculty, gender, isTeacher);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refresh(refreshToken);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
