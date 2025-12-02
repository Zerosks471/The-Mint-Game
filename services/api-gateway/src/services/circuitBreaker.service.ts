import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

interface HaltedStock {
  ticker: string;
  reason: string;
  haltedAt: string;
  resumesAt: string;
  priceChange: number;
}

interface CircuitBreakerStatus {
  marketHalted: boolean;
  haltReason?: string;
  resumesAt?: string;
  haltedStocks: HaltedStock[];
  mint35Change: number;
}

export class CircuitBreakerService {
  // Individual stock thresholds
  private static HALT_10_PERCENT = { threshold: 0.10, duration: 5 * 60 * 1000 }; // 5 min
  private static HALT_15_PERCENT = { threshold: 0.15, duration: 15 * 60 * 1000 }; // 15 min
  private static HALT_25_PERCENT = { threshold: 0.25, duration: 60 * 60 * 1000 }; // 1 hour

  // Market-wide thresholds (MINT35)
  private static MARKET_HALT_10 = { threshold: 0.10, duration: 15 * 60 * 1000 };
  private static MARKET_HALT_20 = { threshold: 0.20, duration: 60 * 60 * 1000 };
  private static MARKET_HALT_30 = { threshold: 0.30, duration: 24 * 60 * 60 * 1000 }; // Close for day

  private haltedStocks: Map<string, { resumesAt: Date; reason: string }> = new Map();
  private marketHaltedUntil: Date | null = null;
  private marketHaltReason: string | null = null;

  /**
   * Check if a stock is currently halted
   */
  isStockHalted(ticker: string): boolean {
    const halt = this.haltedStocks.get(ticker);
    if (!halt) return false;

    if (new Date() > halt.resumesAt) {
      this.haltedStocks.delete(ticker);
      return false;
    }

    return true;
  }

  /**
   * Check if market is halted
   */
  isMarketHalted(): boolean {
    if (!this.marketHaltedUntil) return false;

    if (new Date() > this.marketHaltedUntil) {
      this.marketHaltedUntil = null;
      this.marketHaltReason = null;
      return false;
    }

    return true;
  }

  /**
   * Check price movement and trigger halts if needed
   * Returns true if trading should be halted
   */
  async checkPriceMovement(
    ticker: string,
    currentPrice: number,
    previousClose: number,
    timeframeMinutes: number
  ): Promise<{ halted: boolean; reason?: string }> {
    if (previousClose <= 0) return { halted: false };

    const changePercent = Math.abs((currentPrice - previousClose) / previousClose);

    // Check against thresholds based on timeframe
    let haltDuration: number | null = null;
    let threshold: number | null = null;

    if (timeframeMinutes <= 30 && changePercent >= CircuitBreakerService.HALT_10_PERCENT.threshold) {
      haltDuration = CircuitBreakerService.HALT_10_PERCENT.duration;
      threshold = 10;
    } else if (timeframeMinutes <= 60 && changePercent >= CircuitBreakerService.HALT_15_PERCENT.threshold) {
      haltDuration = CircuitBreakerService.HALT_15_PERCENT.duration;
      threshold = 15;
    } else if (changePercent >= CircuitBreakerService.HALT_25_PERCENT.threshold) {
      haltDuration = CircuitBreakerService.HALT_25_PERCENT.duration;
      threshold = 25;
    }

    if (haltDuration && threshold) {
      const resumesAt = new Date(Date.now() + haltDuration);
      const direction = currentPrice > previousClose ? 'up' : 'down';
      const reason = `${ticker} moved ${direction} ${(changePercent * 100).toFixed(1)}% - ${threshold}% circuit breaker triggered`;

      this.haltedStocks.set(ticker, { resumesAt, reason });

      // Log market event
      await prisma.stockMarketEvent.create({
        data: {
          eventType: 'circuit_breaker',
          severity: threshold >= 25 ? 'critical' : threshold >= 15 ? 'warning' : 'info',
          title: `${ticker} Trading Halted`,
          description: reason,
          affectedTickers: [ticker],
          priceImpact: new Decimal(changePercent * 100),
          duration: Math.floor(haltDuration / 1000),
          expiresAt: resumesAt,
          isActive: true,
        },
      });

      return { halted: true, reason };
    }

    return { halted: false };
  }

  /**
   * Check MINT35 index for market-wide halts
   */
  async checkMarketWideHalt(): Promise<{ halted: boolean; reason?: string }> {
    const mint35 = await prisma.marketIndex.findUnique({
      where: { tickerSymbol: 'MINT35' },
    });

    if (!mint35) return { halted: false };

    const changePercent = Math.abs(Number(mint35.changePercent) / 100);

    let haltDuration: number | null = null;
    let threshold: number | null = null;

    // Only trigger on drops (not rises)
    if (Number(mint35.change) < 0) {
      if (changePercent >= CircuitBreakerService.MARKET_HALT_30.threshold) {
        haltDuration = CircuitBreakerService.MARKET_HALT_30.duration;
        threshold = 30;
      } else if (changePercent >= CircuitBreakerService.MARKET_HALT_20.threshold) {
        haltDuration = CircuitBreakerService.MARKET_HALT_20.duration;
        threshold = 20;
      } else if (changePercent >= CircuitBreakerService.MARKET_HALT_10.threshold) {
        haltDuration = CircuitBreakerService.MARKET_HALT_10.duration;
        threshold = 10;
      }
    }

    if (haltDuration && threshold) {
      this.marketHaltedUntil = new Date(Date.now() + haltDuration);
      this.marketHaltReason = `MINT35 dropped ${(changePercent * 100).toFixed(1)}% - Level ${threshold} circuit breaker`;

      await prisma.stockMarketEvent.create({
        data: {
          eventType: 'halt',
          severity: 'critical',
          title: 'Market-Wide Trading Halt',
          description: this.marketHaltReason,
          affectedTickers: ['MINT35'],
          priceImpact: new Decimal(changePercent * 100),
          duration: Math.floor(haltDuration / 1000),
          expiresAt: this.marketHaltedUntil,
          isActive: true,
        },
      });

      return { halted: true, reason: this.marketHaltReason };
    }

    return { halted: false };
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): CircuitBreakerStatus {
    const now = new Date();

    // Clean up expired halts
    for (const [ticker, halt] of this.haltedStocks.entries()) {
      if (now > halt.resumesAt) {
        this.haltedStocks.delete(ticker);
      }
    }

    const haltedStocks: HaltedStock[] = [];
    for (const [ticker, halt] of this.haltedStocks.entries()) {
      haltedStocks.push({
        ticker,
        reason: halt.reason,
        haltedAt: new Date(halt.resumesAt.getTime() - 5 * 60 * 1000).toISOString(),
        resumesAt: halt.resumesAt.toISOString(),
        priceChange: 0, // Would need to track this
      });
    }

    return {
      marketHalted: this.isMarketHalted(),
      haltReason: this.marketHaltReason || undefined,
      resumesAt: this.marketHaltedUntil?.toISOString(),
      haltedStocks,
      mint35Change: 0, // Would fetch from index
    };
  }
}

export const circuitBreakerService = new CircuitBreakerService();
