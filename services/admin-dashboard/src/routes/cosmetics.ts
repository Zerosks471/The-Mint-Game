import { Router, Response } from 'express';
import { prisma } from '@mint/database';
import { AdminRequest } from '../middleware';
import { logger } from '../services/logger';

const router: ReturnType<typeof Router> = Router();

/**
 * GET /admin/cosmetics
 * List all cosmetics
 */
router.get('/', async (req: AdminRequest, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const rarity = req.query.rarity as string | undefined;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (rarity) where.rarity = rarity;

    const cosmetics = await prisma.cosmetic.findMany({
      where,
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { playerCosmetics: true } },
      },
    });

    res.json({
      success: true,
      data: cosmetics.map(c => ({
        ...c,
        ownedCount: c._count.playerCosmetics,
      })),
    });
  } catch (error) {
    logger.error('Error listing cosmetics', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list cosmetics' },
    });
  }
});

/**
 * GET /admin/cosmetics/:id
 * Get a specific cosmetic with stats
 */
router.get('/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const cosmetic = await prisma.cosmetic.findUnique({
      where: { id },
      include: {
        _count: { select: { playerCosmetics: true } },
      },
    });

    if (!cosmetic) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Cosmetic not found' },
      });
    }

    res.json({
      success: true,
      data: {
        ...cosmetic,
        ownedCount: cosmetic._count.playerCosmetics,
      },
    });
  } catch (error) {
    logger.error('Error getting cosmetic', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get cosmetic' },
    });
  }
});

/**
 * POST /admin/cosmetics
 * Create a new cosmetic
 */
router.post('/', async (req: AdminRequest, res: Response) => {
  try {
    const {
      id,
      name,
      description,
      type,
      category,
      rarity,
      previewUrl,
      assetUrl,
      acquisitionType,
      premiumCost,
      isAvailable,
      sortOrder,
    } = req.body;

    // Validate required fields
    if (!id || !name || !type || !acquisitionType) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'id, name, type, and acquisitionType are required' },
      });
    }

    // Check if ID already exists
    const existing = await prisma.cosmetic.findUnique({
      where: { id },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'ID_EXISTS', message: 'Cosmetic ID already exists' },
      });
    }

    const cosmetic = await prisma.cosmetic.create({
      data: {
        id,
        name,
        description: description || null,
        type,
        category: category || null,
        rarity: rarity || 'common',
        previewUrl: previewUrl || null,
        assetUrl: assetUrl || null,
        acquisitionType,
        premiumCost: premiumCost ? parseInt(premiumCost) : null,
        isAvailable: isAvailable !== false,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      },
    });

    logger.info('Cosmetic created', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      cosmeticId: cosmetic.id,
      name: cosmetic.name,
      type: cosmetic.type,
    });

    res.json({
      success: true,
      data: cosmetic,
    });
  } catch (error) {
    logger.error('Error creating cosmetic', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create cosmetic' },
    });
  }
});

/**
 * PATCH /admin/cosmetics/:id
 * Update a cosmetic
 */
router.patch('/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      rarity,
      previewUrl,
      assetUrl,
      premiumCost,
      isAvailable,
      sortOrder,
    } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (category !== undefined) updateData.category = category || null;
    if (rarity !== undefined) updateData.rarity = rarity;
    if (previewUrl !== undefined) updateData.previewUrl = previewUrl || null;
    if (assetUrl !== undefined) updateData.assetUrl = assetUrl || null;
    if (premiumCost !== undefined) updateData.premiumCost = premiumCost ? parseInt(premiumCost) : null;
    if (typeof isAvailable === 'boolean') updateData.isAvailable = isAvailable;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);

    const cosmetic = await prisma.cosmetic.update({
      where: { id },
      data: updateData,
    });

    logger.info('Cosmetic updated', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      cosmeticId: id,
      changes: updateData,
    });

    res.json({
      success: true,
      data: cosmetic,
    });
  } catch (error) {
    logger.error('Error updating cosmetic', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update cosmetic' },
    });
  }
});

/**
 * DELETE /admin/cosmetics/:id
 * Delete a cosmetic (only if not owned by anyone)
 */
router.delete('/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if anyone owns this cosmetic
    const ownedCount = await prisma.playerCosmetic.count({
      where: { cosmeticId: id },
    });

    if (ownedCount > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'COSMETIC_IN_USE',
          message: `Cannot delete - ${ownedCount} players own this cosmetic. Set isAvailable to false instead.`,
        },
      });
    }

    await prisma.cosmetic.delete({
      where: { id },
    });

    logger.info('Cosmetic deleted', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      cosmeticId: id,
    });

    res.json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error) {
    logger.error('Error deleting cosmetic', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete cosmetic' },
    });
  }
});

/**
 * GET /admin/cosmetics/stats/summary
 * Get overall cosmetic statistics
 */
router.get('/stats/summary', async (req: AdminRequest, res: Response) => {
  try {
    const [
      totalCosmetics,
      availableCosmetics,
      totalOwned,
      byType,
      byRarity,
    ] = await Promise.all([
      prisma.cosmetic.count(),
      prisma.cosmetic.count({ where: { isAvailable: true } }),
      prisma.playerCosmetic.count(),
      prisma.cosmetic.groupBy({
        by: ['type'],
        _count: true,
      }),
      prisma.cosmetic.groupBy({
        by: ['rarity'],
        _count: true,
      }),
    ]);

    // Get most popular cosmetics
    const popular = await prisma.playerCosmetic.groupBy({
      by: ['cosmeticId'],
      _count: true,
      orderBy: { _count: { cosmeticId: 'desc' } },
      take: 5,
    });

    const popularIds = popular.map(p => p.cosmeticId);
    const popularCosmetics = await prisma.cosmetic.findMany({
      where: { id: { in: popularIds } },
    });

    res.json({
      success: true,
      data: {
        totalCosmetics,
        availableCosmetics,
        totalOwned,
        byType: byType.map(t => ({ type: t.type, count: t._count })),
        byRarity: byRarity.map(r => ({ rarity: r.rarity, count: r._count })),
        popularCosmetics: popular.map(p => ({
          cosmetic: popularCosmetics.find(c => c.id === p.cosmeticId),
          ownedCount: p._count,
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting cosmetic stats', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get cosmetic stats' },
    });
  }
});

export default router;
