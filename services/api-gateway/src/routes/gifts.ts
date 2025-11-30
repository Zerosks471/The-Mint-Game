import { Router, Response, NextFunction } from 'express';
import { giftsService } from '../services/gifts.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/gifts - Get pending gifts
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const gifts = await giftsService.getPendingGifts(req.user!.id);
    res.json({ success: true, data: gifts });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/gifts/sent - Get sent gifts
router.get('/sent', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const gifts = await giftsService.getSentGifts(req.user!.id);
    res.json({ success: true, data: gifts });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/gifts/counts - Get gift counts
router.get('/counts', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const counts = await giftsService.getGiftCounts(req.user!.id);
    res.json({ success: true, data: counts });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/gifts/send - Send gift to friend
router.post('/send', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { receiverId, giftType, amount, message } = req.body;
    if (!receiverId || !giftType) {
      return res.status(400).json({
        success: false,
        error: { message: 'Receiver and gift type required' },
      });
    }
    const gift = await giftsService.sendGift(req.user!.id, receiverId, giftType, amount, message);
    res.json({ success: true, data: gift, message: 'Gift sent!' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/gifts/:id/claim - Claim a gift
router.post('/:id/claim', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await giftsService.claimGift(req.user!.id, req.params.id);
    res.json({
      success: true,
      data: result,
      message: result.cashReceived ? `Claimed $${result.cashReceived}!` : 'Gift claimed!',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
