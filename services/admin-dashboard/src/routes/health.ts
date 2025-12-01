import { Router, Response } from 'express';
import { prisma } from '@mint/database';
import { AdminRequest } from '../middleware';
import { logger } from '../services/logger';
import os from 'os';

const router: ReturnType<typeof Router> = Router();

// Track server start time
const serverStartTime = new Date();

/**
 * GET /admin/health
 * System health check and metrics
 */
router.get('/', async (req: AdminRequest, res: Response) => {
  try {
    const startTime = Date.now();

    // Database health check
    let dbHealthy = false;
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbHealthy = true;
    } catch (error) {
      logger.error('Database health check failed', { error });
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // CPU usage
    const cpus = os.cpus();
    const cpuLoad = os.loadavg();

    // Uptime
    const uptime = process.uptime();
    const systemUptime = os.uptime();

    res.json({
      success: true,
      data: {
        status: dbHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        serverStartedAt: serverStartTime.toISOString(),
        responseTime: Date.now() - startTime,
        services: {
          database: {
            status: dbHealthy ? 'healthy' : 'unhealthy',
            latency: dbLatency,
          },
        },
        system: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          uptime: {
            process: uptime,
            system: systemUptime,
          },
          memory: {
            process: {
              heapUsed: formatBytes(memUsage.heapUsed),
              heapTotal: formatBytes(memUsage.heapTotal),
              rss: formatBytes(memUsage.rss),
              external: formatBytes(memUsage.external),
            },
            system: {
              total: formatBytes(totalMem),
              free: formatBytes(freeMem),
              usedPercent: ((1 - freeMem / totalMem) * 100).toFixed(2) + '%',
            },
          },
          cpu: {
            cores: cpus.length,
            model: cpus[0]?.model || 'unknown',
            loadAverage: {
              '1min': (cpuLoad[0] ?? 0).toFixed(2),
              '5min': (cpuLoad[1] ?? 0).toFixed(2),
              '15min': (cpuLoad[2] ?? 0).toFixed(2),
            },
          },
        },
      },
    });
  } catch (error) {
    logger.error('Health check error', { error });
    res.status(500).json({
      success: false,
      data: {
        status: 'unhealthy',
        error: 'Health check failed',
      },
    });
  }
});

/**
 * GET /admin/health/database
 * Detailed database statistics
 */
router.get('/database', async (req: AdminRequest, res: Response) => {
  try {
    // Get table counts
    const [
      userCount,
      sessionCount,
      propertyCount,
      businessCount,
      orderCount,
      achievementCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userSession.count({ where: { isActive: true } }),
      prisma.playerProperty.count(),
      prisma.playerBusiness.count(),
      prisma.stockOrder.count(),
      prisma.playerAchievement.count({ where: { isCompleted: true } }),
    ]);

    res.json({
      success: true,
      data: {
        tables: {
          users: userCount,
          activeSessions: sessionCount,
          playerProperties: propertyCount,
          playerBusinesses: businessCount,
          stockOrders: orderCount,
          completedAchievements: achievementCount,
        },
        connection: {
          status: 'connected',
        },
      },
    });
  } catch (error) {
    logger.error('Database stats error', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get database stats' },
    });
  }
});

/**
 * GET /admin/health/metrics
 * Real-time application metrics
 */
router.get('/metrics', async (req: AdminRequest, res: Response) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [
      dailyActiveUsers,
      hourlyActiveUsers,
      newUsersToday,
      tradesLast24h,
    ] = await Promise.all([
      prisma.user.count({ where: { lastActiveAt: { gte: oneDayAgo } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: oneHourAgo } } }),
      prisma.user.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.stockOrder.count({ where: { createdAt: { gte: oneDayAgo } } }),
    ]);

    res.json({
      success: true,
      data: {
        activity: {
          dailyActiveUsers,
          hourlyActiveUsers,
          newUsersToday,
          tradesLast24h,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Metrics error', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get metrics' },
    });
  }
});

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export default router;
