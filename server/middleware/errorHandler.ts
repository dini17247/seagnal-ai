import { Request, Response, NextFunction } from 'express';
import * as env from '../config/env';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[Express Error Handler]:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Maritime Server Anomaly';
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: message,
      details: env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
}
