import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import { stockService } from './stock.service';

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
      botUser = await prisma.user.create({
        data: {
          id: BotTraderService.BOT_USER_ID,
          email: 'bot-trader@system.local',
          username: 'BotTrader',
          password: 'system-bot-no-login', // Can't login
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
  private momentumStrategy(
    stock: any,
    holdings: any[],
    cash: Decimal
  ): TradingDecision {
    const changePercent = parseFloat(stock.changePercent);
    const trend = stock.trend;
    const volume = stock.volume24h;

    // Strong momentum signals
    if (changePercent > 2 && trend === 'bullish' && volume > 1000) {
      const confidence = Math.min(0.9, changePercent / 5);
      const maxInvestment = cash.mul(0.15); // 15% of cash
      const shares = Math.floor(Number(maxInvestment) / parseFloat(stock.currentPrice));
      
      if (shares > 0) {
        return {
          action: 'buy',
          ticker: stock.tickerSymbol,
          shares,
          confidence,
          reason: `Strong momentum: +${changePercent.toFixed(2)}% with bullish trend`,
        };
      }
    }

    // Sell if momentum reverses
    const holding = holdings.find((h) => h.tickerSymbol === stock.tickerSymbol);
    if (holding && changePercent < -3 && trend === 'bearish') {
      return {
        action: 'sell',
        ticker: stock.tickerSymbol,
        shares: Math.floor(holding.shares * 0.5), // Sell 50%
        confidence: 0.7,
        reason: `Momentum reversal: ${changePercent.toFixed(2)}% with bearish trend`,
      };
    }

    return { action: 'hold', ticker: stock.tickerSymbol, shares: 0, confidence: 0, reason: 'No strong signal' };
  }

  /**
   * Mean reversion strategy: Buy when price is below base, sell when above
   */
  private meanReversionStrategy(
    stock: any,
    holdings: any[],
    cash: Decimal
  ): TradingDecision {
    if (stock.stockType !== 'bot' || !stock.basePrice) {
      return { action: 'hold', ticker: stock.tickerSymbol, shares: 0, confidence: 0, reason: 'No base price' };
    }

    const currentPrice = parseFloat(stock.currentPrice);
    const basePrice = parseFloat(stock.basePrice);
    const deviation = (currentPrice - basePrice) / basePrice;

    // Buy when significantly below base (oversold)
    if (deviation < -0.1 && currentPrice > 0) {
      const confidence = Math.min(0.8, Math.abs(deviation) * 2);
      const maxInvestment = cash.mul(0.2);
      const shares = Math.floor(Number(maxInvestment) / currentPrice);
      
      if (shares > 0) {
        return {
          action: 'buy',
          ticker: stock.tickerSymbol,
          shares,
          confidence,
          reason: `Oversold: ${(deviation * 100).toFixed(2)}% below base price`,
        };
      }
    }

    // Sell when significantly above base (overbought)
    const holding = holdings.find((h) => h.tickerSymbol === stock.tickerSymbol);
    if (holding && deviation > 0.15) {
      return {
        action: 'sell',
        ticker: stock.tickerSymbol,
        shares: Math.floor(holding.shares * 0.6),
        confidence: 0.75,
        reason: `Overbought: ${(deviation * 100).toFixed(2)}% above base price`,
      };
    }

    return { action: 'hold', ticker: stock.tickerSymbol, shares: 0, confidence: 0, reason: 'Price near base' };
  }

  /**
   * Contrarian strategy: Buy when others are selling, sell when others are buying
   */
  private contrarianStrategy(
    stock: any,
    holdings: any[],
    cash: Decimal
  ): TradingDecision {
    const changePercent = parseFloat(stock.changePercent);
    const volume = stock.volume24h;

    // Buy on heavy selling (negative sentiment)
    if (changePercent < -5 && volume > 500) {
      const confidence = Math.min(0.7, Math.abs(changePercent) / 10);
      const maxInvestment = cash.mul(0.12);
      const shares = Math.floor(Number(maxInvestment) / parseFloat(stock.currentPrice));
      
      if (shares > 0) {
        return {
          action: 'buy',
          ticker: stock.tickerSymbol,
          shares,
          confidence,
          reason: `Contrarian buy: Heavy selling at ${changePercent.toFixed(2)}%`,
        };
      }
    }

    // Sell on heavy buying (positive sentiment)
    const holding = holdings.find((h) => h.tickerSymbol === stock.tickerSymbol);
    if (holding && changePercent > 8 && volume > 1000) {
      return {
        action: 'sell',
        ticker: stock.tickerSymbol,
        shares: Math.floor(holding.shares * 0.4),
        confidence: 0.65,
        reason: `Contrarian sell: Heavy buying at ${changePercent.toFixed(2)}%`,
      };
    }

    return { action: 'hold', ticker: stock.tickerSymbol, shares: 0, confidence: 0, reason: 'No contrarian signal' };
  }

  /**
   * Trend following strategy: Follow the trend, buy uptrends, sell downtrends
   */
  private trendFollowingStrategy(
    stock: any,
    holdings: any[],
    cash: Decimal
  ): TradingDecision {
    const trend = stock.trend;
    const trendStrength = stock.trendStrength || 1;
    const changePercent = parseFloat(stock.changePercent);

    // Strong uptrend
    if (trend === 'bullish' && trendStrength >= 3 && changePercent > 0) {
      const confidence = Math.min(0.85, 0.5 + trendStrength * 0.1);
      const maxInvestment = cash.mul(0.18);
      const shares = Math.floor(Number(maxInvestment) / parseFloat(stock.currentPrice));
      
      if (shares > 0) {
        return {
          action: 'buy',
          ticker: stock.tickerSymbol,
          shares,
          confidence,
          reason: `Strong uptrend: ${trend} with strength ${trendStrength}`,
        };
      }
    }

    // Strong downtrend - exit position
    const holding = holdings.find((h) => h.tickerSymbol === stock.tickerSymbol);
    if (holding && trend === 'bearish' && trendStrength >= 3) {
      return {
        action: 'sell',
        ticker: stock.tickerSymbol,
        shares: Math.floor(holding.shares * 0.7),
        confidence: 0.8,
        reason: `Strong downtrend: ${trend} with strength ${trendStrength}`,
      };
    }

    return { action: 'hold', ticker: stock.tickerSymbol, shares: 0, confidence: 0, reason: 'Weak or neutral trend' };
  }

  /**
   * Volatility strategy: Trade on high volatility
   */
  private volatilityStrategy(
    stock: any,
    holdings: any[],
    cash: Decimal
  ): TradingDecision {
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

    return { action: 'hold', ticker: stock.tickerSymbol, shares: 0, confidence: 0, reason: 'Low volatility or neutral position' };
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
    const botUserId = await this.getBotUser();
    const botTraders = this.getBotTraders();

    // Get all bot stocks
    const stocks = await prisma.botStock.findMany({
      where: { isActive: true },
    });

    // Get bot's current portfolio
    const portfolio = await stockService.getPortfolio(botUserId);
    const stats = await prisma.playerStats.findUnique({
      where: { userId: botUserId },
    });

    if (!stats) return;

    const cash = new Decimal(stats.cash);
    const totalValue = portfolio.reduce((sum, h) => sum + parseFloat(h.currentValue), 0) + Number(cash);

    // Convert stocks to market data format
    const marketStocks = await stockService.getMarketStocks();
    const botStocks = marketStocks.filter((s) => s.stockType === 'bot');

    // Each bot trader makes decisions
    for (const bot of botTraders) {
      // Check if bot should trade (based on aggressiveness and time since last trade)
      const shouldTrade = Math.random() < bot.aggressiveness;
      if (!shouldTrade) continue;

      // Allocate portion of portfolio to this bot
      const botCash = cash.mul(0.2); // Each bot gets 20% of total cash
      const botHoldings = portfolio.filter((h) => 
        botStocks.some((s) => s.tickerSymbol === h.tickerSymbol)
      );

      // Evaluate each stock
      for (const stock of botStocks) {
        const stockDetail = stocks.find((s) => s.tickerSymbol === stock.tickerSymbol);
        if (!stockDetail) continue;

        // Get decision based on strategy
        let decision: TradingDecision;
        switch (bot.strategy) {
          case 'momentum':
            decision = this.momentumStrategy(stock, botHoldings, botCash);
            break;
          case 'mean_reversion':
            decision = this.meanReversionStrategy({ ...stock, basePrice: stockDetail.basePrice.toString() }, botHoldings, botCash);
            break;
          case 'contrarian':
            decision = this.contrarianStrategy(stock, botHoldings, botCash);
            break;
          case 'trend_following':
            decision = this.trendFollowingStrategy({ ...stock, trendStrength: stockDetail.trendStrength }, botHoldings, botCash);
            break;
          case 'volatility':
            decision = this.volatilityStrategy(stock, botHoldings, botCash);
            break;
          default:
            continue;
        }

        // Execute trade if confidence is high enough
        if (decision.action !== 'hold' && decision.confidence >= 0.5 && Math.random() < decision.confidence) {
          await this.executeTrade(botUserId, decision, stock);
          
          // Log the trade
          console.log(`[${bot.name}] ${decision.action.toUpperCase()} ${decision.shares} shares of ${decision.ticker}: ${decision.reason}`);
        }
      }
    }
  }
}

export const botTraderService = new BotTraderService();

