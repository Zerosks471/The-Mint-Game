import { Router, Response, NextFunction } from 'express';
import { prisma } from '@mint/database';
import { ErrorCodes } from '@mint/types';
import { authenticate, AuthenticatedRequest, AppError } from '../middleware';
import { gameService } from '../services/game.service';

const router = Router();

// Helper to serialize BigInt values to strings for JSON
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

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

      // Sanitize user - remove sensitive fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, twoFactorSecret, emailVerifyToken, passwordResetToken, ...sanitized } = user;

      res.json({
        success: true,
        data: serializeBigInt(sanitized),
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

      // Record a snapshot (will skip if too soon since last one)
      gameService.recordSnapshot(req.user!.id, 'hourly').catch(() => {
        // Silently ignore snapshot errors
      });

      res.json({
        success: true,
        data: serializeBigInt(stats),
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/user/snapshot - Force create a snapshot (bypasses time check)
router.post(
  '/snapshot',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await gameService.recordSnapshotForce(req.user!.id);

      res.json({
        success: true,
        message: 'Snapshot created',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
