import { Request, Response, NextFunction } from 'express';
import { AllocationService } from '../services/allocation.service';

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
}
