import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

interface MarketEventData {
  id: string;
  eventType: string;
  severity: string;
  title: string;
  description?: string;
  affectedTickers: string[];
  priceImpact?: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

type GameEventType =
  | 'player_heist_success'
  | 'player_heist_fail'
  | 'player_business_opened'
  | 'player_arrested'
  | 'player_level_up'
  | 'player_large_trade';

export class MarketEventService {
  private static EVENT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  // Map game events to affected sectors
  private static EVENT_SECTOR_MAP: Record<GameEventType, string[]> = {
    player_heist_success: ['industrial', 'tech'],
    player_heist_fail: ['industrial'],
    player_business_opened: ['consumer', 'finance'],
    player_arrested: [],
    player_level_up: [],
    player_large_trade: [],
  };

  // Price impact by event type
  private static EVENT_IMPACT: Record<GameEventType, number> = {
    player_heist_success: 0.02, // +2%
    player_heist_fail: -0.01, // -1%
    player_business_opened: 0.015, // +1.5%
    player_arrested: -0.03, // -3%
    player_level_up: 0.01, // +1%
    player_large_trade: 0.005, // +0.5%
  };

  /**
   * Get active market events
   */
  async getActiveEvents(limit = 20): Promise<MarketEventData[]> {
    const events = await prisma.stockMarketEvent.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      severity: e.severity,
      title: e.title,
      description: e.description || undefined,
      affectedTickers: e.affectedTickers,
      priceImpact: e.priceImpact ? Number(e.priceImpact) : undefined,
      expiresAt: e.expiresAt?.toISOString(),
      isActive: e.isActive,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  /**
   * Get recent events (including expired)
   */
  async getRecentEvents(limit = 50): Promise<MarketEventData[]> {
    const events = await prisma.stockMarketEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      severity: e.severity,
      title: e.title,
      description: e.description || undefined,
      affectedTickers: e.affectedTickers,
      priceImpact: e.priceImpact ? Number(e.priceImpact) : undefined,
      expiresAt: e.expiresAt?.toISOString(),
      isActive: e.isActive,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  /**
   * Create a market event from a game action
   */
  async createGameEvent(
    eventType: GameEventType,
    playerId: string,
    playerTicker?: string
  ): Promise<MarketEventData | null> {
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { username: true },
    });

    if (!player) return null;

    const affectedSectors = MarketEventService.EVENT_SECTOR_MAP[eventType];
    const priceImpact = MarketEventService.EVENT_IMPACT[eventType];

    // Get tickers for affected sectors
    const affectedStocks = await prisma.botStock.findMany({
      where: { sector: { in: affectedSectors }, isActive: true },
      select: { tickerSymbol: true },
    });

    const affectedTickers = affectedStocks.map((s) => s.tickerSymbol);

    // Add player's stock if they have one
    if (playerTicker) {
      affectedTickers.push(playerTicker);
    }

    const eventTitles: Record<GameEventType, string> = {
      player_heist_success: `${player.username} pulled off a successful heist!`,
      player_heist_fail: `${player.username}'s heist went wrong`,
      player_business_opened: `${player.username} opened a new business`,
      player_arrested: `${player.username} was arrested`,
      player_level_up: `${player.username} reached a new level`,
      player_large_trade: `${player.username} made a large trade`,
    };

    const event = await prisma.stockMarketEvent.create({
      data: {
        eventType: 'player_action',
        severity: Math.abs(priceImpact) >= 0.02 ? 'warning' : 'info',
        title: eventTitles[eventType],
        description: `Market impact: ${priceImpact >= 0 ? '+' : ''}${(priceImpact * 100).toFixed(1)}%`,
        affectedTickers,
        priceImpact: new Decimal(priceImpact * 100),
        duration: Math.floor(MarketEventService.EVENT_DURATION_MS / 1000),
        expiresAt: new Date(Date.now() + MarketEventService.EVENT_DURATION_MS),
        triggeredBy: playerId,
        isActive: true,
      },
    });

    return {
      id: event.id,
      eventType: event.eventType,
      severity: event.severity,
      title: event.title,
      description: event.description || undefined,
      affectedTickers: event.affectedTickers,
      priceImpact: Number(event.priceImpact),
      expiresAt: event.expiresAt?.toISOString(),
      isActive: event.isActive,
      createdAt: event.createdAt.toISOString(),
    };
  }

  /**
   * Deactivate expired events
   */
  async cleanupExpiredEvents(): Promise<number> {
    const result = await prisma.stockMarketEvent.updateMany({
      where: {
        isActive: true,
        expiresAt: { lt: new Date() },
      },
      data: { isActive: false },
    });

    return result.count;
  }
}

export const marketEventService = new MarketEventService();
