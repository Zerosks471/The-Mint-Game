import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '@mint/database';
import { ErrorCodes } from '@mint/types';
import { authenticate, AuthenticatedRequest, AppError } from '../middleware';
import { gameService } from '../services/game.service';

const SALT_ROUNDS = 12;

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

// PATCH /api/v1/user/settings - Update user settings
router.patch(
  '/settings',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { displayName, theme, soundEnabled, musicEnabled, notificationsEnabled } = req.body;

      // Validate theme if provided
      if (theme !== undefined && !['light', 'dark'].includes(theme)) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid theme value', 400);
      }

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (theme !== undefined) updateData.theme = theme;
      if (soundEnabled !== undefined) updateData.soundEnabled = soundEnabled;
      if (musicEnabled !== undefined) updateData.musicEnabled = musicEnabled;
      if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;

      if (Object.keys(updateData).length === 0) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No fields to update', 400);
      }

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: updateData,
      });

      // Sanitize response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, twoFactorSecret, emailVerifyToken, passwordResetToken, ...sanitized } = user;

      res.json({
        success: true,
        data: sanitized,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/user/change-password - Change user password
router.post(
  '/change-password',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Current and new password required', 400);
      }

      if (newPassword.length < 8) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Password must be at least 8 characters', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Current password is incorrect', 401);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      await prisma.user.update({
        where: { id: req.user!.id },
        data: { passwordHash },
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/user/delete-account - Soft delete user account
router.post(
  '/delete-account',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { password } = req.body;

      if (!password) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Password required to confirm deletion', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Password is incorrect', 401);
      }

      // Soft delete - set deletedAt and change account status
      await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          deletedAt: new Date(),
          accountStatus: 'deleted',
        },
      });

      // Revoke all sessions
      await prisma.userSession.updateMany({
        where: { userId: req.user!.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokeReason: 'Account deleted',
        },
      });

      res.json({
        success: true,
        message: 'Account scheduled for deletion. You have 30 days to recover it by logging in.',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
