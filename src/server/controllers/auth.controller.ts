import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { sendVerificationEmail } from '../utils/mailer';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';

export const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

export class AuthController {
  static sendVerificationCode = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Користувач з таким email вже існує. Будь ласка, увійдіть.' });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    verificationCodes.set(email, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000
    });
    
    await sendVerificationEmail(email, code);
    
    res.json({ message: 'Код підтвердження надіслано на вашу електронну пошту.' });
  });

  static register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, phone, studentIdNumber, course, faculty, gender, verificationCode } = req.body;
    
    if (!email || !password || !firstName || !lastName || !phone || !studentIdNumber || !course || !faculty || !gender || !verificationCode) {
      return res.status(400).json({ error: 'Відсутні обов\'язкові поля.' });
    }

    if (gender !== 'MALE' && gender !== 'FEMALE') {
      return res.status(400).json({ error: 'Некоректне значення статі.' });
    }

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

    verificationCodes.delete(email);
    const isTeacher = false; 
    
    const result = await AuthService.register(email, password, firstName, lastName, phone, studentIdNumber, course, faculty, gender, isTeacher);
    res.json(result);
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  });

  static refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await AuthService.refresh(refreshToken);
    res.json(result);
  });
}
