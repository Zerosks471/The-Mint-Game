import { Router, Response, NextFunction } from 'express';
import { minigameService } from '../services/minigame.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Start a business task (when collecting revenue)
router.post(
  '/business/start',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { businessId } = req.body;
      const result = await minigameService.startBusinessTask(req.user!.id, businessId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Submit business task result
router.post(
  '/business/complete',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { sessionId, success, score } = req.body;
      const result = await minigameService.submitBusinessTaskResult(
        req.user!.id,
        sessionId,
        success,
        score
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Submit property task result (optional bonus task)
router.post(
  '/property/complete',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { propertyId, success, score } = req.body;
      const result = await minigameService.submitPropertyTaskResult(
        req.user!.id,
        propertyId,
        success,
        score
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Get task statistics
router.get(
  '/stats',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await minigameService.getTaskStats(req.user!.id);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
