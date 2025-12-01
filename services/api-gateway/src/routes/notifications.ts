import { Router, Response, NextFunction } from 'express';
import { prisma } from '@mint/database';
import { authenticate, AuthenticatedRequest } from '../middleware';

const router = Router();

/**
 * GET /api/v1/notifications
 * Get user's notifications
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const unreadOnly = req.query.unread === 'true';

      const where = {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      };

      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        prisma.notification.count({
          where: { userId, isRead: false },
        }),
      ]);

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/notifications/count
 * Get unread notification count (lightweight endpoint for polling)
 */
router.get(
  '/count',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      res.json({
        success: true,
        data: { unreadCount },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a notification as read
 */
router.patch(
  '/:id/read',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const notification = await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
      });

      if (notification.count === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Notification not found' },
        });
      }

      res.json({
        success: true,
        data: { id, isRead: true },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/notifications/read-all
 * Mark all notifications as read
 */
router.post(
  '/read-all',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const result = await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      res.json({
        success: true,
        data: { markedRead: result.count },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/notifications/:id
 * Delete a notification
 */
router.delete(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const notification = await prisma.notification.deleteMany({
        where: { id, userId },
      });

      if (notification.count === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Notification not found' },
        });
      }

      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/notifications
 * Clear all notifications
 */
router.delete(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const result = await prisma.notification.deleteMany({
        where: { userId },
      });

      res.json({
        success: true,
        data: { deleted: result.count },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
