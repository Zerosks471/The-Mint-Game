import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../services/logger';
import { prisma } from '@mint/database';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  sessionId: string;
}

export interface AdminRequest extends Request {
  admin?: AdminUser;
}

/**
 * Admin Authentication Middleware
 * Validates JWT and ensures user has admin privileges
 * Uses the main app's JWT secret to validate existing tokens
 */
export async function adminAuth(
  req: AdminRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Authentication required',
        },
      });
    }

    const token = authHeader.slice(7);

    // Verify token using main app's JWT secret
    let payload: any;
    try {
      payload = jwt.verify(token, config.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired',
          },
        });
      }
      throw err;
    }

    // Verify this is an access token
    if (payload.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Invalid token type',
        },
      });
    }

    // CRITICAL: Verify user is actually an admin in the database
    // Don't just trust the token - verify against current DB state
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        accountStatus: true,
      },
    });

    if (!user) {
      logger.warn('Admin auth failed: user not found', { userId: payload.sub });
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    if (!user.isAdmin) {
      logger.warn('Admin auth failed: user is not admin', {
        userId: user.id,
        username: user.username,
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_ADMIN',
          message: 'Admin access required',
        },
      });
    }

    if (user.accountStatus !== 'active') {
      logger.warn('Admin auth failed: account not active', {
        userId: user.id,
        status: user.accountStatus,
      });
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is not active',
        },
      });
    }

    // Attach admin info to request
    req.admin = {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      sessionId: payload.sessionId,
    };

    logger.info('Admin authenticated', {
      adminId: user.id,
      username: user.username,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('Admin auth error', { error });
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}
