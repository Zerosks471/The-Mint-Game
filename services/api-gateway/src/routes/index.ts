import { Router } from 'express';
import healthRoutes from './health';
import authRouter from './auth';
import userRouter from './user';
import gameRouter from './game';
import prestigeRouter from './prestige';
import dailyRouter from './daily';
import leaderboardRouter from './leaderboard';
import achievementsRouter from './achievements';
import ipoRouter from './ipo';
import friendsRouter from './friends';
import clubsRouter from './clubs';
import giftsRouter from './gifts';
import subscriptionsRouter from './subscriptions';

const router: Router = Router();

// Health check routes (no auth required)
router.use(healthRoutes);

// API v1 routes
const v1Router = Router();

// Placeholder routes - will be implemented in Phase 1
v1Router.get('/ping', (_req, res) => {
  res.json({ message: 'pong', version: '1.0.0' });
});

// Auth routes
v1Router.use('/auth', authRouter);

// User routes
v1Router.use('/user', userRouter);

// Game routes
v1Router.use('/game', gameRouter);

// Prestige routes
v1Router.use('/prestige', prestigeRouter);

// Daily rewards routes
v1Router.use('/daily', dailyRouter);

// Leaderboard routes
v1Router.use('/leaderboards', leaderboardRouter);

// Achievements routes
v1Router.use('/achievements', achievementsRouter);

// IPO routes
v1Router.use('/ipo', ipoRouter);

// Friends routes
v1Router.use('/friends', friendsRouter);

// Clubs routes
v1Router.use('/clubs', clubsRouter);

// Gifts routes
v1Router.use('/gifts', giftsRouter);

// Subscriptions routes (Stripe)
v1Router.use('/subscriptions', subscriptionsRouter);

router.use('/v1', v1Router);

export default router;
