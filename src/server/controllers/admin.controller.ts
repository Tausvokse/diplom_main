import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';

export class AdminController {
  // ... попередні методи
  static async getDormitories(req: Request, res: Response, next: NextFunction) {
    try {
      const dorms = await AdminService.getDormitories();
      res.json(dorms);
    } catch (error) {
      next(error);
    }
  }

  static async updateRoomStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params;
      const { status } = req.body;
      
      const updated = await AdminService.updateRoomStatus(roomId, status);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const apps = await AdminService.getApplications();
      // Parsing string arrays for client
      const formattedApps = apps.map(app => ({
        ...app,
        scanDocumentsUrl: app.scanDocumentsUrl.split(',').filter(Boolean)
      }));
      res.json(formattedApps);
    } catch (error) {
      next(error);
    }
  }

  static async approveApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const app = await AdminService.approveApplication(id);
      res.json(app);
    } catch (error) {
      next(error);
    }
  }

  static async rejectApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason) {
        res.status(400).json({ message: 'Причина відмови обов\'язкова' });
        return;
      }
      const app = await AdminService.rejectApplication(id, reason);
      res.json(app);
    } catch (error) {
      next(error);
    }
  }

  static async getAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const admins = await AdminService.getAdmins();
      res.json(admins);
    } catch (error) {
      next(error);
    }
  }

  static async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, role, dormitoryId } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({ message: 'Заповніть всі обов\'язкові поля' });
        return;
      }

      const admin = await AuthService.createAdmin(email, password, firstName, lastName, role, dormitoryId);
      res.json(admin);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
