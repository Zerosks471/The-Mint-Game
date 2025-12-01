import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@mint/database';
import { config } from '../config';
import { logger } from '../services/logger';

const router: ReturnType<typeof Router> = Router();

/**
 * POST /admin/auth/login
 * Login with username/email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Username and password required' },
      });
    }

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        isAdmin: true,
        accountStatus: true,
      },
    });

    if (!user) {
      logger.warn('Admin login failed: user not found', { username, ip: req.ip });
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logger.warn('Admin login failed: invalid password', { username, ip: req.ip });
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
      });
    }

    // Check if user is admin
    if (!user.isAdmin) {
      logger.warn('Admin login failed: not an admin', { username, userId: user.id, ip: req.ip });
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_ADMIN', message: 'Admin access required' },
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      logger.warn('Admin login failed: account not active', { username, status: user.accountStatus });
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' },
      });
    }

    // Generate admin token
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        isAdmin: true,
        type: 'access',
        sessionId: crypto.randomUUID(),
      },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    logger.info('Admin login successful', { username, userId: user.id, ip: req.ip });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (error) {
    logger.error('Admin login error', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Login failed' },
    });
  }
});

export default router;
