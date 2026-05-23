import { Request, Response, NextFunction } from 'express';
import { ComplaintStatus } from '@prisma/client';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class AdminController {
  static async getDormitories(req: Request, res: Response, next: NextFunction) {
    try {
      const dorms = await AdminService.getDormitories();
      res.json(dorms);
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await AdminService.getAuditLogs(page, limit);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  }

  static async createDormitory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, address, universityId } = req.body;
      const dorm = await AdminService.createDormitory(name, address, universityId);
      res.status(201).json(dorm);
    } catch (error) {
      next(error);
    }
  }

  static async updateDormitory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const dorm = await AdminService.updateDormitory(id, req.body);
      res.json(dorm);
    } catch (error) {
      next(error);
    }
  }

  static async deleteDormitory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await AdminService.deleteDormitory(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async createFloor(req: Request, res: Response, next: NextFunction) {
    try {
      const { dormitoryId, floorNumber } = req.body;
      const floor = await AdminService.createFloor(dormitoryId, floorNumber);
      res.status(201).json(floor);
    } catch (error) {
      next(error);
    }
  }

  static async updateFloor(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { floorNumber } = req.body;
      const floor = await AdminService.updateFloor(id, floorNumber);
      res.json(floor);
    } catch (error) {
      next(error);
    }
  }

  static async deleteFloor(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await AdminService.deleteFloor(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { floorId, roomNumber, capacity } = req.body;
      const room = await AdminService.createRoom(floorId, roomNumber, capacity);
      res.status(201).json(room);
    } catch (error) {
      next(error);
    }
  }

  static async updateRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params;
      const room = await AdminService.updateRoom(roomId, req.body);
      res.json(room);
    } catch (error) {
      next(error);
    }
  }

  static async deleteRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params;
      await AdminService.deleteRoom(roomId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async updateRoomStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params;
      const { status } = req.body;
      const room = await AdminService.updateRoomStatus(roomId, status);
      res.json(room);
    } catch (error) {
      next(error);
    }
  }

  static async getRoomStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params;
      const students = await AdminService.getRoomStudents(roomId);
      res.json(students);
    } catch (error) {
      next(error);
    }
  }

  static async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const apps = await AdminService.getApplications();
      res.json(apps);
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

  static async updateApplicationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const app = await AdminService.updateApplicationStatus(id, status);
      res.json(app);
    } catch (error) {
      next(error);
    }
  }

  static async rejectApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
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

  static async getAllStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const studentsData = await AdminService.getAllStudents(page, limit);
      res.json(studentsData);
    } catch (error) {
      next(error);
    }
  }

  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getAnalytics();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  static async getComplaints(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const complaints = await AdminService.getComplaints(req.user!.id);
      res.json(complaints);
    } catch (error) {
      next(error);
    }
  }

  static async updateComplaintStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const complaint = await AdminService.updateComplaintStatus(req.user!.id, id, status as ComplaintStatus);
      res.json(complaint);
    } catch (error) {
      next(error);
    }
  }

  static async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, role, dormitoryId } = req.body;
      const admin = await AuthService.createAdmin(email, password, firstName, lastName, role, dormitoryId);
      res.json(admin);
    } catch (error) {
      next(error);
    }
  }

  static async getStudentDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const details = await AdminService.getStudentDetails(id);
      res.json(details);
    } catch (error) {
      next(error);
    }
  }

  static async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { amount, dueDate, description } = req.body;
      const invoice = await AdminService.createInvoice(id, amount, new Date(dueDate), description);
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }

  static async getDebts(req: Request, res: Response, next: NextFunction) {
    try {
      const debts = await AdminService.getDebts();
      res.json(debts);
    } catch (error) {
      next(error);
    }
  }

  static async createMassNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, message } = req.body;
      await AdminService.createMassNotification(title, message);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async createJar(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, goalAmount, description, dormitoryId, monobankUrl } = req.body;
      const jar = await AdminService.createJar(title, goalAmount, description, dormitoryId, monobankUrl);
      res.json(jar);
    } catch (error) {
      next(error);
    }
  }

  static async getJars(req: Request, res: Response, next: NextFunction) {
    try {
      const jars = await AdminService.getJars();
      res.json(jars);
    } catch (error) {
      next(error);
    }
  }

  static async deleteJar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await AdminService.deleteJar(id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
