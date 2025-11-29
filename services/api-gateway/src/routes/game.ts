import { Router, Response, NextFunction } from 'express';
import { gameService } from '../services/game.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// ==================== PROPERTIES ====================

// GET /api/v1/game/properties/types
router.get(
  '/properties/types',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const types = await gameService.getPropertyTypes(req.user!.id);
      res.json({ success: true, data: types });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/game/properties
router.get(
  '/properties',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const properties = await gameService.getPlayerProperties(req.user!.id);
      res.json({ success: true, data: properties });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/game/properties/:typeId/buy
router.post(
  '/properties/:typeId/buy',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const typeId = parseInt(req.params.typeId as string);
      const property = await gameService.buyProperty(req.user!.id, typeId);
      res.json({ success: true, data: property });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/game/properties/:id/upgrade
router.post(
  '/properties/:id/upgrade',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const property = await gameService.upgradeProperty(req.user!.id, req.params.id as string);
      res.json({ success: true, data: property });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/game/properties/:id/hire-manager
router.post(
  '/properties/:id/hire-manager',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const property = await gameService.hireManager(req.user!.id, req.params.id as string);
      res.json({ success: true, data: property });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== BUSINESSES ====================

// GET /api/v1/game/businesses/types
router.get(
  '/businesses/types',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const types = await gameService.getBusinessTypes(req.user!.id);
      res.json({ success: true, data: types });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/game/businesses
router.get(
  '/businesses',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const businesses = await gameService.getPlayerBusinesses(req.user!.id);
      res.json({ success: true, data: businesses });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/game/businesses/:typeId/buy
router.post(
  '/businesses/:typeId/buy',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const typeId = parseInt(req.params.typeId as string);
      const business = await gameService.buyBusiness(req.user!.id, typeId);
      res.json({ success: true, data: business });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/game/businesses/:id/level-up
router.post(
  '/businesses/:id/level-up',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const business = await gameService.levelUpBusiness(req.user!.id, req.params.id as string);
      res.json({ success: true, data: business });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/game/businesses/:id/collect
router.post(
  '/businesses/:id/collect',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await gameService.collectBusinessRevenue(req.user!.id, req.params.id as string);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== OFFLINE EARNINGS ====================

// GET /api/v1/game/offline/status
router.get(
  '/offline/status',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = await gameService.getOfflineStatus(req.user!.id);
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/game/offline/collect
router.post(
  '/offline/collect',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await gameService.collectOfflineEarnings(req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
