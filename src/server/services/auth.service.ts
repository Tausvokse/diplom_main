import { PrismaClient, Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';

const prisma = new PrismaClient();

export class AuthService {
  static async register(email: string, password: string, firstName: string, lastName: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('Користувач з таким email вже існує');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'STUDENT',
        firstName,
        lastName
      }
    });

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn as any });

    return { user, accessToken, refreshToken };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Невірний email або пароль');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Невірний email або пароль');
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn as any });

    return { user, accessToken, refreshToken };
  }

  static async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { id: string, email: string, role: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      
      if (!user) throw new Error('Користувача не знайдено');

      const payload = { id: user.id, email: user.email, role: user.role };
      const newAccessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
      const newRefreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn as any });

      return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error('Недійсний токен оновлення');
    }
  }

  static async createAdmin(email: string, password: string, firstName: string, lastName: string, role: string, dormitoryId?: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('Користувач з таким email вже існує');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role as Role,
        firstName,
        lastName,
        dormitoryId: role === 'ADMIN_COMMANDANT' ? dormitoryId : null
      }
    });

    return user;
  }
}
