import type { NextFunction, Request, Response } from 'express';
import { AppError, ValidationAppError, AuthenticationError, AuthorizationError, NotFoundError, ConflictAppError } from '../shared/errors.js';
import { auditService } from '../services/auditService.js';
import logger from '../utils/logger.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Log the error
  logger.error({
    error: err instanceof Error ? {
      name: err.name,
      message: err.message,
      stack: err.stack,
    } : err,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
  }, 'Error occurred');

  // Log to audit trail if user is authenticated
  if (req.user) {
    auditService.logFailure(
      req.user.id,
      'error',
      'system',
      `Error on ${req.method} ${req.url}`,
      err instanceof Error ? err.message : 'Unknown error',
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      }
    ).catch((auditError) => {
      logger.error({ error: auditError }, 'Failed to log error to audit trail');
    });
  }

  // Handle known AppError types
  if (err instanceof ValidationAppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
    });
  }

  if (err instanceof AuthenticationError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
    });
  }

  if (err instanceof AuthorizationError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
    });
  }

  if (err instanceof ConflictAppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
    });
  }

  // Handle generic errors
  const message = err instanceof Error ? err.message : 'Internal server error';
  
  return res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message,
  });
}
