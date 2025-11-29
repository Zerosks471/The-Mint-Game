import { Router } from 'express';
import healthRoutes from './health';
import authRouter from './auth';
import userRouter from './user';
import gameRouter from './game';
import prestigeRouter from './prestige';
import dailyRouter from './daily';
import leaderboardRouter from './leaderboard';
import achievementsRouter from './achievements';

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

router.use('/v1', v1Router);

export default router;
