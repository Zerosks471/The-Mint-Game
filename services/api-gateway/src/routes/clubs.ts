import { Router, Response, NextFunction } from 'express';
import { clubsService } from '../services/clubs.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/clubs - Browse public clubs
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const clubs = await clubsService.getPublicClubs(req.user!.id);
    res.json({ success: true, data: clubs });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/clubs/my - Get player's club
router.get('/my', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const club = await clubsService.getMyClub(req.user!.id);
    res.json({ success: true, data: club });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/clubs - Create club
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, isPublic } = req.body;
    if (!name || name.length < 3 || name.length > 30) {
      return res.status(400).json({
        success: false,
        error: { message: 'Club name must be 3-30 characters' },
      });
    }
    const club = await clubsService.createClub(req.user!.id, name, description, isPublic);
    res.json({ success: true, data: club, message: 'Club created!' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/clubs/:id - Get club details
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const club = await clubsService.getClub(req.params.id, req.user!.id);
    res.json({ success: true, data: club });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/clubs/:id/activities - Get club activity feed
router.get('/:id/activities', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const activities = await clubsService.getActivities(req.params.id);
    res.json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/clubs/:id/join - Join club
router.post('/:id/join', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await clubsService.joinClub(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Joined club!' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/clubs/leave - Leave club
router.post('/leave', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await clubsService.leaveClub(req.user!.id);
    res.json({ success: true, message: 'Left club' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/clubs/donate - Donate to club
router.post('/donate', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid donation amount' },
      });
    }
    const result = await clubsService.donate(req.user!.id, amount);
    res.json({
      success: true,
      data: result,
      message: `Donated! Club is now level ${result.newLevel} with ${result.newBonus} bonus`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/clubs/kick/:userId - Kick member
router.post('/kick/:userId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await clubsService.kickMember(req.user!.id, req.params.userId);
    res.json({ success: true, message: 'Member kicked' });
  } catch (error) {
    next(error);
  }
});

export default router;
