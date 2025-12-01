import { Router, Response } from 'express';
import { prisma } from '@mint/database';
import { AdminRequest } from '../middleware';
import { logger } from '../services/logger';

const router: ReturnType<typeof Router> = Router();

// In-memory system state (in production, use Redis)
let maintenanceMode = false;
let maintenanceMessage = 'The game is currently under maintenance. Please try again later.';
let maintenanceEndTime: Date | null = null;

/**
 * GET /admin/system/status
 * Get current system status
 */
router.get('/status', async (req: AdminRequest, res: Response) => {
  try {
    const [userCount, activeSessionCount] = await Promise.all([
      prisma.user.count(),
      prisma.userSession.count({ where: { isActive: true } }),
    ]);

    res.json({
      success: true,
      data: {
        maintenanceMode,
        maintenanceMessage,
        maintenanceEndTime,
        stats: {
          totalUsers: userCount,
          activeSessions: activeSessionCount,
        },
      },
    });
  } catch (error) {
    logger.error('Error getting system status', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get system status' },
    });
  }
});

/**
 * POST /admin/system/maintenance
 * Toggle maintenance mode
 */
router.post('/maintenance', async (req: AdminRequest, res: Response) => {
  try {
    const { enabled, message, endTime } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_VALUE', message: 'enabled must be a boolean' },
      });
    }

    maintenanceMode = enabled;
    if (message) maintenanceMessage = message;
    if (endTime) maintenanceEndTime = new Date(endTime);
    else if (!enabled) maintenanceEndTime = null;

    logger.info('Maintenance mode toggled', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      enabled,
      message: maintenanceMessage,
      endTime: maintenanceEndTime,
    });

    res.json({
      success: true,
      data: {
        maintenanceMode,
        maintenanceMessage,
        maintenanceEndTime,
      },
    });
  } catch (error) {
    logger.error('Error toggling maintenance mode', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle maintenance mode' },
    });
  }
});

/**
 * POST /admin/system/announcement
 * Send announcement to all users (via in-game notification)
 */
router.post('/announcement', async (req: AdminRequest, res: Response) => {
  try {
    const { title, message, type = 'announcement' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Title and message are required' },
      });
    }

    // Get all user IDs
    const users = await prisma.user.findMany({
      where: { accountStatus: 'active' },
      select: { id: true },
    });

    // Create notifications for all users
    const notifications = users.map(user => ({
      userId: user.id,
      type,
      title,
      message,
      data: { fromAdmin: true, adminId: req.admin?.id },
    }));

    // Batch insert (Prisma createMany)
    const result = await prisma.notification.createMany({
      data: notifications,
    });

    logger.info('Announcement sent', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      title,
      recipientCount: result.count,
    });

    res.json({
      success: true,
      data: {
        sent: result.count,
        title,
      },
    });
  } catch (error) {
    logger.error('Error sending announcement', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send announcement' },
    });
  }
});

/**
 * POST /admin/system/notification
 * Send notification to specific users
 */
router.post('/notification', async (req: AdminRequest, res: Response) => {
  try {
    const { userIds, title, message, type = 'admin' } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_USERS', message: 'userIds must be a non-empty array' },
      });
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Title and message are required' },
      });
    }

    const notifications = userIds.map((userId: string) => ({
      userId,
      type,
      title,
      message,
      data: { fromAdmin: true, adminId: req.admin?.id },
    }));

    const result = await prisma.notification.createMany({
      data: notifications,
    });

    logger.info('Notifications sent', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      title,
      recipientCount: result.count,
    });

    res.json({
      success: true,
      data: {
        sent: result.count,
      },
    });
  } catch (error) {
    logger.error('Error sending notifications', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send notifications' },
    });
  }
});

/**
 * POST /admin/system/force-logout-all
 * Force logout all users (emergency)
 */
router.post('/force-logout-all', async (req: AdminRequest, res: Response) => {
  try {
    const { confirm, reason } = req.body;

    if (confirm !== 'LOGOUT_ALL') {
      return res.status(400).json({
        success: false,
        error: { code: 'CONFIRMATION_REQUIRED', message: 'Must confirm with "LOGOUT_ALL"' },
      });
    }

    const result = await prisma.userSession.updateMany({
      where: { isActive: true },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: reason || 'Admin-initiated global logout',
      },
    });

    logger.info('All users logged out', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      sessionsRevoked: result.count,
      reason,
    });

    res.json({
      success: true,
      data: {
        sessionsRevoked: result.count,
      },
    });
  } catch (error) {
    logger.error('Error forcing global logout', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to force global logout' },
    });
  }
});

/**
 * GET /admin/system/online-users
 * Get currently online users
 */
router.get('/online-users', async (req: AdminRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const onlineUsers = await prisma.userSession.findMany({
      where: {
        isActive: true,
        lastActivityAt: { gte: fiveMinutesAgo },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            isPremium: true,
            isAdmin: true,
          },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: {
        count: onlineUsers.length,
        users: onlineUsers.map(s => ({
          ...s.user,
          sessionId: s.id,
          deviceType: s.deviceType,
          lastActivityAt: s.lastActivityAt,
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting online users', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get online users' },
    });
  }
});

// Export maintenance state checker for other services
export function isMaintenanceMode() {
  return maintenanceMode;
}

export function getMaintenanceInfo() {
  return { maintenanceMode, maintenanceMessage, maintenanceEndTime };
}

export default router;
