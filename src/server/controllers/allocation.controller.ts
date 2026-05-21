import { Request, Response, NextFunction } from 'express';
import { AllocationService } from '../services/allocation.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class AllocationController {
  static async runAlgorithm(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await AllocationService.runAllocationPipeline();
      res.json(results);
    } catch (error) {
      next(error);
    }
  }

  static async previewAlgorithm(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await AllocationService.previewAllocationPipeline();
      res.json(results);
    } catch (error) {
      next(error);
    }
  }

  static async confirmAllocationPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { plan } = req.body;
      const result = await AllocationService.confirmAllocationPlan(plan);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getPool(req: Request, res: Response, next: NextFunction) {
    try {
      const students = await AllocationService.getPool();
      // Parsing vectors for client
      const formatted = students.map(s => ({
        ...s,
        clusteringVector: s.clusteringVector ? JSON.parse(s.clusteringVector) : null
      }));
      res.json(formatted);
    } catch (error) {
      next(error);
    }
  }

  static async evictStudent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.body;
      await AllocationService.evictStudent(studentId, req.user?.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async allocateStudentToRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.params;
      const { studentId } = req.body;
      const result = await AllocationService.allocateStudentToRoom(studentId, roomId, req.user?.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
