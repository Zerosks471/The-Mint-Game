# Mini-Games & Critical Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 5 critical bugs, then implement interactive station-based mini-games for all businesses and properties, transforming The Mint from an idle clicker to an engaging skill-based game.

**Architecture:** Each business/property type gets a unique mini-game triggered on revenue collection. Business tasks are required; property tasks are optional (+25% bonus). Games use a shared `MiniGameModal` framework with type-specific game components. Server validates task completion before granting revenue.

**Tech Stack:** React 18 + TypeScript + Zustand | Express.js + Prisma + PostgreSQL

---

## Phase 1: Critical Bug Fixes

### Task 1.1: Fix Payment Webhook Silent Failure

**Files:**
- Modify: `services/api-gateway/src/services/coins.service.ts:166-173`
- Create: `packages/database/prisma/schema.prisma` (add FailedPurchase model)

**Step 1: Add FailedPurchase model to schema**

Add to `packages/database/prisma/schema.prisma` before the closing of the file:

```prisma
model FailedPurchase {
  id              String    @id @default(cuid())
  stripeSessionId String    @unique @map("stripe_session_id")
  userId          String?   @map("user_id")
  packageId       String?   @map("package_id")
  coins           Int?
  errorReason     String    @map("error_reason")
  metadata        Json?
  resolved        Boolean   @default(false)
  resolvedAt      DateTime? @map("resolved_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@index([resolved, createdAt])
  @@map("failed_purchases")
}
```

**Step 2: Run Prisma generate and push**

Run: `pnpm db:generate && pnpm db:push`
Expected: Schema changes applied successfully

**Step 3: Fix the silent failure in coins.service.ts**

Replace lines 166-173 in `services/api-gateway/src/services/coins.service.ts`:

```typescript
  private async fulfillCoinPurchase(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const coins = parseInt(session.metadata?.coins || '0', 10);

    if (!userId || !coins) {
      // Log failed purchase for admin review instead of silently failing
      console.error('Invalid coin purchase metadata:', session.metadata);
      await prisma.failedPurchase.create({
        data: {
          stripeSessionId: session.id,
          userId: session.metadata?.userId || null,
          packageId: session.metadata?.packageId || null,
          coins: coins || null,
          errorReason: !userId ? 'Missing userId' : 'Missing coins amount',
          metadata: session.metadata as any,
        },
      });
      // Throw error to trigger Stripe retry
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid coin purchase metadata - logged for admin review',
        400
      );
    }
```

**Step 4: Verify the change compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add packages/database/prisma/schema.prisma services/api-gateway/src/services/coins.service.ts
git commit -m "fix: log failed purchases instead of silent failure"
```

---

### Task 1.2: Fix Property Sell Value Calculation

**Files:**
- Modify: `services/api-gateway/src/services/game.service.ts:266-269`

**Step 1: Update sell value calculation**

Replace lines 266-269 in `services/api-gateway/src/services/game.service.ts`:

```typescript
      // Return 50% of total investment (base cost + upgrades + manager)
      const sellValue = new Prisma.Decimal(playerProperty.totalSpent)
        .mul(quantity)
        .div(playerProperty.quantity)
        .mul(0.5);
```

**Step 2: Verify the change compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add services/api-gateway/src/services/game.service.ts
git commit -m "fix: sell value now returns 50% of total investment, not just base cost"
```

---

### Task 1.3: Fix Prestige Lifetime Earnings Reset

**Files:**
- Modify: `services/api-gateway/src/services/prestige.service.ts:225`

**Step 1: Remove lifetimeCashEarned reset**

In `services/api-gateway/src/services/prestige.service.ts`, find line 225 (`lifetimeCashEarned: 0,`) and DELETE it entirely.

The surrounding code should look like:

```typescript
      // Reset player stats but keep prestige data
      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: 1000, // Starting cash
          // lifetimeCashEarned: 0, <-- REMOVED
          playerLevel: 1,
          experiencePoints: 0,
```

**Step 2: Verify the change compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add services/api-gateway/src/services/prestige.service.ts
git commit -m "fix: preserve lifetimeCashEarned across prestige resets"
```

---

### Task 1.4: Fix IPO Seeded RNG Inconsistency

**Files:**
- Modify: `services/api-gateway/src/services/ipo.service.ts:251-373`

**Step 1: Refactor processTicksOnDemand to cache ticks**

Replace the `processTicksOnDemand` method in `services/api-gateway/src/services/ipo.service.ts`:

```typescript
  /**
   * Process ticks that should have happened since last check
   * Uses timestamp-based determinism for consistent results
   */
  private async processTicksOnDemand(ipo: any): Promise<any> {
    const now = new Date();
    const lastTick = new Date(ipo.lastTickAt);
    const elapsed = now.getTime() - lastTick.getTime();

    // Calculate how many ticks should have happened
    const avgTickInterval = (IPOService.TICK_INTERVAL_MIN_MS + IPOService.TICK_INTERVAL_MAX_MS) / 2;
    const ticksToProcess = Math.floor(elapsed / avgTickInterval);

    if (ticksToProcess === 0) {
      return ipo;
    }

    let currentPrice = Number(ipo.currentPrice);
    const ipoPrice = Number(ipo.ipoPrice);
    let highPrice = Number(ipo.highPrice);
    let lowPrice = Number(ipo.lowPrice);
    let trend = ipo.trend;
    let trendStrength = ipo.trendStrength;
    let activeEvent = ipo.activeEvent;
    let eventExpiresAt = ipo.eventExpiresAt;
    let priceHistory = [...(ipo.priceHistory as PricePoint[])];

    // Use IPO start time + tick index for deterministic seed (not mutable seed)
    const baseSeed = new Date(ipo.startsAt).getTime();

    // Process each tick
    for (let i = 0; i < ticksToProcess && i < 50; i++) { // Cap at 50 ticks
      const tickTime = lastTick.getTime() + (i + 1) * avgTickInterval;

      // Deterministic seed based on IPO start + absolute tick time
      // This ensures same tick always produces same result
      const tickSeed = Math.floor((baseSeed + tickTime) / 1000);

      // Seeded random using tick-specific seed
      let seed = tickSeed;
      const random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      // Check if event expired
      if (eventExpiresAt && new Date(eventExpiresAt) <= new Date(tickTime)) {
        activeEvent = null;
        eventExpiresAt = null;
      }

      // Maybe trigger new event (5% chance per tick if no active event)
      if (!activeEvent && random() < 0.05) {
        const eventResult = await this.triggerRandomEvent(random);
        if (eventResult) {
          activeEvent = eventResult.slug;
          eventExpiresAt = new Date(tickTime + eventResult.durationMinutes * 60 * 1000);

          // Handle instant spike events
          if (eventResult.effectType === 'instant_spike') {
            const spikeChange = Number(eventResult.effectValue) / 100;
            currentPrice = currentPrice * (1 + spikeChange);
            activeEvent = null; // Instant events don't persist
            eventExpiresAt = null;
          }
        }
      }

      // Roll for trend change (30% chance)
      if (random() < 0.30) {
        const trendRoll = random();
        if (trendRoll < 0.33) trend = 'bullish';
        else if (trendRoll < 0.66) trend = 'bearish';
        else trend = 'neutral';
        trendStrength = Math.floor(random() * 5) + 1;
      }

      // Calculate price change
      let baseChange = (random() - 0.5) * 0.04; // ±2% base

      // Apply trend bias
      if (trend === 'bullish') baseChange += 0.01 * trendStrength;
      else if (trend === 'bearish') baseChange -= 0.01 * trendStrength;

      // Apply active event modifier
      if (activeEvent) {
        const event = await prisma.marketEvent.findUnique({ where: { slug: activeEvent } });
        if (event) {
          if (event.effectType === 'trend_bias') {
            baseChange += Number(event.effectValue) / 100 / 10; // Spread over ticks
          } else if (event.effectType === 'tick_modifier') {
            baseChange *= (1 + Math.abs(Number(event.effectValue)) / 100);
            if (!event.isPositive) baseChange = -Math.abs(baseChange);
          }
        }
      }

      // Apply change with bounds
      currentPrice = currentPrice * (1 + baseChange);
      currentPrice = Math.max(currentPrice, ipoPrice * IPOService.PRICE_FLOOR_PCT);
      currentPrice = Math.min(currentPrice, ipoPrice * IPOService.PRICE_CEILING_PCT);

      // Update high/low
      highPrice = Math.max(highPrice, currentPrice);
      lowPrice = Math.min(lowPrice, currentPrice);

      // Add to history
      priceHistory.push({
        time: Math.floor(tickTime / 1000),
        price: Math.round(currentPrice * 100) / 100
      });
    }

    // Trim history to max points
    if (priceHistory.length > IPOService.MAX_HISTORY_POINTS) {
      priceHistory = priceHistory.slice(-IPOService.MAX_HISTORY_POINTS);
    }

    // Update database (no longer storing mutable seed)
    const updated = await prisma.playerIPO.update({
      where: { userId: ipo.userId },
      data: {
        currentPrice: new Decimal(Math.round(currentPrice * 100) / 100),
        highPrice: new Decimal(Math.round(highPrice * 100) / 100),
        lowPrice: new Decimal(Math.round(lowPrice * 100) / 100),
        trend,
        trendStrength,
        activeEvent,
        eventExpiresAt,
        priceHistory: priceHistory as any,
        lastTickAt: now,
      },
    });

    return updated;
  }
```

**Step 2: Verify the change compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add services/api-gateway/src/services/ipo.service.ts
git commit -m "fix: use timestamp-based determinism for IPO price ticks"
```

---

### Task 1.5: Fix Cash Ticker Divergence

**Files:**
- Modify: `apps/web/src/stores/gameStore.ts:22-26, 227-277`

**Step 1: Add sync tracking state**

In `apps/web/src/stores/gameStore.ts`, add to the interface after line 26:

```typescript
  // Sync tracking
  lastSyncedCash: number;
  isSyncing: boolean;
  syncFailed: boolean;
```

Add to initialState after line 73:

```typescript
  lastSyncedCash: 0,
  isSyncing: false,
  syncFailed: false,
```

**Step 2: Update collectEarnings with rollback logic**

Replace the `collectEarnings` function (around line 228):

```typescript
  // Collect earnings from server and sync cash
  collectEarnings: async () => {
    set({ isSyncing: true });
    try {
      const response = await gameApi.collectEarnings();
      if (response.success && response.data) {
        const newCash = parseFloat(response.data.newCash);
        const incomePerHour = parseFloat(response.data.incomePerHour);
        set({
          displayedCash: newCash,
          lastSyncedCash: newCash,
          incomePerSecond: incomePerHour / 3600,
          isSyncing: false,
          syncFailed: false,
        });
        // Also update stats
        await get().fetchStats();
      } else {
        // Sync failed - rollback to last known good value
        const { lastSyncedCash } = get();
        set({
          displayedCash: lastSyncedCash,
          isSyncing: false,
          syncFailed: true,
        });
      }
    } catch {
      // Network error - rollback to last known good value
      const { lastSyncedCash } = get();
      set({
        displayedCash: lastSyncedCash,
        isSyncing: false,
        syncFailed: true,
      });
    }
  },
```

**Step 3: Update startTicker to track lastSyncedCash**

Update the `startTicker` function (around line 243):

```typescript
  // Start real-time cash ticker (updates displayed cash every 100ms)
  startTicker: () => {
    // Clear any existing intervals
    const existingTicker = get().tickerInterval;
    const existingSync = get().syncInterval;
    if (existingTicker) clearInterval(existingTicker);
    if (existingSync) clearInterval(existingSync);

    // Initialize displayedCash from current stats
    const stats = get().stats;
    if (stats) {
      const incomePerHour = parseFloat(stats.effectiveIncomeHour);
      const cash = parseFloat(stats.cash);
      set({
        displayedCash: cash,
        lastSyncedCash: cash,
        incomePerSecond: incomePerHour / 3600,
        syncFailed: false,
      });
    }

    // Collect from server immediately to sync
    get().collectEarnings();

    // Update displayed cash locally every 100ms
    const tickerInterval = setInterval(() => {
      const { displayedCash, incomePerSecond, syncFailed } = get();
      // Don't increment if sync failed (wait for recovery)
      if (incomePerSecond > 0 && !syncFailed) {
        set({ displayedCash: displayedCash + incomePerSecond * 0.1 });
      }
    }, 100);

    // Sync with server every 2 seconds (reduced from 5s for better accuracy)
    const syncInterval = setInterval(() => {
      get().collectEarnings();
    }, 2000);

    set({ tickerInterval, syncInterval });
  },
```

**Step 4: Verify the change compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add apps/web/src/stores/gameStore.ts
git commit -m "fix: add cash ticker rollback on sync failure"
```

---

## Phase 2: Mini-Game Foundation

### Task 2.1: Add Database Schema for Tasks

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add TaskAttempt and TaskStreak models**

Add to `packages/database/prisma/schema.prisma`:

```prisma
// ============================================================================
// MINI-GAME TASKS DOMAIN
// ============================================================================

model TaskAttempt {
  id              String    @id @default(cuid())
  userId          String    @map("user_id")
  taskType        String    @map("task_type") // "business:restaurant", "property:apartment"
  targetId        String    @map("target_id") // businessId or propertyId
  attemptNumber   Int       @map("attempt_number") // 1, 2, or 3
  success         Boolean
  score           Int?
  revenueMultiplier Float   @map("revenue_multiplier") // 1.0, 0.75, 0.5
  difficulty      Int       @default(1)
  completedAt     DateTime  @default(now()) @map("completed_at")

  @@index([userId, taskType, targetId])
  @@index([userId, completedAt])
  @@map("task_attempts")
}

model TaskStreak {
  id              String    @id @default(cuid())
  playerId        String    @unique @map("player_id")
  propertyStreak  Int       @default(0) @map("property_streak")
  lastPropertyTask DateTime? @map("last_property_task")
  businessStreak  Int       @default(0) @map("business_streak")
  lastBusinessTask DateTime? @map("last_business_task")

  @@map("task_streaks")
}

model BusinessTaskSession {
  id              String    @id @default(cuid())
  userId          String    @map("user_id")
  businessId      String    @map("business_id")
  businessType    String    @map("business_type")
  attemptsUsed    Int       @default(0) @map("attempts_used")
  cycleStart      DateTime  @map("cycle_start")
  expiresAt       DateTime  @map("expires_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@unique([userId, businessId, cycleStart])
  @@index([userId, expiresAt])
  @@map("business_task_sessions")
}
```

**Step 2: Run Prisma generate and push**

Run: `pnpm db:generate && pnpm db:push`
Expected: Schema changes applied successfully

**Step 3: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat: add task attempt tracking schema for mini-games"
```

---

### Task 2.2: Create Mini-Game Service

**Files:**
- Create: `services/api-gateway/src/services/minigame.service.ts`

**Step 1: Create the minigame service**

Create file `services/api-gateway/src/services/minigame.service.ts`:

```typescript
import { prisma } from '@mint/database';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';

// Task difficulty configurations by business type
const BUSINESS_TASK_CONFIG: Record<string, {
  baseItems: number;
  itemsPerLevel: number;
  baseTimeSeconds: number;
  timeReductionPerLevel: number;
  minTimeSeconds: number;
}> = {
  restaurant: { baseItems: 2, itemsPerLevel: 0.6, baseTimeSeconds: 30, timeReductionPerLevel: 1, minTimeSeconds: 10 },
  tech_startup: { baseItems: 1, itemsPerLevel: 0.3, baseTimeSeconds: 45, timeReductionPerLevel: 2, minTimeSeconds: 15 },
  retail_store: { baseItems: 4, itemsPerLevel: 0.8, baseTimeSeconds: 30, timeReductionPerLevel: 1, minTimeSeconds: 12 },
  factory: { baseItems: 4, itemsPerLevel: 0.8, baseTimeSeconds: 25, timeReductionPerLevel: 1, minTimeSeconds: 10 },
  bank: { baseItems: 2, itemsPerLevel: 0.4, baseTimeSeconds: 30, timeReductionPerLevel: 1, minTimeSeconds: 12 },
  hotel: { baseItems: 3, itemsPerLevel: 0.5, baseTimeSeconds: 35, timeReductionPerLevel: 1, minTimeSeconds: 15 },
  marketing_agency: { baseItems: 3, itemsPerLevel: 0.5, baseTimeSeconds: 30, timeReductionPerLevel: 1, minTimeSeconds: 10 },
  consulting_firm: { baseItems: 3, itemsPerLevel: 0.5, baseTimeSeconds: 35, timeReductionPerLevel: 1, minTimeSeconds: 15 },
};

// Revenue multipliers based on attempt number
const ATTEMPT_MULTIPLIERS = {
  1: 1.0,
  2: 0.75,
  3: 0.5,
};

export interface TaskDifficulty {
  itemCount: number;
  timeLimit: number;
  level: number;
}

export interface TaskResult {
  success: boolean;
  revenueMultiplier: number;
  canRetry: boolean;
  attemptsRemaining: number;
  isPremium: boolean;
}

export class MinigameService {
  /**
   * Get task difficulty for a business based on its level
   */
  getBusinessTaskDifficulty(businessType: string, level: number): TaskDifficulty {
    const config = BUSINESS_TASK_CONFIG[businessType] || BUSINESS_TASK_CONFIG.restaurant;

    const itemCount = Math.floor(config.baseItems + (level - 1) * config.itemsPerLevel);
    const timeLimit = Math.max(
      config.minTimeSeconds,
      config.baseTimeSeconds - (level - 1) * config.timeReductionPerLevel
    );

    return { itemCount, timeLimit, level };
  }

  /**
   * Start a business task session (called when cycle completes)
   */
  async startBusinessTask(userId: string, businessId: string): Promise<{
    sessionId: string;
    taskType: string;
    difficulty: TaskDifficulty;
    attemptsUsed: number;
  }> {
    const business = await prisma.playerBusiness.findUnique({
      where: { id: businessId },
      include: { businessType: true },
    });

    if (!business || business.userId !== userId) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Business not found', 404);
    }

    // Check if cycle is actually complete
    const cycleStart = new Date(business.currentCycleStart);
    const cycleSeconds = business.cycleSeconds || business.businessType.cycleSeconds;
    const cycleEndTime = new Date(cycleStart.getTime() + cycleSeconds * 1000);

    if (new Date() < cycleEndTime) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Business cycle not complete', 400);
    }

    // Get or create session for this cycle
    let session = await prisma.businessTaskSession.findUnique({
      where: {
        userId_businessId_cycleStart: {
          userId,
          businessId,
          cycleStart,
        },
      },
    });

    if (!session) {
      session = await prisma.businessTaskSession.create({
        data: {
          userId,
          businessId,
          businessType: business.businessType.slug,
          cycleStart,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
        },
      });
    }

    const difficulty = this.getBusinessTaskDifficulty(
      business.businessType.slug,
      business.level
    );

    return {
      sessionId: session.id,
      taskType: `business:${business.businessType.slug}`,
      difficulty,
      attemptsUsed: session.attemptsUsed,
    };
  }

  /**
   * Submit business task result
   */
  async submitBusinessTaskResult(
    userId: string,
    sessionId: string,
    success: boolean,
    score?: number
  ): Promise<TaskResult> {
    const session = await prisma.businessTaskSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Task session not found', 404);
    }

    if (new Date() > session.expiresAt) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Task session expired', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true },
    });
    const isPremium = user?.isPremium || false;

    const attemptNumber = session.attemptsUsed + 1;
    const revenueMultiplier = ATTEMPT_MULTIPLIERS[attemptNumber as 1 | 2 | 3] || 0.5;

    // Record the attempt
    await prisma.taskAttempt.create({
      data: {
        userId,
        taskType: `business:${session.businessType}`,
        targetId: session.businessId,
        attemptNumber,
        success,
        score,
        revenueMultiplier: success ? revenueMultiplier : 0,
        difficulty: 1, // Could be calculated
      },
    });

    // Update session attempts
    await prisma.businessTaskSession.update({
      where: { id: sessionId },
      data: { attemptsUsed: attemptNumber },
    });

    // Determine if can retry
    const canRetry = !success && attemptNumber < 3;
    const attemptsRemaining = Math.max(0, 3 - attemptNumber);

    // If failed all attempts, premium users auto-collect at 50%
    if (!success && attemptNumber >= 3 && isPremium) {
      return {
        success: false,
        revenueMultiplier: 0.5, // Premium auto-collect
        canRetry: false,
        attemptsRemaining: 0,
        isPremium,
      };
    }

    // If failed all attempts, free users get nothing this cycle
    if (!success && attemptNumber >= 3 && !isPremium) {
      return {
        success: false,
        revenueMultiplier: 0,
        canRetry: false,
        attemptsRemaining: 0,
        isPremium,
      };
    }

    return {
      success,
      revenueMultiplier: success ? revenueMultiplier : 0,
      canRetry,
      attemptsRemaining,
      isPremium,
    };
  }

  /**
   * Submit property task result (optional task for +25% bonus)
   */
  async submitPropertyTaskResult(
    userId: string,
    propertyId: string,
    success: boolean,
    score?: number
  ): Promise<{ bonusMultiplier: number; newStreak: number }> {
    const property = await prisma.playerProperty.findUnique({
      where: { id: propertyId },
      include: { propertyType: true },
    });

    if (!property || property.userId !== userId) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Property not found', 404);
    }

    // Record the attempt
    await prisma.taskAttempt.create({
      data: {
        userId,
        taskType: `property:${property.propertyType.slug}`,
        targetId: propertyId,
        attemptNumber: 1, // Properties only get one attempt
        success,
        score,
        revenueMultiplier: success ? 1.25 : 1.0,
        difficulty: 1,
      },
    });

    // Update streak
    let streak = await prisma.taskStreak.findUnique({
      where: { playerId: userId },
    });

    if (!streak) {
      streak = await prisma.taskStreak.create({
        data: { playerId: userId },
      });
    }

    const newStreak = success ? streak.propertyStreak + 1 : 0;

    await prisma.taskStreak.update({
      where: { playerId: userId },
      data: {
        propertyStreak: newStreak,
        lastPropertyTask: new Date(),
      },
    });

    return {
      bonusMultiplier: success ? 1.25 : 1.0,
      newStreak,
    };
  }

  /**
   * Get player's task statistics
   */
  async getTaskStats(userId: string): Promise<{
    totalAttempts: number;
    successRate: number;
    streaks: { property: number; business: number };
  }> {
    const [attempts, streak] = await Promise.all([
      prisma.taskAttempt.findMany({
        where: { userId },
        select: { success: true },
      }),
      prisma.taskStreak.findUnique({
        where: { playerId: userId },
      }),
    ]);

    const totalAttempts = attempts.length;
    const successCount = attempts.filter((a) => a.success).length;
    const successRate = totalAttempts > 0 ? successCount / totalAttempts : 0;

    return {
      totalAttempts,
      successRate: Math.round(successRate * 100),
      streaks: {
        property: streak?.propertyStreak || 0,
        business: streak?.businessStreak || 0,
      },
    };
  }
}

export const minigameService = new MinigameService();
```

**Step 2: Verify the change compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add services/api-gateway/src/services/minigame.service.ts
git commit -m "feat: add minigame service with task tracking and difficulty scaling"
```

---

### Task 2.3: Create Mini-Game API Routes

**Files:**
- Create: `services/api-gateway/src/routes/minigames.ts`
- Modify: `services/api-gateway/src/routes/index.ts`

**Step 1: Create minigames routes**

Create file `services/api-gateway/src/routes/minigames.ts`:

```typescript
import { Router } from 'express';
import { minigameService } from '../services/minigame.service';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Start a business task (when collecting revenue)
router.post('/business/start', async (req, res, next) => {
  try {
    const { businessId } = req.body;
    const result = await minigameService.startBusinessTask(req.userId!, businessId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Submit business task result
router.post('/business/complete', async (req, res, next) => {
  try {
    const { sessionId, success, score } = req.body;
    const result = await minigameService.submitBusinessTaskResult(
      req.userId!,
      sessionId,
      success,
      score
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Submit property task result (optional bonus task)
router.post('/property/complete', async (req, res, next) => {
  try {
    const { propertyId, success, score } = req.body;
    const result = await minigameService.submitPropertyTaskResult(
      req.userId!,
      propertyId,
      success,
      score
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Get task statistics
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await minigameService.getTaskStats(req.userId!);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 2: Register routes in index**

In `services/api-gateway/src/routes/index.ts`, add:

```typescript
import minigamesRouter from './minigames';

// Add with other route registrations:
router.use('/minigames', minigamesRouter);
```

**Step 3: Verify the change compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add services/api-gateway/src/routes/minigames.ts services/api-gateway/src/routes/index.ts
git commit -m "feat: add minigame API routes"
```

---

### Task 2.4: Create MiniGameModal Component

**Files:**
- Create: `apps/web/src/components/minigames/MiniGameModal.tsx`

**Step 1: Create the MiniGameModal component**

Create file `apps/web/src/components/minigames/MiniGameModal.tsx`:

```typescript
import { useState, useCallback } from 'react';

export interface TaskDifficulty {
  itemCount: number;
  timeLimit: number;
  level: number;
}

export interface MiniGameProps {
  difficulty: TaskDifficulty;
  onComplete: (success: boolean, score: number) => void;
}

interface MiniGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  taskType: string;
  difficulty: TaskDifficulty;
  attemptsUsed: number;
  maxAttempts: number;
  GameComponent: React.ComponentType<MiniGameProps>;
  onTaskComplete: (success: boolean, score: number) => Promise<void>;
}

export function MiniGameModal({
  isOpen,
  onClose,
  title,
  taskType,
  difficulty,
  attemptsUsed,
  maxAttempts,
  GameComponent,
  onTaskComplete,
}: MiniGameModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<{ success: boolean; score: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStart = useCallback(() => {
    setIsPlaying(true);
    setResult(null);
  }, []);

  const handleComplete = useCallback(async (success: boolean, score: number) => {
    setIsPlaying(false);
    setResult({ success, score });
    setIsSubmitting(true);

    try {
      await onTaskComplete(success, score);
    } finally {
      setIsSubmitting(false);
    }
  }, [onTaskComplete]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setIsPlaying(true);
  }, []);

  if (!isOpen) return null;

  const attemptsRemaining = maxAttempts - attemptsUsed - (result ? 1 : 0);
  const canRetry = result && !result.success && attemptsRemaining > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 text-white">
          <h2 className="text-xl font-bold">{title}</h2>
          <div className="flex items-center gap-4 mt-1 text-sm opacity-90">
            <span>Level {difficulty.level}</span>
            <span>•</span>
            <span>{difficulty.timeLimit}s time limit</span>
            <span>•</span>
            <span>Attempts: {attemptsUsed}/{maxAttempts}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isPlaying && !result && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Complete the task to collect your revenue!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {difficulty.itemCount} items • {difficulty.timeLimit} seconds
              </p>
              <button
                onClick={handleStart}
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
              >
                Start Task
              </button>
            </div>
          )}

          {isPlaying && (
            <GameComponent
              difficulty={difficulty}
              onComplete={handleComplete}
            />
          )}

          {result && !isPlaying && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">
                {result.success ? '🎉' : '😔'}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {result.success ? 'Task Complete!' : 'Task Failed'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Score: {result.score}
              </p>
              {result.success ? (
                <p className="text-emerald-500 font-semibold mb-6">
                  Revenue collected at {Math.round((1 - attemptsUsed * 0.25) * 100)}%!
                </p>
              ) : (
                <p className="text-amber-500 mb-6">
                  {canRetry
                    ? `${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} remaining`
                    : 'No attempts remaining'}
                </p>
              )}

              <div className="flex gap-4 justify-center">
                {canRetry && (
                  <button
                    onClick={handleRetry}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    Retry ({attemptsRemaining} left)
                  </button>
                )}
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {result.success || !canRetry ? 'Done' : 'Give Up'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify the change compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add apps/web/src/components/minigames/MiniGameModal.tsx
git commit -m "feat: add MiniGameModal component for task framework"
```

---

### Task 2.5: Create Task Registry

**Files:**
- Create: `apps/web/src/components/minigames/TaskRegistry.ts`
- Create: `apps/web/src/components/minigames/index.ts`

**Step 1: Create TaskRegistry**

Create file `apps/web/src/components/minigames/TaskRegistry.ts`:

```typescript
import { ComponentType } from 'react';
import { MiniGameProps } from './MiniGameModal';

// Placeholder game component (will be replaced with actual games)
const PlaceholderGame: ComponentType<MiniGameProps> = ({ difficulty, onComplete }) => {
  return (
    <div className="text-center py-8">
      <p className="text-gray-600 mb-4">
        Mini-game for this type coming soon!
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Items: {difficulty.itemCount} | Time: {difficulty.timeLimit}s
      </p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => onComplete(true, 100)}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg"
        >
          Simulate Success
        </button>
        <button
          onClick={() => onComplete(false, 0)}
          className="px-4 py-2 bg-red-500 text-white rounded-lg"
        >
          Simulate Fail
        </button>
      </div>
    </div>
  );
};

// Business task registry
export const BUSINESS_TASKS: Record<string, {
  name: string;
  description: string;
  component: ComponentType<MiniGameProps>;
}> = {
  restaurant: {
    name: 'Order Rush',
    description: 'Match ingredients to order tickets',
    component: PlaceholderGame, // Will be: OrderRushGame
  },
  tech_startup: {
    name: 'Debug Code',
    description: 'Find and fix the bugs',
    component: PlaceholderGame,
  },
  retail_store: {
    name: 'Stock Shelves',
    description: 'Arrange inventory tetris-style',
    component: PlaceholderGame,
  },
  factory: {
    name: 'Assembly Line',
    description: 'Follow the button sequence',
    component: PlaceholderGame,
  },
  bank: {
    name: 'Verify Deposits',
    description: 'Check the math is correct',
    component: PlaceholderGame,
  },
  hotel: {
    name: 'Guest Requests',
    description: 'Remember and match guest orders',
    component: PlaceholderGame,
  },
  marketing_agency: {
    name: 'Ad Review',
    description: 'Approve or reject advertisements',
    component: PlaceholderGame,
  },
  consulting_firm: {
    name: 'Schedule Meeting',
    description: 'Fit meetings into the calendar',
    component: PlaceholderGame,
  },
};

// Property task registry
export const PROPERTY_TASKS: Record<string, {
  name: string;
  description: string;
  component: ComponentType<MiniGameProps>;
}> = {
  apartment: {
    name: 'Collect Rent',
    description: 'Knock on doors in sequence',
    component: PlaceholderGame,
  },
  duplex: {
    name: 'Fix Pipes',
    description: 'Connect the water flow',
    component: PlaceholderGame,
  },
  townhouse: {
    name: 'Paint Walls',
    description: 'Match the color pattern',
    component: PlaceholderGame,
  },
  small_house: {
    name: 'Mow Lawn',
    description: 'Trace the path to cover all grass',
    component: PlaceholderGame,
  },
  large_house: {
    name: 'Security Check',
    description: 'Spot the differences',
    component: PlaceholderGame,
  },
  mansion: {
    name: 'Host Party',
    description: 'Serve guests their drinks',
    component: PlaceholderGame,
  },
  beach_house: {
    name: 'Clean Beach',
    description: 'Clear debris before waves hit',
    component: PlaceholderGame,
  },
  penthouse: {
    name: 'Valet Cars',
    description: 'Slide puzzle to exit',
    component: PlaceholderGame,
  },
  villa: {
    name: 'Garden Care',
    description: 'Remove the weeds',
    component: PlaceholderGame,
  },
  private_island: {
    name: 'Dock Boats',
    description: 'Time the docking perfectly',
    component: PlaceholderGame,
  },
};

export function getBusinessTask(businessType: string) {
  return BUSINESS_TASKS[businessType] || BUSINESS_TASKS.restaurant;
}

export function getPropertyTask(propertyType: string) {
  return PROPERTY_TASKS[propertyType] || PROPERTY_TASKS.apartment;
}
```

**Step 2: Create index export**

Create file `apps/web/src/components/minigames/index.ts`:

```typescript
export { MiniGameModal } from './MiniGameModal';
export type { TaskDifficulty, MiniGameProps } from './MiniGameModal';
export { BUSINESS_TASKS, PROPERTY_TASKS, getBusinessTask, getPropertyTask } from './TaskRegistry';
```

**Step 3: Verify the change compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add apps/web/src/components/minigames/
git commit -m "feat: add task registry with placeholder games"
```

---

### Task 2.6: Create Minigame API Client

**Files:**
- Create: `apps/web/src/api/minigames.ts`

**Step 1: Create API client**

Create file `apps/web/src/api/minigames.ts`:

```typescript
import { api, ApiResponse } from './client';

export interface TaskDifficulty {
  itemCount: number;
  timeLimit: number;
  level: number;
}

export interface StartTaskResponse {
  sessionId: string;
  taskType: string;
  difficulty: TaskDifficulty;
  attemptsUsed: number;
}

export interface TaskResult {
  success: boolean;
  revenueMultiplier: number;
  canRetry: boolean;
  attemptsRemaining: number;
  isPremium: boolean;
}

export interface PropertyTaskResult {
  bonusMultiplier: number;
  newStreak: number;
}

export interface TaskStats {
  totalAttempts: number;
  successRate: number;
  streaks: {
    property: number;
    business: number;
  };
}

export const minigameApi = {
  // Start a business task session
  startBusinessTask: async (businessId: string): Promise<ApiResponse<StartTaskResponse>> => {
    return api.post('/minigames/business/start', { businessId });
  },

  // Submit business task result
  completeBusinessTask: async (
    sessionId: string,
    success: boolean,
    score?: number
  ): Promise<ApiResponse<TaskResult>> => {
    return api.post('/minigames/business/complete', { sessionId, success, score });
  },

  // Submit property task result
  completePropertyTask: async (
    propertyId: string,
    success: boolean,
    score?: number
  ): Promise<ApiResponse<PropertyTaskResult>> => {
    return api.post('/minigames/property/complete', { propertyId, success, score });
  },

  // Get task statistics
  getStats: async (): Promise<ApiResponse<TaskStats>> => {
    return api.get('/minigames/stats');
  },
};
```

**Step 2: Verify the change compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add apps/web/src/api/minigames.ts
git commit -m "feat: add minigame API client"
```

---

## Phase 3: Business Mini-Games

*Note: Each business mini-game follows the same pattern. I'll detail the first one fully, then provide condensed instructions for the rest.*

### Task 3.1: Order Rush Game (Restaurant)

**Files:**
- Create: `apps/web/src/components/minigames/business/OrderRushGame.tsx`

**Step 1: Create OrderRushGame component**

Create file `apps/web/src/components/minigames/business/OrderRushGame.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { MiniGameProps } from '../MiniGameModal';

interface Order {
  id: number;
  ingredients: string[];
}

interface Ingredient {
  id: string;
  emoji: string;
  name: string;
}

const INGREDIENTS: Ingredient[] = [
  { id: 'tomato', emoji: '🍅', name: 'Tomato' },
  { id: 'lettuce', emoji: '🥬', name: 'Lettuce' },
  { id: 'cheese', emoji: '🧀', name: 'Cheese' },
  { id: 'meat', emoji: '🥩', name: 'Meat' },
  { id: 'bread', emoji: '🍞', name: 'Bread' },
  { id: 'onion', emoji: '🧅', name: 'Onion' },
  { id: 'pepper', emoji: '🌶️', name: 'Pepper' },
  { id: 'egg', emoji: '🥚', name: 'Egg' },
];

function generateOrders(count: number): Order[] {
  const orders: Order[] = [];
  for (let i = 0; i < count; i++) {
    const ingredientCount = Math.min(2 + Math.floor(i / 2), 4);
    const shuffled = [...INGREDIENTS].sort(() => Math.random() - 0.5);
    orders.push({
      id: i,
      ingredients: shuffled.slice(0, ingredientCount).map((ing) => ing.id),
    });
  }
  return orders;
}

export function OrderRushGame({ difficulty, onComplete }: MiniGameProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(difficulty.timeLimit);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Initialize orders
  useEffect(() => {
    setOrders(generateOrders(difficulty.itemCount));
  }, [difficulty.itemCount]);

  // Timer
  useEffect(() => {
    if (isComplete) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isComplete]);

  // Check completion
  useEffect(() => {
    if (isComplete) {
      const success = currentOrderIndex >= orders.length;
      onComplete(success, score);
    }
  }, [isComplete, currentOrderIndex, orders.length, score, onComplete]);

  const handleIngredientClick = useCallback((ingredientId: string) => {
    if (isComplete || currentOrderIndex >= orders.length) return;

    const currentOrder = orders[currentOrderIndex];
    const newSelected = [...selectedIngredients, ingredientId];
    setSelectedIngredients(newSelected);

    // Check if all ingredients for current order are selected correctly
    if (newSelected.length === currentOrder.ingredients.length) {
      const isCorrect = currentOrder.ingredients.every((ing) => newSelected.includes(ing));

      if (isCorrect) {
        setScore((prev) => prev + 100 + timeLeft);
        setCurrentOrderIndex((prev) => prev + 1);
        setSelectedIngredients([]);

        // Check if all orders complete
        if (currentOrderIndex + 1 >= orders.length) {
          setIsComplete(true);
        }
      } else {
        // Wrong order - reset selection
        setSelectedIngredients([]);
        setScore((prev) => Math.max(0, prev - 20));
      }
    }
  }, [currentOrderIndex, orders, selectedIngredients, isComplete, timeLeft]);

  const currentOrder = orders[currentOrderIndex];

  return (
    <div className="space-y-6">
      {/* Timer and Progress */}
      <div className="flex justify-between items-center">
        <div className="text-lg font-bold">
          Order {Math.min(currentOrderIndex + 1, orders.length)} / {orders.length}
        </div>
        <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : ''}`}>
          {timeLeft}s
        </div>
        <div className="text-lg">
          Score: {score}
        </div>
      </div>

      {/* Current Order */}
      {currentOrder && (
        <div className="bg-amber-100 dark:bg-amber-900/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
            Order #{currentOrderIndex + 1}
          </h3>
          <div className="flex gap-2 flex-wrap">
            {currentOrder.ingredients.map((ingId) => {
              const ing = INGREDIENTS.find((i) => i.id === ingId);
              const isSelected = selectedIngredients.includes(ingId);
              return (
                <div
                  key={ingId}
                  className={`px-3 py-1 rounded-full text-sm ${
                    isSelected
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-100'
                  }`}
                >
                  {ing?.emoji} {ing?.name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ingredients to Select */}
      <div className="grid grid-cols-4 gap-3">
        {INGREDIENTS.map((ing) => (
          <button
            key={ing.id}
            onClick={() => handleIngredientClick(ing.id)}
            disabled={isComplete}
            className={`
              p-4 rounded-xl text-center transition-all
              ${selectedIngredients.includes(ing.id)
                ? 'bg-emerald-500 text-white scale-95'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
              ${isComplete ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
            `}
          >
            <div className="text-3xl mb-1">{ing.emoji}</div>
            <div className="text-xs">{ing.name}</div>
          </button>
        ))}
      </div>

      {/* Selected Ingredients */}
      <div className="flex gap-2 min-h-[40px]">
        {selectedIngredients.map((ingId, idx) => {
          const ing = INGREDIENTS.find((i) => i.id === ingId);
          return (
            <div
              key={`${ingId}-${idx}`}
              className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-700 dark:text-emerald-300"
            >
              {ing?.emoji}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Update TaskRegistry to use OrderRushGame**

In `apps/web/src/components/minigames/TaskRegistry.ts`, add import and update restaurant:

```typescript
import { OrderRushGame } from './business/OrderRushGame';

// In BUSINESS_TASKS:
restaurant: {
  name: 'Order Rush',
  description: 'Match ingredients to order tickets',
  component: OrderRushGame,
},
```

**Step 3: Verify the change compiles**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add apps/web/src/components/minigames/business/OrderRushGame.tsx apps/web/src/components/minigames/TaskRegistry.ts
git commit -m "feat: add Order Rush mini-game for restaurant business"
```

---

### Task 3.2-3.8: Remaining Business Games

Create the following files following the same pattern as OrderRushGame:

- `apps/web/src/components/minigames/business/DebugCodeGame.tsx` (Tech Startup)
- `apps/web/src/components/minigames/business/StockShelvesGame.tsx` (Retail Store)
- `apps/web/src/components/minigames/business/AssemblyLineGame.tsx` (Factory)
- `apps/web/src/components/minigames/business/VerifyDepositsGame.tsx` (Bank)
- `apps/web/src/components/minigames/business/GuestRequestsGame.tsx` (Hotel)
- `apps/web/src/components/minigames/business/AdReviewGame.tsx` (Marketing Agency)
- `apps/web/src/components/minigames/business/ScheduleMeetingGame.tsx` (Consulting Firm)

Each game should:
1. Accept `{ difficulty, onComplete }` props
2. Use `difficulty.itemCount` and `difficulty.timeLimit`
3. Call `onComplete(success, score)` when finished
4. Match the theme described in the design document

**Commit after each game:**
```bash
git commit -m "feat: add [GameName] mini-game for [business type]"
```

---

### Task 3.9: Integrate Mini-Games into BusinessesPage

**Files:**
- Modify: `apps/web/src/pages/BusinessesPage.tsx`

**Step 1: Add minigame state and imports**

Add to imports:

```typescript
import { useState } from 'react';
import { MiniGameModal, getBusinessTask } from '../components/minigames';
import { minigameApi, StartTaskResponse } from '../api/minigames';
```

**Step 2: Add state for active task**

Inside the component, add:

```typescript
const [activeTask, setActiveTask] = useState<{
  business: PlayerBusiness;
  session: StartTaskResponse;
} | null>(null);
```

**Step 3: Modify collect revenue handler**

Replace the collect revenue click handler to open mini-game:

```typescript
const handleCollectClick = async (business: PlayerBusiness) => {
  // Start the mini-game task
  const response = await minigameApi.startBusinessTask(business.id);
  if (response.success && response.data) {
    setActiveTask({ business, session: response.data });
  } else {
    toast.error('Failed to start task', response.error?.message);
  }
};

const handleTaskComplete = async (success: boolean, score: number) => {
  if (!activeTask) return;

  const result = await minigameApi.completeBusinessTask(
    activeTask.session.sessionId,
    success,
    score
  );

  if (result.success && result.data) {
    if (result.data.success || (result.data.revenueMultiplier > 0)) {
      // Actually collect the revenue with multiplier
      const collected = await collectBusinessRevenue(activeTask.business.id);
      if (collected) {
        toast.success(
          'Revenue Collected!',
          `$${parseFloat(collected).toLocaleString()} (${Math.round(result.data.revenueMultiplier * 100)}%)`
        );
      }
    } else if (!result.data.canRetry) {
      toast.error('Task Failed', 'Better luck next cycle!');
    }
  }
};

const handleCloseTask = () => {
  setActiveTask(null);
  fetchPlayerBusinesses(); // Refresh
};
```

**Step 4: Add MiniGameModal render**

Add before the closing tag:

```typescript
{activeTask && (
  <MiniGameModal
    isOpen={true}
    onClose={handleCloseTask}
    title={getBusinessTask(activeTask.business.businessType.slug).name}
    taskType={activeTask.session.taskType}
    difficulty={activeTask.session.difficulty}
    attemptsUsed={activeTask.session.attemptsUsed}
    maxAttempts={3}
    GameComponent={getBusinessTask(activeTask.business.businessType.slug).component}
    onTaskComplete={handleTaskComplete}
  />
)}
```

**Step 5: Verify and commit**

Run: `pnpm typecheck`
Expected: No TypeScript errors

```bash
git add apps/web/src/pages/BusinessesPage.tsx
git commit -m "feat: integrate mini-games into business revenue collection"
```

---

## Phase 4: Property Mini-Games

### Task 4.1-4.10: Property Game Components

Create 10 property mini-game components in `apps/web/src/components/minigames/property/`:

1. `CollectRentGame.tsx` - Tap doors in sequence
2. `FixPipesGame.tsx` - Rotate pipe puzzle
3. `PaintWallsGame.tsx` - Color matching
4. `MowLawnGame.tsx` - Path tracing
5. `SecurityCheckGame.tsx` - Spot the difference
6. `HostPartyGame.tsx` - Memory matching
7. `CleanBeachGame.tsx` - Tap debris before waves
8. `ValetCarsGame.tsx` - Slide puzzle
9. `GardenCareGame.tsx` - Whack-a-mole
10. `DockBoatsGame.tsx` - Timing game

Follow the same pattern as business games. Commit each separately.

### Task 4.11: Add Property Task Button to PropertiesPage

**Files:**
- Modify: `apps/web/src/pages/PropertiesPage.tsx`

Add optional "Do Task +25%" button next to properties with managers. When clicked, open MiniGameModal with property task.

---

## Phase 5: IPO Interactive System

### Task 5.1: Create Investor Pitch Quiz

**Files:**
- Create: `apps/web/src/components/minigames/ipo/InvestorPitchGame.tsx`
- Create: `services/api-gateway/src/data/investorQuestions.ts`

### Task 5.2: Create Market Maker Component

**Files:**
- Create: `apps/web/src/components/minigames/ipo/MarketMaker.tsx`
- Modify: `services/api-gateway/src/services/ipo.service.ts` (add hype action)

### Task 5.3: Create Crisis Management Modal

**Files:**
- Create: `apps/web/src/components/minigames/ipo/CrisisManagement.tsx`

### Task 5.4: Integrate IPO Games into StocksPage

**Files:**
- Modify: `apps/web/src/pages/StocksPage.tsx`

---

## Phase 6: UX Polish

### Task 6.1: Add Toast Integration

Ensure all game actions show toast notifications for success/failure.

### Task 6.2: Add Achievement Unlock Popups

Create achievement unlock modal that triggers when achievements are unlocked.

### Task 6.3: Add Prestige Preview Modal

Show detailed breakdown of what will be lost before prestige.

### Task 6.4: Add ROI Indicators

Add payback period indicators to property cards.

### Task 6.5: Update Terminology

- Rename "Go Public" to "Prestige" in prestige page
- Update business "Ready!" state to "Complete Task"

### Task 6.6: Final Testing and Polish

Run full test suite, fix any issues, and commit final polish.

---

## Verification Checklist

After completing all phases:

- [ ] All 5 critical bugs are fixed
- [ ] Database schema includes task tracking tables
- [ ] MinigameService handles task sessions correctly
- [ ] All 8 business mini-games are implemented
- [ ] All 10 property mini-games are implemented
- [ ] IPO interactive system works (pitch, market maker, crisis)
- [ ] Toast notifications appear for all actions
- [ ] Retry mechanic works correctly (100% → 75% → 50%)
- [ ] Premium auto-collect works on final failure
- [ ] Property tasks give +25% bonus
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] App runs without console errors

---

*Plan complete. Ready for execution.*
