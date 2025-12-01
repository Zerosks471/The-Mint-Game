import { Router, Response, NextFunction } from 'express';
import { phaseService } from '../services/phase.service';
import { projectService } from '../services/project.service';
import { upgradeService } from '../services/upgrade.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All progression routes require authentication
router.use(authenticate);

// ============================================================================
// PHASES
// ============================================================================

// GET /api/v1/progression/phases - Get phase status
router.get('/phases', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await phaseService.getPhaseStatus(req.user!.id);
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PROJECTS (one-time purchases, Universal Paperclips style)
// ============================================================================

// GET /api/v1/progression/projects - Get all projects
router.get('/projects', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await projectService.getProjects(req.user!.id);
    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/progression/projects/:slug/purchase - Purchase a project
router.post(
  '/projects/:slug/purchase',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params as { slug: string };
      const result = await projectService.purchaseProject(req.user!.id, slug);
      res.json({
        success: true,
        data: result,
        message: `Completed project: ${result.project.name}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// UPGRADES (repeatable level-based purchases)
// ============================================================================

// GET /api/v1/progression/upgrades - Get all upgrades with current levels
router.get('/upgrades', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const upgrades = await upgradeService.getUpgrades(req.user!.id);
    res.json({
      success: true,
      data: upgrades,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/progression/upgrades/:slug/purchase - Purchase an upgrade level
router.post(
  '/upgrades/:slug/purchase',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params as { slug: string };
      const result = await upgradeService.purchaseUpgrade(req.user!.id, slug);
      res.json({
        success: true,
        data: result,
        message: `Upgraded ${result.upgrade.name} to level ${result.upgrade.currentLevel}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// COMBINED STATUS
// ============================================================================

// GET /api/v1/progression/status - Get combined progression status
router.get('/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [phaseStatus, projects, upgrades] = await Promise.all([
      phaseService.getPhaseStatus(req.user!.id),
      projectService.getProjects(req.user!.id),
      upgradeService.getUpgrades(req.user!.id),
    ]);

    res.json({
      success: true,
      data: {
        phase: phaseStatus,
        projects,
        upgrades,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
