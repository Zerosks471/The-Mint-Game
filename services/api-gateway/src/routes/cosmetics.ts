import { Router, Response, NextFunction } from 'express';
import { ErrorCodes } from '@mint/types';
import { authenticate, AuthenticatedRequest, AppError } from '../middleware';
import { cosmeticsService } from '../services/cosmetics.service';

const router = Router();

// GET /api/v1/cosmetics/catalog - Get all cosmetics with ownership status
router.get(
  '/catalog',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const catalog = await cosmeticsService.getCatalog(req.user!.id);

      res.json({
        success: true,
        data: catalog,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/cosmetics/owned - Get player's owned cosmetics
router.get(
  '/owned',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const owned = await cosmeticsService.getOwned(req.user!.id);

      res.json({
        success: true,
        data: { cosmetics: owned },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/cosmetics/:id/purchase - Purchase a cosmetic
router.post(
  '/:id/purchase',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cosmetic ID is required', 400);
      }

      const result = await cosmeticsService.purchase(req.user!.id, id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/cosmetics/equip - Equip or unequip a cosmetic
router.post(
  '/equip',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { cosmeticId, slot } = req.body;

      // cosmeticId can be null (for unequipping), but slot is required when unequipping
      if (cosmeticId === undefined) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'cosmeticId is required', 400);
      }

      const result = await cosmeticsService.equip(req.user!.id, cosmeticId, slot);

      res.json({
        success: true,
        data: { equipped: result },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
