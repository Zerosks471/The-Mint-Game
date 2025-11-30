import { Router, Response, NextFunction } from 'express';
import { leaderboardService } from '../services/leaderboard.service';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All leaderboard routes require authentication
router.use(authenticate);

// GET /api/v1/leaderboards/types - Get available leaderboard types
router.get('/types', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const types = leaderboardService.getLeaderboardTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/leaderboards/:type - Get leaderboard entries
router.get('/:type', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const leaderboard = await leaderboardService.getLeaderboard(
      type as any,
      req.user!.id,
      limit,
      offset
    );

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/leaderboards/:type/me - Get player's rank
router.get('/:type/me', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const rank = await leaderboardService.getPlayerRank(type as any, req.user!.id);
    res.json({ success: true, data: rank });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/leaderboards/refresh - Refresh all leaderboards (admin only)
router.post('/refresh', requireAdmin, async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await leaderboardService.refreshAllLeaderboards();
    res.json({
      success: true,
      data: result,
      message: `Refreshed ${result.updated.length} leaderboards`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
