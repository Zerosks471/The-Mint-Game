import { Router, Request, Response, NextFunction } from 'express';
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

// POST /api/v1/coins/webhook - Handle Stripe webhooks for coin purchases
// Note: This endpoint uses raw body for signature verification
router.post(
  '/webhook',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['stripe-signature'];

      if (!signature || typeof signature !== 'string') {
        throw new AppError(ErrorCodes.BAD_REQUEST, 'Missing Stripe signature', 400);
      }

      // req.body is the raw buffer when using express.raw middleware
      await coinsService.handleWebhook(req.body, signature);

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
