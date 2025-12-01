import { Router, Response } from 'express';
import { prisma } from '@mint/database';
import { AdminRequest } from '../middleware';
import { logger } from '../services/logger';

const router: ReturnType<typeof Router> = Router();

// ============================================================================
// USER ANALYTICS
// ============================================================================

/**
 * GET /admin/analytics/overview
 * Get high-level analytics overview
 */
router.get('/overview', async (req: AdminRequest, res: Response) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      activeUsersToday,
      activeUsersWeek,
      premiumUsers,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.userSession.groupBy({
        by: ['userId'],
        where: { lastActivityAt: { gte: oneDayAgo } },
      }),
      prisma.userSession.groupBy({
        by: ['userId'],
        where: { lastActivityAt: { gte: sevenDaysAgo } },
      }),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.transaction.aggregate({
        where: { type: 'purchase', status: 'completed' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersWeek,
          newThisMonth: newUsersMonth,
          activeToday: activeUsersToday.length,
          activeThisWeek: activeUsersWeek.length,
          premium: premiumUsers,
        },
        revenue: {
          total: totalRevenue._sum.amount?.toString() || '0',
        },
      },
    });
  } catch (error) {
    logger.error('Error getting analytics overview', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get analytics overview' },
    });
  }
});

/**
 * GET /admin/analytics/registrations
 * Get daily registration counts for charting
 */
router.get('/registrations', async (req: AdminRequest, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get registrations grouped by date
    const registrations = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json({
      success: true,
      data: registrations.map(r => ({
        date: r.date,
        count: Number(r.count),
      })),
    });
  } catch (error) {
    logger.error('Error getting registration analytics', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get registration analytics' },
    });
  }
});

/**
 * GET /admin/analytics/retention
 * Get user retention metrics
 */
router.get('/retention', async (req: AdminRequest, res: Response) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get users who signed up in the past week
    const newUsersLastWeek = await prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo, lt: oneDayAgo } },
      select: { id: true, createdAt: true },
    });

    // Check which of those users have been active since signup
    const userIds = newUsersLastWeek.map(u => u.id);
    const returnedUsers = await prisma.userSession.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        lastActivityAt: { gt: sevenDaysAgo },
      },
    });

    const day1Retention = newUsersLastWeek.length > 0
      ? (returnedUsers.length / newUsersLastWeek.length) * 100
      : 0;

    // Calculate cohort retention (users from 30+ days ago still active in last 7 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

    const cohortUsers = await prisma.user.count({
      where: { createdAt: { gte: fortyDaysAgo, lt: thirtyDaysAgo } },
    });

    const cohortActive = await prisma.userSession.groupBy({
      by: ['userId'],
      where: {
        user: { createdAt: { gte: fortyDaysAgo, lt: thirtyDaysAgo } },
        lastActivityAt: { gte: sevenDaysAgo },
      },
    });

    const day30Retention = cohortUsers > 0
      ? (cohortActive.length / cohortUsers) * 100
      : 0;

    res.json({
      success: true,
      data: {
        day1Retention: Math.round(day1Retention * 100) / 100,
        day30Retention: Math.round(day30Retention * 100) / 100,
        newUsersAnalyzed: newUsersLastWeek.length,
        cohortSize: cohortUsers,
      },
    });
  } catch (error) {
    logger.error('Error getting retention analytics', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get retention analytics' },
    });
  }
});

/**
 * GET /admin/analytics/activity
 * Get hourly activity distribution
 */
router.get('/activity', async (req: AdminRequest, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get session activity by hour of day
    const activity = await prisma.$queryRaw<{ hour: number; count: bigint }[]>`
      SELECT EXTRACT(HOUR FROM last_activity_at) as hour, COUNT(*) as count
      FROM user_sessions
      WHERE last_activity_at >= ${sevenDaysAgo}
      GROUP BY EXTRACT(HOUR FROM last_activity_at)
      ORDER BY hour ASC
    `;

    // Fill in missing hours with 0
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
      const found = activity.find(a => Number(a.hour) === i);
      return { hour: i, count: found ? Number(found.count) : 0 };
    });

    res.json({
      success: true,
      data: hourlyActivity,
    });
  } catch (error) {
    logger.error('Error getting activity analytics', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get activity analytics' },
    });
  }
});

// ============================================================================
// GAME ANALYTICS
// ============================================================================

/**
 * GET /admin/analytics/economy
 * Get game economy statistics
 */
router.get('/economy', async (req: AdminRequest, res: Response) => {
  try {
    // Aggregate player stats
    const economyStats = await prisma.playerStats.aggregate({
      _sum: {
        cash: true,
        totalEarnings: true,
        totalSpent: true,
      },
      _avg: {
        cash: true,
        prestigeLevel: true,
      },
      _max: {
        cash: true,
        prestigeLevel: true,
      },
    });

    // Count assets
    const [propertyCount, businessCount, stockHoldingsCount] = await Promise.all([
      prisma.playerProperty.count(),
      prisma.playerBusiness.count(),
      prisma.stockHolding.count(),
    ]);

    res.json({
      success: true,
      data: {
        totalCashInCirculation: economyStats._sum.cash?.toString() || '0',
        totalEarningsAllTime: economyStats._sum.totalEarnings?.toString() || '0',
        totalSpentAllTime: economyStats._sum.totalSpent?.toString() || '0',
        averagePlayerCash: economyStats._avg.cash?.toString() || '0',
        averagePrestigeLevel: economyStats._avg.prestigeLevel || 0,
        maxPrestigeLevel: economyStats._max.prestigeLevel || 0,
        richestPlayerCash: economyStats._max.cash?.toString() || '0',
        totalProperties: propertyCount,
        totalBusinesses: businessCount,
        totalStockHoldings: stockHoldingsCount,
      },
    });
  } catch (error) {
    logger.error('Error getting economy analytics', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get economy analytics' },
    });
  }
});

/**
 * GET /admin/analytics/leaderboard
 * Get top players by various metrics
 */
router.get('/leaderboard', async (req: AdminRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const [richest, mostProperties, highestPrestige] = await Promise.all([
      // Richest players
      prisma.playerStats.findMany({
        orderBy: { cash: 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, username: true, displayName: true } },
        },
      }),
      // Most properties
      prisma.playerProperty.groupBy({
        by: ['userId'],
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: limit,
      }),
      // Highest prestige
      prisma.playerStats.findMany({
        orderBy: { prestigeLevel: 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, username: true, displayName: true } },
        },
      }),
    ]);

    // Get user info for property leaders
    const propertyUserIds = mostProperties.map(p => p.userId);
    const propertyUsers = await prisma.user.findMany({
      where: { id: { in: propertyUserIds } },
      select: { id: true, username: true, displayName: true },
    });

    res.json({
      success: true,
      data: {
        richest: richest.map(p => ({
          user: p.user,
          cash: p.cash.toString(),
        })),
        mostProperties: mostProperties.map(p => ({
          user: propertyUsers.find(u => u.id === p.userId),
          count: p._count,
        })),
        highestPrestige: highestPrestige.map(p => ({
          user: p.user,
          prestigeLevel: p.prestigeLevel,
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting leaderboard', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get leaderboard' },
    });
  }
});

/**
 * GET /admin/analytics/transactions
 * Get transaction volume over time
 */
router.get('/transactions', async (req: AdminRequest, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const transactions = await prisma.$queryRaw<{ date: Date; count: bigint; total: string }[]>`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE created_at >= ${startDate} AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json({
      success: true,
      data: transactions.map(t => ({
        date: t.date,
        count: Number(t.count),
        total: t.total,
      })),
    });
  } catch (error) {
    logger.error('Error getting transaction analytics', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get transaction analytics' },
    });
  }
});

export default router;
