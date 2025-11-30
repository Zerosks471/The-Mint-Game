import { Router, Response, NextFunction } from 'express';
import { friendsService } from '../services/friends.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/friends - Get friends list
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const friends = await friendsService.getFriends(req.user!.id);
    res.json({ success: true, data: friends });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/friends/requests - Get pending requests (received)
router.get('/requests', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await friendsService.getPendingRequests(req.user!.id);
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/friends/sent - Get sent requests (outgoing)
router.get('/sent', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await friendsService.getSentRequests(req.user!.id);
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/friends/search?q=username - Search users
router.get('/search', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.json({ success: true, data: [] });
    }
    const users = await friendsService.searchUsers(query, req.user!.id);
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/friends/request - Send friend request
router.post('/request', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: { message: 'Username required' } });
    }
    const result = await friendsService.sendRequest(req.user!.id, username);
    res.json({ success: true, data: result, message: 'Friend request sent' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/friends/:id/accept - Accept friend request
router.post('/:id/accept', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await friendsService.acceptRequest(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Friend request accepted' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/friends/:id/reject - Reject friend request
router.post('/:id/reject', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await friendsService.rejectRequest(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Friend request rejected' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/friends/:id - Remove friend
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await friendsService.removeFriend(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    next(error);
  }
});

export default router;
