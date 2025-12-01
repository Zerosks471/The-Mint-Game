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

/**
 * POST /admin/users/:id/give-cash
 * Add cash to a user's account
 */
router.post('/:id/give-cash', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const cashAmount = parseFloat(amount);
    if (isNaN(cashAmount) || cashAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Amount must be a positive number' },
      });
    }

    const stats = await prisma.playerStats.update({
      where: { userId: id },
      data: {
        cash: { increment: cashAmount },
      },
      select: {
        cash: true,
        userId: true,
      },
    });

    logger.info('Cash given to user', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      targetUserId: id,
      amount: cashAmount,
      reason,
      newBalance: stats.cash.toString(),
    });

    res.json({
      success: true,
      data: {
        newBalance: stats.cash.toString(),
        amountAdded: cashAmount,
      },
    });
  } catch (error) {
    logger.error('Error giving cash', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to give cash' },
    });
  }
});

/**
 * POST /admin/users/:id/remove-cash
 * Remove cash from a user's account
 */
router.post('/:id/remove-cash', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const cashAmount = parseFloat(amount);
    if (isNaN(cashAmount) || cashAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Amount must be a positive number' },
      });
    }

    // Get current balance first
    const currentStats = await prisma.playerStats.findUnique({
      where: { userId: id },
      select: { cash: true },
    });

    if (!currentStats) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User stats not found' },
      });
    }

    const newBalance = Math.max(0, Number(currentStats.cash) - cashAmount);

    const stats = await prisma.playerStats.update({
      where: { userId: id },
      data: {
        cash: newBalance,
      },
      select: {
        cash: true,
      },
    });

    logger.info('Cash removed from user', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      targetUserId: id,
      amount: cashAmount,
      reason,
      newBalance: stats.cash.toString(),
    });

    res.json({
      success: true,
      data: {
        newBalance: stats.cash.toString(),
        amountRemoved: cashAmount,
      },
    });
  } catch (error) {
    logger.error('Error removing cash', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove cash' },
    });
  }
});

/**
 * POST /admin/users/:id/set-cash
 * Set user's cash to a specific amount
 */
router.post('/:id/set-cash', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const cashAmount = parseFloat(amount);
    if (isNaN(cashAmount) || cashAmount < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Amount must be a non-negative number' },
      });
    }

    const stats = await prisma.playerStats.update({
      where: { userId: id },
      data: {
        cash: cashAmount,
      },
      select: {
        cash: true,
      },
    });

    logger.info('Cash set for user', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      targetUserId: id,
      amount: cashAmount,
      reason,
    });

    res.json({
      success: true,
      data: {
        newBalance: stats.cash.toString(),
      },
    });
  } catch (error) {
    logger.error('Error setting cash', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to set cash' },
    });
  }
});

/**
 * PATCH /admin/users/:id/premium
 * Grant or revoke premium status
 */
router.patch('/:id/premium', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isPremium, durationDays } = req.body;

    if (typeof isPremium !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_VALUE', message: 'isPremium must be a boolean' },
      });
    }

    let premiumUntil: Date | null = null;
    if (isPremium && durationDays) {
      premiumUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    } else if (isPremium) {
      // Default to 30 days
      premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        isPremium,
        premiumUntil,
      },
      select: {
        id: true,
        username: true,
        isPremium: true,
        premiumUntil: true,
      },
    });

    logger.info('User premium status updated', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      targetUserId: id,
      isPremium,
      premiumUntil,
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error updating premium status', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update premium status' },
    });
  }
});

/**
 * GET /admin/users/:id/inventory
 * Get full user inventory (properties, businesses, stocks, achievements)
 */
router.get('/:id/inventory', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [properties, businesses, stocks, achievements, upgrades, projects] = await Promise.all([
      prisma.playerProperty.findMany({
        where: { userId: id },
        include: { propertyType: true },
        orderBy: { firstPurchasedAt: 'desc' },
      }),
      prisma.playerBusiness.findMany({
        where: { userId: id },
        include: { businessType: true },
        orderBy: { purchasedAt: 'desc' },
      }),
      prisma.stockHolding.findMany({
        where: { userId: id },
        include: {
          playerStock: true,
          botStock: true,
        },
      }),
      prisma.playerAchievement.findMany({
        where: { userId: id },
        include: { achievement: true },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.playerUpgrade.findMany({
        where: { userId: id },
        include: { upgrade: true },
      }),
      prisma.playerProject.findMany({
        where: { userId: id },
        include: { project: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        properties: properties.map(p => ({
          ...p,
          totalSpent: p.totalSpent.toString(),
          currentIncomeHour: p.currentIncomeHour.toString(),
        })),
        businesses: businesses.map(b => ({
          ...b,
          totalInvested: b.totalInvested.toString(),
          totalRevenue: b.totalRevenue.toString(),
          currentRevenue: b.currentRevenue.toString(),
        })),
        stocks: stocks.map(s => ({
          ...s,
          avgBuyPrice: s.avgBuyPrice.toString(),
          totalInvested: s.totalInvested.toString(),
        })),
        achievements,
        upgrades: upgrades.map(u => ({
          ...u,
          totalSpent: u.totalSpent.toString(),
        })),
        projects,
      },
    });
  } catch (error) {
    logger.error('Error getting user inventory', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get user inventory' },
    });
  }
});

/**
 * POST /admin/users/:id/reset-progress
 * Reset a user's game progress (dangerous!)
 */
router.post('/:id/reset-progress', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { confirm, keepPremium } = req.body;

    if (confirm !== 'RESET') {
      return res.status(400).json({
        success: false,
        error: { code: 'CONFIRMATION_REQUIRED', message: 'Must confirm with "RESET"' },
      });
    }

    // Delete all user game data
    await prisma.$transaction([
      prisma.playerProperty.deleteMany({ where: { userId: id } }),
      prisma.playerBusiness.deleteMany({ where: { userId: id } }),
      prisma.stockHolding.deleteMany({ where: { userId: id } }),
      prisma.stockOrder.deleteMany({ where: { userId: id } }),
      prisma.playerAchievement.deleteMany({ where: { userId: id } }),
      prisma.playerUpgrade.deleteMany({ where: { userId: id } }),
      prisma.playerProject.deleteMany({ where: { userId: id } }),
      prisma.playerPrestigePerk.deleteMany({ where: { userId: id } }),
      prisma.playerIPO.deleteMany({ where: { userId: id } }),
      prisma.playerStock.deleteMany({ where: { userId: id } }),
      prisma.playerStats.update({
        where: { userId: id },
        data: {
          cash: 1000,
          premiumCurrency: 0,
          lifetimeCashEarned: 0,
          playerLevel: 1,
          experiencePoints: 0,
          currentPhase: 1,
          prestigeLevel: 0,
          prestigePoints: 0,
          prestigeMultiplier: 1,
          timesPrestiged: 0,
          baseIncomePerHour: 0,
          currentMultiplier: 1,
          effectiveIncomeHour: 0,
          totalPropertiesOwned: 0,
          totalBusinessesOwned: 0,
          highestNetWorth: 0,
        },
      }),
    ]);

    // Optionally revoke premium
    if (!keepPremium) {
      await prisma.user.update({
        where: { id },
        data: {
          isPremium: false,
          premiumUntil: null,
        },
      });
    }

    logger.info('User progress reset', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      targetUserId: id,
      keepPremium,
    });

    res.json({
      success: true,
      message: 'User progress has been reset',
    });
  } catch (error) {
    logger.error('Error resetting user progress', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to reset user progress' },
    });
  }
});

/**
 * POST /admin/users/:id/force-logout
 * Revoke all sessions for a user
 */
router.post('/:id/force-logout', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await prisma.userSession.updateMany({
      where: { userId: id, isActive: true },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: reason || 'Admin-initiated force logout',
      },
    });

    logger.info('User sessions revoked', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      targetUserId: id,
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
    logger.error('Error forcing logout', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to force logout' },
    });
  }
});

/**
 * GET /admin/users/:id/activity
 * Get user's activity timeline
 */
router.get('/:id/activity', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const [sessions, orders, purchases, achievements] = await Promise.all([
      prisma.userSession.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          deviceType: true,
          ipAddress: true,
          isActive: true,
          createdAt: true,
          revokedAt: true,
          revokeReason: true,
        },
      }),
      prisma.stockOrder.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          tickerSymbol: true,
          orderType: true,
          shares: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
      prisma.coinPurchase.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.playerAchievement.findMany({
        where: { userId: id, isCompleted: true },
        orderBy: { completedAt: 'desc' },
        take: limit,
        include: { achievement: true },
      }),
    ]);

    // Combine and sort by date
    const timeline = [
      ...sessions.map(s => ({ type: 'session', data: s, timestamp: s.createdAt })),
      ...orders.map(o => ({ type: 'trade', data: { ...o, totalAmount: o.totalAmount.toString() }, timestamp: o.createdAt })),
      ...purchases.map(p => ({ type: 'purchase', data: p, timestamp: p.createdAt })),
      ...achievements.map(a => ({ type: 'achievement', data: a, timestamp: a.completedAt })),
    ].sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
     .slice(0, limit);

    res.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    logger.error('Error getting user activity', { error, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get user activity' },
    });
  }
});

export default router;
