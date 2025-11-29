import { Router, Response, NextFunction } from 'express';
import { achievementService } from '../services/achievement.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All achievement routes require authentication
router.use(authenticate);

// GET /api/v1/achievements - Get all achievements with progress
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const achievements = await achievementService.getAchievements(req.user!.id);
    res.json({ success: true, data: achievements });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/achievements/summary - Get achievement summary
router.get('/summary', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const summary = await achievementService.getSummary(req.user!.id);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/achievements/recent - Get recently unlocked achievements
router.get('/recent', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
    const recent = await achievementService.getRecentUnlocked(req.user!.id, limit);
    res.json({ success: true, data: recent });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/achievements/check - Check and unlock any new achievements
router.post('/check', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const newlyUnlocked = await achievementService.checkAndUnlockAchievements(req.user!.id);
    res.json({
      success: true,
      data: {
        newlyUnlocked,
        count: newlyUnlocked.length,
      },
      message:
        newlyUnlocked.length > 0
          ? `Unlocked ${newlyUnlocked.length} achievement(s)!`
          : 'No new achievements unlocked',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
