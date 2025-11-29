import { Router, Response, NextFunction } from 'express';
import { prestigeService } from '../services/prestige.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { ValidationError } from '../middleware/errorHandler';

const router = Router();

// All prestige routes require authentication
router.use(authenticate);

// GET /api/v1/prestige/status - Get prestige status
router.get('/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await prestigeService.getPrestigeStatus(req.user!.id);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/prestige/perks - Get all perks with player's levels
router.get('/perks', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const perks = await prestigeService.getPerks(req.user!.id);
    res.json({ success: true, data: perks });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/prestige/go-public - Execute prestige
router.post('/go-public', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await prestigeService.goPublic(req.user!.id);
    res.json({
      success: true,
      data: result,
      message: `Congratulations! You went public and earned ${result.pointsEarned} prestige points!`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/prestige/buy-perk - Purchase a perk
const buyPerkSchema = z.object({
  perkId: z.string().min(1, 'Perk ID is required'),
});

router.post('/buy-perk', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = buyPerkSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
    }

    const { perkId } = result.data;
    const data = await prestigeService.buyPerk(req.user!.id, perkId);

    res.json({
      success: true,
      data,
      message: `Successfully purchased ${data.perk.name}!`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
