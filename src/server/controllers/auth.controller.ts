import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, phone, studentIdNumber, course, faculty } = req.body;
      
      if (!email || !password || !firstName || !lastName || !phone || !studentIdNumber || !course || !faculty) {
        console.error('Registration missing fields. Body:', req.body);
        return res.status(400).json({ 
          error: `Помилка валідації! Відсутні деякі поля. 
          Сервер отримав: ${JSON.stringify(req.body)}. 
          Очистіть кеш (Ctrl+F5) і спробуйте ще раз.` 
        });
      }

      const result = await AuthService.register(email, password, firstName, lastName, phone, studentIdNumber, course, faculty);
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
