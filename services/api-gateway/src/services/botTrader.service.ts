import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import bcrypt from 'bcrypt';
import { stockService } from './stock.service';

const SALT_ROUNDS = 10;

// Bot personality types
type BotPersonality = 'aggressive' | 'moderate' | 'conservative';

interface BotTrader {
  id: string;
  name: string;
  strategy: 'momentum' | 'mean_reversion' | 'contrarian' | 'trend_following' | 'volatility' | 'pump_hunter' | 'dump_catcher';
  aggressiveness: number; // 0-1, how often they trade
  cash: Decimal;
  riskTolerance: number; // 0-1, how much they're willing to risk
  lastTradeAt: Date | null;
  personality: BotPersonality;
  tradeIntervalMs: number; // How often this bot can trade (milliseconds)
  positionSizeMultiplier: number; // Multiplier for position sizing
}

// Track active pump and dump events
interface MarketEvent {
  tickerSymbol: string;
  type: 'pump' | 'dump' | 'news_positive' | 'news_negative';
  magnitude: number; // 0.1 to 0.5 (10% to 50% price impact)
  startedAt: Date;
  duration: number; // milliseconds
  targetPrice?: number;
}

interface TradingDecision {
  action: 'buy' | 'sell' | 'hold';
  ticker: string;
  shares: number;
  confidence: number; // 0-1
  reason: string;
}

export class BotTraderService {
  private static BOT_USER_ID = 'system-bot-trader'; // Special system user ID for bots
  private static MIN_CASH_RESERVE = 10000; // Bots keep minimum cash reserve
  private static MAX_POSITION_SIZE = 0.2; // Max 20% of portfolio in one stock

  // Track active market events (pumps, dumps, news)
  private activeEvents: MarketEvent[] = [];

  // Track last trade time per bot for variable intervals
  private botLastTradeTime: Map<string, Date> = new Map();

  // Track last rebalance time
  private lastRebalanceTime: Date = new Date(0);
  private static REBALANCE_INTERVAL_MS = 5 * 60 * 1000; // Rebalance every 5 minutes

  /**
   * Get or create bot trader user
   */
  private async getBotUser(): Promise<string> {
    let botUser = await prisma.user.findUnique({
      where: { id: BotTraderService.BOT_USER_ID },
    });

    if (!botUser) {
      // Create bot user if doesn't exist
      // Hash password (bot can't login anyway, but schema requires it)
      const passwordHash = await bcrypt.hash('system-bot-no-login', SALT_ROUNDS);

      botUser = await prisma.user.create({
        data: {
          id: BotTraderService.BOT_USER_ID,
          email: 'bot-trader@system.local',
          username: 'BotTrader',
          passwordHash,
        },
      });

      // Initialize bot stats with starting cash
      await prisma.playerStats.create({
        data: {
          userId: BotTraderService.BOT_USER_ID,
          cash: 2000000, // $2M starting capital (increased for more aggressive trading)
        },
      });
    }

    return botUser.id;
  }

  /**
   * Create different bot traders with different strategies
   * Now includes aggressive, moderate, and conservative personalities
   */
  private getBotTraders(): BotTrader[] {
    return [
      // === AGGRESSIVE BOTS (trade fast, big positions, high risk) ===
      {
        id: 'shark-bot',
        name: 'The Shark',
        strategy: 'momentum',
        aggressiveness: 0.95,
        cash: new Decimal(400000),
        riskTolerance: 0.9,
        lastTradeAt: null,
        personality: 'aggressive',
        tradeIntervalMs: 10000, // Can trade every 10 seconds
        positionSizeMultiplier: 2.5, // Takes 2.5x larger positions
      },
      {
        id: 'whale-bot',
        name: 'The Whale',
        strategy: 'trend_following',
        aggressiveness: 0.85,
        cash: new Decimal(500000),
        riskTolerance: 0.85,
        lastTradeAt: null,
        personality: 'aggressive',
        tradeIntervalMs: 15000, // Can trade every 15 seconds
        positionSizeMultiplier: 3.0, // Takes massive positions
      },
      {
        id: 'pump-hunter-bot',
        name: 'Pump Hunter',
        strategy: 'pump_hunter',
        aggressiveness: 0.9,
        cash: new Decimal(300000),
        riskTolerance: 0.95,
        lastTradeAt: null,
        personality: 'aggressive',
        tradeIntervalMs: 8000, // Fastest trader - 8 seconds
        positionSizeMultiplier: 2.0,
      },

      // === MODERATE BOTS (balanced approach) ===
      {
        id: 'momentum-bot',
        name: 'Momentum Trader',
        strategy: 'momentum',
        aggressiveness: 0.7,
        cash: new Decimal(200000),
        riskTolerance: 0.6,
        lastTradeAt: null,
        personality: 'moderate',
        tradeIntervalMs: 30000, // Trade every 30 seconds
        positionSizeMultiplier: 1.0,
      },
      {
        id: 'mean-reversion-bot',
        name: 'Value Finder',
        strategy: 'mean_reversion',
        aggressiveness: 0.5,
        cash: new Decimal(200000),
        riskTolerance: 0.4,
        lastTradeAt: null,
        personality: 'moderate',
        tradeIntervalMs: 45000,
        positionSizeMultiplier: 1.0,
      },
      {
        id: 'contrarian-bot',
        name: 'Contrarian',
        strategy: 'contrarian',
        aggressiveness: 0.5,
        cash: new Decimal(200000),
        riskTolerance: 0.5,
        lastTradeAt: null,
        personality: 'moderate',
        tradeIntervalMs: 40000,
        positionSizeMultiplier: 1.0,
      },
      {
        id: 'volatility-bot',
        name: 'Volatility Rider',
        strategy: 'volatility',
        aggressiveness: 0.75,
        cash: new Decimal(200000),
        riskTolerance: 0.7,
        lastTradeAt: null,
        personality: 'moderate',
        tradeIntervalMs: 25000,
        positionSizeMultiplier: 1.2,
      },

      // === CONSERVATIVE BOTS (slow, steady, small positions) ===
      {
        id: 'steady-eddie-bot',
        name: 'Steady Eddie',
        strategy: 'mean_reversion',
        aggressiveness: 0.25,
        cash: new Decimal(150000),
        riskTolerance: 0.2,
        lastTradeAt: null,
        personality: 'conservative',
        tradeIntervalMs: 90000, // Trade every 90 seconds
        positionSizeMultiplier: 0.5, // Takes smaller positions
      },
      {
        id: 'turtle-bot',
        name: 'The Turtle',
        strategy: 'trend_following',
        aggressiveness: 0.15,
        cash: new Decimal(100000),
        riskTolerance: 0.15,
        lastTradeAt: null,
        personality: 'conservative',
        tradeIntervalMs: 120000, // Trade every 2 minutes
        positionSizeMultiplier: 0.3, // Very small positions
      },
      {
        id: 'dump-catcher-bot',
        name: 'Dump Catcher',
        strategy: 'dump_catcher',
        aggressiveness: 0.3,
        cash: new Decimal(200000),
        riskTolerance: 0.25,
        lastTradeAt: null,
        personality: 'conservative',
        tradeIntervalMs: 60000,
        positionSizeMultiplier: 0.8,
      },
    ];
  }

  /**
   * Momentum strategy: Buy stocks that are rising, sell stocks that are falling
   */
  private momentumStrategy(stock: any, holdings: any[], cash: Decimal): TradingDecision {
    const changePercent = parseFloat(stock.changePercent);
    const trend = stock.trend;
    const volume = stock.volume24h;

    // Strong momentum signals (lowered threshold for more trading)
    if (changePercent > 1 && trend === 'bullish' && volume > 100) {
      const confidence = Math.min(0.85, 0.5 + changePercent / 10);
      const maxInvestment = cash.mul(0.15); // 15% of cash
      const shares = Math.floor(Number(maxInvestment) / parseFloat(stock.currentPrice));

      if (shares > 0) {
        return {
          action: 'buy',
          ticker: stock.tickerSymbol,
          shares: Math.max(1, shares), // At least 1 share
          confidence,
          reason: `Momentum: +${changePercent.toFixed(2)}% with bullish trend`,
        };
      }
    }

    // Sell if momentum reverses
    const holding = holdings.find((h) => h.tickerSymbol === stock.tickerSymbol);
    if (holding && changePercent < -2 && trend === 'bearish') {
      return {
        action: 'sell',
        ticker: stock.tickerSymbol,
        shares: Math.max(1, Math.floor(holding.shares * 0.5)), // Sell 50%, at least 1
        confidence: 0.65,
        reason: `Momentum reversal: ${changePercent.toFixed(2)}% with bearish trend`,
      };
    }

    return {
      action: 'hold',
      ticker: stock.tickerSymbol,
      shares: 0,
      confidence: 0,
      reason: 'No strong signal',
    };
  }

  /**
   * Mean reversion strategy: Buy when price is below base, sell when above
   */
  private meanReversionStrategy(stock: any, holdings: any[], cash: Decimal): TradingDecision {
    // Use basePrice for bot stocks, previousClose for player stocks
    const basePriceStr = stock.basePrice || stock.previousClose;
    if (!basePriceStr) {
      return {
        action: 'hold',
        ticker: stock.tickerSymbol,
        shares: 0,
        confidence: 0,
        reason: 'No base price',
      };
    }

    const currentPrice = parseFloat(stock.currentPrice);
    const basePrice = parseFloat(basePriceStr);
    if (basePrice <= 0) {
      return {
        action: 'hold',
        ticker: stock.tickerSymbol,
        shares: 0,
        confidence: 0,
        reason: 'Invalid base price',
      };
    }

    const deviation = (currentPrice - basePrice) / basePrice;

    // Buy when significantly below base (oversold) - lowered threshold
    if (deviation < -0.05 && currentPrice > 0) {
      const confidence = Math.min(0.8, 0.5 + Math.abs(deviation) * 3);
      const maxInvestment = cash.mul(0.2);
      const shares = Math.floor(Number(maxInvestment) / currentPrice);

      if (shares > 0) {
        return {
          action: 'buy',
          ticker: stock.tickerSymbol,
          shares: Math.max(1, shares),
          confidence,
          reason: `Oversold: ${(deviation * 100).toFixed(2)}% below base price`,
        };
      }
    }

    // Sell when significantly above base (overbought) - lowered threshold
    const holding = holdings.find((h) => h.tickerSymbol === stock.tickerSymbol);
    if (holding && deviation > 0.08) {
      return {
        action: 'sell',
        ticker: stock.tickerSymbol,
        shares: Math.max(1, Math.floor(holding.shares * 0.6)),
        confidence: 0.7,
        reason: `Overbought: ${(deviation * 100).toFixed(2)}% above base price`,
      };
    }

    return {
      action: 'hold',
      ticker: stock.tickerSymbol,
      shares: 0,
      confidence: 0,
      reason: 'Price near base',
    };
  }

  /**
   * Contrarian strategy: Buy when others are selling, sell when others are buying
   */
  private contrarianStrategy(stock: any, holdings: any[], cash: Decimal): TradingDecision {
    const changePercent = parseFloat(stock.changePercent);
    const volume = stock.volume24h;

    // Buy on heavy selling (negative sentiment) - lowered threshold
    if (changePercent < -3 && volume > 100) {
      const confidence = Math.min(0.75, 0.5 + Math.abs(changePercent) / 15);
      const maxInvestment = cash.mul(0.12);
      const shares = Math.floor(Number(maxInvestment) / parseFloat(stock.currentPrice));

      if (shares > 0) {
        return {
          action: 'buy',
          ticker: stock.tickerSymbol,
          shares: Math.max(1, shares),
          confidence,
          reason: `Contrarian buy: Selling at ${changePercent.toFixed(2)}%`,
        };
      }
    }

    // Sell on heavy buying (positive sentiment) - lowered threshold
    const holding = holdings.find((h) => h.tickerSymbol === stock.tickerSymbol);
    if (holding && changePercent > 5 && volume > 200) {
      return {
        action: 'sell',
        ticker: stock.tickerSymbol,
        shares: Math.max(1, Math.floor(holding.shares * 0.4)),
        confidence: 0.6,
        reason: `Contrarian sell: Buying at ${changePercent.toFixed(2)}%`,
      };
    }

    return {
      action: 'hold',
      ticker: stock.tickerSymbol,
      shares: 0,
      confidence: 0,
      reason: 'No contrarian signal',
    };
  }

  /**
   * Trend following strategy: Follow the trend, buy uptrends, sell downtrends
   */
  private trendFollowingStrategy(stock: any, holdings: any[], cash: Decimal): TradingDecision {
    const trend = stock.trend;
    const trendStrength = stock.trendStrength || 1;
    const changePercent = parseFloat(stock.changePercent);

    // Strong uptrend - lowered threshold
    if (trend === 'bullish' && trendStrength >= 2 && changePercent > 0) {
      const confidence = Math.min(0.85, 0.5 + trendStrength * 0.12);
      const maxInvestment = cash.mul(0.18);
      const shares = Math.floor(Number(maxInvestment) / parseFloat(stock.currentPrice));

      if (shares > 0) {
        return {
          action: 'buy',
          ticker: stock.tickerSymbol,
          shares: Math.max(1, shares),
          confidence,
          reason: `Uptrend: ${trend} with strength ${trendStrength}`,
        };
      }
    }

    // Strong downtrend - exit position - lowered threshold
    const holding = holdings.find((h) => h.tickerSymbol === stock.tickerSymbol);
    if (holding && trend === 'bearish' && trendStrength >= 2) {
      return {
        action: 'sell',
        ticker: stock.tickerSymbol,
        shares: Math.max(1, Math.floor(holding.shares * 0.7)),
        confidence: 0.75,
        reason: `Downtrend: ${trend} with strength ${trendStrength}`,
      };
    }

    return {
      action: 'hold',
      ticker: stock.tickerSymbol,
      shares: 0,
      confidence: 0,
      reason: 'Weak or neutral trend',
    };
  }

  /**
   * Volatility strategy: Trade on high volatility
   */
  private volatilityStrategy(stock: any, holdings: any[], cash: Decimal): TradingDecision {
    const high24h = parseFloat(stock.highPrice24h);
    const low24h = parseFloat(stock.lowPrice24h);
    const currentPrice = parseFloat(stock.currentPrice);
    const volatility = ((high24h - low24h) / currentPrice) * 100;

    // High volatility - buy at lows, sell at highs
    if (volatility > 10) {
      const pricePosition = (currentPrice - low24h) / (high24h - low24h);

      // Buy near low
      if (pricePosition < 0.3 && currentPrice > 0) {
        const confidence = 0.6;
        const maxInvestment = cash.mul(0.1);
        const shares = Math.floor(Number(maxInvestment) / currentPrice);

        if (shares > 0) {
          return {
            action: 'buy',
            ticker: stock.tickerSymbol,
            shares,
            confidence,
            reason: `High volatility: Buying near 24h low (${volatility.toFixed(2)}% range)`,
          };
        }
      }

      // Sell near high
      const holding = holdings.find((h) => h.tickerSymbol === stock.tickerSymbol);
      if (holding && pricePosition > 0.7) {
        return {
          action: 'sell',
          ticker: stock.tickerSymbol,
          shares: Math.floor(holding.shares * 0.5),
          confidence: 0.65,
          reason: `High volatility: Selling near 24h high (${volatility.toFixed(2)}% range)`,
        };
      }
    }

    return {
      action: 'hold',
      ticker: stock.tickerSymbol,
      shares: 0,
      confidence: 0,
      reason: 'Low volatility or neutral position',
    };
  }

  /**
   * Pump Hunter strategy: Aggressively buy into pumping stocks
   * HIGH RISK - can make huge gains or lose big on dumps
   */
  private pumpHunterStrategy(stock: any, holdings: any[], cash: Decimal): TradingDecision {
    const changePercent = parseFloat(stock.changePercent);
    const volume = stock.volume24h;
    const trend = stock.trend;

    // Look for pump signals: rapid price increase with high volume
    if (changePercent > 3 && volume > 50 && trend === 'bullish') {
      // Aggressive buy - ride the pump
      const confidence = Math.min(0.95, 0.6 + changePercent / 20);
      const maxInvestment = cash.mul(0.25); // 25% of cash - aggressive
      const shares = Math.floor(Number(maxInvestment) / parseFloat(stock.currentPrice));

      if (shares > 0) {
        return {
          action: 'buy',
          ticker: stock.tickerSymbol,
          shares: Math.max(1, shares),
          confidence,
          reason: `PUMP DETECTED: +${changePercent.toFixed(2)}% surge, riding momentum!`,
        };
      }
    }

    // Exit quickly on any reversal
    const holding = holdings.find((h) => h.tickerSymbol === stock.tickerSymbol);
    if (holding && (changePercent < 0 || trend === 'bearish')) {
      return {
        action: 'sell',
        ticker: stock.tickerSymbol,
        shares: holding.shares, // Sell ALL to escape dump
        confidence: 0.9,
        reason: `PUMP EXIT: Momentum fading, dumping position`,
      };
    }

    // Also take profits at high gains
    if (holding && changePercent > 10) {
      return {
        action: 'sell',
        ticker: stock.tickerSymbol,
        shares: Math.floor(holding.shares * 0.7), // Take 70% profit
        confidence: 0.85,
        reason: `PUMP PROFIT: Taking gains at +${changePercent.toFixed(2)}%`,
      };
    }

    return {
      action: 'hold',
      ticker: stock.tickerSymbol,
      shares: 0,
      confidence: 0,
      reason: 'No pump signal',
    };
  }

  /**
   * Dump Catcher strategy: Buy crashed stocks expecting recovery
   * Conservative approach - waits for dust to settle
   */
  private dumpCatcherStrategy(stock: any, holdings: any[], cash: Decimal): TradingDecision {
    const changePercent = parseFloat(stock.changePercent);
    const currentPrice = parseFloat(stock.currentPrice);
    const low24h = parseFloat(stock.lowPrice24h);
    const high24h = parseFloat(stock.highPrice24h);

    // Calculate how far price has dropped from 24h high
    const dropFromHigh = high24h > 0 ? ((high24h - currentPrice) / high24h) * 100 : 0;
    // Calculate how close to 24h low
    const range = high24h - low24h;
    const positionInRange = range > 0 ? (currentPrice - low24h) / range : 0.5;

    // Look for dump that may have bottomed out
    // Price dropped significantly but showing signs of stabilization
    if (dropFromHigh > 15 && positionInRange < 0.3 && changePercent > -2) {
      // Cautious buy - might be near bottom
      const confidence = Math.min(0.7, 0.4 + dropFromHigh / 50);
      const maxInvestment = cash.mul(0.1); // Only 10% - conservative
      const shares = Math.floor(Number(maxInvestment) / currentPrice);

      if (shares > 0) {
        return {
          action: 'buy',
          ticker: stock.tickerSymbol,
          shares: Math.max(1, shares),
          confidence,
          reason: `DUMP CATCH: ${dropFromHigh.toFixed(1)}% off high, potential bottom`,
        };
      }
    }

    // Sell on recovery for profit
    const holding = holdings.find((h) => h.tickerSymbol === stock.tickerSymbol);
    if (holding && changePercent > 5 && positionInRange > 0.6) {
      return {
        action: 'sell',
        ticker: stock.tickerSymbol,
        shares: Math.floor(holding.shares * 0.5), // Sell half on recovery
        confidence: 0.65,
        reason: `DUMP RECOVERY: Stock recovering, taking partial profits`,
      };
    }

    return {
      action: 'hold',
      ticker: stock.tickerSymbol,
      shares: 0,
      confidence: 0,
      reason: 'No dump catch opportunity',
    };
  }

  /**
   * Check if a market event affects this stock
   */
  private getActiveEventForStock(tickerSymbol: string): MarketEvent | null {
    const now = new Date();
    // Clean up expired events
    this.activeEvents = this.activeEvents.filter(
      (e) => now.getTime() - e.startedAt.getTime() < e.duration
    );

    return this.activeEvents.find((e) => e.tickerSymbol === tickerSymbol) || null;
  }

  /**
   * Generate random market events (pumps, dumps, news)
   */
  private async generateMarketEvents(allStocks: any[]): Promise<void> {
    // 5% chance per cycle to generate a new event (roughly every 10 minutes on average)
    if (Math.random() > 0.05 || allStocks.length === 0) return;

    // Pick a random stock
    const randomStock = allStocks[Math.floor(Math.random() * allStocks.length)];
    if (!randomStock) return;

    // Already has an active event?
    if (this.getActiveEventForStock(randomStock.tickerSymbol)) return;

    // Determine event type with weighted probability
    const roll = Math.random();
    let eventType: MarketEvent['type'];
    let magnitude: number;
    let duration: number;

    if (roll < 0.25) {
      // 25% chance: PUMP (fast rise)
      eventType = 'pump';
      magnitude = 0.15 + Math.random() * 0.35; // 15-50% pump
      duration = 60000 + Math.random() * 180000; // 1-4 minutes
    } else if (roll < 0.50) {
      // 25% chance: DUMP (fast crash)
      eventType = 'dump';
      magnitude = 0.15 + Math.random() * 0.35; // 15-50% dump
      duration = 45000 + Math.random() * 120000; // 45sec-2.5min (dumps are faster)
    } else if (roll < 0.75) {
      // 25% chance: Good news (moderate rise)
      eventType = 'news_positive';
      magnitude = 0.05 + Math.random() * 0.15; // 5-20%
      duration = 120000 + Math.random() * 300000; // 2-7 minutes
    } else {
      // 25% chance: Bad news (moderate fall)
      eventType = 'news_negative';
      magnitude = 0.05 + Math.random() * 0.15; // 5-20%
      duration = 120000 + Math.random() * 300000; // 2-7 minutes
    }

    const event: MarketEvent = {
      tickerSymbol: randomStock.tickerSymbol,
      type: eventType,
      magnitude,
      startedAt: new Date(),
      duration,
    };

    this.activeEvents.push(event);
    console.log(`📈 MARKET EVENT: ${eventType.toUpperCase()} on ${randomStock.tickerSymbol} (${(magnitude * 100).toFixed(1)}% over ${(duration / 1000).toFixed(0)}s)`);

    // Apply immediate price impact for the event
    await this.applyEventPriceImpact(event);
  }

  /**
   * Apply price impact from a market event
   */
  private async applyEventPriceImpact(event: MarketEvent): Promise<void> {
    const { MarketDynamicsService } = await import('./marketDynamics.service');

    // Calculate per-tick impact based on event type
    const isPump = event.type === 'pump' || event.type === 'news_positive';
    const totalImpact = event.magnitude;

    // Apply impact as a series of trades to move price
    const impactShares = Math.floor(1000 + Math.random() * 5000); // Random trade size
    const stock = await prisma.botStock.findUnique({
      where: { tickerSymbol: event.tickerSymbol },
    });

    if (stock) {
      const pricePerShare = new Decimal(stock.currentPrice);
      await MarketDynamicsService.applyTradeImpact(
        event.tickerSymbol,
        isPump ? 'buy' : 'sell',
        impactShares,
        pricePerShare
      );
    } else {
      // Try player stock
      const playerStock = await prisma.playerStock.findFirst({
        where: { tickerSymbol: event.tickerSymbol },
      });
      if (playerStock) {
        const pricePerShare = new Decimal(playerStock.currentPrice);
        await MarketDynamicsService.applyTradeImpact(
          event.tickerSymbol,
          isPump ? 'buy' : 'sell',
          impactShares,
          pricePerShare
        );
      }
    }
  }

  /**
   * Portfolio rebalancing - bots take profits and cut losses
   */
  private async rebalancePortfolio(botUserId: string): Promise<void> {
    const now = new Date();
    if (now.getTime() - this.lastRebalanceTime.getTime() < BotTraderService.REBALANCE_INTERVAL_MS) {
      return; // Not time to rebalance yet
    }

    this.lastRebalanceTime = now;

    // Get bot's holdings
    const holdings = await prisma.stockHolding.findMany({
      where: { userId: botUserId, shares: { gt: 0 } },
      include: { botStock: true, playerStock: true },
    });

    for (const holding of holdings) {
      try {
        const stock = holding.botStock || holding.playerStock;
        if (!stock) continue;

        const currentPrice = new Decimal(stock.currentPrice);
        const avgBuyPrice = holding.avgBuyPrice;
        const profitPercent = currentPrice.sub(avgBuyPrice).div(avgBuyPrice).mul(100).toNumber();

        // Take profits on big winners (>25% gain)
        if (profitPercent > 25 && holding.shares > 1) {
          const sharesToSell = Math.floor(holding.shares * 0.3); // Sell 30%
          if (sharesToSell > 0) {
            try {
              await stockService.sellShares(botUserId, stock.tickerSymbol, sharesToSell);
              console.log(`📊 REBALANCE: Took profits on ${stock.tickerSymbol} (+${profitPercent.toFixed(1)}%)`);
            } catch (e) {
              // Ignore sell errors
            }
          }
        }

        // Cut losses on big losers (>20% loss)
        if (profitPercent < -20 && holding.shares > 1) {
          const sharesToSell = Math.floor(holding.shares * 0.5); // Sell 50%
          if (sharesToSell > 0) {
            try {
              await stockService.sellShares(botUserId, stock.tickerSymbol, sharesToSell);
              console.log(`📉 REBALANCE: Cut losses on ${stock.tickerSymbol} (${profitPercent.toFixed(1)}%)`);
            } catch (e) {
              // Ignore sell errors
            }
          }
        }
      } catch (error) {
        // Continue with next holding
      }
    }
  }

  /**
   * Check if bot can trade based on its individual interval
   */
  private canBotTrade(bot: BotTrader): boolean {
    const lastTrade = this.botLastTradeTime.get(bot.id);
    if (!lastTrade) return true;

    const elapsed = Date.now() - lastTrade.getTime();
    return elapsed >= bot.tradeIntervalMs;
  }

  /**
   * Record that bot made a trade
   */
  private recordBotTrade(bot: BotTrader): void {
    this.botLastTradeTime.set(bot.id, new Date());
  }

  /**
   * Execute a trading decision
   */
  private async executeTrade(
    botUserId: string,
    decision: TradingDecision,
    stock: any,
    availableCash: Decimal
  ): Promise<boolean> {
    try {
      if (decision.action === 'buy' && decision.shares > 0) {
        // Pre-validate cash before attempting buy to reduce exception overhead
        const totalCost = new Decimal(stock.currentPrice).mul(decision.shares);
        if (availableCash.lessThan(totalCost)) {
          // Reduce shares to what we can afford
          const affordableShares = Math.floor(availableCash.div(stock.currentPrice).toNumber());
          if (affordableShares <= 0) {
            return false;
          }
          decision.shares = affordableShares;
        }
        await stockService.buyShares(botUserId, decision.ticker, decision.shares);
        return true;
      } else if (decision.action === 'sell' && decision.shares > 0) {
        // Pre-validate holdings before attempting sell to reduce exception overhead
        const portfolio = await stockService.getPortfolio(botUserId);
        const holding = portfolio.find(h => h.tickerSymbol === decision.ticker);
        if (!holding || holding.shares <= 0) {
          return false; // Don't have shares to sell
        }
        // Adjust shares if trying to sell more than we have
        const sharesToSell = Math.min(decision.shares, holding.shares);
        if (sharesToSell <= 0) {
          return false;
        }
        await stockService.sellShares(botUserId, decision.ticker, sharesToSell);
        return true;
      }
      return false;
    } catch (error) {
      // Only log unexpected errors, not validation errors
      if (error instanceof Error && !error.message.includes('Not enough shares')) {
        console.error(`Bot trade failed for ${decision.ticker}:`, error);
      }
      return false;
    }
  }

  /**
   * Run bot trading algorithm - Enhanced with variable intervals, market events, and rebalancing
   */
  async runBotTrading(): Promise<void> {
    try {
      const botUserId = await this.getBotUser();
      const botTraders = this.getBotTraders();

      // Get all stocks (bot and player)
      const botStocks = await prisma.botStock.findMany({
        where: { isActive: true },
      });
      const playerStocks = await prisma.playerStock.findMany({
        where: { isListed: true },
      });

      // Get bot's current portfolio
      const portfolio = await stockService.getPortfolio(botUserId);
      const stats = await prisma.playerStats.findUnique({
        where: { userId: botUserId },
      });

      if (!stats) {
        return;
      }

      const cash = new Decimal(stats.cash);

      // Get all market stocks (bot + player)
      const marketStocks = await stockService.getMarketStocks();
      const allStocks = marketStocks;

      // === GENERATE MARKET EVENTS (pumps, dumps, news) ===
      await this.generateMarketEvents(allStocks);

      // === PORTFOLIO REBALANCING ===
      await this.rebalancePortfolio(botUserId);

      // === CONTINUE EXISTING MARKET EVENTS ===
      for (const event of this.activeEvents) {
        const elapsed = Date.now() - event.startedAt.getTime();
        if (elapsed < event.duration) {
          // Event is still active - apply ongoing price pressure
          await this.applyEventPriceImpact(event);
        }
      }

      // Low cash threshold adjusted for minimum activity
      if (cash.lessThan(500)) {
        return;
      }

      // Track trades for activity
      let tradesExecuted = 0;
      let remainingCash = cash;

      // === EACH BOT TRADES BASED ON ITS OWN INTERVAL ===
      for (const bot of botTraders) {
        // Check if this bot can trade based on its individual interval
        if (!this.canBotTrade(bot)) {
          continue; // This bot traded too recently
        }

        // Refresh portfolio data for each bot
        const currentPortfolio = await stockService.getPortfolio(botUserId);
        const currentStats = await prisma.playerStats.findUnique({
          where: { userId: botUserId },
        });
        if (currentStats) {
          remainingCash = new Decimal(currentStats.cash);
        }

        // Check if bot wants to trade (based on aggressiveness)
        // Aggressive bots have higher trade probability
        const tradeProbability = bot.aggressiveness * (bot.personality === 'aggressive' ? 1.8 : bot.personality === 'conservative' ? 0.7 : 1.2);
        const shouldTrade = Math.random() < tradeProbability;
        if (!shouldTrade) {
          continue;
        }

        // Allocate cash based on bot personality and position size multiplier
        const baseCashAllocation = bot.personality === 'aggressive' ? 0.25 : bot.personality === 'conservative' ? 0.08 : 0.15;
        const botCash = remainingCash.mul(baseCashAllocation * bot.positionSizeMultiplier);
        const botHoldings = currentPortfolio;

        // Sector rotation with personality-based variety
        const randomOffset = Math.floor(Math.random() * 5);
        const rotationSpeed = bot.personality === 'aggressive' ? 15 : bot.personality === 'conservative' ? 60 : 30;
        const sectorRotation = (Math.floor(Date.now() / (rotationSpeed * 1000)) + randomOffset) % 5;
        const focusSectors = ['tech', 'finance', 'energy', 'consumer', 'healthcare'] as const;
        const currentFocusSector = focusSectors[sectorRotation] ?? 'tech';

        // Sort stocks - prioritize stocks with active events for aggressive bots
        const sortedStocks = [...allStocks].sort((a, b) => {
          // Event bonus (aggressive bots hunt events)
          const aEvent = this.getActiveEventForStock(a.tickerSymbol);
          const bEvent = this.getActiveEventForStock(b.tickerSymbol);
          const aEventScore = aEvent && bot.personality === 'aggressive' ? 2 : 0;
          const bEventScore = bEvent && bot.personality === 'aggressive' ? 2 : 0;

          // Sector bonus
          const aInFocus = a.sector?.toLowerCase().includes(currentFocusSector) ? 1 : 0;
          const bInFocus = b.sector?.toLowerCase().includes(currentFocusSector) ? 1 : 0;

          return (bEventScore + bInFocus) - (aEventScore + aInFocus);
        });

        for (const stock of sortedStocks) {
          if (!stock.currentPrice || parseFloat(stock.currentPrice) <= 0) continue;

          // Check for active market event on this stock
          const activeEvent = this.getActiveEventForStock(stock.tickerSymbol);
          const eventBonus = activeEvent ? 0.3 : 0; // 30% confidence bonus for event stocks

          const isFocusSector = stock.sector?.toLowerCase().includes(currentFocusSector) ?? false;
          const sectorBonus = isFocusSector ? 0.15 : 0;

          // Get stock detail
          let stockDetail: any = null;
          if (stock.stockType === 'bot') {
            stockDetail = botStocks.find((s) => s.tickerSymbol === stock.tickerSymbol);
          } else {
            stockDetail = playerStocks.find((s) => s.tickerSymbol === stock.tickerSymbol);
          }

          // Get decision based on strategy
          let decision: TradingDecision;
          switch (bot.strategy) {
            case 'momentum':
              decision = this.momentumStrategy(stock, botHoldings, botCash);
              break;
            case 'mean_reversion': {
              const basePrice =
                stock.stockType === 'bot' && stockDetail?.basePrice
                  ? stockDetail.basePrice.toString()
                  : stock.previousClose;
              decision = this.meanReversionStrategy({ ...stock, basePrice }, botHoldings, botCash);
              break;
            }
            case 'contrarian':
              decision = this.contrarianStrategy(stock, botHoldings, botCash);
              break;
            case 'trend_following': {
              const trendStrength = stockDetail?.trendStrength || 1;
              decision = this.trendFollowingStrategy(
                { ...stock, trendStrength },
                botHoldings,
                botCash
              );
              break;
            }
            case 'volatility':
              decision = this.volatilityStrategy(stock, botHoldings, botCash);
              break;
            case 'pump_hunter':
              decision = this.pumpHunterStrategy(stock, botHoldings, botCash);
              break;
            case 'dump_catcher':
              decision = this.dumpCatcherStrategy(stock, botHoldings, botCash);
              break;
            default:
              continue;
          }

          // Apply bonuses to confidence
          const adjustedConfidence = Math.min(1, decision.confidence + sectorBonus + eventBonus);

          // Confidence threshold varies by personality
          const confidenceThreshold = bot.personality === 'aggressive' ? 0.25 : bot.personality === 'conservative' ? 0.5 : 0.35;

          // Execute trade if confidence is high enough
          if (decision.action !== 'hold' && adjustedConfidence >= confidenceThreshold) {
            // Execution probability based on adjusted confidence
            if (Math.random() < adjustedConfidence) {
              // Apply position size multiplier to shares
              const adjustedShares = Math.max(1, Math.floor(decision.shares * bot.positionSizeMultiplier));
              decision.shares = adjustedShares;

              const success = await this.executeTrade(botUserId, decision, stock, botCash);

              if (success) {
                tradesExecuted++;
                this.recordBotTrade(bot); // Record this bot's trade time

                // Aggressive bots might make multiple trades per cycle
                if (bot.personality !== 'aggressive' || tradesExecuted >= 3) {
                  break; // Move to next bot (unless aggressive and under trade limit)
                }
              }
            }
          }
        }

        // === PLAYER STOCK TARGETING ===
        // Bots specifically target player stocks for activity
        if (playerStocks.length > 0) {
          // Aggressive bots target player stocks more often
          const playerTargetChance = bot.personality === 'aggressive' ? 0.8 : bot.personality === 'conservative' ? 0.3 : 0.5;

          if (Math.random() < playerTargetChance) {
            const randomPlayer = playerStocks[Math.floor(Math.random() * playerStocks.length)];
            if (!randomPlayer) continue;

            const marketStock = allStocks.find((s) => s.tickerSymbol === randomPlayer.tickerSymbol);

            if (marketStock && marketStock.currentPrice && parseFloat(marketStock.currentPrice) > 0) {
              const previousClose = parseFloat(marketStock.previousClose);
              const currentPrice = parseFloat(marketStock.currentPrice);
              const diffPct = previousClose > 0 ? (currentPrice - previousClose) / previousClose : 0;

              let action: 'buy' | 'sell' | 'hold' = 'hold';
              let confidence = 0.4;
              let shares = 0;

              // Different thresholds based on personality
              const buyThreshold = bot.personality === 'aggressive' ? -0.02 : bot.personality === 'conservative' ? -0.08 : -0.05;
              const sellThreshold = bot.personality === 'aggressive' ? 0.02 : bot.personality === 'conservative' ? 0.08 : 0.05;

              if (diffPct < buyThreshold) {
                action = 'buy';
                const buyAmount = bot.personality === 'aggressive' ? 15 : bot.personality === 'conservative' ? 30 : 20;
                shares = Math.max(1, Math.floor(Number(botCash.div(buyAmount).toNumber()) / currentPrice));
                confidence = bot.personality === 'aggressive' ? 0.7 : 0.5;
              } else if (diffPct > sellThreshold) {
                const holding = botHoldings.find((h) => h.tickerSymbol === marketStock.tickerSymbol);
                if (holding && holding.shares > 0) {
                  action = 'sell';
                  const sellPct = bot.personality === 'aggressive' ? 0.5 : bot.personality === 'conservative' ? 0.2 : 0.3;
                  shares = Math.max(1, Math.floor(holding.shares * sellPct));
                  confidence = bot.personality === 'aggressive' ? 0.7 : 0.5;
                }
              }

              if (action !== 'hold' && shares > 0) {
                const decision: TradingDecision = {
                  action,
                  ticker: marketStock.tickerSymbol,
                  shares: Math.floor(shares * bot.positionSizeMultiplier),
                  confidence,
                  reason: action === 'buy'
                    ? `${bot.name}: Buying player stock dip`
                    : `${bot.name}: Taking profits on player stock`,
                };

                const success = await this.executeTrade(botUserId, decision, marketStock, botCash);
                if (success) {
                  tradesExecuted++;
                  this.recordBotTrade(bot);
                }
              }
            }
          }
        }
      }

      // === FALLBACK TRADE for activity ===
      const finalStats = await prisma.playerStats.findUnique({
        where: { userId: botUserId },
      });
      const finalCash = finalStats ? new Decimal(finalStats.cash) : cash;

      if (tradesExecuted === 0 && finalCash.greaterThan(1000)) {
        const affordable = allStocks.filter((s) => {
          const price = parseFloat(s.currentPrice);
          return price > 0 && price * 5 <= Number(finalCash);
        });

        if (affordable.length > 0) {
          const pick = affordable[Math.floor(Math.random() * affordable.length)];
          if (pick) {
            const price = parseFloat(pick.currentPrice);
            const maxBudget = Number(finalCash) * 0.03; // 3% of cash
            const shares = Math.max(1, Math.floor(maxBudget / price));

            const totalCost = price * shares;
            if (Number(finalCash) >= totalCost) {
              try {
                await stockService.buyShares(botUserId, pick.tickerSymbol, shares);
              } catch (error) {
                console.error('Fallback bot trade failed:', error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Bot trading error:', error);
    }
  }

  /**
   * Get active market events (for external monitoring)
   */
  getActiveEvents(): MarketEvent[] {
    const now = new Date();
    return this.activeEvents.filter(
      (e) => now.getTime() - e.startedAt.getTime() < e.duration
    );
  }
}

export const botTraderService = new BotTraderService();
