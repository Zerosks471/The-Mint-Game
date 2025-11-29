import { Router } from 'express';
import healthRoutes from './health';

const router: Router = Router();

// Health check routes (no auth required)
router.use(healthRoutes);

// API v1 routes
const v1Router = Router();

// Placeholder routes - will be implemented in Phase 1
v1Router.get('/ping', (_req, res) => {
  res.json({ message: 'pong', version: '1.0.0' });
});

router.use('/v1', v1Router);

export default router;
