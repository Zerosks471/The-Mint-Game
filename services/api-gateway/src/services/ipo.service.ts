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
    await prisma.playerIPO.create({
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
        priceHistory: [{ time: Math.floor(now.getTime() / 1000), price: Number(ipoPrice) }] as any,
        tickSeed: Math.floor(Math.random() * 1000000),
        lastTickAt: now,
        startsAt: now,
        expiresAt,
      },
    });

    return this.getIPOStatus(userId) as Promise<IPOStatus>;
  }

  /**
   * Sell shares - earns cash based on current stock price (NO RESET)
   * This is now an investment feature, not prestige
   */
  async sellShares(userId: string): Promise<{ cashEarned: string; multiplier: number }> {
    const ipo = await prisma.playerIPO.findUnique({ where: { userId } });
    if (!ipo) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'No active IPO found', 404);
    }

    // Process any remaining ticks
    const updatedIPO = await this.processTicksOnDemand(ipo);

    const ipoPrice = Number(updatedIPO.ipoPrice);
    const currentPrice = Number(updatedIPO.currentPrice);
    const multiplier = currentPrice / ipoPrice;

    // Calculate cash earned: current price * base value
    // Base value is ipoPrice * 1000 shares (conceptual)
    const cashEarned = new Decimal(currentPrice).mul(1000);

    // Complete the sale - just add cash, NO reset
    await this.completeIPOSale(userId, cashEarned);

    // Delete IPO record
    await prisma.playerIPO.delete({ where: { userId } });

    return {
      cashEarned: cashEarned.toString(),
      multiplier: Math.round(multiplier * 100) / 100,
    };
  }

  /**
   * Cancel IPO - earns cash at IPO price (NO RESET)
   * Player gets their initial investment back
   */
  async cancelIPO(userId: string): Promise<{ cashEarned: string }> {
    const ipo = await prisma.playerIPO.findUnique({ where: { userId } });
    if (!ipo) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'No active IPO found', 404);
    }

    // Cash earned at IPO price (1x multiplier)
    const cashEarned = new Decimal(ipo.ipoPrice).mul(1000);

    // Complete the sale - just add cash, NO reset
    await this.completeIPOSale(userId, cashEarned);

    // Delete IPO record
    await prisma.playerIPO.delete({ where: { userId } });

    return {
      cashEarned: cashEarned.toString(),
    };
  }

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
    if (!selected) return null;

    return {
      slug: selected.slug,
      effectType: selected.effectType,
      effectValue: selected.effectValue,
      durationMinutes: selected.durationMinutes,
    };
  }

  /**
   * Complete IPO sale - NO RESET, just add cash earnings to player
   * The IPO is now an investment feature, not a prestige reset
   */
  private async completeIPOSale(userId: string, cashEarned: Decimal): Promise<{ cashEarned: string }> {
    return prisma.$transaction(async (tx) => {
      const stats = await tx.playerStats.findUnique({ where: { userId } });
      if (!stats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      // Simply add the cash earned from selling IPO shares
      // NO reset of properties, businesses, or any other stats
      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { increment: cashEarned },
          lifetimeCashEarned: { increment: cashEarned },
        },
      });

      return { cashEarned: cashEarned.toString() };
    });
  }
}

export const ipoService = new IPOService();
