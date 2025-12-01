import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Market Dynamics Service
 * Handles supply/demand pressure and sector-based market effects
 */
export class MarketDynamicsService {
  // Price impact per share traded (scaled by market cap)
  // Bots control markets - they can move prices significantly
  private static BASE_PRICE_IMPACT = 0.0005; // Increased base impact
  private static MIN_PRICE_IMPACT = 0.001; // Minimum 0.1% impact
  private static MAX_PRICE_IMPACT = 0.15; // Maximum 15% impact per trade (bots can move markets!)

  // Sector correlation - sectors that move together
  private static SECTOR_CORRELATIONS: Record<string, string[]> = {
    tech: ['technology'],
    finance: ['finance', 'banking'],
    energy: ['energy', 'oil'],
    consumer: ['consumer', 'retail'],
    healthcare: ['healthcare', 'pharma'],
  };

  /**
   * Apply price impact from a trade
   * Large buys push price up, large sells push price down
   */
  static async applyTradeImpact(
    tickerSymbol: string,
    orderType: 'buy' | 'sell',
    shares: number,
    pricePerShare: Decimal
  ): Promise<void> {
    // Get stock
    const botStock = await prisma.botStock.findUnique({
      where: { tickerSymbol: tickerSymbol.toUpperCase() },
    });
    const playerStock = await prisma.playerStock.findFirst({
      where: { tickerSymbol: tickerSymbol.toUpperCase() },
    });

    const stock = botStock || playerStock;
    if (!stock) return;

    // Calculate market cap
    const marketCap = stock.marketCap
      ? new Decimal(stock.marketCap)
      : new Decimal(stock.currentPrice).mul(stock.totalShares || 1000000);

    // Calculate trade value as percentage of market cap
    const tradeValue = pricePerShare.mul(shares);
    const tradePercentage = tradeValue.div(marketCap);

    // Price impact scales with trade size
    // For now, all trades use the same impact multiplier to avoid runtime errors
    const impactMultiplier = 1;
    
    const rawImpact = Number(tradePercentage) * 10 * impactMultiplier;
    const impact = Math.min(
      this.MAX_PRICE_IMPACT,
      Math.max(this.MIN_PRICE_IMPACT, rawImpact * Math.log10(shares + 1) / 2)
    );

    // Buy orders push price up, sell orders push price down
    const priceChange = orderType === 'buy' ? impact : -impact;
    const currentPrice = new Decimal(stock.currentPrice);
    const newPrice = currentPrice.mul(1 + priceChange);

    // Ensure price doesn't go below $0.01
    const finalPrice = newPrice.greaterThan(0.01) ? newPrice : new Decimal(0.01);

    // Update stock price
    if (botStock) {
      await prisma.botStock.update({
        where: { id: botStock.id },
        data: {
          currentPrice: finalPrice,
          highPrice24h: finalPrice.greaterThan(botStock.highPrice24h) ? finalPrice : botStock.highPrice24h,
          lowPrice24h: finalPrice.lessThan(botStock.lowPrice24h) ? finalPrice : botStock.lowPrice24h,
        },
      });
    } else if (playerStock) {
      await prisma.playerStock.update({
        where: { id: playerStock.id },
        data: {
          currentPrice: finalPrice,
          highPrice24h: finalPrice.greaterThan(playerStock.highPrice24h) ? finalPrice : playerStock.highPrice24h,
          lowPrice24h: finalPrice.lessThan(playerStock.lowPrice24h) ? finalPrice : playerStock.lowPrice24h,
        },
      });
    }

    // Apply sector correlation effects (smaller impact on related stocks)
    if (stock.sector || playerStock) {
      const sector = stock.sector || 'general';
      await this.applySectorCorrelation(sector, orderType, impact * 0.1); // 10% of impact spreads to sector
    }
  }

  /**
   * Apply sector correlation - when one stock moves, related stocks move slightly
   */
  private static async applySectorCorrelation(
    sector: string,
    orderType: 'buy' | 'sell',
    impact: number
  ): Promise<void> {
    // Find related sectors
    const relatedSectors: string[] = [];
    for (const [key, sectors] of Object.entries(this.SECTOR_CORRELATIONS)) {
      if (sectors.some((s) => sector.toLowerCase().includes(s))) {
        relatedSectors.push(...sectors);
      }
    }

    // Apply small price changes to stocks in related sectors
    const botStocks = await prisma.botStock.findMany({
      where: {
        isActive: true,
        sector: relatedSectors.length > 0 ? { in: relatedSectors } : undefined,
      },
    });

    // Only affect a random subset to avoid too much correlation
    const affectedStocks = botStocks
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(3, botStocks.length));

    for (const stock of affectedStocks) {
      const currentPrice = new Decimal(stock.currentPrice);
      const sectorImpact = impact * (Math.random() * 0.5 + 0.5); // 50-100% of base impact
      const priceChange = orderType === 'buy' ? sectorImpact : -sectorImpact;
      const newPrice = currentPrice.mul(1 + priceChange);

      if (newPrice.greaterThan(0.01)) {
        await prisma.botStock.update({
          where: { id: stock.id },
          data: {
            currentPrice: newPrice,
          },
        });
      }
    }
  }

  /**
   * Calculate supply/demand pressure for a stock
   * Based on recent trading volume and direction
   */
  static async calculateSupplyDemand(tickerSymbol: string): Promise<{
    pressure: number; // -1 to 1, negative = oversupply, positive = high demand
    buyVolume: number;
    sellVolume: number;
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentOrders = await prisma.stockOrder.findMany({
      where: {
        tickerSymbol: tickerSymbol.toUpperCase(),
        createdAt: { gte: oneHourAgo },
        status: 'completed',
      },
    });

    let buyVolume = 0;
    let sellVolume = 0;

    for (const order of recentOrders) {
      const volume = order.shares * Number(order.pricePerShare);
      if (order.orderType === 'buy') {
        buyVolume += volume;
      } else {
        sellVolume += volume;
      }
    }

    const totalVolume = buyVolume + sellVolume;
    const pressure = totalVolume > 0 ? (buyVolume - sellVolume) / totalVolume : 0;

    return { pressure, buyVolume, sellVolume };
  }
}

