import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  }
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should throw an error if user is not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      await expect(AuthService.login('test@kai.edu.ua', 'password')).rejects.toThrow('Невірний email або пароль');
    });

    it('should throw an error if password does not match', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: '1', email: 'test@kai.edu.ua', password: 'hashedpassword', role: 'STUDENT' } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      await expect(AuthService.login('test@kai.edu.ua', 'wrongpassword')).rejects.toThrow('Невірний email або пароль');
    });

    it('should return safeUser and tokens on successful login', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: '1', email: 'test@kai.edu.ua', password: 'hashedpassword', role: 'STUDENT' } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwt.sign).mockReturnValue('mock-token' as never);

      const result = await AuthService.login('test@kai.edu.ua', 'correctpassword');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
      expect(result).toHaveProperty('accessToken', 'mock-token');
      expect(result).toHaveProperty('refreshToken', 'mock-token');
    });
  });

  describe('register', () => {
    it('should throw error if email exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: '1' } as any);
      await expect(AuthService.register('test@kai.edu.ua', 'pass', 'John', 'Doe', '123', 'KA123', 1, 'ФКНТ', 'MALE')).rejects.toThrow('Користувач з таким email вже існує');
    });

    it('should successfully register a student', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedpass' as never);
      
      const mockUser = { id: '1', email: 'test@kai.edu.ua', password: 'hashedpass', role: 'STUDENT' };
      vi.mocked(prisma.$transaction).mockResolvedValue(mockUser as any);
      vi.mocked(jwt.sign).mockReturnValue('mock-token' as never);

      const result = await AuthService.register('test@kai.edu.ua', 'pass', 'John', 'Doe', '123', 'KA123', 1, 'ФКНТ', 'MALE');
      expect(result.user.email).toBe('test@kai.edu.ua');
      expect(result.accessToken).toBe('mock-token');
    });
  });
});
