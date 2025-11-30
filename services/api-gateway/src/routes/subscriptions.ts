import { Router, Request, Response, NextFunction } from 'express';
import { ErrorCodes } from '@mint/types';
import { authenticate, AuthenticatedRequest, AppError } from '../middleware';
import { subscriptionService } from '../services/subscription.service';

const router = Router();

// POST /api/v1/subscriptions/checkout - Create Stripe checkout session
router.post(
  '/checkout',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { plan } = req.body;

      if (!plan || !['monthly', 'annual'].includes(plan)) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid plan. Must be "monthly" or "annual"', 400);
      }

      const result = await subscriptionService.createCheckoutSession(req.user!.id, plan);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/subscriptions/webhook - Handle Stripe webhooks
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
      await subscriptionService.handleWebhook(req.body, signature);

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/subscriptions/status - Get current subscription status
router.get(
  '/status',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = await subscriptionService.getSubscriptionStatus(req.user!.id);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/subscriptions/portal - Create Stripe Customer Portal session
router.post(
  '/portal',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await subscriptionService.createPortalSession(req.user!.id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
