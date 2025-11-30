# Stock Market IPO Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the "Go Public" prestige mechanic into an engaging IPO stock market simulation where players gamble for bonus prestige points.

**Architecture:** Enhance existing prestige system with a new `PlayerIPO` model. When prestiging, players choose between instant prestige (safe) or launch IPO (gamble). IPO prices fluctuate using on-demand tick calculation with seeded randomness. Market events add volatility. Players sell shares when ready to complete prestige.

**Tech Stack:** Prisma ORM, Express.js, React 18, lightweight-charts (TradingView), Zustand, Tailwind CSS

---

## Task 1: Database Schema - Add IPO Models

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add PlayerIPO and MarketEvent models**

Add to `packages/database/prisma/schema.prisma` after the Prestige domain section (around line 463):

```prisma
// ============================================================================
// IPO DOMAIN
// ============================================================================

model PlayerIPO {
  id              String    @id @default(cuid())
  userId          String    @unique @map("user_id")
  tickerSymbol    String    @map("ticker_symbol")
  ipoPrice        Decimal   @db.Decimal(18, 2) @map("ipo_price")
  currentPrice    Decimal   @db.Decimal(18, 2) @map("current_price")
  highPrice       Decimal   @db.Decimal(18, 2) @map("high_price")
  lowPrice        Decimal   @db.Decimal(18, 2) @map("low_price")
  basePoints      Int       @map("base_points")
  trend           String    @default("neutral") // bullish, bearish, neutral
  trendStrength   Int       @default(1) @map("trend_strength") // 1-5
  activeEvent     String?   @map("active_event") // event slug or null
  eventExpiresAt  DateTime? @map("event_expires_at")
  priceHistory    Json      @default("[]") @map("price_history") // [{time, price}]
  lastTickAt      DateTime  @default(now()) @map("last_tick_at")
  tickSeed        Int       @default(0) @map("tick_seed") // For deterministic tick generation
  startsAt        DateTime  @default(now()) @map("starts_at")
  expiresAt       DateTime  @map("expires_at") // 8hr max
  createdAt       DateTime  @default(now()) @map("created_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("player_ipos")
}

model MarketEvent {
  id              String    @id @default(cuid())
  slug            String    @unique
  name            String
  description     String
  effectType      String    @map("effect_type") // trend_bias, instant_spike, tick_modifier
  effectValue     Decimal   @db.Decimal(5, 2) @map("effect_value")
  durationMinutes Int       @map("duration_minutes") // 0 for instant
  isPositive      Boolean   @map("is_positive")
  rarity          Int       @default(1) // 1=common, 2=uncommon, 3=rare
  isActive        Boolean   @default(true) @map("is_active")

  @@map("market_events")
}
```

**Step 2: Add relation to User model**

Find the User model (around line 14) and add this relation in the relations section (around line 89):

```prisma
  ipo                   PlayerIPO?
```

**Step 3: Push schema to database**

Run:
```bash
cd /Users/n809m/Desktop/The-Mint-Game && pnpm db:generate && pnpm db:push
```

Expected: Schema synced, Prisma client regenerated

**Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add PlayerIPO and MarketEvent models for IPO simulation"
```

---

## Task 2: Seed Market Events

**Files:**
- Modify: `packages/database/prisma/seed.ts`

**Step 1: Add market events seed data**

Add to `packages/database/prisma/seed.ts` after the businessTypes array (around line 40):

```typescript
const marketEvents: Prisma.MarketEventCreateInput[] = [
  // Positive Events
  { slug: 'bull-run', name: 'Bull Run', description: 'Market momentum is strong! Prices trending up.', effectType: 'trend_bias', effectValue: 5, durationMinutes: 45, isPositive: true, rarity: 2 },
  { slug: 'sector-boom-real-estate', name: 'Real Estate Boom', description: 'Property sector is hot!', effectType: 'trend_bias', effectValue: 10, durationMinutes: 30, isPositive: true, rarity: 2 },
  { slug: 'sector-boom-business', name: 'Business Sector Rally', description: 'Business stocks are surging!', effectType: 'trend_bias', effectValue: 10, durationMinutes: 30, isPositive: true, rarity: 2 },
  { slug: 'earnings-beat', name: 'Earnings Beat', description: 'Your company crushed expectations!', effectType: 'instant_spike', effectValue: 12, durationMinutes: 0, isPositive: true, rarity: 3 },
  { slug: 'analyst-upgrade', name: 'Analyst Upgrade', description: 'Wall Street loves you now.', effectType: 'tick_modifier', effectValue: 3, durationMinutes: 20, isPositive: true, rarity: 2 },
  { slug: 'fed-rate-cut', name: 'Fed Rate Cut', description: 'The Fed cut rates! Markets rally.', effectType: 'trend_bias', effectValue: 5, durationMinutes: 40, isPositive: true, rarity: 3 },
  { slug: 'viral-news', name: 'Viral News', description: 'Your company is trending!', effectType: 'instant_spike', effectValue: 15, durationMinutes: 0, isPositive: true, rarity: 3 },

  // Negative Events
  { slug: 'bear-market', name: 'Bear Market', description: 'Market sentiment is turning negative.', effectType: 'trend_bias', effectValue: -5, durationMinutes: 45, isPositive: false, rarity: 2 },
  { slug: 'sector-crash-real-estate', name: 'Real Estate Crash', description: 'Property bubble bursting!', effectType: 'trend_bias', effectValue: -10, durationMinutes: 30, isPositive: false, rarity: 2 },
  { slug: 'sector-crash-business', name: 'Business Sector Slump', description: 'Business stocks are tanking.', effectType: 'trend_bias', effectValue: -10, durationMinutes: 30, isPositive: false, rarity: 2 },
  { slug: 'earnings-miss', name: 'Earnings Miss', description: 'Your company disappointed investors.', effectType: 'instant_spike', effectValue: -12, durationMinutes: 0, isPositive: false, rarity: 3 },
  { slug: 'analyst-downgrade', name: 'Analyst Downgrade', description: 'Wall Street turned on you.', effectType: 'tick_modifier', effectValue: -3, durationMinutes: 20, isPositive: false, rarity: 2 },
  { slug: 'fed-rate-hike', name: 'Fed Rate Hike', description: 'The Fed raised rates. Ouch.', effectType: 'trend_bias', effectValue: -5, durationMinutes: 40, isPositive: false, rarity: 3 },

  // Neutral/Chaos Events
  { slug: 'meme-stock-surge', name: 'Meme Stock Surge', description: 'Wild swings incoming! 🚀🎢', effectType: 'tick_modifier', effectValue: 10, durationMinutes: 20, isPositive: true, rarity: 3 },
  { slug: 'market-holiday', name: 'Market Holiday', description: 'Trading paused for holiday.', effectType: 'trend_bias', effectValue: 0, durationMinutes: 30, isPositive: true, rarity: 1 },
];
```

**Step 2: Add market events to seed function**

Add to the `main()` function in seed.ts, after the business types upsert:

```typescript
  // Upsert market events
  for (const event of marketEvents) {
    await prisma.marketEvent.upsert({
      where: { slug: event.slug },
      update: event,
      create: event,
    });
  }
  console.log(`✅ Seeded ${marketEvents.length} market events`);
```

**Step 3: Run seed**

```bash
cd /Users/n809m/Desktop/The-Mint-Game && npx prisma db seed --schema packages/database/prisma/schema.prisma
```

Expected: "✅ Seeded 15 market events"

**Step 4: Commit**

```bash
git add packages/database/prisma/seed.ts
git commit -m "feat(db): seed 15 market events for IPO simulation"
```

---

## Task 3: IPO Service - Core Logic

**Files:**
- Create: `services/api-gateway/src/services/ipo.service.ts`

**Step 1: Create IPO service with ticker generation and launch logic**

Create `services/api-gateway/src/services/ipo.service.ts`:

```typescript
import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';

interface PricePoint {
  time: number; // Unix timestamp
  price: number;
}

interface IPOStatus {
  id: string;
  tickerSymbol: string;
  ipoPrice: string;
  currentPrice: string;
  highPrice: string;
  lowPrice: string;
  basePoints: number;
  currentMultiplier: number;
  potentialPoints: number;
  trend: string;
  trendStrength: number;
  activeEvent: {
    slug: string;
    name: string;
    description: string;
    isPositive: boolean;
    expiresAt: string;
  } | null;
  priceHistory: PricePoint[];
  startsAt: string;
  expiresAt: string;
  timeRemainingMs: number;
  percentChange: number;
}

export class IPOService {
  private static IPO_DURATION_HOURS = 8;
  private static TICK_INTERVAL_MIN_MS = 5 * 60 * 1000; // 5 minutes
  private static TICK_INTERVAL_MAX_MS = 15 * 60 * 1000; // 15 minutes
  private static PRICE_FLOOR_PCT = 0.70; // -30% from IPO
  private static PRICE_CEILING_PCT = 1.50; // +50% from IPO
  private static MAX_HISTORY_POINTS = 100;

  /**
   * Generate ticker symbol from username
   * Extract consonants + first vowel, uppercase, 3-4 chars
   */
  generateTickerSymbol(username: string): string {
    const clean = username.toUpperCase().replace(/[^A-Z]/g, '');
    const consonants = clean.replace(/[AEIOU]/g, '');
    const firstVowel = clean.match(/[AEIOU]/)?.[0] || '';

    let ticker = '';
    if (consonants.length >= 3) {
      ticker = consonants.slice(0, 3) + firstVowel;
    } else if (consonants.length >= 2) {
      ticker = consonants.slice(0, 2) + firstVowel + clean[clean.length - 1];
    } else {
      ticker = clean.slice(0, 4);
    }

    return ticker.slice(0, 4).padEnd(3, 'X');
  }

  /**
   * Check if user has an active IPO
   */
  async hasActiveIPO(userId: string): Promise<boolean> {
    const ipo = await prisma.playerIPO.findUnique({ where: { userId } });
    if (!ipo) return false;
    return new Date() < new Date(ipo.expiresAt);
  }

  /**
   * Get IPO status with on-demand tick calculation
   */
  async getIPOStatus(userId: string): Promise<IPOStatus | null> {
    const ipo = await prisma.playerIPO.findUnique({ where: { userId } });
    if (!ipo) return null;

    const now = new Date();
    if (now >= new Date(ipo.expiresAt)) {
      // IPO expired, auto-sell at current price
      return null;
    }

    // Calculate ticks that happened since last check
    const updatedIPO = await this.processTicksOnDemand(ipo);

    const ipoPrice = Number(updatedIPO.ipoPrice);
    const currentPrice = Number(updatedIPO.currentPrice);
    const multiplier = currentPrice / ipoPrice;
    const percentChange = ((currentPrice - ipoPrice) / ipoPrice) * 100;

    // Get active event details
    let activeEvent = null;
    if (updatedIPO.activeEvent && updatedIPO.eventExpiresAt && new Date(updatedIPO.eventExpiresAt) > now) {
      const event = await prisma.marketEvent.findUnique({ where: { slug: updatedIPO.activeEvent } });
      if (event) {
        activeEvent = {
          slug: event.slug,
          name: event.name,
          description: event.description,
          isPositive: event.isPositive,
          expiresAt: updatedIPO.eventExpiresAt.toISOString(),
        };
      }
    }

    return {
      id: updatedIPO.id,
      tickerSymbol: updatedIPO.tickerSymbol,
      ipoPrice: updatedIPO.ipoPrice.toString(),
      currentPrice: updatedIPO.currentPrice.toString(),
      highPrice: updatedIPO.highPrice.toString(),
      lowPrice: updatedIPO.lowPrice.toString(),
      basePoints: updatedIPO.basePoints,
      currentMultiplier: Math.round(multiplier * 100) / 100,
      potentialPoints: Math.floor(updatedIPO.basePoints * multiplier),
      trend: updatedIPO.trend,
      trendStrength: updatedIPO.trendStrength,
      activeEvent,
      priceHistory: updatedIPO.priceHistory as PricePoint[],
      startsAt: updatedIPO.startsAt.toISOString(),
      expiresAt: updatedIPO.expiresAt.toISOString(),
      timeRemainingMs: new Date(updatedIPO.expiresAt).getTime() - now.getTime(),
      percentChange: Math.round(percentChange * 100) / 100,
    };
  }

  /**
   * Launch IPO instead of instant prestige
   */
  async launchIPO(userId: string): Promise<IPOStatus> {
    // Check if already has active IPO
    if (await this.hasActiveIPO(userId)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'You already have an active IPO', 400);
    }

    // Get user and calculate net worth
    const [user, stats] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.playerStats.findUnique({ where: { userId } }),
    ]);

    if (!user || !stats) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    // Import prestige service to calculate net worth and points
    const { prestigeService } = await import('./prestige.service');
    const netWorth = await prestigeService.calculateNetWorth(userId);

    const MINIMUM_NET_WORTH = 100000;
    if (netWorth.lessThan(MINIMUM_NET_WORTH)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Need at least $${MINIMUM_NET_WORTH.toLocaleString()} net worth to launch IPO`,
        400
      );
    }

    const basePoints = prestigeService.calculatePrestigePoints(netWorth, stats.prestigeLevel);
    const ipoPrice = new Decimal(netWorth).div(10000); // $100K net worth = $10/share
    const tickerSymbol = this.generateTickerSymbol(user.username);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + IPOService.IPO_DURATION_HOURS * 60 * 60 * 1000);

    // Delete any existing IPO (shouldn't happen but safety)
    await prisma.playerIPO.deleteMany({ where: { userId } });

    // Create IPO
    const ipo = await prisma.playerIPO.create({
      data: {
        userId,
        tickerSymbol,
        ipoPrice,
        currentPrice: ipoPrice,
        highPrice: ipoPrice,
        lowPrice: ipoPrice,
        basePoints,
        trend: 'neutral',
        trendStrength: 1,
        priceHistory: [{ time: Math.floor(now.getTime() / 1000), price: Number(ipoPrice) }],
        tickSeed: Math.floor(Math.random() * 1000000),
        lastTickAt: now,
        startsAt: now,
        expiresAt,
      },
    });

    return this.getIPOStatus(userId) as Promise<IPOStatus>;
  }

  /**
   * Sell shares and complete prestige
   */
  async sellShares(userId: string): Promise<{ pointsEarned: number; multiplier: number; newPrestigeLevel: number }> {
    const ipo = await prisma.playerIPO.findUnique({ where: { userId } });
    if (!ipo) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'No active IPO found', 404);
    }

    // Process any remaining ticks
    const updatedIPO = await this.processTicksOnDemand(ipo);

    const ipoPrice = Number(updatedIPO.ipoPrice);
    const currentPrice = Number(updatedIPO.currentPrice);
    const multiplier = currentPrice / ipoPrice;
    const pointsEarned = Math.floor(updatedIPO.basePoints * multiplier);

    // Execute prestige with the calculated points
    const result = await this.executePrestigeWithIPO(userId, pointsEarned);

    // Delete IPO record
    await prisma.playerIPO.delete({ where: { userId } });

    return {
      pointsEarned,
      multiplier: Math.round(multiplier * 100) / 100,
      newPrestigeLevel: result.newPrestigeLevel,
    };
  }

  /**
   * Cancel IPO and do instant prestige with base points
   */
  async cancelIPO(userId: string): Promise<{ pointsEarned: number; newPrestigeLevel: number }> {
    const ipo = await prisma.playerIPO.findUnique({ where: { userId } });
    if (!ipo) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'No active IPO found', 404);
    }

    // Execute prestige with base points (no multiplier)
    const result = await this.executePrestigeWithIPO(userId, ipo.basePoints);

    // Delete IPO record
    await prisma.playerIPO.delete({ where: { userId } });

    return {
      pointsEarned: ipo.basePoints,
      newPrestigeLevel: result.newPrestigeLevel,
    };
  }

  /**
   * Process ticks that should have happened since last check
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
    let seed = ipo.tickSeed;

    // Process each tick
    for (let i = 0; i < ticksToProcess && i < 50; i++) { // Cap at 50 ticks
      // Seeded random for deterministic results
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      // Check if event expired
      if (eventExpiresAt && new Date(eventExpiresAt) <= new Date(lastTick.getTime() + i * avgTickInterval)) {
        activeEvent = null;
        eventExpiresAt = null;
      }

      // Maybe trigger new event (5% chance per tick if no active event)
      if (!activeEvent && random() < 0.05) {
        const eventResult = await this.triggerRandomEvent(random);
        if (eventResult) {
          activeEvent = eventResult.slug;
          eventExpiresAt = new Date(lastTick.getTime() + i * avgTickInterval + eventResult.durationMinutes * 60 * 1000);

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
      const tickTime = Math.floor((lastTick.getTime() + (i + 1) * avgTickInterval) / 1000);
      priceHistory.push({ time: tickTime, price: Math.round(currentPrice * 100) / 100 });
    }

    // Trim history to max points
    if (priceHistory.length > IPOService.MAX_HISTORY_POINTS) {
      priceHistory = priceHistory.slice(-IPOService.MAX_HISTORY_POINTS);
    }

    // Update database
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
        priceHistory,
        tickSeed: seed,
        lastTickAt: now,
      },
    });

    return updated;
  }

  /**
   * Trigger a random market event
   */
  private async triggerRandomEvent(random: () => number): Promise<{
    slug: string;
    effectType: string;
    effectValue: Decimal;
    durationMinutes: number;
  } | null> {
    const events = await prisma.marketEvent.findMany({ where: { isActive: true } });
    if (events.length === 0) return null;

    // Weight by rarity (lower rarity = more common)
    const weighted: typeof events = [];
    for (const event of events) {
      const weight = 4 - event.rarity; // rarity 1 = weight 3, rarity 3 = weight 1
      for (let i = 0; i < weight; i++) {
        weighted.push(event);
      }
    }

    const selected = weighted[Math.floor(random() * weighted.length)];
    return {
      slug: selected.slug,
      effectType: selected.effectType,
      effectValue: selected.effectValue,
      durationMinutes: selected.durationMinutes,
    };
  }

  /**
   * Execute prestige with specified points (reusing existing prestige logic)
   */
  private async executePrestigeWithIPO(userId: string, pointsEarned: number): Promise<{ newPrestigeLevel: number }> {
    return prisma.$transaction(async (tx) => {
      const stats = await tx.playerStats.findUnique({ where: { userId } });
      if (!stats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      const newPrestigeLevel = stats.prestigeLevel + 1;

      // Calculate new multiplier based on owned perks
      const playerPerks = await tx.playerPrestigePerk.findMany({
        where: { userId },
        include: { perk: true },
      });

      let prestigeMultiplier = new Decimal(1);
      for (const pp of playerPerks) {
        const effect = pp.perk.effect as { type: string; value: number };
        if (effect.type === 'income_mult') {
          prestigeMultiplier = prestigeMultiplier.add(effect.value * pp.level);
        }
      }

      // Add base prestige bonus: +5% per prestige level
      prestigeMultiplier = prestigeMultiplier.add(new Decimal(newPrestigeLevel).mul(0.05));

      // Delete all properties
      await tx.playerProperty.deleteMany({ where: { userId } });

      // Delete all businesses
      await tx.playerBusiness.deleteMany({ where: { userId } });

      // Reset player stats but keep prestige data
      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: 1000,
          lifetimeCashEarned: 0,
          playerLevel: 1,
          experiencePoints: 0,
          baseIncomePerHour: 0,
          effectiveIncomeHour: 0,
          currentMultiplier: prestigeMultiplier,
          prestigeLevel: newPrestigeLevel,
          prestigePoints: { increment: pointsEarned },
          prestigeMultiplier,
          timesPrestiged: { increment: 1 },
          totalPropertiesOwned: 0,
          totalBusinessesOwned: 0,
          lastCollectionAt: new Date(),
        },
      });

      return { newPrestigeLevel };
    });
  }
}

export const ipoService = new IPOService();
```

**Step 2: Verify TypeScript compiles**

```bash
cd /Users/n809m/Desktop/The-Mint-Game && pnpm typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add services/api-gateway/src/services/ipo.service.ts
git commit -m "feat(ipo): add IPO service with ticker generation, launch, and sell logic"
```

---

## Task 4: IPO API Routes

**Files:**
- Create: `services/api-gateway/src/routes/ipo.ts`
- Modify: `services/api-gateway/src/routes/index.ts`

**Step 1: Create IPO routes**

Create `services/api-gateway/src/routes/ipo.ts`:

```typescript
import { Router, Response, NextFunction } from 'express';
import { ipoService } from '../services/ipo.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All IPO routes require authentication
router.use(authenticate);

// GET /api/v1/ipo/status - Get current IPO status
router.get('/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await ipoService.getIPOStatus(req.user!.id);
    res.json({
      success: true,
      data: status,
      hasActiveIPO: status !== null,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/ipo/launch - Launch IPO instead of instant prestige
router.post('/launch', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await ipoService.launchIPO(req.user!.id);
    res.json({
      success: true,
      data: status,
      message: `IPO launched! Your ticker symbol is ${status.tickerSymbol}`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/ipo/sell - Sell shares and complete prestige
router.post('/sell', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ipoService.sellShares(req.user!.id);
    res.json({
      success: true,
      data: result,
      message: `Sold shares for ${result.pointsEarned} prestige points (${result.multiplier}x multiplier)!`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/ipo/cancel - Cancel IPO and take base points
router.post('/cancel', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ipoService.cancelIPO(req.user!.id);
    res.json({
      success: true,
      data: result,
      message: `IPO cancelled. You received ${result.pointsEarned} base prestige points.`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 2: Register IPO routes**

Modify `services/api-gateway/src/routes/index.ts` - add import and route:

```typescript
import ipoRouter from './ipo';
// ... add after prestige router:
router.use('/v1/ipo', ipoRouter);
```

**Step 3: Verify server starts**

```bash
cd /Users/n809m/Desktop/The-Mint-Game && pnpm --filter @mint/api-gateway build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add services/api-gateway/src/routes/ipo.ts services/api-gateway/src/routes/index.ts
git commit -m "feat(ipo): add IPO API routes for launch, status, sell, cancel"
```

---

## Task 5: Frontend API Client

**Files:**
- Modify: `apps/web/src/api/game.ts`

**Step 1: Add IPO types and API methods**

Add these types after the existing type definitions (around line 265):

```typescript
export interface IPOStatus {
  id: string;
  tickerSymbol: string;
  ipoPrice: string;
  currentPrice: string;
  highPrice: string;
  lowPrice: string;
  basePoints: number;
  currentMultiplier: number;
  potentialPoints: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  trendStrength: number;
  activeEvent: {
    slug: string;
    name: string;
    description: string;
    isPositive: boolean;
    expiresAt: string;
  } | null;
  priceHistory: Array<{ time: number; price: number }>;
  startsAt: string;
  expiresAt: string;
  timeRemainingMs: number;
  percentChange: number;
}

export interface IPOLaunchResult {
  id: string;
  tickerSymbol: string;
  ipoPrice: string;
  basePoints: number;
}

export interface IPOSellResult {
  pointsEarned: number;
  multiplier: number;
  newPrestigeLevel: number;
}
```

Add these methods to the `gameApi` object (before the closing brace):

```typescript
  // IPO
  async getIPOStatus(): Promise<ApiResponse<IPOStatus | null> & { hasActiveIPO?: boolean }> {
    return apiClient.get<IPOStatus | null>('/ipo/status');
  },

  async launchIPO(): Promise<ApiResponse<IPOStatus>> {
    return apiClient.post<IPOStatus>('/ipo/launch');
  },

  async sellIPOShares(): Promise<ApiResponse<IPOSellResult>> {
    return apiClient.post<IPOSellResult>('/ipo/sell');
  },

  async cancelIPO(): Promise<ApiResponse<{ pointsEarned: number; newPrestigeLevel: number }>> {
    return apiClient.post<{ pointsEarned: number; newPrestigeLevel: number }>('/ipo/cancel');
  },
```

**Step 2: Commit**

```bash
git add apps/web/src/api/game.ts
git commit -m "feat(web): add IPO API client methods"
```

---

## Task 6: IPO Stock Chart Component

**Files:**
- Create: `apps/web/src/components/IPOChart.tsx`

**Step 1: Create IPO chart component using lightweight-charts**

Create `apps/web/src/components/IPOChart.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  LineData,
  Time,
  AreaSeries,
} from 'lightweight-charts';
import { formatCurrency } from '@mint/utils';

interface PricePoint {
  time: number;
  price: number;
}

interface IPOChartProps {
  priceHistory: PricePoint[];
  ipoPrice: number;
  currentPrice: number;
  isPositive: boolean;
}

export function IPOChart({ priceHistory, ipoPrice, currentPrice, isPositive }: IPOChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1e293b',
      },
      rightPriceScale: {
        borderColor: '#1e293b',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: isPositive ? '#22c55e' : '#ef4444',
          width: 1,
          style: 2,
          labelBackgroundColor: isPositive ? '#22c55e' : '#ef4444',
        },
        horzLine: {
          color: isPositive ? '#22c55e' : '#ef4444',
          width: 1,
          style: 2,
          labelBackgroundColor: isPositive ? '#22c55e' : '#ef4444',
        },
      },
    });

    chartRef.current = chart;

    const lineColor = isPositive ? '#22c55e' : '#ef4444';
    const topColor = isPositive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor,
      bottomColor: 'rgba(0, 0, 0, 0)',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => formatCurrency(price),
      },
    });

    seriesRef.current = series;

    // Add IPO price line
    series.createPriceLine({
      price: ipoPrice,
      color: '#6366f1',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'IPO',
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [ipoPrice, isPositive]);

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return;

    const chartData: LineData[] = priceHistory.map((point) => ({
      time: point.time as Time,
      value: point.price,
    }));

    seriesRef.current.setData(chartData);

    if (chartRef.current && chartData.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [priceHistory]);

  // Update colors when trend changes
  useEffect(() => {
    if (!seriesRef.current) return;

    const lineColor = isPositive ? '#22c55e' : '#ef4444';
    const topColor = isPositive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';

    seriesRef.current.applyOptions({
      lineColor,
      topColor,
    });
  }, [isPositive]);

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden">
      <div ref={chartContainerRef} />
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-indigo-500" style={{ borderStyle: 'dashed' }} />
            <span className="text-slate-400">IPO Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-slate-400">Current</span>
          </div>
        </div>
        <div className={`font-mono font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(currentPrice)}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/IPOChart.tsx
git commit -m "feat(web): add IPO stock chart component"
```

---

## Task 7: IPO Dashboard Component

**Files:**
- Create: `apps/web/src/components/IPODashboard.tsx`

**Step 1: Create IPO dashboard with status, chart, and controls**

Create `apps/web/src/components/IPODashboard.tsx`:

```typescript
import { useState } from 'react';
import { IPOChart } from './IPOChart';
import { formatCurrency } from '@mint/utils';
import type { IPOStatus } from '../api/game';

interface IPODashboardProps {
  status: IPOStatus;
  onSell: () => Promise<void>;
  onCancel: () => Promise<void>;
  isLoading: boolean;
}

export function IPODashboard({ status, onSell, onCancel, isLoading }: IPODashboardProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSellConfirm, setShowSellConfirm] = useState(false);

  const isPositive = status.percentChange >= 0;
  const timeRemaining = formatTimeRemaining(status.timeRemainingMs);

  const trendEmoji = {
    bullish: '📈',
    bearish: '📉',
    neutral: '➡️',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold font-mono">${status.tickerSymbol}</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isPositive ? '+' : ''}
                {status.percentChange.toFixed(2)}%
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">Your company is now trading!</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Time Remaining</p>
            <p className="text-2xl font-bold font-mono">{timeRemaining}</p>
          </div>
        </div>

        {/* Price Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-slate-400">IPO Price</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(parseFloat(status.ipoPrice))}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-slate-400">Current</p>
            <p className={`text-lg font-bold font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(parseFloat(status.currentPrice))}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-slate-400">Session High</p>
            <p className="text-lg font-bold font-mono text-green-400">
              {formatCurrency(parseFloat(status.highPrice))}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-slate-400">Session Low</p>
            <p className="text-lg font-bold font-mono text-red-400">
              {formatCurrency(parseFloat(status.lowPrice))}
            </p>
          </div>
        </div>
      </div>

      {/* Active Event Banner */}
      {status.activeEvent && (
        <div
          className={`rounded-xl p-4 flex items-center gap-4 ${
            status.activeEvent.isPositive
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}
        >
          <span className="text-3xl">{status.activeEvent.isPositive ? '🚀' : '⚠️'}</span>
          <div>
            <p className={`font-bold ${status.activeEvent.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {status.activeEvent.name}
            </p>
            <p className="text-sm text-slate-400">{status.activeEvent.description}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <IPOChart
        priceHistory={status.priceHistory}
        ipoPrice={parseFloat(status.ipoPrice)}
        currentPrice={parseFloat(status.currentPrice)}
        isPositive={isPositive}
      />

      {/* Trend Indicator */}
      <div className="flex items-center justify-center gap-6 text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{trendEmoji[status.trend]}</span>
          <span className="capitalize">{status.trend}</span>
          <span className="text-xs">
            (Strength: {'⚡'.repeat(status.trendStrength)})
          </span>
        </div>
      </div>

      {/* Points Preview */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6 text-center">
        <p className="text-purple-300 text-sm mb-2">If you sell now, you'll earn:</p>
        <p className="text-5xl font-bold text-purple-400">{status.potentialPoints}</p>
        <p className="text-purple-300">
          Prestige Points ({status.currentMultiplier}x multiplier)
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Base: {status.basePoints} PP × {status.currentMultiplier.toFixed(2)} = {status.potentialPoints} PP
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => setShowCancelConfirm(true)}
          disabled={isLoading}
          className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          Cancel IPO ({status.basePoints} PP)
        </button>
        <button
          onClick={() => setShowSellConfirm(true)}
          disabled={isLoading}
          className={`flex-1 py-4 font-bold rounded-xl transition-colors disabled:opacity-50 ${
            isPositive
              ? 'bg-green-500 hover:bg-green-400 text-white'
              : 'bg-red-500 hover:bg-red-400 text-white'
          }`}
        >
          Sell Shares ({status.potentialPoints} PP)
        </button>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🛑</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Cancel IPO?</h2>
              <p className="text-gray-600 mb-6">
                This will end your IPO early and give you {status.basePoints} base prestige points
                (no multiplier).
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg"
                  disabled={isLoading}
                >
                  Keep Trading
                </button>
                <button
                  onClick={async () => {
                    await onCancel();
                    setShowCancelConfirm(false);
                  }}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Cancel IPO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sell Confirmation Modal */}
      {showSellConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">{isPositive ? '🎉' : '💼'}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sell Shares?</h2>
              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600">You will earn:</p>
                <p className="text-4xl font-bold text-purple-600">+{status.potentialPoints} PP</p>
                <p className="text-sm text-gray-500">
                  {status.currentMultiplier}x multiplier applied
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSellConfirm(false)}
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg"
                  disabled={isLoading}
                >
                  Keep Trading
                </button>
                <button
                  onClick={async () => {
                    await onSell();
                    setShowSellConfirm(false);
                  }}
                  className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Selling...' : 'Sell Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/IPODashboard.tsx
git commit -m "feat(web): add IPO dashboard component with status and controls"
```

---

## Task 8: Update Prestige Page with IPO Flow

**Files:**
- Modify: `apps/web/src/pages/PrestigePage.tsx`

**Step 1: Add IPO state and choice modal**

Replace the entire content of `apps/web/src/pages/PrestigePage.tsx`:

```typescript
import { useEffect, useState, useCallback } from 'react';
import { gameApi, PrestigeStatus, PrestigePerk, IPOStatus } from '../api/game';
import { formatCurrency } from '@mint/utils';
import { IPODashboard } from '../components/IPODashboard';

export function PrestigePage() {
  const [status, setStatus] = useState<PrestigeStatus | null>(null);
  const [perks, setPerks] = useState<PrestigePerk[]>([]);
  const [ipoStatus, setIpoStatus] = useState<IPOStatus | null>(null);
  const [hasActiveIPO, setHasActiveIPO] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isPrestiging, setIsPrestiging] = useState(false);
  const [prestigeResult, setPrestigeResult] = useState<{
    pointsEarned: number;
    newPrestigeLevel: number;
    multiplier?: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statusRes, perksRes, ipoRes] = await Promise.all([
        gameApi.getPrestigeStatus(),
        gameApi.getPrestigePerks(),
        gameApi.getIPOStatus(),
      ]);

      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      }
      if (perksRes.success && perksRes.data) {
        setPerks(perksRes.data);
      }
      if (ipoRes.success) {
        setIpoStatus(ipoRes.data);
        setHasActiveIPO((ipoRes as any).hasActiveIPO || ipoRes.data !== null);
      }
    } catch {
      setError('Failed to load prestige data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll IPO status when active
  useEffect(() => {
    if (!hasActiveIPO) return;

    const interval = setInterval(async () => {
      const res = await gameApi.getIPOStatus();
      if (res.success && res.data) {
        setIpoStatus(res.data);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [hasActiveIPO]);

  const handleGoPublicClick = () => {
    if (!status?.canPrestige) return;
    setShowChoiceModal(true);
  };

  const handleInstantPrestige = async () => {
    setIsPrestiging(true);
    try {
      const res = await gameApi.goPublic();
      if (res.success && res.data) {
        setPrestigeResult(res.data);
        await fetchData();
      } else {
        setError(res.error?.message || 'Failed to go public');
      }
    } catch {
      setError('Failed to go public');
    } finally {
      setIsPrestiging(false);
      setShowChoiceModal(false);
    }
  };

  const handleLaunchIPO = async () => {
    setIsPrestiging(true);
    try {
      const res = await gameApi.launchIPO();
      if (res.success && res.data) {
        setIpoStatus(res.data);
        setHasActiveIPO(true);
      } else {
        setError(res.error?.message || 'Failed to launch IPO');
      }
    } catch {
      setError('Failed to launch IPO');
    } finally {
      setIsPrestiging(false);
      setShowChoiceModal(false);
    }
  };

  const handleSellShares = async () => {
    setIsPrestiging(true);
    try {
      const res = await gameApi.sellIPOShares();
      if (res.success && res.data) {
        setPrestigeResult({
          pointsEarned: res.data.pointsEarned,
          newPrestigeLevel: res.data.newPrestigeLevel,
          multiplier: res.data.multiplier,
        });
        setIpoStatus(null);
        setHasActiveIPO(false);
        await fetchData();
      } else {
        setError(res.error?.message || 'Failed to sell shares');
      }
    } catch {
      setError('Failed to sell shares');
    } finally {
      setIsPrestiging(false);
    }
  };

  const handleCancelIPO = async () => {
    setIsPrestiging(true);
    try {
      const res = await gameApi.cancelIPO();
      if (res.success && res.data) {
        setPrestigeResult({
          pointsEarned: res.data.pointsEarned,
          newPrestigeLevel: res.data.newPrestigeLevel,
        });
        setIpoStatus(null);
        setHasActiveIPO(false);
        await fetchData();
      } else {
        setError(res.error?.message || 'Failed to cancel IPO');
      }
    } catch {
      setError('Failed to cancel IPO');
    } finally {
      setIsPrestiging(false);
    }
  };

  const handleBuyPerk = async (perkId: string) => {
    try {
      const res = await gameApi.buyPerk(perkId);
      if (res.success && res.data) {
        setPerks((prev) => prev.map((p) => (p.id === perkId ? res.data!.perk : p)));
        setStatus((prev) => (prev ? { ...prev, prestigePoints: res.data!.remainingPoints } : null));
      } else {
        setError(res.error?.message || 'Failed to buy perk');
      }
    } catch {
      setError('Failed to buy perk');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-500"></div>
      </div>
    );
  }

  // Show IPO Dashboard if active
  if (hasActiveIPO && ipoStatus) {
    return (
      <div className="space-y-6">
        <IPODashboard
          status={ipoStatus}
          onSell={handleSellShares}
          onCancel={handleCancelIPO}
          isLoading={isPrestiging}
        />

        {/* Perks section still visible during IPO */}
        <PerksSection
          perks={perks}
          prestigePoints={status?.prestigePoints || 0}
          onBuyPerk={handleBuyPerk}
        />
      </div>
    );
  }

  const categoryIcons: Record<string, string> = {
    income: '💰',
    offline: '🌙',
    speed: '⚡',
    cosmetic: '✨',
  };

  const tierColors: Record<number, string> = {
    1: 'border-gray-300 bg-gray-50',
    2: 'border-green-300 bg-green-50',
    3: 'border-purple-300 bg-purple-50',
    4: 'border-yellow-400 bg-yellow-50',
  };

  return (
    <div className="space-y-6">
      {/* Prestige Result Modal */}
      {prestigeResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h2>
            <p className="text-gray-600 mb-4">
              {prestigeResult.multiplier ? 'IPO Complete!' : 'You went public!'}
            </p>
            <div className="space-y-2 mb-6">
              <p className="text-lg">
                <span className="text-purple-600 font-bold">+{prestigeResult.pointsEarned}</span>{' '}
                prestige points earned
              </p>
              {prestigeResult.multiplier && (
                <p className="text-sm text-gray-500">
                  ({prestigeResult.multiplier}x multiplier applied)
                </p>
              )}
              <p className="text-lg">
                Now at{' '}
                <span className="text-purple-600 font-bold">
                  Prestige Level {prestigeResult.newPrestigeLevel}
                </span>
              </p>
            </div>
            <button
              onClick={() => setPrestigeResult(null)}
              className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors"
            >
              Continue Building
            </button>
          </div>
        </div>
      )}

      {/* Choice Modal - Instant vs IPO */}
      {showChoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎰</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Path</h2>
              <p className="text-gray-600">How do you want to go public?</p>
            </div>

            <div className="space-y-4">
              {/* Instant Prestige Option */}
              <button
                onClick={handleInstantPrestige}
                disabled={isPrestiging}
                className="w-full p-6 border-2 border-gray-200 hover:border-purple-500 rounded-xl text-left transition-all group"
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl">✅</span>
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-purple-600">
                      Instant Prestige
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">Safe and guaranteed</p>
                    <p className="text-2xl font-bold text-purple-600">
                      +{status?.potentialPoints} PP
                    </p>
                  </div>
                </div>
              </button>

              {/* Launch IPO Option */}
              <button
                onClick={handleLaunchIPO}
                disabled={isPrestiging}
                className="w-full p-6 border-2 border-gray-200 hover:border-amber-500 rounded-xl text-left transition-all group bg-gradient-to-r from-amber-50 to-orange-50"
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl">📈</span>
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-amber-600">
                      Launch IPO
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      Gamble for more! Stock fluctuates for 8 hours
                    </p>
                    <p className="text-lg font-bold text-amber-600">
                      {Math.floor(status!.potentialPoints * 0.7)} - {Math.floor(status!.potentialPoints * 1.5)} PP
                    </p>
                    <p className="text-xs text-gray-400">0.7x to 1.5x multiplier possible</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowChoiceModal(false)}
              className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700 font-medium"
              disabled={isPrestiging}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Go Public</h1>
          <span className="text-4xl">🚀</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">Prestige Level</p>
            <p className="text-2xl font-bold">{status?.prestigeLevel || 0}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">Prestige Points</p>
            <p className="text-2xl font-bold">{status?.prestigePoints || 0}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">Income Multiplier</p>
            <p className="text-2xl font-bold">
              {((parseFloat(status?.prestigeMultiplier || '1') - 1) * 100).toFixed(0)}%
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">Times Prestiged</p>
            <p className="text-2xl font-bold">{status?.timesPrestiged || 0}</p>
          </div>
        </div>

        <div className="bg-white/10 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Current Net Worth</span>
            <span className="font-bold">
              {formatCurrency(parseFloat(status?.currentNetWorth || '0'))}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Minimum to Prestige</span>
            <span className="font-bold">{formatCurrency(status?.minimumNetWorth || 100000)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Base Points on Prestige</span>
            <span className="font-bold text-yellow-300">+{status?.potentialPoints || 0} PP</span>
          </div>
        </div>

        <button
          onClick={handleGoPublicClick}
          disabled={!status?.canPrestige}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
            status?.canPrestige
              ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900 shadow-lg hover:shadow-xl'
              : 'bg-white/20 text-white/50 cursor-not-allowed'
          }`}
        >
          {status?.canPrestige
            ? `Go Public (+${status.potentialPoints} PP)`
            : `Need ${formatCurrency(status?.minimumNetWorth || 100000)} Net Worth`}
        </button>
      </div>

      {/* Perks Shop */}
      <PerksSection
        perks={perks}
        prestigePoints={status?.prestigePoints || 0}
        onBuyPerk={handleBuyPerk}
      />

      {/* Info Section */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-bold text-gray-900 mb-3">How Prestige Works</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-purple-500">1.</span>
            Build your net worth to at least $100,000
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500">2.</span>
            Choose: Instant Prestige (safe) or Launch IPO (gamble for more)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500">3.</span>
            Spend points on permanent perks that boost your empire
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500">4.</span>
            Each prestige level gives you +5% base income bonus
          </li>
        </ul>
      </div>
    </div>
  );
}

// Perks section component
interface PerksSectionProps {
  perks: PrestigePerk[];
  prestigePoints: number;
  onBuyPerk: (perkId: string) => Promise<void>;
}

function PerksSection({ perks, prestigePoints, onBuyPerk }: PerksSectionProps) {
  const categoryIcons: Record<string, string> = {
    income: '💰',
    offline: '🌙',
    speed: '⚡',
    cosmetic: '✨',
  };

  const tierColors: Record<number, string> = {
    1: 'border-gray-300 bg-gray-50',
    2: 'border-green-300 bg-green-50',
    3: 'border-purple-300 bg-purple-50',
    4: 'border-yellow-400 bg-yellow-50',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Prestige Perks</h2>
        <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-lg">
          <span className="text-purple-600 font-bold">{prestigePoints}</span>
          <span className="text-purple-600 text-sm">PP Available</span>
        </div>
      </div>

      {perks.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No perks available yet. Prestige to unlock perks!
        </p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {perks.map((perk) => (
            <div
              key={perk.id}
              className={`rounded-xl border-2 p-4 ${tierColors[perk.tier] || tierColors[1]}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{categoryIcons[perk.category] || '🎯'}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{perk.name}</h3>
                    <p className="text-xs text-gray-500">Tier {perk.tier}</p>
                  </div>
                </div>
                {perk.currentLevel > 0 && (
                  <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                    Lv.{perk.currentLevel}/{perk.maxLevel}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-3">{perk.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {perk.currentLevel >= perk.maxLevel ? 'Max Level' : `Cost: ${perk.totalCost} PP`}
                </span>
                {perk.currentLevel < perk.maxLevel && (
                  <button
                    onClick={() => onBuyPerk(perk.id)}
                    disabled={!perk.canPurchase}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      perk.canPurchase
                        ? 'bg-purple-500 hover:bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {perk.currentLevel > 0 ? 'Upgrade' : 'Buy'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify frontend builds**

```bash
cd /Users/n809m/Desktop/The-Mint-Game && pnpm --filter @mint/web build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/web/src/pages/PrestigePage.tsx
git commit -m "feat(web): integrate IPO flow into prestige page with choice modal"
```

---

## Task 9: Add IPO Indicator to Navigation

**Files:**
- Modify: `apps/web/src/components/Layout.tsx` (or wherever the nav is)

**Step 1: Find the navigation/layout component**

First, locate the file:
```bash
find apps/web/src -name "*.tsx" | xargs grep -l "nav\|Nav\|Sidebar\|Layout" | head -5
```

**Step 2: Add IPO status indicator**

Add a small indicator that shows when user has an active IPO. This depends on the existing layout structure. The key addition is:

```typescript
// Add to imports
import { useEffect, useState } from 'react';
import { gameApi } from '../api/game';

// Add state in component
const [hasActiveIPO, setHasActiveIPO] = useState(false);

// Check for active IPO on mount
useEffect(() => {
  const checkIPO = async () => {
    try {
      const res = await gameApi.getIPOStatus();
      setHasActiveIPO((res as any).hasActiveIPO || res.data !== null);
    } catch {
      // Ignore errors
    }
  };
  checkIPO();
  const interval = setInterval(checkIPO, 60000); // Check every minute
  return () => clearInterval(interval);
}, []);

// Add badge next to Prestige nav item
{hasActiveIPO && (
  <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full animate-pulse">
    IPO
  </span>
)}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/*.tsx
git commit -m "feat(web): add IPO status indicator to navigation"
```

---

## Task 10: Testing and Polish

**Files:**
- Manual testing

**Step 1: Start development servers**

```bash
cd /Users/n809m/Desktop/The-Mint-Game && pnpm dev
```

**Step 2: Test complete IPO flow**

1. Register/login to the game
2. Build net worth to $100k+
3. Go to Prestige page
4. Click "Go Public"
5. Choose "Launch IPO"
6. Verify:
   - Ticker symbol generated
   - Chart displays
   - Price updates on refresh
   - Time remaining counts down
   - Sell/Cancel buttons work
7. Test selling at different prices
8. Test canceling IPO
9. Test instant prestige still works

**Step 3: Final commit**

```bash
git add .
git commit -m "feat(ipo): complete stock market IPO simulation

- Database schema for PlayerIPO and MarketEvent
- 15 market events with varying effects
- IPO service with on-demand tick calculation
- API routes for launch, status, sell, cancel
- Frontend IPO dashboard with TradingView chart
- Updated prestige page with IPO choice flow
- Momentum-based price fluctuation (±30% to +50%)
- Seeded randomness for deterministic tick generation"
```

---

## Verification Checklist

- [ ] PlayerIPO and MarketEvent models exist in database
- [ ] 15 market events seeded
- [ ] Can launch IPO from prestige page
- [ ] Ticker symbol generated from username
- [ ] IPO price calculated from net worth
- [ ] Price fluctuates over time
- [ ] Chart displays price history
- [ ] Market events trigger and display
- [ ] Can sell shares for multiplied points
- [ ] Can cancel IPO for base points
- [ ] IPO auto-expires after 8 hours
- [ ] Instant prestige still works
- [ ] Prestige perks still purchasable during IPO

---

*Plan created: November 29, 2025*
