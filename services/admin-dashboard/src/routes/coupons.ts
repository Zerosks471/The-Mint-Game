import { Router, Response } from 'express';
import { prisma } from '@mint/database';
import { AdminRequest } from '../middleware';
import { logger } from '../services/logger';
import crypto from 'crypto';

const router: ReturnType<typeof Router> = Router();

/**
 * GET /admin/coupons
 * List all coupon codes
 */
router.get('/', async (req: AdminRequest, res: Response) => {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;
    const activeOnly = req.query.active === 'true';

    const where = activeOnly ? { isActive: true } : {};

    const [coupons, total] = await Promise.all([
      prisma.couponCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          _count: { select: { redemptions: true } },
        },
      }),
      prisma.couponCode.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        coupons: coupons.map(c => ({
          ...c,
          rewardAmount: c.rewardAmount?.toString(),
          redemptionCount: c._count.redemptions,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error listing coupons', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list coupons' },
    });
  }
});

/**
 * GET /admin/coupons/:id
 * Get a specific coupon with redemption details
 */
router.get('/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.couponCode.findUnique({
      where: { id },
      include: {
        redemptions: {
          take: 100,
          orderBy: { redeemedAt: 'desc' },
          include: {
            user: { select: { id: true, username: true } },
          },
        },
        _count: { select: { redemptions: true } },
      },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Coupon not found' },
      });
    }

    res.json({
      success: true,
      data: {
        ...coupon,
        rewardAmount: coupon.rewardAmount?.toString(),
        redemptionCount: coupon._count.redemptions,
      },
    });
  } catch (error) {
    logger.error('Error getting coupon', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get coupon' },
    });
  }
});

/**
 * POST /admin/coupons
 * Create a new coupon code
 */
router.post('/', async (req: AdminRequest, res: Response) => {
  try {
    const {
      code,
      description,
      rewardType,
      rewardAmount,
      rewardData,
      maxRedemptions,
      maxPerUser = 1,
      expiresAt,
      requiresPremium = false,
      minLevel,
    } = req.body;

    // Generate code if not provided
    const couponCode = code || generateCouponCode();

    // Validate required fields
    if (!rewardType) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'rewardType is required' },
      });
    }

    // Check if code already exists
    const existing = await prisma.couponCode.findUnique({
      where: { code: couponCode.toUpperCase() },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'CODE_EXISTS', message: 'Coupon code already exists' },
      });
    }

    const coupon = await prisma.couponCode.create({
      data: {
        code: couponCode.toUpperCase(),
        description: description || null,
        rewardType,
        rewardAmount: rewardAmount ? parseFloat(rewardAmount) : null,
        rewardData: rewardData || null,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
        maxPerUser,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        requiresPremium,
        minLevel: minLevel ? parseInt(minLevel) : null,
        isActive: true,
        createdBy: req.admin?.id || 'system',
      },
    });

    logger.info('Coupon created', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      couponId: coupon.id,
      code: coupon.code,
      rewardType,
    });

    res.json({
      success: true,
      data: {
        ...coupon,
        rewardAmount: coupon.rewardAmount?.toString(),
      },
    });
  } catch (error) {
    logger.error('Error creating coupon', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create coupon' },
    });
  }
});

/**
 * POST /admin/coupons/bulk
 * Create multiple coupon codes at once
 */
router.post('/bulk', async (req: AdminRequest, res: Response) => {
  try {
    const {
      count,
      prefix,
      rewardType,
      rewardAmount,
      rewardData,
      maxRedemptions = 1,
      maxPerUser = 1,
      expiresAt,
      description,
    } = req.body;

    if (!count || count < 1 || count > 1000) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_COUNT', message: 'Count must be between 1 and 1000' },
      });
    }

    if (!rewardType) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'rewardType is required' },
      });
    }

    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(generateCouponCode(prefix));
    }

    // Check for existing codes
    const existing = await prisma.couponCode.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    });

    const existingCodes = new Set(existing.map(e => e.code));
    const uniqueCodes = codes.filter(c => !existingCodes.has(c));

    // Create all unique codes
    const coupons = await prisma.couponCode.createMany({
      data: uniqueCodes.map(code => ({
        code,
        description: description || `Bulk generated coupon`,
        rewardType,
        rewardAmount: rewardAmount ? parseFloat(rewardAmount) : null,
        rewardData: rewardData || null,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
        maxPerUser,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        createdBy: req.admin?.id || 'system',
      })),
    });

    logger.info('Bulk coupons created', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      count: coupons.count,
      rewardType,
    });

    res.json({
      success: true,
      data: {
        created: coupons.count,
        codes: uniqueCodes,
        skipped: codes.length - uniqueCodes.length,
      },
    });
  } catch (error) {
    logger.error('Error creating bulk coupons', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create bulk coupons' },
    });
  }
});

/**
 * PATCH /admin/coupons/:id
 * Update a coupon code
 */
router.patch('/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      description,
      maxRedemptions,
      maxPerUser,
      expiresAt,
      isActive,
      requiresPremium,
      minLevel,
    } = req.body;

    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (maxRedemptions !== undefined) updateData.maxRedemptions = maxRedemptions ? parseInt(maxRedemptions) : null;
    if (maxPerUser !== undefined) updateData.maxPerUser = parseInt(maxPerUser);
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof requiresPremium === 'boolean') updateData.requiresPremium = requiresPremium;
    if (minLevel !== undefined) updateData.minLevel = minLevel ? parseInt(minLevel) : null;

    const coupon = await prisma.couponCode.update({
      where: { id },
      data: updateData,
    });

    logger.info('Coupon updated', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      couponId: id,
      code: coupon.code,
      changes: updateData,
    });

    res.json({
      success: true,
      data: {
        ...coupon,
        rewardAmount: coupon.rewardAmount?.toString(),
      },
    });
  } catch (error) {
    logger.error('Error updating coupon', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update coupon' },
    });
  }
});

/**
 * DELETE /admin/coupons/:id
 * Deactivate a coupon (soft delete)
 */
router.delete('/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.couponCode.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Coupon deactivated', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      couponId: id,
      code: coupon.code,
    });

    res.json({
      success: true,
      data: { id, deactivated: true },
    });
  } catch (error) {
    logger.error('Error deactivating coupon', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate coupon' },
    });
  }
});

/**
 * GET /admin/coupons/:id/redemptions
 * Get redemption history for a coupon
 */
router.get('/:id/redemptions', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    const [redemptions, total] = await Promise.all([
      prisma.couponRedemption.findMany({
        where: { couponId: id },
        orderBy: { redeemedAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          user: { select: { id: true, username: true, email: true } },
        },
      }),
      prisma.couponRedemption.count({ where: { couponId: id } }),
    ]);

    res.json({
      success: true,
      data: {
        redemptions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error getting redemptions', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get redemptions' },
    });
  }
});

/**
 * GET /admin/coupons/stats/summary
 * Get overall coupon statistics
 */
router.get('/stats/summary', async (req: AdminRequest, res: Response) => {
  try {
    const [totalCoupons, activeCoupons, totalRedemptions, recentRedemptions] = await Promise.all([
      prisma.couponCode.count(),
      prisma.couponCode.count({ where: { isActive: true } }),
      prisma.couponRedemption.count(),
      prisma.couponRedemption.count({
        where: { redeemedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    // Get most popular coupons
    const popular = await prisma.couponRedemption.groupBy({
      by: ['couponId'],
      _count: true,
      orderBy: { _count: { couponId: 'desc' } },
      take: 5,
    });

    const popularCouponIds = popular.map(p => p.couponId);
    const popularCoupons = await prisma.couponCode.findMany({
      where: { id: { in: popularCouponIds } },
    });

    res.json({
      success: true,
      data: {
        totalCoupons,
        activeCoupons,
        totalRedemptions,
        redemptionsLast24h: recentRedemptions,
        popularCoupons: popular.map(p => ({
          coupon: popularCoupons.find(c => c.id === p.couponId),
          redemptions: p._count,
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting coupon stats', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get coupon stats' },
    });
  }
});

// Helper function to generate unique coupon codes
function generateCouponCode(prefix?: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  const randomPart = Array.from({ length: 8 }, () =>
    chars[crypto.randomInt(chars.length)]
  ).join('');

  return prefix
    ? `${prefix.toUpperCase()}-${randomPart}`
    : randomPart;
}

export default router;
