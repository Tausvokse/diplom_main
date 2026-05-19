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
        scanDocumentsUrl: application.scanDocumentsUrl ? application.scanDocumentsUrl.split(',').filter(Boolean) : []
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

  static async getNeighbors(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const neighbors = await StudentService.getNeighbors(req.user!.id);
      res.json(neighbors);
    } catch (error: any) {
      next(error);
    }
  }

  static async getMasters(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const masters = await StudentService.getMasters();
      res.json(masters);
    } catch (error: any) {
      next(error);
    }
  }

  static async submitComplaint(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { accusedId, content } = req.body;
      const file = req.file;
      const evidenceUrl = file ? `/uploads/${file.filename}` : undefined;

      if (!accusedId || !content) {
        res.status(400).json({ message: 'Вкажіть порушника та зміст скарги' });
        return;
      }

      const complaint = await StudentService.submitComplaint(req.user!.id, accusedId, content, evidenceUrl);
      res.json(complaint);
    } catch (error: any) {
      next(error);
    }
  }

  static async getComplaints(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const complaints = await StudentService.getComplaints(req.user!.id);
      res.json(complaints);
    } catch (error: any) {
      next(error);
    }
  }

  static async submitRepairRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { description } = req.body;
      if (!description) {
        res.status(400).json({ message: 'Опишіть проблему' });
        return;
      }
      const request = await StudentService.submitRepairRequest(req.user!.id, description);
      res.json(request);
    } catch (error: any) {
      next(error);
    }
  }

  static async getRepairRequests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const requests = await StudentService.getRepairRequests(req.user!.id);
      res.json(requests);
    } catch (error: any) {
      next(error);
    }
  }

  static async getJars(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const jars = await StudentService.getJars(req.user!.id);
      res.json(jars);
    } catch (error: any) {
      next(error);
    }
  }

  static async donateToJar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { jarId, amount, comment } = req.body;
      if (!jarId || !amount) {
        res.status(400).json({ message: 'Оберіть банку та вкажіть суму' });
        return;
      }
      const result = await StudentService.donateToJar(req.user!.id, jarId, Number(amount), comment);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getPayments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payments = await StudentService.getPayments(req.user!.id);
      res.json(payments);
    } catch (error: any) {
      next(error);
    }
  }

  static async payPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const payment = await StudentService.payPayment(req.user!.id, id);
      res.json(payment);
    } catch (error: any) {
      next(error);
    }
  }

  static async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notifications = await StudentService.getNotifications(req.user!.id);
      res.json(notifications);
    } catch (error: any) {
      next(error);
    }
  }

  static async markNotificationRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const notification = await StudentService.markNotificationRead(req.user!.id, id);
      res.json(notification);
    } catch (error: any) {
      next(error);
    }
  }
}
