import { Router, Response } from 'express';
import { prisma } from '@mint/database';
import { AdminRequest } from '../middleware';
import { logger } from '../services/logger';

const router: ReturnType<typeof Router> = Router();

/**
 * GET /admin/economy/overview
 * Get economy-wide statistics
 */
router.get('/overview', async (req: AdminRequest, res: Response) => {
  try {
    // Get aggregated stats
    const [
      userStats,
      totalCash,
      propertyStats,
      businessStats,
      recentPurchases,
      stockStats,
    ] = await Promise.all([
      // User counts by status
      prisma.user.groupBy({
        by: ['accountStatus'],
        _count: true,
      }),

      // Total cash in circulation
      prisma.playerStats.aggregate({
        _sum: {
          cash: true,
          lifetimeCashEarned: true,
        },
        _avg: {
          cash: true,
          playerLevel: true,
        },
        _max: {
          cash: true,
          playerLevel: true,
        },
      }),

      // Property ownership stats
      prisma.playerProperty.aggregate({
        _count: true,
        _sum: {
          quantity: true,
          totalSpent: true,
          currentIncomeHour: true,
        },
      }),

      // Business ownership stats
      prisma.playerBusiness.aggregate({
        _count: true,
        _sum: {
          totalInvested: true,
          totalRevenue: true,
        },
        _avg: {
          level: true,
        },
      }),

      // Recent coin purchases
      prisma.coinPurchase.aggregate({
        _sum: {
          amountPaid: true,
          coins: true,
        },
        _count: true,
      }),

      // Stock market activity
      prisma.stockOrder.aggregate({
        _count: true,
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    // Get daily active users (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyActiveUsers = await prisma.user.count({
      where: {
        lastActiveAt: { gte: oneDayAgo },
      },
    });

    // Get new users today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const newUsersToday = await prisma.user.count({
      where: {
        createdAt: { gte: todayStart },
      },
    });

    res.json({
      success: true,
      data: {
        users: {
          byStatus: userStats.reduce((acc, curr) => {
            acc[curr.accountStatus] = curr._count;
            return acc;
          }, {} as Record<string, number>),
          dailyActive: dailyActiveUsers,
          newToday: newUsersToday,
        },
        economy: {
          totalCashInCirculation: totalCash._sum.cash?.toString() || '0',
          lifetimeCashEarned: totalCash._sum.lifetimeCashEarned?.toString() || '0',
          averageCash: totalCash._avg.cash?.toString() || '0',
          maxCash: totalCash._max.cash?.toString() || '0',
          averageLevel: totalCash._avg.playerLevel || 0,
          maxLevel: totalCash._max.playerLevel || 0,
        },
        properties: {
          totalOwned: propertyStats._count,
          totalQuantity: propertyStats._sum.quantity || 0,
          totalSpent: propertyStats._sum.totalSpent?.toString() || '0',
          hourlyIncome: propertyStats._sum.currentIncomeHour?.toString() || '0',
        },
        businesses: {
          totalOwned: businessStats._count,
          totalInvested: businessStats._sum.totalInvested?.toString() || '0',
          totalRevenue: businessStats._sum.totalRevenue?.toString() || '0',
          averageLevel: businessStats._avg.level || 0,
        },
        purchases: {
          totalTransactions: recentPurchases._count,
          totalRevenue: (recentPurchases._sum.amountPaid || 0) / 100, // cents to dollars
          totalCoinsSold: recentPurchases._sum.coins || 0,
        },
        stockMarket: {
          totalTrades: stockStats._count,
          totalVolume: stockStats._sum.totalAmount?.toString() || '0',
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error getting economy overview', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get economy overview' },
    });
  }
});

/**
 * GET /admin/economy/top-players
 * Get top players by various metrics
 */
router.get('/top-players', async (req: AdminRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const metric = (req.query.metric as string) || 'cash';

    let orderBy: any;
    switch (metric) {
      case 'level':
        orderBy = { playerLevel: 'desc' };
        break;
      case 'lifetime':
        orderBy = { lifetimeCashEarned: 'desc' };
        break;
      case 'income':
        orderBy = { effectiveIncomeHour: 'desc' };
        break;
      default:
        orderBy = { cash: 'desc' };
    }

    const topPlayers = await prisma.playerStats.findMany({
      orderBy,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            isPremium: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: topPlayers.map((stats, index) => ({
        rank: index + 1,
        user: stats.user,
        cash: stats.cash.toString(),
        playerLevel: stats.playerLevel,
        lifetimeCashEarned: stats.lifetimeCashEarned.toString(),
        effectiveIncomeHour: stats.effectiveIncomeHour.toString(),
        currentPhase: stats.currentPhase,
      })),
    });
  } catch (error) {
    logger.error('Error getting top players', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get top players' },
    });
  }
});

/**
 * GET /admin/economy/recent-purchases
 * Get recent coin purchases
 */
router.get('/recent-purchases', async (req: AdminRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const purchases = await prisma.coinPurchase.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: purchases.map(p => ({
        ...p,
        amountPaid: p.amountPaid / 100, // cents to dollars
      })),
    });
  } catch (error) {
    logger.error('Error getting recent purchases', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get recent purchases' },
    });
  }
});

/**
 * GET /admin/economy/failed-purchases
 * Get failed purchase attempts
 */
router.get('/failed-purchases', async (req: AdminRequest, res: Response) => {
  try {
    const includeResolved = req.query.includeResolved === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const where = includeResolved ? {} : { resolved: false };

    const failures = await prisma.failedPurchase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: failures,
    });
  } catch (error) {
    logger.error('Error getting failed purchases', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get failed purchases' },
    });
  }
});

export default router;
