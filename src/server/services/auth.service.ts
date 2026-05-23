import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class AuthService {
  static async register(email: string, password: string, firstName: string, lastName: string, phone: string, studentIdNumber: string, course: number, faculty: string, gender: string, isTeacher: boolean = false) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Користувач з таким email вже існує', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User and StudentProfile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: isTeacher ? 'ADMIN' : 'STUDENT',
          gender: gender as any,
          firstName,
          lastName
        }
      });

      await tx.studentProfile.create({
        data: {
          userId: newUser.id,
          fullName: `${lastName} ${firstName}`,
          email,
          phone,
          studentIdNumber,
          course,
          faculty,
          isVerifiedByDiia: false
        }
      });

      return newUser;
    });

    const { password: _password, ...safeUser } = user;
    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn as any });

    return { user: safeUser, accessToken, refreshToken };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Невірний email або пароль', 401);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('Невірний email або пароль', 401);
    }

    const { password: _password, ...safeUser } = user;
    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn as any });

    return { user: safeUser, accessToken, refreshToken };
  }

  static async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { id: string, email: string, role: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      
      if (!user) throw new AppError('Користувача не знайдено', 404);

      const { password: _password, ...safeUser } = user;
      const payload = { id: user.id, email: user.email, role: user.role };
      const newAccessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
      const newRefreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn as any });

      return { user: safeUser, accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Недійсний токен оновлення', 401);
    }
  }

  static async createAdmin(email: string, password: string, firstName: string, lastName: string, role: string, dormitoryId?: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Користувач з таким email вже існує', 409);
    }

    if (!['ADMIN', 'ADMIN_CAMPUS', 'ADMIN_COMMANDANT'].includes(role)) {
      throw new AppError('Невірна роль адміністратора', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    if (role === 'ADMIN_COMMANDANT' && !dormitoryId) {
      throw new AppError('dormitoryId є обов’язковим для ADMIN_COMMANDANT', 400);
    }

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

    const { password: _password, ...safeUser } = user;
    return safeUser;
  }
}
