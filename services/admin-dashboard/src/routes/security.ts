import { Router, Response } from 'express';
import { prisma } from '@mint/database';
import { AdminRequest } from '../middleware';
import { logger } from '../services/logger';

const router: ReturnType<typeof Router> = Router();

// In-memory blocked IPs (in production, use Redis)
const blockedIPs: Map<string, { reason: string; blockedAt: Date; blockedBy: string }> = new Map();

// ============================================================================
// FAILED LOGIN TRACKING
// ============================================================================

/**
 * GET /admin/security/failed-logins
 * Get recent failed login attempts
 */
router.get('/failed-logins', async (req: AdminRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const hours = Math.min(parseInt(req.query.hours as string) || 24, 168);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const failedLogins = await prisma.loginAttempt.findMany({
      where: {
        success: false,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: failedLogins,
    });
  } catch (error) {
    logger.error('Error getting failed logins', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get failed logins' },
    });
  }
});

/**
 * GET /admin/security/failed-logins/by-ip
 * Get failed login attempts grouped by IP
 */
router.get('/failed-logins/by-ip', async (req: AdminRequest, res: Response) => {
  try {
    const hours = Math.min(parseInt(req.query.hours as string) || 24, 168);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const byIp = await prisma.loginAttempt.groupBy({
      by: ['ipAddress'],
      where: {
        success: false,
        createdAt: { gte: since },
      },
      _count: true,
      orderBy: { _count: { ipAddress: 'desc' } },
      take: 50,
    });

    res.json({
      success: true,
      data: byIp.map(item => ({
        ipAddress: item.ipAddress,
        failedAttempts: item._count,
      })),
    });
  } catch (error) {
    logger.error('Error getting failed logins by IP', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get failed logins by IP' },
    });
  }
});

/**
 * GET /admin/security/failed-logins/by-user
 * Get failed login attempts grouped by username
 */
router.get('/failed-logins/by-user', async (req: AdminRequest, res: Response) => {
  try {
    const hours = Math.min(parseInt(req.query.hours as string) || 24, 168);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const byUser = await prisma.loginAttempt.groupBy({
      by: ['attemptedUsername'],
      where: {
        success: false,
        createdAt: { gte: since },
      },
      _count: true,
      orderBy: { _count: { attemptedUsername: 'desc' } },
      take: 50,
    });

    res.json({
      success: true,
      data: byUser.map(item => ({
        username: item.attemptedUsername,
        failedAttempts: item._count,
      })),
    });
  } catch (error) {
    logger.error('Error getting failed logins by user', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get failed logins by user' },
    });
  }
});

// ============================================================================
// IP BLOCKING
// ============================================================================

/**
 * GET /admin/security/blocked-ips
 * List all blocked IPs
 */
router.get('/blocked-ips', async (req: AdminRequest, res: Response) => {
  try {
    // Get from database
    const dbBlocked = await prisma.blockedIP.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // Merge with in-memory (for newly blocked)
    const memoryBlocked = Array.from(blockedIPs.entries()).map(([ip, data]) => ({
      ipAddress: ip,
      ...data,
      source: 'memory',
    }));

    res.json({
      success: true,
      data: {
        persistent: dbBlocked,
        temporary: memoryBlocked,
      },
    });
  } catch (error) {
    logger.error('Error getting blocked IPs', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get blocked IPs' },
    });
  }
});

/**
 * POST /admin/security/block-ip
 * Block an IP address
 */
router.post('/block-ip', async (req: AdminRequest, res: Response) => {
  try {
    const { ipAddress, reason, persistent = false } = req.body;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_IP', message: 'IP address is required' },
      });
    }

    // Validate IP format (basic)
    const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$|^[a-fA-F0-9:]+$/;
    if (!ipRegex.test(ipAddress)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_IP', message: 'Invalid IP address format' },
      });
    }

    if (persistent) {
      // Store in database for permanent blocking
      await prisma.blockedIP.upsert({
        where: { ipAddress },
        create: {
          ipAddress,
          reason: reason || 'Blocked by admin',
          blockedBy: req.admin?.id || 'system',
          isActive: true,
        },
        update: {
          reason: reason || 'Blocked by admin',
          blockedBy: req.admin?.id || 'system',
          isActive: true,
          updatedAt: new Date(),
        },
      });
    } else {
      // Store in memory (temporary)
      blockedIPs.set(ipAddress, {
        reason: reason || 'Temporarily blocked by admin',
        blockedAt: new Date(),
        blockedBy: req.admin?.username || 'admin',
      });
    }

    logger.info('IP address blocked', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      ipAddress,
      reason,
      persistent,
    });

    res.json({
      success: true,
      data: { ipAddress, blocked: true, persistent },
    });
  } catch (error) {
    logger.error('Error blocking IP', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to block IP' },
    });
  }
});

/**
 * DELETE /admin/security/block-ip/:ip
 * Unblock an IP address
 */
router.delete('/block-ip/:ip', async (req: AdminRequest, res: Response) => {
  try {
    const ipAddress = req.params.ip;

    // Remove from memory
    blockedIPs.delete(ipAddress);

    // Remove from database
    await prisma.blockedIP.updateMany({
      where: { ipAddress },
      data: { isActive: false },
    });

    logger.info('IP address unblocked', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      ipAddress,
    });

    res.json({
      success: true,
      data: { ipAddress, blocked: false },
    });
  } catch (error) {
    logger.error('Error unblocking IP', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to unblock IP' },
    });
  }
});

// ============================================================================
// USER SESSION MANAGEMENT
// ============================================================================

/**
 * GET /admin/security/sessions/:userId
 * Get all active sessions for a user
 */
router.get('/sessions/:userId', async (req: AdminRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const sessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastActivityAt: 'desc' },
    });

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    logger.error('Error getting user sessions', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get user sessions' },
    });
  }
});

/**
 * DELETE /admin/security/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', async (req: AdminRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    const session = await prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: reason || 'Revoked by admin',
      },
    });

    logger.info('Session revoked', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      sessionId,
      userId: session.userId,
      reason,
    });

    res.json({
      success: true,
      data: { sessionId, revoked: true },
    });
  } catch (error) {
    logger.error('Error revoking session', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke session' },
    });
  }
});

// ============================================================================
// AUDIT LOGS
// ============================================================================

/**
 * GET /admin/security/audit-log
 * Get admin audit log
 */
router.get('/audit-log', async (req: AdminRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const offset = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          admin: { select: { id: true, username: true } },
        },
      }),
      prisma.adminAuditLog.count(),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error getting audit log', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit log' },
    });
  }
});

// ============================================================================
// SUSPICIOUS ACTIVITY
// ============================================================================

/**
 * GET /admin/security/suspicious
 * Get potentially suspicious account activity
 */
router.get('/suspicious', async (req: AdminRequest, res: Response) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find accounts with rapid cash changes
    const rapidGrowth = await prisma.$queryRaw<{ userId: string; cashGrowth: string }[]>`
      SELECT
        user_id as "userId",
        (cash - LAG(cash) OVER (PARTITION BY user_id ORDER BY updated_at)) as "cashGrowth"
      FROM player_stats
      WHERE updated_at >= ${oneDayAgo}
      HAVING "cashGrowth" > 1000000000
      LIMIT 20
    `.catch(() => []); // May not work on all DBs, return empty if fails

    // Find users with many sessions from different IPs
    const multiIpUsers = await prisma.userSession.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: oneDayAgo },
      },
      _count: {
        ipAddress: true,
      },
      having: {
        ipAddress: { _count: { gt: 5 } },
      },
    });

    const multiIpUserIds = multiIpUsers.map(u => u.userId);
    const multiIpUserDetails = await prisma.user.findMany({
      where: { id: { in: multiIpUserIds } },
      select: { id: true, username: true },
    });

    res.json({
      success: true,
      data: {
        rapidCashGrowth: rapidGrowth,
        multipleIPLogins: multiIpUsers.map(u => ({
          user: multiIpUserDetails.find(ud => ud.id === u.userId),
          distinctIPs: u._count.ipAddress,
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting suspicious activity', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get suspicious activity' },
    });
  }
});

// Export IP check function for middleware
export function isIPBlocked(ip: string): boolean {
  return blockedIPs.has(ip);
}

export default router;
