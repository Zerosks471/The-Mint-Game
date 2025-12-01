import { Router, Response } from 'express';
import { prisma } from '@mint/database';
import { AdminRequest } from '../middleware';
import { logger } from '../services/logger';

const router: ReturnType<typeof Router> = Router();

/**
 * GET /admin/users
 * List all users with pagination and search
 */
router.get('/', async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;
    const status = req.query.status as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.accountStatus = status;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          accountStatus: true,
          isAdmin: true,
          isPremium: true,
          createdAt: true,
          lastLoginAt: true,
          lastActiveAt: true,
          playerStats: {
            select: {
              cash: true,
              playerLevel: true,
              currentPhase: true,
              lifetimeCashEarned: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error listing users', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' },
    });
  }
});

/**
 * GET /admin/users/:id
 * Get detailed user information
 */
router.get('/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        playerStats: true,
        sessions: {
          where: { isActive: true },
          select: {
            id: true,
            deviceType: true,
            ipAddress: true,
            lastActivityAt: true,
            createdAt: true,
          },
        },
        properties: {
          include: { propertyType: true },
          take: 10,
        },
        businesses: {
          include: { businessType: true },
          take: 10,
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            properties: true,
            businesses: true,
            achievements: true,
            purchases: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Remove sensitive fields
    const { passwordHash, twoFactorSecret, passwordResetToken, ...safeUser } = user;

    res.json({
      success: true,
      data: safeUser,
    });
  } catch (error) {
    logger.error('Error getting user', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' },
    });
  }
});

/**
 * PATCH /admin/users/:id/status
 * Update user account status (ban/unban)
 */
router.patch('/:id/status', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['active', 'suspended', 'banned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Invalid status value' },
      });
    }

    // Prevent admin from modifying their own status
    if (id === req.admin?.id) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_MODIFY', message: 'Cannot modify your own account status' },
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        accountStatus: status,
      },
      select: {
        id: true,
        username: true,
        accountStatus: true,
      },
    });

    logger.info('User status updated', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      targetUserId: id,
      newStatus: status,
      reason,
    });

    // Revoke all active sessions if banning/suspending
    if (status !== 'active') {
      await prisma.userSession.updateMany({
        where: { userId: id, isActive: true },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokeReason: `Account ${status}: ${reason || 'No reason provided'}`,
        },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error updating user status', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update user status' },
    });
  }
});

/**
 * PATCH /admin/users/:id/admin
 * Grant or revoke admin privileges
 */
router.patch('/:id/admin', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body;

    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_VALUE', message: 'isAdmin must be a boolean' },
      });
    }

    // Prevent admin from revoking their own admin status
    if (id === req.admin?.id && !isAdmin) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_MODIFY', message: 'Cannot revoke your own admin privileges' },
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isAdmin },
      select: {
        id: true,
        username: true,
        isAdmin: true,
      },
    });

    logger.info('User admin status updated', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      targetUserId: id,
      isAdmin,
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error updating admin status', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update admin status' },
    });
  }
});

/**
 * POST /admin/users/:id/reset-password
 * Force password reset for a user
 */
router.post('/:id/reset-password', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Generate a temporary reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: expiresAt,
      },
    });

    // Revoke all active sessions
    await prisma.userSession.updateMany({
      where: { userId: id, isActive: true },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: 'Admin-initiated password reset',
      },
    });

    logger.info('Password reset initiated by admin', {
      adminId: req.admin?.id,
      targetUserId: id,
    });

    res.json({
      success: true,
      message: 'Password reset initiated. User sessions have been revoked.',
    });
  } catch (error) {
    logger.error('Error initiating password reset', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to initiate password reset' },
    });
  }
});

export default router;
