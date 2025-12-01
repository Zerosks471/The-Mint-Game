import { Router } from 'express';
import { adminAuth, auditLog } from '../middleware';
import authRouter from './auth';
import usersRouter from './users';
import economyRouter from './economy';
import logsRouter from './logs';
import healthRouter from './health';

const router: ReturnType<typeof Router> = Router();

// Public health endpoint (for load balancers, still IP-restricted)
router.get('/ping', (req, res) => {
  res.json({ status: 'ok', service: 'admin-dashboard' });
});

// Auth routes (public - no token required)
router.use('/auth', authRouter);

// All routes below require admin authentication
router.use(adminAuth);
router.use(auditLog);

// Mount route modules
router.use('/users', usersRouter);
router.use('/economy', economyRouter);
router.use('/logs', logsRouter);
router.use('/health', healthRouter);

// Admin info endpoint
router.get('/me', (req: any, res) => {
  res.json({
    success: true,
    data: {
      id: req.admin.id,
      username: req.admin.username,
      email: req.admin.email,
    },
  });
});

export default router;
