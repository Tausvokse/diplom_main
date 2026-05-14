import { Response, NextFunction } from 'express';
import { StudentService } from '../services/student.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class StudentController {
  static async getDashboardData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { application, group } = await StudentService.getApplication(req.user!.id);
      
      // Розділяємо масив лінків для клієнта
      const formattedApp = application ? {
        ...application,
        scanDocumentsUrl: application.scanDocumentsUrl.split(',').filter(Boolean)
      } : null;

      res.json({ application: formattedApp, group });
    } catch (error) {
      next(error);
    }
  }

  static async submitApplication(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { course, faculty, privilegeCategoryId, clusteringVector } = req.body;
      const files = req.files as Express.Multer.File[] || [];

      if (!course || !faculty || !clusteringVector) {
        res.status(400).json({ message: 'Заповніть всі обов\'язкові поля' });
        return;
      }

      const app = await StudentService.submitApplication(
        req.user!.id, 
        course, 
        faculty, 
        privilegeCategoryId, 
        clusteringVector, 
        files
      );
      
      res.json(app);
    } catch (error) {
      next(error);
    }
  }

  static async createGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const group = await StudentService.createGroup(req.user!.id);
      res.json(group);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async joinGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      if (!code) {
        res.status(400).json({ message: 'Код групи обов\'язковий' });
        return;
      }
      const group = await StudentService.joinGroup(req.user!.id, code);
      res.json(group);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
