import { Router, Response, NextFunction } from 'express';
import { ErrorCodes } from '@mint/types';
import { authenticate, AuthenticatedRequest, AppError } from '../middleware';
import { coinsService } from '../services/coins.service';

const router = Router();

// GET /api/v1/coins/packages - Get available coin packages
router.get(
  '/packages',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await coinsService.getPackages(req.user!.id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/coins/checkout - Create checkout session for coin purchase
router.post(
  '/checkout',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { packageId } = req.body;

      if (!packageId || typeof packageId !== 'string') {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Package ID is required', 400);
      }

      const result = await coinsService.createCheckoutSession(req.user!.id, packageId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Note: Coin purchase webhooks are handled by the unified webhook endpoint
// at /api/v1/subscriptions/webhook - see subscription.service.ts

export default router;
