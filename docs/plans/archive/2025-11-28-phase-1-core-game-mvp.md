# Phase 1: Core Game MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core game mechanics: authentication, properties, businesses, income calculation, and offline earnings.

**Architecture:** User Service handles auth with JWT tokens stored in HTTP-only cookies. Game Service manages properties/businesses with income calculations. Frontend uses Zustand for state management with React Query for API calls.

**Tech Stack:** Express.js, Prisma, bcrypt, jsonwebtoken, React 18, Zustand, React Query, Tailwind CSS

---

## Overview

Phase 1 delivers a playable idle game with:

- User registration and login (JWT auth)
- 10 property types to buy and upgrade
- 8 business types with cycle mechanics
- Income calculation engine
- Offline earnings collection
- Main dashboard UI

**Estimated Tasks:** 12 major tasks with ~150 bite-sized steps

---

## Task 1: User Service - Registration

**Files:**

- Create: `services/api-gateway/src/services/user.service.ts`
- Create: `services/api-gateway/src/routes/auth.ts`
- Create: `services/api-gateway/src/validators/auth.validators.ts`
- Modify: `services/api-gateway/src/routes/index.ts`
- Test: `services/api-gateway/src/__tests__/auth.test.ts`

### Step 1: Install additional dependencies

```bash
cd /Users/n809m/Desktop/Capital\ P
pnpm --filter @mint/api-gateway add bcrypt uuid
pnpm --filter @mint/api-gateway add -D @types/bcrypt @types/uuid vitest @vitest/coverage-v8 supertest @types/supertest
```

### Step 2: Create auth validators

Create `services/api-gateway/src/validators/auth.validators.ts`:

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
```

### Step 3: Create user service

Create `services/api-gateway/src/services/user.service.ts`:

```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@mint/database';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  sub: string;
  email: string;
  username: string;
  isPremium: boolean;
  sessionId: string;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class UserService {
  async register(
    email: string,
    username: string,
    password: string,
    ip?: string
  ): Promise<{ user: any; tokens: AuthTokens }> {
    // Check if email exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new AppError('Email already registered', 409);
    }

    // Check if username exists
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new AppError('Username already taken', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate referral code
    const referralCode = uuidv4().slice(0, 8).toUpperCase();

    // Create user with transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          username,
          passwordHash,
          referralCode,
          signupPlatform: 'web',
          signupIp: ip,
        },
      });

      // Create player stats
      await tx.playerStats.create({
        data: {
          userId: newUser.id,
          cash: 1000,
        },
      });

      return newUser;
    });

    // Create session and generate tokens
    const tokens = await this.createSession(user.id, ip);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(
    email: string,
    password: string,
    ip?: string
  ): Promise<{ user: any; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(`Account locked. Try again in ${minutesLeft} minutes`, 423);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      // Increment failed attempts
      const attempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: attempts };

      if (attempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new AppError('Invalid email or password', 401);
    }

    // Reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const tokens = await this.createSession(user.id, ip);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as TokenPayload;

      if (payload.type !== 'refresh') {
        throw new AppError('Invalid token type', 401);
      }

      // Verify session exists and is active
      const session = await prisma.userSession.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session || !session.isActive || session.revokedAt) {
        throw new AppError('Session expired or revoked', 401);
      }

      // Generate new tokens (rotation)
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new AppError('User not found', 401);
      }

      // Update session activity
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() },
      });

      return this.generateTokens(user, session.id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async logout(sessionId: string): Promise<void> {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: 'logout',
      },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: 'logout_all',
      },
    });
  }

  private async createSession(userId: string, ip?: string): Promise<AuthTokens> {
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        ipAddress: ip,
        expiresAt,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    return this.generateTokens(user, session.id);
  }

  private generateTokens(user: any, sessionId: string): AuthTokens {
    const basePayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      isPremium: user.isPremium,
      sessionId,
    };

    const accessToken = jwt.sign({ ...basePayload, type: 'access' }, config.JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign({ ...basePayload, type: 'refresh' }, config.JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    return { accessToken, refreshToken, expiresAt };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, twoFactorSecret, emailVerifyToken, passwordResetToken, ...sanitized } =
      user;
    return sanitized;
  }
}

export const userService = new UserService();
```

### Step 4: Create auth routes

Create `services/api-gateway/src/routes/auth.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth.validators';
import { ValidationError } from '../middleware/errorHandler';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
    }

    const { email, username, password } = result.data;
    const ip = req.ip || req.socket.remoteAddress;

    const { user, tokens } = await userService.register(email, username, password, ip);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
    }

    const { email, password } = result.data;
    const ip = req.ip || req.socket.remoteAddress;

    const { user, tokens } = await userService.login(email, password, ip);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required', {});
    }

    const tokens = await userService.refreshToken(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get session ID from token if available
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const jwt = await import('jsonwebtoken');
        const { config } = await import('../config');
        const payload = jwt.default.verify(token, config.JWT_ACCESS_SECRET) as any;
        await userService.logout(payload.sessionId);
      } catch {
        // Token invalid, just clear cookie
      }
    }

    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Step 5: Add cookie-parser to app

```bash
pnpm --filter @mint/api-gateway add cookie-parser
pnpm --filter @mint/api-gateway add -D @types/cookie-parser
```

### Step 6: Update app.ts to add cookie-parser

Modify `services/api-gateway/src/app.ts` - add after bodyParser:

```typescript
import cookieParser from 'cookie-parser';
// ... in createApp function, after express.json():
app.use(cookieParser());
```

### Step 7: Update routes index

Modify `services/api-gateway/src/routes/index.ts`:

```typescript
import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';

const router = Router();

// Health check routes
router.use('/health', healthRouter);
router.use('/ready', healthRouter);

// API v1 routes
router.use('/v1/auth', authRouter);

// Placeholder for future routes
router.get('/v1/ping', (req, res) => {
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

export default router;
```

### Step 8: Test registration manually

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"Password123"}'
```

Expected: 201 response with user and accessToken

### Step 9: Commit

```bash
git add .
git commit -m "feat(auth): add user registration and login

- Add UserService with register, login, refresh, logout
- Add auth routes with validation
- JWT access/refresh token flow
- HTTP-only cookie for refresh token
- Account lockout after failed attempts"
```

---

## Task 2: Authentication Middleware

**Files:**

- Create: `services/api-gateway/src/middleware/auth.ts`
- Modify: `services/api-gateway/src/middleware/index.ts`

### Step 1: Create auth middleware

Create `services/api-gateway/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticationError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    isPremium: boolean;
    sessionId: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.slice(7);

    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as any;

    if (payload.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      isPremium: payload.isPremium,
      sessionId: payload.sessionId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else {
      next(error);
    }
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as any;

    if (payload.type === 'access') {
      req.user = {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        isPremium: payload.isPremium,
        sessionId: payload.sessionId,
      };
    }
  } catch {
    // Token invalid, continue without user
  }

  next();
};
```

### Step 2: Update middleware index

Modify `services/api-gateway/src/middleware/index.ts`:

```typescript
export * from './requestId';
export * from './errorHandler';
export * from './auth';
```

### Step 3: Commit

```bash
git add .
git commit -m "feat(auth): add authentication middleware

- Add authenticate middleware for protected routes
- Add optionalAuth for routes with optional auth
- Token validation with proper error handling"
```

---

## Task 3: Get Current User & Profile Routes

**Files:**

- Create: `services/api-gateway/src/routes/user.ts`
- Modify: `services/api-gateway/src/routes/index.ts`

### Step 1: Create user routes

Create `services/api-gateway/src/routes/user.ts`:

```typescript
import { Router, Response, NextFunction } from 'express';
import { prisma } from '@mint/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/v1/user/me - Get current user with stats
router.get(
  '/me',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          playerStats: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Sanitize user
      const { passwordHash, twoFactorSecret, emailVerifyToken, passwordResetToken, ...sanitized } =
        user;

      res.json({
        success: true,
        data: sanitized,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/user/stats - Get player stats only
router.get(
  '/stats',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await prisma.playerStats.findUnique({
        where: { userId: req.user!.id },
      });

      if (!stats) {
        throw new AppError('Player stats not found', 404);
      }

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### Step 2: Update routes index

Add to `services/api-gateway/src/routes/index.ts`:

```typescript
import userRouter from './user';
// ... add after auth router:
router.use('/v1/user', userRouter);
```

### Step 3: Commit

```bash
git add .
git commit -m "feat(user): add user profile and stats routes

- GET /api/v1/user/me - current user with stats
- GET /api/v1/user/stats - player stats only"
```

---

## Task 4: Seed Property & Business Types

**Files:**

- Create: `packages/database/prisma/seed.ts`
- Modify: `packages/database/package.json`

### Step 1: Create seed file

Create `packages/database/prisma/seed.ts`:

```typescript
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const propertyTypes: Prisma.PropertyTypeCreateInput[] = [
  // Tier 1 - Starter
  {
    slug: 'lemonade-stand',
    name: 'Street Food Cart',
    category: 'starter',
    tier: 1,
    baseCost: 100,
    baseIncomeHour: 15,
    managerCost: 500,
    managerName: 'Street Vendor',
    sortOrder: 1,
  },
  {
    slug: 'newspaper-route',
    name: 'Newspaper Route',
    category: 'starter',
    tier: 1,
    baseCost: 500,
    baseIncomeHour: 25,
    managerCost: 2500,
    managerName: 'Delivery Supervisor',
    sortOrder: 2,
  },
  {
    slug: 'car-wash',
    name: 'Car Wash',
    category: 'starter',
    tier: 1,
    baseCost: 2000,
    baseIncomeHour: 100,
    managerCost: 10000,
    managerName: 'Wash Manager',
    sortOrder: 3,
  },

  // Tier 2 - Residential
  {
    slug: 'apartment',
    name: 'Apartment',
    category: 'residential',
    tier: 2,
    baseCost: 10000,
    baseIncomeHour: 500,
    managerCost: 50000,
    managerName: 'Property Manager',
    sortOrder: 4,
    unlockRequirement: { level: 5 },
  },
  {
    slug: 'duplex',
    name: 'Duplex',
    category: 'residential',
    tier: 2,
    baseCost: 50000,
    baseIncomeHour: 2500,
    managerCost: 250000,
    managerName: 'Building Super',
    sortOrder: 5,
    unlockRequirement: { level: 10 },
  },
  {
    slug: 'condo-complex',
    name: 'Condo Complex',
    category: 'residential',
    tier: 2,
    baseCost: 200000,
    baseIncomeHour: 10000,
    managerCost: 1000000,
    managerName: 'HOA President',
    sortOrder: 6,
    unlockRequirement: { level: 15 },
  },

  // Tier 3 - Commercial
  {
    slug: 'strip-mall',
    name: 'Strip Mall',
    category: 'commercial',
    tier: 3,
    baseCost: 1000000,
    baseIncomeHour: 50000,
    managerCost: 5000000,
    managerName: 'Mall Director',
    sortOrder: 7,
    unlockRequirement: { level: 20 },
  },
  {
    slug: 'office-building',
    name: 'Office Building',
    category: 'commercial',
    tier: 3,
    baseCost: 5000000,
    baseIncomeHour: 250000,
    managerCost: 25000000,
    managerName: 'Building Manager',
    sortOrder: 8,
    unlockRequirement: { level: 25 },
  },

  // Tier 4 - Luxury
  {
    slug: 'hotel',
    name: 'Luxury Hotel',
    category: 'luxury',
    tier: 4,
    baseCost: 25000000,
    baseIncomeHour: 1250000,
    managerCost: 125000000,
    managerName: 'Hotel GM',
    sortOrder: 9,
    unlockRequirement: { level: 30 },
  },
  {
    slug: 'skyscraper',
    name: 'Skyscraper',
    category: 'luxury',
    tier: 4,
    baseCost: 100000000,
    baseIncomeHour: 5000000,
    managerCost: 500000000,
    managerName: 'Tower Director',
    sortOrder: 10,
    unlockRequirement: { level: 35 },
  },
];

const businessTypes: Prisma.BusinessTypeCreateInput[] = [
  // Tier 1 - Small Business
  {
    slug: 'food-truck',
    name: 'Food Truck',
    category: 'food',
    tier: 1,
    baseCost: 5000,
    baseRevenue: 1000,
    cycleSeconds: 60,
    employeeBaseCost: 500,
    sortOrder: 1,
  },
  {
    slug: 'coffee-shop',
    name: 'Coffee Shop',
    category: 'food',
    tier: 1,
    baseCost: 25000,
    baseRevenue: 5000,
    cycleSeconds: 120,
    employeeBaseCost: 2500,
    sortOrder: 2,
    unlockRequirement: { level: 5 },
  },

  // Tier 2 - Medium Business
  {
    slug: 'restaurant',
    name: 'Restaurant',
    category: 'food',
    tier: 2,
    baseCost: 100000,
    baseRevenue: 20000,
    cycleSeconds: 300,
    employeeBaseCost: 10000,
    sortOrder: 3,
    unlockRequirement: { level: 10 },
  },
  {
    slug: 'gym',
    name: 'Fitness Gym',
    category: 'service',
    tier: 2,
    baseCost: 250000,
    baseRevenue: 50000,
    cycleSeconds: 600,
    employeeBaseCost: 25000,
    sortOrder: 4,
    unlockRequirement: { level: 15 },
  },

  // Tier 3 - Large Business
  {
    slug: 'tech-startup',
    name: 'Tech Startup',
    category: 'tech',
    tier: 3,
    baseCost: 1000000,
    baseRevenue: 200000,
    cycleSeconds: 1800,
    employeeBaseCost: 100000,
    sortOrder: 5,
    unlockRequirement: { level: 20 },
  },
  {
    slug: 'factory',
    name: 'Factory',
    category: 'manufacturing',
    tier: 3,
    baseCost: 5000000,
    baseRevenue: 1000000,
    cycleSeconds: 3600,
    employeeBaseCost: 500000,
    sortOrder: 6,
    unlockRequirement: { level: 25 },
  },

  // Tier 4 - Enterprise
  {
    slug: 'bank',
    name: 'Private Bank',
    category: 'finance',
    tier: 4,
    baseCost: 25000000,
    baseRevenue: 5000000,
    cycleSeconds: 7200,
    employeeBaseCost: 2500000,
    sortOrder: 7,
    unlockRequirement: { level: 30 },
  },
  {
    slug: 'space-company',
    name: 'Space Company',
    category: 'tech',
    tier: 4,
    baseCost: 100000000,
    baseRevenue: 20000000,
    cycleSeconds: 14400,
    employeeBaseCost: 10000000,
    sortOrder: 8,
    unlockRequirement: { level: 35 },
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Upsert property types
  for (const property of propertyTypes) {
    await prisma.propertyType.upsert({
      where: { slug: property.slug },
      update: property,
      create: property,
    });
  }
  console.log(`✅ Seeded ${propertyTypes.length} property types`);

  // Upsert business types
  for (const business of businessTypes) {
    await prisma.businessType.upsert({
      where: { slug: business.slug },
      update: business,
      create: business,
    });
  }
  console.log(`✅ Seeded ${businessTypes.length} business types`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Step 2: Update database package.json

Add to `packages/database/package.json` in "prisma" section:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

### Step 3: Run seed

```bash
cd /Users/n809m/Desktop/Capital\ P
pnpm db:push
npx prisma db seed --schema packages/database/prisma/schema.prisma
```

### Step 4: Commit

```bash
git add .
git commit -m "feat(db): add seed data for properties and businesses

- 10 property types across 4 tiers
- 8 business types across 4 tiers
- Unlock requirements by player level"
```

---

## Task 5: Game Service - Properties

**Files:**

- Create: `services/api-gateway/src/services/game.service.ts`
- Create: `services/api-gateway/src/routes/game.ts`

### Step 1: Create game service

Create `services/api-gateway/src/services/game.service.ts`:

```typescript
import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import { AppError } from '../middleware/errorHandler';

export class GameService {
  // ==================== PROPERTIES ====================

  async getPropertyTypes(userId: string) {
    const playerStats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    const playerLevel = playerStats?.playerLevel ?? 1;

    const types = await prisma.propertyType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return types.map((type) => ({
      ...type,
      isUnlocked: this.checkUnlock(type.unlockRequirement, playerLevel),
    }));
  }

  async getPlayerProperties(userId: string) {
    return prisma.playerProperty.findMany({
      where: { userId },
      include: { propertyType: true },
      orderBy: { propertyType: { sortOrder: 'asc' } },
    });
  }

  async buyProperty(userId: string, propertyTypeId: number) {
    return prisma.$transaction(async (tx) => {
      const propertyType = await tx.propertyType.findUnique({
        where: { id: propertyTypeId },
      });

      if (!propertyType) {
        throw new AppError('Property type not found', 404);
      }

      const playerStats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!playerStats) {
        throw new AppError('Player stats not found', 404);
      }

      // Check unlock requirement
      if (!this.checkUnlock(propertyType.unlockRequirement, playerStats.playerLevel)) {
        throw new AppError('Property not unlocked yet', 403);
      }

      // Get existing property or create new
      let playerProperty = await tx.playerProperty.findUnique({
        where: { userId_propertyTypeId: { userId, propertyTypeId } },
      });

      // Calculate cost
      const quantity = playerProperty?.quantity ?? 0;
      const cost = this.calculatePropertyCost(propertyType, quantity);

      // Check if player has enough cash
      if (playerStats.cash.lessThan(cost)) {
        throw new AppError('Not enough cash', 400);
      }

      // Calculate new income
      const newIncomePerProperty = this.calculatePropertyIncome(
        propertyType,
        playerProperty?.upgradeLevel ?? 0
      );

      if (playerProperty) {
        // Update existing
        playerProperty = await tx.playerProperty.update({
          where: { id: playerProperty.id },
          data: {
            quantity: { increment: 1 },
            totalSpent: { increment: cost },
            currentIncomeHour: newIncomePerProperty.mul(quantity + 1),
            nextPurchaseCost: this.calculatePropertyCost(propertyType, quantity + 1),
          },
          include: { propertyType: true },
        });
      } else {
        // Create new
        playerProperty = await tx.playerProperty.create({
          data: {
            userId,
            propertyTypeId,
            quantity: 1,
            totalSpent: cost,
            currentIncomeHour: newIncomePerProperty,
            nextPurchaseCost: this.calculatePropertyCost(propertyType, 1),
          },
          include: { propertyType: true },
        });
      }

      // Deduct cash and update income
      const newTotalIncome = await this.calculateTotalIncome(tx, userId);

      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { decrement: cost },
          totalPropertiesOwned: { increment: 1 },
          baseIncomePerHour: newTotalIncome,
          effectiveIncomeHour: newTotalIncome.mul(playerStats.currentMultiplier),
        },
      });

      return playerProperty;
    });
  }

  async upgradeProperty(userId: string, propertyId: string) {
    return prisma.$transaction(async (tx) => {
      const playerProperty = await tx.playerProperty.findUnique({
        where: { id: propertyId },
        include: { propertyType: true },
      });

      if (!playerProperty || playerProperty.userId !== userId) {
        throw new AppError('Property not found', 404);
      }

      if (playerProperty.upgradeLevel >= playerProperty.propertyType.maxUpgradeLevel) {
        throw new AppError('Property at max upgrade level', 400);
      }

      const playerStats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!playerStats) {
        throw new AppError('Player stats not found', 404);
      }

      // Calculate upgrade cost (base cost * 0.5 * level multiplier)
      const upgradeCost = this.calculateUpgradeCost(
        playerProperty.propertyType,
        playerProperty.upgradeLevel
      );

      if (playerStats.cash.lessThan(upgradeCost)) {
        throw new AppError('Not enough cash', 400);
      }

      // Calculate new income
      const newLevel = playerProperty.upgradeLevel + 1;
      const newIncomePerProperty = this.calculatePropertyIncome(
        playerProperty.propertyType,
        newLevel
      );

      const updated = await tx.playerProperty.update({
        where: { id: propertyId },
        data: {
          upgradeLevel: newLevel,
          totalSpent: { increment: upgradeCost },
          currentIncomeHour: newIncomePerProperty.mul(playerProperty.quantity),
          nextUpgradeCost:
            newLevel < playerProperty.propertyType.maxUpgradeLevel
              ? this.calculateUpgradeCost(playerProperty.propertyType, newLevel)
              : null,
        },
        include: { propertyType: true },
      });

      // Update player stats
      const newTotalIncome = await this.calculateTotalIncome(tx, userId);

      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { decrement: upgradeCost },
          baseIncomePerHour: newTotalIncome,
          effectiveIncomeHour: newTotalIncome.mul(playerStats.currentMultiplier),
        },
      });

      return updated;
    });
  }

  async hireManager(userId: string, propertyId: string) {
    return prisma.$transaction(async (tx) => {
      const playerProperty = await tx.playerProperty.findUnique({
        where: { id: propertyId },
        include: { propertyType: true },
      });

      if (!playerProperty || playerProperty.userId !== userId) {
        throw new AppError('Property not found', 404);
      }

      if (playerProperty.managerHired) {
        throw new AppError('Manager already hired', 400);
      }

      if (!playerProperty.propertyType.managerCost) {
        throw new AppError('No manager available for this property', 400);
      }

      const playerStats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!playerStats) {
        throw new AppError('Player stats not found', 404);
      }

      const cost = playerProperty.propertyType.managerCost;

      if (playerStats.cash.lessThan(cost)) {
        throw new AppError('Not enough cash', 400);
      }

      const updated = await tx.playerProperty.update({
        where: { id: propertyId },
        data: {
          managerHired: true,
          managerHiredAt: new Date(),
          totalSpent: { increment: cost },
        },
        include: { propertyType: true },
      });

      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { decrement: cost },
        },
      });

      return updated;
    });
  }

  // ==================== HELPER METHODS ====================

  private checkUnlock(requirement: any, playerLevel: number): boolean {
    if (!requirement) return true;
    if (requirement.level && playerLevel < requirement.level) return false;
    return true;
  }

  private calculatePropertyCost(propertyType: any, currentQuantity: number): Decimal {
    // cost = baseCost * (costMultiplier ^ quantity)
    const multiplier = Math.pow(Number(propertyType.costMultiplier), currentQuantity);
    return new Decimal(propertyType.baseCost).mul(multiplier);
  }

  private calculatePropertyIncome(propertyType: any, upgradeLevel: number): Decimal {
    // income = baseIncome * (incomeMultiplier ^ upgradeLevel)
    const multiplier = Math.pow(Number(propertyType.incomeMultiplier), upgradeLevel);
    return new Decimal(propertyType.baseIncomeHour).mul(multiplier);
  }

  private calculateUpgradeCost(propertyType: any, currentLevel: number): Decimal {
    // upgradeCost = baseCost * 0.5 * (costMultiplier ^ level)
    const multiplier = Math.pow(Number(propertyType.costMultiplier), currentLevel);
    return new Decimal(propertyType.baseCost).mul(0.5).mul(multiplier);
  }

  private async calculateTotalIncome(tx: any, userId: string): Promise<Decimal> {
    const properties = await tx.playerProperty.findMany({
      where: { userId },
    });

    let total = new Decimal(0);
    for (const prop of properties) {
      total = total.add(prop.currentIncomeHour);
    }
    return total;
  }
}

export const gameService = new GameService();
```

### Step 2: Create game routes

Create `services/api-gateway/src/routes/game.ts`:

```typescript
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
      const typeId = parseInt(req.params.typeId);
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
      const property = await gameService.upgradeProperty(req.user!.id, req.params.id);
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
      const property = await gameService.hireManager(req.user!.id, req.params.id);
      res.json({ success: true, data: property });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### Step 3: Update routes index

Add to `services/api-gateway/src/routes/index.ts`:

```typescript
import gameRouter from './game';
// ... add after user router:
router.use('/v1/game', gameRouter);
```

### Step 4: Commit

```bash
git add .
git commit -m "feat(game): add property purchase, upgrade, and manager system

- GET property types with unlock status
- GET player properties
- POST buy property (with exponential cost scaling)
- POST upgrade property
- POST hire manager for automation"
```

---

## Task 6: Game Service - Businesses

**Files:**

- Modify: `services/api-gateway/src/services/game.service.ts`
- Modify: `services/api-gateway/src/routes/game.ts`

### Step 1: Add business methods to GameService

Add to `services/api-gateway/src/services/game.service.ts`:

```typescript
// ==================== BUSINESSES ====================

async getBusinessTypes(userId: string) {
  const playerStats = await prisma.playerStats.findUnique({
    where: { userId },
  });

  const playerLevel = playerStats?.playerLevel ?? 1;

  const types = await prisma.businessType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return types.map((type) => ({
    ...type,
    isUnlocked: this.checkUnlock(type.unlockRequirement, playerLevel),
  }));
}

async getPlayerBusinesses(userId: string) {
  const businesses = await prisma.playerBusiness.findMany({
    where: { userId },
    include: { businessType: true },
    orderBy: { businessType: { sortOrder: 'asc' } },
  });

  // Add cycle progress
  return businesses.map((biz) => ({
    ...biz,
    cycleProgress: this.calculateCycleProgress(biz),
    cycleComplete: this.isCycleComplete(biz),
  }));
}

async buyBusiness(userId: string, businessTypeId: number) {
  return prisma.$transaction(async (tx) => {
    const businessType = await tx.businessType.findUnique({
      where: { id: businessTypeId },
    });

    if (!businessType) {
      throw new AppError('Business type not found', 404);
    }

    // Check if already owned
    const existing = await tx.playerBusiness.findUnique({
      where: { userId_businessTypeId: { userId, businessTypeId } },
    });

    if (existing) {
      throw new AppError('Business already owned', 400);
    }

    const playerStats = await tx.playerStats.findUnique({
      where: { userId },
    });

    if (!playerStats) {
      throw new AppError('Player stats not found', 404);
    }

    // Check unlock
    if (!this.checkUnlock(businessType.unlockRequirement, playerStats.playerLevel)) {
      throw new AppError('Business not unlocked yet', 403);
    }

    if (playerStats.cash.lessThan(businessType.baseCost)) {
      throw new AppError('Not enough cash', 400);
    }

    const business = await tx.playerBusiness.create({
      data: {
        userId,
        businessTypeId,
        level: 1,
        totalInvested: businessType.baseCost,
        currentRevenue: businessType.baseRevenue,
        cycleSeconds: businessType.cycleSeconds,
        nextLevelCost: this.calculateBusinessLevelCost(businessType, 1),
      },
      include: { businessType: true },
    });

    await tx.playerStats.update({
      where: { userId },
      data: {
        cash: { decrement: businessType.baseCost },
        totalBusinessesOwned: { increment: 1 },
      },
    });

    return business;
  });
}

async levelUpBusiness(userId: string, businessId: string) {
  return prisma.$transaction(async (tx) => {
    const business = await tx.playerBusiness.findUnique({
      where: { id: businessId },
      include: { businessType: true },
    });

    if (!business || business.userId !== userId) {
      throw new AppError('Business not found', 404);
    }

    if (business.level >= business.businessType.maxLevel) {
      throw new AppError('Business at max level', 400);
    }

    const playerStats = await tx.playerStats.findUnique({
      where: { userId },
    });

    if (!playerStats) {
      throw new AppError('Player stats not found', 404);
    }

    const cost = this.calculateBusinessLevelCost(business.businessType, business.level);

    if (playerStats.cash.lessThan(cost)) {
      throw new AppError('Not enough cash', 400);
    }

    const newLevel = business.level + 1;
    const newRevenue = this.calculateBusinessRevenue(business.businessType, newLevel, business.employeeCount);

    const updated = await tx.playerBusiness.update({
      where: { id: businessId },
      data: {
        level: newLevel,
        totalInvested: { increment: cost },
        currentRevenue: newRevenue,
        nextLevelCost: newLevel < business.businessType.maxLevel
          ? this.calculateBusinessLevelCost(business.businessType, newLevel)
          : null,
      },
      include: { businessType: true },
    });

    await tx.playerStats.update({
      where: { userId },
      data: { cash: { decrement: cost } },
    });

    return updated;
  });
}

async collectBusinessRevenue(userId: string, businessId: string) {
  return prisma.$transaction(async (tx) => {
    const business = await tx.playerBusiness.findUnique({
      where: { id: businessId },
      include: { businessType: true },
    });

    if (!business || business.userId !== userId) {
      throw new AppError('Business not found', 404);
    }

    if (!this.isCycleComplete(business)) {
      throw new AppError('Cycle not complete', 400);
    }

    const revenue = business.currentRevenue;

    const updated = await tx.playerBusiness.update({
      where: { id: businessId },
      data: {
        currentCycleStart: new Date(),
        cyclesCompleted: { increment: 1 },
        totalRevenue: { increment: revenue },
      },
      include: { businessType: true },
    });

    const playerStats = await tx.playerStats.findUnique({
      where: { userId },
    });

    await tx.playerStats.update({
      where: { userId },
      data: {
        cash: { increment: revenue },
        lifetimeCashEarned: { increment: revenue },
      },
    });

    // Add XP and check level up
    await this.addExperience(tx, userId, Number(revenue) / 100);

    return { business: updated, collected: revenue };
  });
}

// ==================== BUSINESS HELPERS ====================

private calculateCycleProgress(business: any): number {
  const elapsed = (Date.now() - new Date(business.currentCycleStart).getTime()) / 1000;
  const cycleTime = business.cycleSeconds || business.businessType.cycleSeconds;
  return Math.min(1, elapsed / cycleTime);
}

private isCycleComplete(business: any): boolean {
  return this.calculateCycleProgress(business) >= 1;
}

private calculateBusinessLevelCost(businessType: any, currentLevel: number): Decimal {
  const multiplier = Math.pow(Number(businessType.levelCostMult), currentLevel);
  return new Decimal(businessType.baseCost).mul(0.1).mul(multiplier);
}

private calculateBusinessRevenue(businessType: any, level: number, employees: number): Decimal {
  const levelMultiplier = Math.pow(Number(businessType.levelRevenueMult), level - 1);
  const employeeBonus = 1 + (employees * Number(businessType.employeeBonusPct) / 100);
  return new Decimal(businessType.baseRevenue).mul(levelMultiplier).mul(employeeBonus);
}

private async addExperience(tx: any, userId: string, xp: number) {
  const stats = await tx.playerStats.findUnique({ where: { userId } });
  if (!stats) return;

  const newXp = Number(stats.experiencePoints) + Math.floor(xp);
  const xpForNextLevel = this.xpForLevel(stats.playerLevel);

  let newLevel = stats.playerLevel;
  let remainingXp = newXp;

  while (remainingXp >= this.xpForLevel(newLevel)) {
    remainingXp -= this.xpForLevel(newLevel);
    newLevel++;
  }

  await tx.playerStats.update({
    where: { userId },
    data: {
      experiencePoints: remainingXp,
      playerLevel: newLevel,
    },
  });
}

private xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}
```

### Step 2: Add business routes

Add to `services/api-gateway/src/routes/game.ts`:

```typescript
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
      const typeId = parseInt(req.params.typeId);
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
      const business = await gameService.levelUpBusiness(req.user!.id, req.params.id);
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
      const result = await gameService.collectBusinessRevenue(req.user!.id, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);
```

### Step 3: Commit

```bash
git add .
git commit -m "feat(game): add business system with cycles and revenue

- GET business types with unlock status
- GET player businesses with cycle progress
- POST buy business
- POST level up business
- POST collect revenue (cycle-based)
- XP and leveling system"
```

---

## Task 7: Offline Earnings Collection

**Files:**

- Modify: `services/api-gateway/src/services/game.service.ts`
- Modify: `services/api-gateway/src/routes/game.ts`

### Step 1: Add offline earnings to GameService

Add to `services/api-gateway/src/services/game.service.ts`:

```typescript
// ==================== OFFLINE EARNINGS ====================

async collectOfflineEarnings(userId: string) {
  return prisma.$transaction(async (tx) => {
    const playerStats = await tx.playerStats.findUnique({
      where: { userId },
    });

    if (!playerStats) {
      throw new AppError('Player stats not found', 404);
    }

    const now = new Date();
    const lastCollection = new Date(playerStats.lastCollectionAt);
    const elapsedMs = now.getTime() - lastCollection.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    // Cap at offline limit
    const cappedHours = Math.min(elapsedHours, playerStats.offlineCapHours);

    if (cappedHours < 0.01) { // Less than ~36 seconds
      return {
        collected: new Decimal(0),
        hours: 0,
        capped: false,
      };
    }

    // Only properties with managers earn offline
    const managedProperties = await tx.playerProperty.findMany({
      where: { userId, managerHired: true },
    });

    let totalIncome = new Decimal(0);
    for (const prop of managedProperties) {
      totalIncome = totalIncome.add(prop.currentIncomeHour);
    }

    const earnings = totalIncome.mul(cappedHours).mul(playerStats.currentMultiplier);

    await tx.playerStats.update({
      where: { userId },
      data: {
        cash: { increment: earnings },
        lifetimeCashEarned: { increment: earnings },
        lastCollectionAt: now,
      },
    });

    return {
      collected: earnings,
      hours: cappedHours,
      capped: elapsedHours > playerStats.offlineCapHours,
      incomePerHour: totalIncome.mul(playerStats.currentMultiplier),
    };
  });
}

async getOfflineStatus(userId: string) {
  const playerStats = await prisma.playerStats.findUnique({
    where: { userId },
  });

  if (!playerStats) {
    throw new AppError('Player stats not found', 404);
  }

  const managedProperties = await prisma.playerProperty.findMany({
    where: { userId, managerHired: true },
  });

  let managedIncome = new Decimal(0);
  for (const prop of managedProperties) {
    managedIncome = managedIncome.add(prop.currentIncomeHour);
  }

  const now = new Date();
  const lastCollection = new Date(playerStats.lastCollectionAt);
  const elapsedMs = now.getTime() - lastCollection.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const cappedHours = Math.min(elapsedHours, playerStats.offlineCapHours);

  const pendingEarnings = managedIncome.mul(cappedHours).mul(playerStats.currentMultiplier);

  return {
    pendingEarnings,
    elapsedHours: cappedHours,
    capped: elapsedHours > playerStats.offlineCapHours,
    capHours: playerStats.offlineCapHours,
    managedIncomePerHour: managedIncome.mul(playerStats.currentMultiplier),
    lastCollectionAt: playerStats.lastCollectionAt,
  };
}
```

### Step 2: Add offline routes

Add to `services/api-gateway/src/routes/game.ts`:

```typescript
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
```

### Step 3: Commit

```bash
git add .
git commit -m "feat(game): add offline earnings system

- GET offline status with pending earnings
- POST collect offline earnings
- Only manager-owned properties earn offline
- 8-hour cap for free users (24h for premium)"
```

---

## Task 8-12: Frontend Implementation

Due to the length of this document, Tasks 8-12 cover frontend implementation:

- **Task 8:** Frontend auth (login/register forms, auth context)
- **Task 9:** Main dashboard UI (stats, income display)
- **Task 10:** Properties page (buy, upgrade, hire manager)
- **Task 11:** Businesses page (buy, level up, collect)
- **Task 12:** Polish and testing

These tasks follow the same bite-sized step pattern. Create a follow-up plan for frontend after backend is complete.

---

## Verification Checklist

After completing all tasks:

- [ ] User can register with email/password
- [ ] User can login and receive JWT
- [ ] Token refresh works correctly
- [ ] Protected routes require authentication
- [ ] Properties can be bought, upgraded, managers hired
- [ ] Businesses can be bought, leveled, revenue collected
- [ ] Offline earnings accumulate with manager
- [ ] XP and level progression works
- [ ] Frontend displays all game data
- [ ] All API endpoints respond correctly

---

## Next Steps

After Phase 1 completion:

1. Run full integration tests
2. Deploy to staging environment
3. Begin Phase 2: Social features & polish

---

_Plan created: November 28, 2025_
