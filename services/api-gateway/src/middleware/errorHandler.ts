import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiResponse, ErrorCodes } from '@mint/types';

export class AppError extends Error {
  public code: string;
  public override message: string;
  public statusCode: number;
  public details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.message = message;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ApiResponse<never> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCodes.VALIDATION_ERROR, message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = ErrorCodes.UNAUTHORIZED) {
    super(code, message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(ErrorCodes.NOT_FOUND, `${resource}${id ? ` with id ${id}` : ''} not found`, 404);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Request error:', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid request data',
        details: err.errors,
      },
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: isProduction ? 'An unexpected error occurred' : err.message,
      requestId: req.requestId,
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: `Cannot ${req.method} ${req.path}`,
    },
  });
}
