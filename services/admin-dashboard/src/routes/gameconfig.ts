import { Router, Response } from 'express';
import { prisma } from '@mint/database';
import { AdminRequest } from '../middleware';
import { logger } from '../services/logger';

const router: ReturnType<typeof Router> = Router();

// ============================================================================
// PROPERTY TYPES
// ============================================================================

/**
 * GET /admin/gameconfig/properties
 * List all property types
 */
router.get('/properties', async (req: AdminRequest, res: Response) => {
  try {
    const properties = await prisma.propertyType.findMany({
      orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
    });

    res.json({
      success: true,
      data: properties.map(p => ({
        ...p,
        baseCost: p.baseCost.toString(),
        baseIncomeHour: p.baseIncomeHour.toString(),
        managerCost: p.managerCost?.toString(),
      })),
    });
  } catch (error) {
    logger.error('Error listing property types', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list property types' },
    });
  }
});

/**
 * PATCH /admin/gameconfig/properties/:id
 * Update a property type
 */
router.patch('/properties/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { baseCost, baseIncomeHour, costMultiplier, incomeMultiplier, managerCost, isActive } = req.body;

    const updateData: any = {};
    if (baseCost !== undefined) updateData.baseCost = parseFloat(baseCost);
    if (baseIncomeHour !== undefined) updateData.baseIncomeHour = parseFloat(baseIncomeHour);
    if (costMultiplier !== undefined) updateData.costMultiplier = parseFloat(costMultiplier);
    if (incomeMultiplier !== undefined) updateData.incomeMultiplier = parseFloat(incomeMultiplier);
    if (managerCost !== undefined) updateData.managerCost = managerCost ? parseFloat(managerCost) : null;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const property = await prisma.propertyType.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    logger.info('Property type updated', {
      adminId: req.admin?.id,
      propertyId: id,
      changes: updateData,
    });

    res.json({
      success: true,
      data: {
        ...property,
        baseCost: property.baseCost.toString(),
        baseIncomeHour: property.baseIncomeHour.toString(),
      },
    });
  } catch (error) {
    logger.error('Error updating property type', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update property type' },
    });
  }
});

// ============================================================================
// BUSINESS TYPES
// ============================================================================

/**
 * GET /admin/gameconfig/businesses
 * List all business types
 */
router.get('/businesses', async (req: AdminRequest, res: Response) => {
  try {
    const businesses = await prisma.businessType.findMany({
      orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
    });

    res.json({
      success: true,
      data: businesses.map(b => ({
        ...b,
        baseCost: b.baseCost.toString(),
        baseRevenue: b.baseRevenue.toString(),
        employeeBaseCost: b.employeeBaseCost?.toString(),
      })),
    });
  } catch (error) {
    logger.error('Error listing business types', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list business types' },
    });
  }
});

/**
 * PATCH /admin/gameconfig/businesses/:id
 * Update a business type
 */
router.patch('/businesses/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { baseCost, baseRevenue, cycleSeconds, levelCostMult, levelRevenueMult, isActive } = req.body;

    const updateData: any = {};
    if (baseCost !== undefined) updateData.baseCost = parseFloat(baseCost);
    if (baseRevenue !== undefined) updateData.baseRevenue = parseFloat(baseRevenue);
    if (cycleSeconds !== undefined) updateData.cycleSeconds = parseInt(cycleSeconds);
    if (levelCostMult !== undefined) updateData.levelCostMult = parseFloat(levelCostMult);
    if (levelRevenueMult !== undefined) updateData.levelRevenueMult = parseFloat(levelRevenueMult);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const business = await prisma.businessType.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    logger.info('Business type updated', {
      adminId: req.admin?.id,
      businessId: id,
      changes: updateData,
    });

    res.json({
      success: true,
      data: {
        ...business,
        baseCost: business.baseCost.toString(),
        baseRevenue: business.baseRevenue.toString(),
      },
    });
  } catch (error) {
    logger.error('Error updating business type', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update business type' },
    });
  }
});

// ============================================================================
// UPGRADES
// ============================================================================

/**
 * GET /admin/gameconfig/upgrades
 * List all upgrades
 */
router.get('/upgrades', async (req: AdminRequest, res: Response) => {
  try {
    const upgrades = await prisma.upgrade.findMany({
      orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
    });

    res.json({
      success: true,
      data: upgrades.map(u => ({
        ...u,
        baseCost: u.baseCost.toString(),
      })),
    });
  } catch (error) {
    logger.error('Error listing upgrades', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list upgrades' },
    });
  }
});

/**
 * PATCH /admin/gameconfig/upgrades/:id
 * Update an upgrade
 */
router.patch('/upgrades/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { baseCost, costMultiplier, effect, maxLevel, isActive } = req.body;

    const updateData: any = {};
    if (baseCost !== undefined) updateData.baseCost = parseFloat(baseCost);
    if (costMultiplier !== undefined) updateData.costMultiplier = parseFloat(costMultiplier);
    if (effect !== undefined) updateData.effect = effect;
    if (maxLevel !== undefined) updateData.maxLevel = parseInt(maxLevel);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const upgrade = await prisma.upgrade.update({
      where: { id },
      data: updateData,
    });

    logger.info('Upgrade updated', {
      adminId: req.admin?.id,
      upgradeId: id,
      changes: updateData,
    });

    res.json({
      success: true,
      data: {
        ...upgrade,
        baseCost: upgrade.baseCost.toString(),
      },
    });
  } catch (error) {
    logger.error('Error updating upgrade', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update upgrade' },
    });
  }
});

// ============================================================================
// PROJECTS
// ============================================================================

/**
 * GET /admin/gameconfig/projects
 * List all projects
 */
router.get('/projects', async (req: AdminRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: [{ phaseRequired: 'asc' }, { sortOrder: 'asc' }],
    });

    res.json({
      success: true,
      data: projects.map(p => ({
        ...p,
        cost: p.cost.toString(),
      })),
    });
  } catch (error) {
    logger.error('Error listing projects', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list projects' },
    });
  }
});

/**
 * PATCH /admin/gameconfig/projects/:id
 * Update a project
 */
router.patch('/projects/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { cost, effect, phaseRequired, isActive } = req.body;

    const updateData: any = {};
    if (cost !== undefined) updateData.cost = parseFloat(cost);
    if (effect !== undefined) updateData.effect = effect;
    if (phaseRequired !== undefined) updateData.phaseRequired = parseInt(phaseRequired);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    logger.info('Project updated', {
      adminId: req.admin?.id,
      projectId: id,
      changes: updateData,
    });

    res.json({
      success: true,
      data: {
        ...project,
        cost: project.cost.toString(),
      },
    });
  } catch (error) {
    logger.error('Error updating project', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update project' },
    });
  }
});

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

/**
 * GET /admin/gameconfig/achievements
 * List all achievements
 */
router.get('/achievements', async (req: AdminRequest, res: Response) => {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    res.json({
      success: true,
      data: achievements.map(a => ({
        ...a,
        requirementValue: a.requirementValue.toString(),
        rewardCash: a.rewardCash.toString(),
      })),
    });
  } catch (error) {
    logger.error('Error listing achievements', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list achievements' },
    });
  }
});

export default router;
