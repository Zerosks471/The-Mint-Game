import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import bcrypt from 'bcrypt';
import { stockService } from './stock.service';

const SALT_ROUNDS = 10;

interface BotTrader {
  id: string;
  name: string;
  strategy: 'momentum' | 'mean_reversion' | 'contrarian' | 'trend_following' | 'volatility';
  aggressiveness: number; // 0-1, how often they trade
  cash: Decimal;
  riskTolerance: number; // 0-1, how much they're willing to risk
  lastTradeAt: Date | null;
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
          cash: 1000000, // $1M starting capital
        },
      });
    }

    return botUser.id;
  }

  /**
   * Create different bot traders with different strategies
   */
  private getBotTraders(): BotTrader[] {
    return [
      {
        id: 'momentum-bot',
        name: 'Momentum Bot',
        strategy: 'momentum',
        aggressiveness: 0.7,
        cash: new Decimal(200000),
        riskTolerance: 0.6,
        lastTradeAt: null,
      },
      {
        id: 'mean-reversion-bot',
        name: 'Mean Reversion Bot',
        strategy: 'mean_reversion',
        aggressiveness: 0.5,
        cash: new Decimal(200000),
        riskTolerance: 0.4,
        lastTradeAt: null,
      },
      {
        id: 'contrarian-bot',
        name: 'Contrarian Bot',
        strategy: 'contrarian',
        aggressiveness: 0.4,
        cash: new Decimal(200000),
        riskTolerance: 0.5,
        lastTradeAt: null,
      },
      {
        id: 'trend-bot',
        name: 'Trend Following Bot',
        strategy: 'trend_following',
        aggressiveness: 0.6,
        cash: new Decimal(200000),
        riskTolerance: 0.5,
        lastTradeAt: null,
      },
      {
        id: 'volatility-bot',
        name: 'Volatility Bot',
        strategy: 'volatility',
        aggressiveness: 0.8,
        cash: new Decimal(200000),
        riskTolerance: 0.7,
        lastTradeAt: null,
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
   * Execute a trading decision
   */
  private async executeTrade(
    botUserId: string,
    decision: TradingDecision,
    stock: any
  ): Promise<boolean> {
    try {
      if (decision.action === 'buy' && decision.shares > 0) {
        await stockService.buyShares(botUserId, decision.ticker, decision.shares);
        return true;
      } else if (decision.action === 'sell' && decision.shares > 0) {
        await stockService.sellShares(botUserId, decision.ticker, decision.shares);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Bot trade failed for ${decision.ticker}:`, error);
      return false;
    }
  }

  /**
   * Run bot trading algorithm
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
      if (cash.lessThan(1000)) {
        return;
      }

      // Get all market stocks (bot + player)
      const marketStocks = await stockService.getMarketStocks();
      const allStocks = marketStocks; // Include both bot and player stocks

      // Each bot trader makes decisions
      // Increase trading frequency - each bot has a higher chance to trade
      let tradesExecuted = 0; // Track total trades across all bots
      for (const bot of botTraders) {
        // Increased aggressiveness - bots trade more often
        const shouldTrade = Math.random() < bot.aggressiveness * 1.5; // 50% more aggressive
        if (!shouldTrade) {
          continue;
        }

        // Allocate portion of portfolio to this bot
        const botCash = cash.mul(0.2); // Each bot gets 20% of total cash
        const botHoldings = portfolio; // All holdings

        // Sector rotation - bots focus on different sectors each cycle
        const sectorRotation = Math.floor(Date.now() / (30 * 1000)) % 5; // Rotate every 30 seconds
        const focusSectors = ['tech', 'finance', 'energy', 'consumer', 'healthcare'];
        const currentFocusSector = focusSectors[sectorRotation];

        // Evaluate each stock (both bot and player stocks)
        // Prioritize stocks in the current focus sector for more concentrated trading
        const sortedStocks = [...allStocks].sort((a, b) => {
          const aInFocus = a.sector?.toLowerCase().includes(currentFocusSector) ? 1 : 0;
          const bInFocus = b.sector?.toLowerCase().includes(currentFocusSector) ? 1 : 0;
          return bInFocus - aInFocus; // Focus sector stocks first
        });

        for (const stock of sortedStocks) {
          // Skip if stock has no price or invalid data
          if (!stock.currentPrice || parseFloat(stock.currentPrice) <= 0) continue;

          // Sector focus bonus - bots are more likely to trade in focus sector
          const isFocusSector = stock.sector?.toLowerCase().includes(currentFocusSector);
          const sectorBonus = isFocusSector ? 0.2 : 0; // 20% confidence bonus for focus sector

          // Get stock detail for additional data
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
              // Mean reversion works for bot stocks (with basePrice) and player stocks (use previousClose as base)
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
            default:
              continue;
          }

          // Apply sector bonus to confidence
          const adjustedConfidence = Math.min(1, decision.confidence + sectorBonus);

          // Execute trade if confidence is high enough (lowered threshold to 0.35 for more trading)
          if (decision.action !== 'hold' && adjustedConfidence >= 0.35) {
            // Use confidence as probability of executing
            if (Math.random() < adjustedConfidence) {
              const success = await this.executeTrade(botUserId, decision, stock);

              if (success) {
                tradesExecuted++;
              }
            }
          }
        }

        // Extra: specifically target player stocks sometimes so names like TESS get real activity
        if (playerStocks.length > 0 && Math.random() < 0.6) {
          const randomPlayer = playerStocks[Math.floor(Math.random() * playerStocks.length)];
          const marketStock = allStocks.find(
            (s) => s.tickerSymbol === randomPlayer.tickerSymbol
          );

          if (marketStock && marketStock.currentPrice && parseFloat(marketStock.currentPrice) > 0) {
            // Simple mean-reversion style decision for player stocks
            const previousClose = parseFloat(marketStock.previousClose);
            const currentPrice = parseFloat(marketStock.currentPrice);
            const diffPct = (currentPrice - previousClose) / previousClose;

            let action: 'buy' | 'sell' | 'hold' = 'hold';
            let confidence = 0.4;
            let shares = 0;

            if (diffPct < -0.05) {
              // Dropped a lot -> buy the dip
              action = 'buy';
              shares = Math.max(1, Math.floor(Number(botCash.div(20).toNumber()) / currentPrice));
              confidence = 0.6;
            } else if (diffPct > 0.05) {
              // Up a lot and we hold some -> take profit
              const holding = botHoldings.find(
                (h) => h.tickerSymbol === marketStock.tickerSymbol
              );
              if (holding && holding.shares > 0) {
                action = 'sell';
                shares = Math.max(1, Math.floor(holding.shares * 0.25));
                confidence = 0.6;
              }
            }

            if (action !== 'hold' && shares > 0) {
              const decision: TradingDecision = {
                action,
                ticker: marketStock.tickerSymbol,
                shares,
                confidence,
                reason:
                  action === 'buy'
                    ? 'Buying discounted player stock'
                    : 'Taking profits on strong player stock',
              };

              const success = await this.executeTrade(botUserId, decision, marketStock);
              if (success) {
                tradesExecuted++;
              }
            }
          }
        }
      }
    } catch (error) {
      // Silently handle errors
    }
  }
}

export const botTraderService = new BotTraderService();
