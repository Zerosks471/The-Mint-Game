import { Router, Response, NextFunction } from 'express';
import { prisma } from '@mint/database';
import { ErrorCodes } from '@mint/types';
import { authenticate, AuthenticatedRequest, AppError } from '../middleware';

const router = Router();

// GET /api/v1/user/me - Get current user with stats
router.get(
  '/me',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          playerStats: true,
        },
      });

      if (!user) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
      }

      // Sanitize user
      const {
        passwordHash,
        twoFactorSecret,
        emailVerifyToken,
        passwordResetToken,
        ...sanitized
      } = user;

      res.json({
        success: true,
        data: sanitized,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/user/stats - Get player stats only
router.get(
  '/stats',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await prisma.playerStats.findUnique({
        where: { userId: req.user!.id },
      });

      if (!stats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
