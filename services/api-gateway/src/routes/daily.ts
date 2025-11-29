import { Router, Response, NextFunction } from 'express';
import { dailyService } from '../services/daily.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All daily routes require authentication
router.use(authenticate);

// GET /api/v1/daily/status - Get daily reward status
router.get('/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await dailyService.getStatus(req.user!.id);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/daily/claim - Claim today's reward
router.post('/claim', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await dailyService.claimReward(req.user!.id);
    res.json({
      success: true,
      data: result,
      message: result.streakBroken
        ? `Streak reset! You claimed Day ${result.day} reward.`
        : `Day ${result.day} claimed! ${result.newStreak} day streak!`,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/daily/rewards - Get all rewards for calendar display
router.get('/rewards', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rewards = await dailyService.getAllRewards();
    res.json({ success: true, data: rewards });
  } catch (error) {
    next(error);
  }
});

export default router;
