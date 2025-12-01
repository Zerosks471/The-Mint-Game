import { Router, Response } from 'express';
import { AdminRequest, getAuditLogs } from '../middleware';
import { logger } from '../services/logger';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';

const router: ReturnType<typeof Router> = Router();

/**
 * GET /admin/logs/audit
 * Get admin audit logs
 */
router.get('/audit', async (req: AdminRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const adminId = req.query.adminId as string;
    const action = req.query.action as string;
    const resource = req.query.resource as string;

    const result = getAuditLogs({
      limit,
      offset,
      adminId,
      action,
      resource,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error getting audit logs', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit logs' },
    });
  }
});

/**
 * GET /admin/logs/server
 * Get recent server logs from log files
 */
router.get('/server', async (req: AdminRequest, res: Response) => {
  try {
    const logType = (req.query.type as string) || 'audit';
    const lines = Math.min(parseInt(req.query.lines as string) || 100, 1000);

    let logFile: string;
    switch (logType) {
      case 'error':
        logFile = 'logs/admin-error.log';
        break;
      case 'audit':
      default:
        logFile = 'logs/admin-audit.log';
    }

    const logPath = resolve(process.cwd(), logFile);

    if (!existsSync(logPath)) {
      return res.json({
        success: true,
        data: {
          logs: [],
          message: 'Log file does not exist yet',
        },
      });
    }

    const content = await readFile(logPath, 'utf-8');
    const logLines = content
      .split('\n')
      .filter(line => line.trim())
      .slice(-lines)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      })
      .reverse(); // Most recent first

    res.json({
      success: true,
      data: {
        logs: logLines,
        total: logLines.length,
        file: logFile,
      },
    });
  } catch (error) {
    logger.error('Error getting server logs', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get server logs' },
    });
  }
});

/**
 * GET /admin/logs/activity
 * Get recent user activity logs
 */
router.get('/activity', async (req: AdminRequest, res: Response) => {
  try {
    const { prisma } = await import('@mint/database');
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const userId = req.query.userId as string;

    // Get recent sessions
    const where = userId ? { userId } : {};

    const sessions = await prisma.userSession.findMany({
      where,
      orderBy: { lastActivityAt: 'desc' },
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
      data: sessions.map(s => ({
        id: s.id,
        user: s.user,
        deviceType: s.deviceType,
        ipAddress: s.ipAddress,
        isActive: s.isActive,
        lastActivityAt: s.lastActivityAt,
        createdAt: s.createdAt,
        revokedAt: s.revokedAt,
        revokeReason: s.revokeReason,
      })),
    });
  } catch (error) {
    logger.error('Error getting activity logs', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get activity logs' },
    });
  }
});

/**
 * GET /admin/logs/stock-trades
 * Get recent stock market trades
 */
router.get('/stock-trades', async (req: AdminRequest, res: Response) => {
  try {
    const { prisma } = await import('@mint/database');
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const trades = await prisma.stockOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: trades.map(t => ({
        id: t.id,
        user: t.user,
        ticker: t.tickerSymbol,
        type: t.orderType,
        shares: t.shares,
        pricePerShare: t.pricePerShare.toString(),
        totalAmount: t.totalAmount.toString(),
        status: t.status,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Error getting stock trades', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get stock trades' },
    });
  }
});

export default router;
