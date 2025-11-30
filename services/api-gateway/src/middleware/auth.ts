import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticationError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    isPremium: boolean;
    isAdmin: boolean;
    sessionId: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.slice(7);

    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as any;

    if (payload.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      isPremium: payload.isPremium,
      isAdmin: payload.isAdmin || false,
      sessionId: payload.sessionId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else {
      next(error);
    }
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as any;

    if (payload.type === 'access') {
      req.user = {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        isPremium: payload.isPremium,
        isAdmin: payload.isAdmin || false,
        sessionId: payload.sessionId,
      };
    }
  } catch {
    // Token invalid, continue without user
  }

  next();
};

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
  }
  next();
};
