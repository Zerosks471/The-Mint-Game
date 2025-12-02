import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

interface IndexData {
  tickerSymbol: string;
  name: string;
  indexType: 'master' | 'sector';
  sector?: string;
  currentValue: string;
  previousClose: string;
  change: string;
  changePercent: number;
  highValue24h: string;
  lowValue24h: string;
  volume24h: number;
  components?: { ticker: string; weight: number; price: string }[];
}

export class IndexService {
  private static UPDATE_INTERVAL_MS = 60 * 1000; // 1 minute

  /**
   * Get all market indices
   */
  async getAllIndices(): Promise<IndexData[]> {
    const indices = await prisma.marketIndex.findMany({
      where: { isActive: true },
      orderBy: [{ indexType: 'asc' }, { tickerSymbol: 'asc' }],
    });

    return indices.map((idx) => ({
      tickerSymbol: idx.tickerSymbol,
      name: idx.name,
      indexType: idx.indexType as 'master' | 'sector',
      sector: idx.sector || undefined,
      currentValue: idx.currentValue.toString(),
      previousClose: idx.previousClose.toString(),
      change: idx.change.toString(),
      changePercent: Number(idx.changePercent),
      highValue24h: idx.highValue24h.toString(),
      lowValue24h: idx.lowValue24h.toString(),
      volume24h: idx.volume24h,
    }));
  }

  /**
   * Get single index with components
   */
  async getIndexByTicker(ticker: string): Promise<IndexData | null> {
    const idx = await prisma.marketIndex.findUnique({
      where: { tickerSymbol: ticker },
      include: {
        components: {
          include: { botStock: true },
        },
      },
    });

    if (!idx) return null;

    return {
      tickerSymbol: idx.tickerSymbol,
      name: idx.name,
      indexType: idx.indexType as 'master' | 'sector',
      sector: idx.sector || undefined,
      currentValue: idx.currentValue.toString(),
      previousClose: idx.previousClose.toString(),
      change: idx.change.toString(),
      changePercent: Number(idx.changePercent),
      highValue24h: idx.highValue24h.toString(),
      lowValue24h: idx.lowValue24h.toString(),
      volume24h: idx.volume24h,
      components: idx.components.map((c) => ({
        ticker: c.botStock.tickerSymbol,
        weight: Number(c.weight),
        price: c.botStock.currentPrice.toString(),
      })),
    };
  }

  /**
   * Recalculate all index values based on component stocks
   */
  async recalculateIndices(): Promise<void> {
    const indices = await prisma.marketIndex.findMany({
      where: { isActive: true },
      include: {
        components: {
          include: { botStock: true },
        },
      },
    });

    for (const idx of indices) {
      if (idx.components.length === 0) continue;

      // Calculate weighted value
      let newValue = 0;
      for (const comp of idx.components) {
        newValue += Number(comp.botStock.currentPrice) * Number(comp.weight);
      }

      // Scale factor (indices are scaled for readability)
      const scaleFactor = idx.indexType === 'master' ? 100 : 10;
      newValue *= scaleFactor;

      const change = newValue - Number(idx.previousClose);
      const changePercent =
        Number(idx.previousClose) > 0
          ? (change / Number(idx.previousClose)) * 100
          : 0;

      await prisma.marketIndex.update({
        where: { id: idx.id },
        data: {
          currentValue: new Decimal(newValue),
          change: new Decimal(change),
          changePercent: new Decimal(changePercent),
          highValue24h:
            newValue > Number(idx.highValue24h)
              ? new Decimal(newValue)
              : idx.highValue24h,
          lowValue24h:
            newValue < Number(idx.lowValue24h)
              ? new Decimal(newValue)
              : idx.lowValue24h,
          lastTickAt: new Date(),
        },
      });
    }
  }

  /**
   * Reset daily values at midnight
   */
  async resetDailyValues(): Promise<void> {
    const indices = await prisma.marketIndex.findMany({
      where: { isActive: true },
    });

    for (const idx of indices) {
      await prisma.marketIndex.update({
        where: { id: idx.id },
        data: {
          previousClose: idx.currentValue,
          highValue24h: idx.currentValue,
          lowValue24h: idx.currentValue,
          change: new Decimal(0),
          changePercent: new Decimal(0),
          volume24h: 0,
        },
      });
    }
  }
}

export const indexService = new IndexService();
