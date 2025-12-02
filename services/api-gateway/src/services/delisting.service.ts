import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

interface DelistingCheck {
  stockId: string;
  ticker: string;
  status: 'active' | 'warning' | 'delisted';
  weeklyVolume: number;
  weeklyTraders: number;
  ownerActive: boolean;
  priceAboveMinimum: boolean;
  warningWeek: number;
  action: 'none' | 'warning' | 'delist';
}

export class DelistingService {
  private static MIN_WEEKLY_VOLUME = 1000;
  private static MIN_WEEKLY_TRADERS = 3;
  private static MIN_OWNER_LOGINS = 3; // per week
  private static MIN_PRICE = 0.10;
  private static WARNING_WEEKS_BEFORE_DELIST = 2;
  private static DELIST_COOLDOWN_DAYS = 30;

  /**
   * Run weekly performance checks on all player stocks
   * Should run once per week (e.g., Sunday midnight UTC)
   */
  async runWeeklyCheck(): Promise<DelistingCheck[]> {
    console.log('📋 Running weekly delisting checks...');

    const results: DelistingCheck[] = [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stocks = await prisma.playerStock.findMany({
      where: { isListed: true },
      include: { user: true },
    });

    for (const stock of stocks) {
      // Get weekly trading stats
      const weeklyOrders = await prisma.stockOrder.findMany({
        where: {
          playerStockId: stock.id,
          createdAt: { gte: weekAgo },
        },
      });

      const weeklyVolume = weeklyOrders.reduce((sum, o) => sum + o.shares, 0);
      const uniqueTraders = new Set(weeklyOrders.map((o) => o.userId)).size;

      // Check owner activity (using lastOwnerLogin from schema)
      const ownerActive = stock.lastOwnerLogin
        ? stock.lastOwnerLogin > weekAgo
        : false;

      // Check price floor
      const priceAboveMinimum = Number(stock.currentPrice) >= DelistingService.MIN_PRICE;

      // Determine action
      let action: 'none' | 'warning' | 'delist' = 'none';
      let newStatus = stock.listingStatus;
      let newWarningWeek = stock.warningWeek;

      const meetsRequirements =
        weeklyVolume >= DelistingService.MIN_WEEKLY_VOLUME &&
        uniqueTraders >= DelistingService.MIN_WEEKLY_TRADERS &&
        ownerActive &&
        priceAboveMinimum;

      if (!priceAboveMinimum) {
        // Automatic delist for price floor breach
        action = 'delist';
        newStatus = 'delisted';
      } else if (!meetsRequirements) {
        newWarningWeek = stock.warningWeek + 1;

        if (newWarningWeek >= DelistingService.WARNING_WEEKS_BEFORE_DELIST) {
          action = 'delist';
          newStatus = 'delisted';
        } else {
          action = 'warning';
          newStatus = 'warning';
        }
      } else {
        // Reset warning if requirements met
        newWarningWeek = 0;
        newStatus = 'active';
      }

      // Update stock status
      await prisma.playerStock.update({
        where: { id: stock.id },
        data: {
          listingStatus: newStatus,
          warningWeek: newWarningWeek,
          weeklyVolume,
          weeklyTraders: uniqueTraders,
          isListed: newStatus !== 'delisted',
        },
      });

      // If delisting, payout shareholders
      if (action === 'delist') {
        await this.processDelisting(stock.id);
      }

      results.push({
        stockId: stock.id,
        ticker: stock.tickerSymbol,
        status: newStatus as 'active' | 'warning' | 'delisted',
        weeklyVolume,
        weeklyTraders: uniqueTraders,
        ownerActive,
        priceAboveMinimum,
        warningWeek: newWarningWeek,
        action,
      });
    }

    console.log(`📋 Delisting check complete: ${results.length} stocks reviewed`);
    return results;
  }

  /**
   * Process delisting - payout shareholders at last price
   */
  private async processDelisting(stockId: string): Promise<void> {
    const stock = await prisma.playerStock.findUnique({
      where: { id: stockId },
    });

    if (!stock) return;

    // Get all holdings of this stock
    const holdings = await prisma.stockHolding.findMany({
      where: { playerStockId: stockId, shares: { gt: 0 } },
    });

    // Payout each shareholder
    for (const holding of holdings) {
      const payoutAmount = holding.shares * Number(stock.currentPrice);

      await prisma.$transaction([
        // Credit cash
        prisma.playerStats.update({
          where: { userId: holding.userId },
          data: { cash: { increment: payoutAmount } },
        }),
        // Clear holding
        prisma.stockHolding.delete({
          where: { id: holding.id },
        }),
        // Create order record for the forced sale
        prisma.stockOrder.create({
          data: {
            userId: holding.userId,
            stockType: 'player',
            playerStockId: stockId,
            tickerSymbol: stock.tickerSymbol,
            orderType: 'sell',
            shares: holding.shares,
            pricePerShare: stock.currentPrice,
            totalAmount: new Decimal(payoutAmount),
            status: 'completed',
          },
        }),
      ]);
    }

    // Create market event
    await prisma.stockMarketEvent.create({
      data: {
        eventType: 'halt',
        severity: 'critical',
        title: `${stock.tickerSymbol} Delisted`,
        description: `${stock.companyName} has been removed from the exchange. Shareholders paid out at $${Number(stock.currentPrice).toFixed(2)}/share.`,
        affectedTickers: [stock.tickerSymbol],
        isActive: true,
      },
    });
  }

  /**
   * Check if a player can create a new IPO (not in cooldown)
   */
  async canPlayerIPO(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check for existing active stock
    const activeStock = await prisma.playerStock.findFirst({
      where: { userId, isListed: true },
    });

    if (activeStock) {
      return { allowed: false, reason: 'You already have an active stock listed' };
    }

    // Check for recent delisting (cooldown)
    const recentDelist = await prisma.playerStock.findFirst({
      where: {
        userId,
        isListed: false,
        listingStatus: 'delisted',
        updatedAt: {
          gt: new Date(Date.now() - DelistingService.DELIST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentDelist) {
      const cooldownEnd = new Date(
        recentDelist.updatedAt.getTime() +
          DelistingService.DELIST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
      );
      return {
        allowed: false,
        reason: `Cooldown active until ${cooldownEnd.toISOString().split('T')[0]}`,
      };
    }

    return { allowed: true };
  }
}

export const delistingService = new DelistingService();
