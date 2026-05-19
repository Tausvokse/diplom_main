import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Помилка валідації',
          errors: error.errors.reduce((acc, curr) => {
            const key = curr.path.join('.');
            if (!acc[key]) acc[key] = [];
            acc[key].push(curr.message);
            return acc;
          }, {} as Record<string, string[]>)
        });
      }
      return res.status(400).json({ message: 'Помилка валідації' });
    }
  };
};