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
      const { course, faculty, privilegeCategoryId, clusteringVector, type, previousRoom, checkoutReason } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[] | undefined;

      const app = await StudentService.submitApplication(
        req.user!.id, 
        course, 
        faculty, 
        privilegeCategoryId, 
        clusteringVector, 
        files,
        type || 'CHECK_IN',
        previousRoom,
        checkoutReason
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
    } catch (error) {
      next(error);
    }
  }

  static async joinGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const group = await StudentService.joinGroup(req.user!.id, code);
      res.json(group);
    } catch (error) {
      next(error);
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

      const complaint = await StudentService.submitComplaint(req.user!.id, accusedId, content, evidenceUrl);
      res.json(complaint);
    } catch (error) {
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
      const { description, masterId } = req.body;
      const request = await StudentService.submitRepairRequest(req.user!.id, description, masterId || undefined);
      res.json(request);
    } catch (error) {
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

  static async updateRepairStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const request = await StudentService.updateRepairStatus(req.user!.id, id, status);
      res.json(request);
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
      const result = await StudentService.donateToJar(req.user!.id, jarId, Number(amount), comment);
      res.json(result);
    } catch (error) {
      next(error);
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

  static async markAllNotificationsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await StudentService.markAllNotificationsRead(req.user!.id);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  }
}
