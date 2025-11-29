import { Router, Response, NextFunction } from 'express';
import { ipoService } from '../services/ipo.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All IPO routes require authentication
router.use(authenticate);

// GET /api/v1/ipo/status - Get current IPO status
router.get('/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await ipoService.getIPOStatus(req.user!.id);
    res.json({
      success: true,
      data: status,
      hasActiveIPO: status !== null,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/ipo/launch - Launch IPO instead of instant prestige
router.post('/launch', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await ipoService.launchIPO(req.user!.id);
    res.json({
      success: true,
      data: status,
      message: `IPO launched! Your ticker symbol is ${status.tickerSymbol}`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/ipo/sell - Sell shares and complete prestige
router.post('/sell', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ipoService.sellShares(req.user!.id);
    res.json({
      success: true,
      data: result,
      message: `Sold shares for ${result.pointsEarned} prestige points (${result.multiplier}x multiplier)!`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/ipo/cancel - Cancel IPO and take base points
router.post('/cancel', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ipoService.cancelIPO(req.user!.id);
    res.json({
      success: true,
      data: result,
      message: `IPO cancelled. You received ${result.pointsEarned} base prestige points.`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
