import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

const sendErrorDev = (err: AppError | Error, res: Response) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  res.status(statusCode).json({
    status: err instanceof AppError ? err.status : 'error',
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err: AppError | Error, res: Response) => {
  // Operational, trusted error: send message to client
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Внутрішня помилка сервера',
    });
  }
};

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction): void => {
  let error = err instanceof Error ? err : new Error(String(err));
  
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};
