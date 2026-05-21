import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };
      if (parsed?.body) req.body = parsed.body as typeof req.body;
      if (parsed?.query) req.query = parsed.query as typeof req.query;
      if (parsed?.params) req.params = parsed.params as typeof req.params;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Помилка валідації',
          errors: error.issues.reduce<Record<string, string[]>>((acc, issue) => {
            const key = issue.path.join('.');
            if (!acc[key]) acc[key] = [];
            acc[key].push(issue.message);
            return acc;
          }, {})
        });
      }
      return next(error);
    }
  };
};