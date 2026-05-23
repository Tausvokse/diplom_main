import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../lib/prisma';
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Відсутній токен авторизації' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; role: Role };
    
    // Check if user still exists in DB
    prisma.user.findUnique({ where: { id: decoded.id } })
      .then(user => {
        if (!user) {
          res.status(401).json({ message: 'Користувач більше не існує' });
          return;
        }
        req.user = decoded;
        next();
      })
      .catch(error => {
        res.status(500).json({ message: 'Помилка сервера при перевірці токена' });
      });
  } catch (error) {
    res.status(401).json({ message: 'Недійсний або прострочений токен' });
  }
};
