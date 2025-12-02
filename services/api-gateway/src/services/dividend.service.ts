import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

interface DividendSummary {
  today: string;
  thisWeek: string;
  allTime: string;
  lastPayoutAt: string | null;
}

interface DividendRecord {
  id: string;
  payoutType: string;
  stockType: string;
  ticker: string;
  shares: number;
  amount: string;
  dividendRate: string;
  payoutDate: string;
}

export class DividendService {
  private static MIN_PAYOUT = 1; // Minimum $1 payout
  private static OWNER_DIVIDEND_RATE = 0.05; // 5% of performance
  private static SHAREHOLDER_BASE_YIELD = 0.0001; // 0.01% base daily yield
  private static SHAREHOLDER_MAX_YIELD = 0.005; // 0.5% max daily yield

  /**
   * Calculate and distribute daily dividends for all players
   * Should run at midnight UTC
   */
  async processDailyDividends(): Promise<{ processed: number; totalPaid: string }> {
    console.log('💰 Processing daily dividends...');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    let totalProcessed = 0;
    let totalPaid = new Decimal(0);

    // 1. Process owner dividends (from their gameplay performance)
    const playerStocks = await prisma.playerStock.findMany({
      where: { isListed: true, listingStatus: 'active' },
      include: { user: { include: { playerStats: true } } },
    });

    for (const stock of playerStocks) {
      const stats = stock.user.playerStats;
      if (!stats) continue;

      // Calculate owner dividend based on their performance
      // Using net worth as proxy for "daily income" since we don't track daily separately
      const netWorth = Number(stats.highestNetWorth);
      const ownerDividend = netWorth * DividendService.OWNER_DIVIDEND_RATE * 0.001; // Scale down

      if (ownerDividend >= DividendService.MIN_PAYOUT) {
        await prisma.$transaction([
          prisma.dividendPayout.create({
            data: {
              userId: stock.userId,
              payoutType: 'owner',
              stockType: 'player',
              playerStockId: stock.id,
              shares: stock.ownerShares,
              priceAtPayout: stock.currentPrice,
              dividendRate: new Decimal(DividendService.OWNER_DIVIDEND_RATE),
              amount: new Decimal(ownerDividend),
              payoutDate: now,
            },
          }),
          prisma.playerStats.update({
            where: { userId: stock.userId },
            data: {
              cash: { increment: ownerDividend },
              dividendEarningsTotal: { increment: ownerDividend },
              dividendEarningsToday: ownerDividend,
              lastDividendAt: now,
            },
          }),
        ]);

        totalPaid = totalPaid.add(new Decimal(ownerDividend));
        totalProcessed++;
      }
    }

    // 2. Process shareholder dividends (from stock performance)
    const holdings = await prisma.stockHolding.findMany({
      where: { shares: { gt: 0 } },
      include: {
        botStock: true,
        playerStock: true,
        user: { include: { playerStats: true } },
      },
    });

    for (const holding of holdings) {
      const stock = holding.botStock || holding.playerStock;
      if (!stock) continue;

      // Calculate yield based on stock performance
      const currentPrice = Number(stock.currentPrice);
      const previousClose = Number(stock.previousClose);
      const priceChange = previousClose > 0
        ? (currentPrice - previousClose) / previousClose
        : 0;

      // Yield increases with positive performance, volume, etc.
      let dailyYield = DividendService.SHAREHOLDER_BASE_YIELD;
      dailyYield += Math.max(0, priceChange * 0.1); // Bonus for positive movement
      dailyYield = Math.min(dailyYield, DividendService.SHAREHOLDER_MAX_YIELD);

      const dividendAmount = holding.shares * currentPrice * dailyYield;

      if (dividendAmount >= DividendService.MIN_PAYOUT) {
        await prisma.$transaction([
          prisma.dividendPayout.create({
            data: {
              userId: holding.userId,
              payoutType: 'shareholder',
              stockType: holding.stockType,
              playerStockId: holding.playerStockId,
              botStockId: holding.botStockId,
              shares: holding.shares,
              priceAtPayout: new Decimal(currentPrice),
              dividendRate: new Decimal(dailyYield),
              amount: new Decimal(dividendAmount),
              payoutDate: now,
            },
          }),
          prisma.playerStats.update({
            where: { userId: holding.userId },
            data: {
              cash: { increment: dividendAmount },
              dividendEarningsTotal: { increment: dividendAmount },
              dividendEarningsToday: dividendAmount,
              lastDividendAt: now,
            },
          }),
        ]);

        totalPaid = totalPaid.add(new Decimal(dividendAmount));
        totalProcessed++;
      }
    }

    console.log(`💰 Dividends processed: ${totalProcessed} payouts, $${totalPaid.toFixed(2)} total`);

    return {
      processed: totalProcessed,
      totalPaid: totalPaid.toFixed(2),
    };
  }

  /**
   * Get dividend summary for a player
   */
  async getPlayerDividendSummary(userId: string): Promise<DividendSummary> {
    const stats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekPayouts = await prisma.dividendPayout.aggregate({
      where: {
        userId,
        payoutDate: { gte: weekAgo },
      },
      _sum: { amount: true },
    });

    return {
      today: stats?.dividendEarningsToday?.toString() || '0',
      thisWeek: weekPayouts._sum.amount?.toString() || '0',
      allTime: stats?.dividendEarningsTotal?.toString() || '0',
      lastPayoutAt: stats?.lastDividendAt?.toISOString() || null,
    };
  }

  /**
   * Get dividend history for a player
   */
  async getPlayerDividendHistory(
    userId: string,
    limit = 50
  ): Promise<DividendRecord[]> {
    const payouts = await prisma.dividendPayout.findMany({
      where: { userId },
      orderBy: { payoutDate: 'desc' },
      take: limit,
    });

    // Fetch stock details separately
    const results = await Promise.all(
      payouts.map(async (p) => {
        let ticker = 'Unknown';

        if (p.playerStockId) {
          const playerStock = await prisma.playerStock.findUnique({
            where: { id: p.playerStockId },
            select: { tickerSymbol: true },
          });
          ticker = playerStock?.tickerSymbol || 'Unknown';
        } else if (p.botStockId) {
          const botStock = await prisma.botStock.findUnique({
            where: { id: p.botStockId },
            select: { tickerSymbol: true },
          });
          ticker = botStock?.tickerSymbol || 'Unknown';
        }

        return {
          id: p.id,
          payoutType: p.payoutType,
          stockType: p.stockType,
          ticker,
          shares: p.shares,
          amount: p.amount.toString(),
          dividendRate: p.dividendRate.toString(),
          payoutDate: p.payoutDate.toISOString(),
        };
      })
    );

    return results;
  }
}

export const dividendService = new DividendService();
