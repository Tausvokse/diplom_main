import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from './auth.middleware';

export const auditLogMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    if (req.user && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      prisma.auditLog.create({
        data: {
          adminId: req.user.id,
          action: req.method,
          entity: req.baseUrl + req.path,
          details: {
            body: req.body,
            params: req.params,
            query: req.query,
            statusCode: res.statusCode
          }
        }
      }).catch(console.error);
    }
  });
  next();
};