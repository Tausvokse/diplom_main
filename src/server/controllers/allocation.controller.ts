import { Request, Response, NextFunction } from 'express';
import { AllocationService } from '../services/allocation.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class AllocationController {
  static async runAlgorithm(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await AllocationService.runAllocationPipeline();
      res.json(results);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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
      if (!studentId) {
        res.status(400).json({ message: 'studentId is required' });
        return;
      }
      await AllocationService.evictStudent(studentId, req.user?.id);
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  }
}
