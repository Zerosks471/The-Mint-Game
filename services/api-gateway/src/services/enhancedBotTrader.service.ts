import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import { circuitBreakerService } from './circuitBreaker.service';
import { marketEventService } from './marketEvent.service';
import { stockService } from './stock.service';

// Bot configuration interface
interface TradingBot {
  id: string;
  name: string;
  botType: 'market_maker' | 'whale' | 'news_reactive' | 'sentiment';
  strategy: string;
  personality: 'aggressive' | 'moderate' | 'conservative';
  cash: Decimal;
  initialCash: Decimal;
  riskTolerance: number; // 0-1
  tradeIntervalMs: number;
  positionSizeMultiplier: number;
  sectorFocus: string[];
}

// Trading decision interface
interface TradingDecision {
  action: 'buy' | 'sell' | 'hold';
  ticker: string;
  shares: number;
  confidence: number;
  reason: string;
}

export class EnhancedBotTraderService {
  // Bot configuration constants
  private static readonly MARKET_MAKER_CAPITAL = new Decimal(10_000_000); // $10M each
  private static readonly WHALE_CAPITAL = new Decimal(6_000_000); // $6M each
  private static readonly NEWS_REACTIVE_CAPITAL = new Decimal(750_000); // $750K each
  private static readonly SENTIMENT_CAPITAL = new Decimal(1_000_000); // $1M each

  // Total capital deployed: $80M
  // Market Makers: 5 x $10M = $50M
  // Whales: 3 x $6M = $18M
  // News-Reactive: 8 x $750K = $6M
  // Sentiment: 6 x $1M = $6M

  /**
   * Bot configurations (22 total bots)
   */
  private static readonly BOT_CONFIGS: Omit<TradingBot, 'cash' | 'initialCash'>[] = [
    // ========== MARKET MAKERS (5 bots) - $50M total ==========
    // Stabilize prices, provide liquidity, counter extreme moves
    {
      id: 'mm-stabilizer-1',
      name: 'Stability Anchor',
      botType: 'market_maker',
      strategy: 'mean_reversion',
      personality: 'conservative',
      riskTolerance: 0.3,
      tradeIntervalMs: 45000, // 45 seconds
      positionSizeMultiplier: 1.5,
      sectorFocus: [], // All sectors
    },
    {
      id: 'mm-liquidity-1',
      name: 'Liquidity Provider',
      botType: 'market_maker',
      strategy: 'market_making',
      personality: 'conservative',
      riskTolerance: 0.25,
      tradeIntervalMs: 30000, // 30 seconds
      positionSizeMultiplier: 1.2,
      sectorFocus: [],
    },
    {
      id: 'mm-countertrend-1',
      name: 'Contrarian Stabilizer',
      botType: 'market_maker',
      strategy: 'contrarian',
      personality: 'conservative',
      riskTolerance: 0.35,
      tradeIntervalMs: 60000, // 60 seconds
      positionSizeMultiplier: 1.8,
      sectorFocus: [],
    },
    {
      id: 'mm-balanced-1',
      name: 'Market Balancer',
      botType: 'market_maker',
      strategy: 'mean_reversion',
      personality: 'conservative',
      riskTolerance: 0.3,
      tradeIntervalMs: 50000, // 50 seconds
      positionSizeMultiplier: 1.4,
      sectorFocus: [],
    },
    {
      id: 'mm-spread-1',
      name: 'Spread Arbitrageur',
      botType: 'market_maker',
      strategy: 'volatility',
      personality: 'conservative',
      riskTolerance: 0.28,
      tradeIntervalMs: 40000, // 40 seconds
      positionSizeMultiplier: 1.3,
      sectorFocus: [],
    },

    // ========== WHALES (3 bots) - $18M total ==========
    // Large occasional trades, sector specialization
    {
      id: 'whale-tech-1',
      name: 'Tech Titan',
      botType: 'whale',
      strategy: 'accumulation',
      personality: 'moderate',
      riskTolerance: 0.6,
      tradeIntervalMs: 3_600_000, // 1 hour (2-5 trades per day)
      positionSizeMultiplier: 5.0, // Very large positions
      sectorFocus: ['tech'],
    },
    {
      id: 'whale-finance-1',
      name: 'Wall Street Whale',
      botType: 'whale',
      strategy: 'accumulation',
      personality: 'moderate',
      riskTolerance: 0.55,
      tradeIntervalMs: 4_320_000, // 1.2 hours
      positionSizeMultiplier: 4.5,
      sectorFocus: ['finance'],
    },
    {
      id: 'whale-diversified-1',
      name: 'The Leviathan',
      botType: 'whale',
      strategy: 'trend_following',
      personality: 'moderate',
      riskTolerance: 0.65,
      tradeIntervalMs: 3_000_000, // 50 minutes
      positionSizeMultiplier: 5.5,
      sectorFocus: ['energy', 'industrial'],
    },

    // ========== NEWS-REACTIVE (8 bots) - $6M total ==========
    // React to MarketEvent entries - 4 trend followers, 4 contrarians

    // Trend Followers (4 bots)
    {
      id: 'news-follower-1',
      name: 'News Momentum Trader',
      botType: 'news_reactive',
      strategy: 'trend_following',
      personality: 'aggressive',
      riskTolerance: 0.85,
      tradeIntervalMs: 8000, // 8 seconds
      positionSizeMultiplier: 2.0,
      sectorFocus: [],
    },
    {
      id: 'news-follower-2',
      name: 'Event Chaser',
      botType: 'news_reactive',
      strategy: 'momentum',
      personality: 'aggressive',
      riskTolerance: 0.9,
      tradeIntervalMs: 10000, // 10 seconds
      positionSizeMultiplier: 2.2,
      sectorFocus: [],
    },
    {
      id: 'news-follower-3',
      name: 'Headline Hunter',
      botType: 'news_reactive',
      strategy: 'trend_following',
      personality: 'aggressive',
      riskTolerance: 0.82,
      tradeIntervalMs: 12000, // 12 seconds
      positionSizeMultiplier: 1.8,
      sectorFocus: [],
    },
    {
      id: 'news-follower-4',
      name: 'Catalyst Rider',
      botType: 'news_reactive',
      strategy: 'momentum',
      personality: 'aggressive',
      riskTolerance: 0.88,
      tradeIntervalMs: 15000, // 15 seconds
      positionSizeMultiplier: 2.1,
      sectorFocus: [],
    },

    // Contrarians (4 bots)
    {
      id: 'news-contrarian-1',
      name: 'Event Contrarian',
      botType: 'news_reactive',
      strategy: 'contrarian',
      personality: 'aggressive',
      riskTolerance: 0.75,
      tradeIntervalMs: 20000, // 20 seconds
      positionSizeMultiplier: 1.9,
      sectorFocus: [],
    },
    {
      id: 'news-contrarian-2',
      name: 'News Skeptic',
      botType: 'news_reactive',
      strategy: 'contrarian',
      personality: 'aggressive',
      riskTolerance: 0.78,
      tradeIntervalMs: 18000, // 18 seconds
      positionSizeMultiplier: 2.0,
      sectorFocus: [],
    },
    {
      id: 'news-contrarian-3',
      name: 'Panic Buyer',
      botType: 'news_reactive',
      strategy: 'dump_catcher',
      personality: 'aggressive',
      riskTolerance: 0.8,
      tradeIntervalMs: 25000, // 25 seconds
      positionSizeMultiplier: 1.7,
      sectorFocus: [],
    },
    {
      id: 'news-contrarian-4',
      name: 'Hype Seller',
      botType: 'news_reactive',
      strategy: 'contrarian',
      personality: 'aggressive',
      riskTolerance: 0.77,
      tradeIntervalMs: 30000, // 30 seconds
      positionSizeMultiplier: 1.8,
      sectorFocus: [],
    },

    // ========== SENTIMENT (6 bots) - $6M total ==========
    // Follow crowd behavior, volume tracking, panic/FOMO
    {
      id: 'sentiment-momentum-1',
      name: 'Crowd Follower',
      botType: 'sentiment',
      strategy: 'momentum',
      personality: 'moderate',
      riskTolerance: 0.65,
      tradeIntervalMs: 35000, // 35 seconds
      positionSizeMultiplier: 1.5,
      sectorFocus: [],
    },
    {
      id: 'sentiment-volume-1',
      name: 'Volume Tracker',
      botType: 'sentiment',
      strategy: 'volatility',
      personality: 'moderate',
      riskTolerance: 0.6,
      tradeIntervalMs: 40000, // 40 seconds
      positionSizeMultiplier: 1.4,
      sectorFocus: [],
    },
    {
      id: 'sentiment-fomo-1',
      name: 'FOMO Trader',
      botType: 'sentiment',
      strategy: 'momentum',
      personality: 'aggressive',
      riskTolerance: 0.85,
      tradeIntervalMs: 25000, // 25 seconds
      positionSizeMultiplier: 2.0,
      sectorFocus: [],
    },
    {
      id: 'sentiment-panic-1',
      name: 'Panic Seller',
      botType: 'sentiment',
      strategy: 'dump_catcher',
      personality: 'moderate',
      riskTolerance: 0.5,
      tradeIntervalMs: 30000, // 30 seconds
      positionSizeMultiplier: 1.2,
      sectorFocus: [],
    },
    {
      id: 'sentiment-trend-1',
      name: 'Trend Surfer',
      botType: 'sentiment',
      strategy: 'trend_following',
      personality: 'moderate',
      riskTolerance: 0.7,
      tradeIntervalMs: 45000, // 45 seconds
      positionSizeMultiplier: 1.6,
      sectorFocus: [],
    },
    {
      id: 'sentiment-herd-1',
      name: 'Herd Mentality',
      botType: 'sentiment',
      strategy: 'momentum',
      personality: 'moderate',
      riskTolerance: 0.68,
      tradeIntervalMs: 38000, // 38 seconds
      positionSizeMultiplier: 1.5,
      sectorFocus: [],
    },
  ];

  // Track last trade time per bot
  private botLastTradeTime: Map<string, Date> = new Map();

  /**
   * Initialize all bots in the database
   */
  async initializeBots(): Promise<void> {
    console.log('Initializing enhanced bot traders...');

    for (const config of EnhancedBotTraderService.BOT_CONFIGS) {
      // Determine capital based on bot type
      let capital: Decimal;
      switch (config.botType) {
        case 'market_maker':
          capital = EnhancedBotTraderService.MARKET_MAKER_CAPITAL;
          break;
        case 'whale':
          capital = EnhancedBotTraderService.WHALE_CAPITAL;
          break;
        case 'news_reactive':
          capital = EnhancedBotTraderService.NEWS_REACTIVE_CAPITAL;
          break;
        case 'sentiment':
          capital = EnhancedBotTraderService.SENTIMENT_CAPITAL;
          break;
      }

      // Upsert bot to database
      await prisma.tradingBot.upsert({
        where: { id: config.id },
        update: {
          name: config.name,
          botType: config.botType,
          strategy: config.strategy,
          personality: config.personality,
          cash: capital,
          initialCash: capital,
          riskTolerance: new Decimal(config.riskTolerance),
          tradeIntervalMs: config.tradeIntervalMs,
          positionSizeMultiplier: new Decimal(config.positionSizeMultiplier),
          sectorFocus: config.sectorFocus,
          isActive: true,
        },
        create: {
          id: config.id,
          name: config.name,
          botType: config.botType,
          strategy: config.strategy,
          personality: config.personality,
          cash: capital,
          initialCash: capital,
          riskTolerance: new Decimal(config.riskTolerance),
          tradeIntervalMs: config.tradeIntervalMs,
          positionSizeMultiplier: new Decimal(config.positionSizeMultiplier),
          sectorFocus: config.sectorFocus,
          isActive: true,
        },
      });
    }

    console.log(`Initialized ${EnhancedBotTraderService.BOT_CONFIGS.length} enhanced trading bots`);
  }

  /**
   * Run one trading cycle for all active bots
   */
  async runTradingCycle(): Promise<void> {
    try {
      // Check if market is halted
      if (circuitBreakerService.isMarketHalted()) {
        console.log('Market halted - bots paused');
        return;
      }

      // Get all active bots
      const bots = await prisma.tradingBot.findMany({
        where: { isActive: true },
        include: { positions: { include: { botStock: true } } },
      });

      // Execute trades for each bot based on type
      for (const bot of bots) {
        // Check if bot can trade based on interval
        if (!this.canBotTrade(bot.id, bot.tradeIntervalMs)) {
          continue;
        }

        // Skip if stock is halted (for individual stocks)
        // (checked within individual trade methods)

        // Execute trade based on bot type
        try {
          switch (bot.botType) {
            case 'market_maker':
              await this.executeMarketMakerTrade(bot);
              break;
            case 'whale':
              await this.executeWhaleTrade(bot);
              break;
            case 'news_reactive':
              await this.executeNewsReactiveTrade(bot);
              break;
            case 'sentiment':
              await this.executeSentimentTrade(bot);
              break;
          }

          // Record trade time
          this.recordBotTrade(bot.id);
        } catch (error) {
          console.error(`Error executing trade for bot ${bot.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Enhanced bot trading cycle error:', error);
    }
  }

  /**
   * Market Maker: Stabilize prices and provide liquidity
   */
  private async executeMarketMakerTrade(bot: any): Promise<void> {
    // Get all bot stocks
    const stocks = await prisma.botStock.findMany({
      where: { isActive: true },
    });

    // Filter by sector focus if specified
    const targetStocks = bot.sectorFocus.length > 0
      ? stocks.filter(s => bot.sectorFocus.includes(s.sector))
      : stocks;

    if (targetStocks.length === 0) return;

    // Find stocks with extreme price movements
    const extremeStocks = targetStocks
      .map(stock => {
        const currentPrice = Number(stock.currentPrice);
        const basePrice = Number(stock.basePrice);
        const deviation = Math.abs((currentPrice - basePrice) / basePrice);
        return { stock, deviation };
      })
      .filter(({ deviation }) => deviation > 0.05) // 5% deviation threshold
      .sort((a, b) => b.deviation - a.deviation);

    if (extremeStocks.length === 0) return;

    const target = extremeStocks[0];
    if (!target) return;

    const stock = target.stock;

    // Check if stock is halted
    if (circuitBreakerService.isStockHalted(stock.tickerSymbol)) {
      return;
    }

    const currentPrice = Number(stock.currentPrice);
    const basePrice = Number(stock.basePrice);
    const isOvervalued = currentPrice > basePrice;

    // Counter extreme moves: sell if overvalued, buy if undervalued
    if (isOvervalued) {
      // Sell to stabilize
      const position = bot.positions.find((p: any) => p.botStockId === stock.id);
      if (position && position.shares > 0) {
        const sharesToSell = Math.min(
          Math.floor(position.shares * 0.2), // Max 20% of position
          Math.floor(Number(bot.cash) * 0.1 / currentPrice) // Or 10% of capital
        );

        if (sharesToSell > 0) {
          await this.executeBotSell(bot.id, stock.tickerSymbol, sharesToSell, currentPrice);
        }
      }
    } else {
      // Buy to stabilize
      const maxInvestment = Number(bot.cash) * 0.15 * Number(bot.positionSizeMultiplier);
      const sharesToBuy = Math.floor(maxInvestment / currentPrice);

      if (sharesToBuy > 0 && Number(bot.cash) >= sharesToBuy * currentPrice) {
        await this.executeBotBuy(bot.id, stock.tickerSymbol, sharesToBuy, currentPrice);
      }
    }
  }

  /**
   * Whale: Large occasional trades with accumulation strategy
   */
  private async executeWhaleTrade(bot: any): Promise<void> {
    // Whales trade infrequently (2-5 per day based on interval)
    // Sometimes accumulate slowly, sometimes make big moves

    const stocks = await prisma.botStock.findMany({
      where: {
        isActive: true,
        sector: bot.sectorFocus.length > 0 ? { in: bot.sectorFocus } : undefined,
      },
    });

    if (stocks.length === 0) return;

    // 30% chance of large trade, 70% chance of small accumulation
    const isLargeTrade = Math.random() < 0.3;

    // Pick a random stock
    const stock = stocks[Math.floor(Math.random() * stocks.length)];
    if (!stock) return;

    // Check if halted
    if (circuitBreakerService.isStockHalted(stock.tickerSymbol)) {
      return;
    }

    const currentPrice = Number(stock.currentPrice);
    const trend = stock.trend;

    if (isLargeTrade) {
      // Large trade: $500K-$2M
      const tradeSize = 500_000 + Math.random() * 1_500_000;
      const shares = Math.floor(tradeSize / currentPrice);
      const totalCost = shares * currentPrice;

      // Decide buy or sell based on trend
      const shouldBuy = trend === 'bullish' || Math.random() < 0.6;

      if (shouldBuy && Number(bot.cash) >= totalCost) {
        await this.executeBotBuy(bot.id, stock.tickerSymbol, shares, currentPrice);
      } else {
        // Sell if we have position
        const position = bot.positions.find((p: any) => p.botStockId === stock.id);
        if (position && position.shares >= shares) {
          await this.executeBotSell(bot.id, stock.tickerSymbol, shares, currentPrice);
        }
      }
    } else {
      // Small accumulation trade
      const smallTradeSize = 50_000 + Math.random() * 150_000;
      const shares = Math.floor(smallTradeSize / currentPrice);
      const totalCost = shares * currentPrice;

      if (shares > 0 && Number(bot.cash) >= totalCost) {
        await this.executeBotBuy(bot.id, stock.tickerSymbol, shares, currentPrice);
      }
    }
  }

  /**
   * News-Reactive: React to MarketEvent entries
   */
  private async executeNewsReactiveTrade(bot: any): Promise<void> {
    // Get active market events
    const events = await marketEventService.getActiveEvents();

    if (events.length === 0) return;

    // Pick a random event
    const event = events[Math.floor(Math.random() * events.length)];
    if (!event) return;

    // Get affected tickers
    const affectedTickers = event.affectedTickers;
    if (affectedTickers.length === 0) return;

    // Pick a random affected ticker
    const ticker = affectedTickers[Math.floor(Math.random() * affectedTickers.length)];
    if (!ticker) return;

    // Find the stock
    const stock = await prisma.botStock.findUnique({
      where: { tickerSymbol: ticker },
    });

    if (!stock || !stock.isActive) return;

    // Check if halted
    if (circuitBreakerService.isStockHalted(ticker)) {
      return;
    }

    const currentPrice = Number(stock.currentPrice);
    const priceImpact = event.priceImpact || 0;
    const isPositiveEvent = priceImpact > 0;

    // Trend followers buy on positive news, sell on negative
    // Contrarians do the opposite
    const isContrarian = bot.strategy === 'contrarian' || bot.strategy === 'dump_catcher';

    let shouldBuy: boolean;
    if (isContrarian) {
      shouldBuy = !isPositiveEvent; // Buy on bad news
    } else {
      shouldBuy = isPositiveEvent; // Buy on good news
    }

    const maxInvestment = Number(bot.cash) * 0.25 * Number(bot.positionSizeMultiplier);
    const shares = Math.floor(maxInvestment / currentPrice);

    if (shouldBuy) {
      if (shares > 0 && Number(bot.cash) >= shares * currentPrice) {
        await this.executeBotBuy(bot.id, ticker, shares, currentPrice);
      }
    } else {
      // Sell if we have position
      const position = bot.positions.find((p: any) => p.botStock.tickerSymbol === ticker);
      if (position && position.shares > 0) {
        const sharesToSell = Math.floor(position.shares * 0.5); // Sell 50%
        if (sharesToSell > 0) {
          await this.executeBotSell(bot.id, ticker, sharesToSell, currentPrice);
        }
      }
    }
  }

  /**
   * Sentiment: Follow crowd behavior and volume
   */
  private async executeSentimentTrade(bot: any): Promise<void> {
    // Get all bot stocks sorted by volume
    const stocks = await prisma.botStock.findMany({
      where: { isActive: true },
      orderBy: { volume24h: 'desc' },
      take: 10, // Top 10 by volume
    });

    if (stocks.length === 0) return;

    // Pick from top volume stocks
    const stock = stocks[Math.floor(Math.random() * Math.min(5, stocks.length))];
    if (!stock) return;

    // Check if halted
    if (circuitBreakerService.isStockHalted(stock.tickerSymbol)) {
      return;
    }

    const currentPrice = Number(stock.currentPrice);
    const previousClose = Number(stock.previousClose);
    const changePercent = ((currentPrice - previousClose) / previousClose) * 100;
    const volume = stock.volume24h;

    // FOMO buying: Buy stocks rising with high volume
    if (changePercent > 3 && volume > 100) {
      const maxInvestment = Number(bot.cash) * 0.2 * Number(bot.positionSizeMultiplier);
      const shares = Math.floor(maxInvestment / currentPrice);

      if (shares > 0 && Number(bot.cash) >= shares * currentPrice) {
        await this.executeBotBuy(bot.id, stock.tickerSymbol, shares, currentPrice);
      }
    }

    // Panic selling: Sell during halts or big drops
    if (changePercent < -5 || circuitBreakerService.isStockHalted(stock.tickerSymbol)) {
      const position = bot.positions.find((p: any) => p.botStockId === stock.id);
      if (position && position.shares > 0) {
        const sharesToSell = Math.floor(position.shares * 0.7); // Panic sell 70%
        if (sharesToSell > 0) {
          await this.executeBotSell(bot.id, stock.tickerSymbol, sharesToSell, currentPrice);
        }
      }
    }

    // Follow trends: Buy uptrending, sell downtrending
    if (stock.trend === 'bullish' && changePercent > 1) {
      const maxInvestment = Number(bot.cash) * 0.15 * Number(bot.positionSizeMultiplier);
      const shares = Math.floor(maxInvestment / currentPrice);

      if (shares > 0 && Number(bot.cash) >= shares * currentPrice) {
        await this.executeBotBuy(bot.id, stock.tickerSymbol, shares, currentPrice);
      }
    } else if (stock.trend === 'bearish' && changePercent < -1) {
      const position = bot.positions.find((p: any) => p.botStockId === stock.id);
      if (position && position.shares > 0) {
        const sharesToSell = Math.floor(position.shares * 0.4); // Sell 40%
        if (sharesToSell > 0) {
          await this.executeBotSell(bot.id, stock.tickerSymbol, sharesToSell, currentPrice);
        }
      }
    }
  }

  /**
   * Execute bot buy order
   */
  private async executeBotBuy(
    botId: string,
    ticker: string,
    shares: number,
    pricePerShare: number
  ): Promise<void> {
    const totalCost = shares * pricePerShare;

    // Get bot
    const bot = await prisma.tradingBot.findUnique({
      where: { id: botId },
    });

    if (!bot || Number(bot.cash) < totalCost) {
      return;
    }

    // Get stock
    const stock = await prisma.botStock.findUnique({
      where: { tickerSymbol: ticker },
    });

    if (!stock) return;

    // Update or create position
    const existingPosition = await prisma.botPosition.findUnique({
      where: {
        botId_botStockId: {
          botId: botId,
          botStockId: stock.id,
        },
      },
    });

    if (existingPosition) {
      // Update existing position
      const newTotalShares = existingPosition.shares + shares;
      const newTotalInvested = Number(existingPosition.totalInvested) + totalCost;
      const newAvgPrice = newTotalInvested / newTotalShares;

      await prisma.botPosition.update({
        where: { id: existingPosition.id },
        data: {
          shares: newTotalShares,
          avgBuyPrice: new Decimal(newAvgPrice),
          totalInvested: new Decimal(newTotalInvested),
        },
      });
    } else {
      // Create new position
      await prisma.botPosition.create({
        data: {
          botId: botId,
          botStockId: stock.id,
          shares: shares,
          avgBuyPrice: new Decimal(pricePerShare),
          totalInvested: new Decimal(totalCost),
        },
      });
    }

    // Update bot cash and stats
    await prisma.tradingBot.update({
      where: { id: botId },
      data: {
        cash: { decrement: new Decimal(totalCost) },
        lastTradeAt: new Date(),
        tradesExecuted: { increment: 1 },
      },
    });

    // Update stock volume
    await prisma.botStock.update({
      where: { id: stock.id },
      data: {
        volume24h: { increment: shares },
      },
    });

    console.log(`Bot ${botId} bought ${shares} shares of ${ticker} @ $${pricePerShare.toFixed(2)}`);
  }

  /**
   * Execute bot sell order
   */
  private async executeBotSell(
    botId: string,
    ticker: string,
    shares: number,
    pricePerShare: number
  ): Promise<void> {
    // Get stock
    const stock = await prisma.botStock.findUnique({
      where: { tickerSymbol: ticker },
    });

    if (!stock) return;

    // Get position
    const position = await prisma.botPosition.findUnique({
      where: {
        botId_botStockId: {
          botId: botId,
          botStockId: stock.id,
        },
      },
    });

    if (!position || position.shares < shares) {
      return;
    }

    const totalProceeds = shares * pricePerShare;
    const costBasis = Number(position.avgBuyPrice) * shares;
    const profitLoss = totalProceeds - costBasis;

    // Update position
    const newShares = position.shares - shares;
    if (newShares === 0) {
      // Delete position
      await prisma.botPosition.delete({
        where: { id: position.id },
      });
    } else {
      // Update position
      const newTotalInvested = Number(position.totalInvested) - costBasis;
      await prisma.botPosition.update({
        where: { id: position.id },
        data: {
          shares: newShares,
          totalInvested: new Decimal(Math.max(0, newTotalInvested)),
        },
      });
    }

    // Update bot cash and stats
    await prisma.tradingBot.update({
      where: { id: botId },
      data: {
        cash: { increment: new Decimal(totalProceeds) },
        lastTradeAt: new Date(),
        tradesExecuted: { increment: 1 },
        profitLoss: { increment: new Decimal(profitLoss) },
      },
    });

    // Update stock volume
    await prisma.botStock.update({
      where: { id: stock.id },
      data: {
        volume24h: { increment: shares },
      },
    });

    console.log(`Bot ${botId} sold ${shares} shares of ${ticker} @ $${pricePerShare.toFixed(2)} (P/L: $${profitLoss.toFixed(2)})`);
  }

  /**
   * Check if bot can trade based on interval
   */
  private canBotTrade(botId: string, intervalMs: number): boolean {
    const lastTrade = this.botLastTradeTime.get(botId);
    if (!lastTrade) return true;

    const elapsed = Date.now() - lastTrade.getTime();
    return elapsed >= intervalMs;
  }

  /**
   * Record bot trade time
   */
  private recordBotTrade(botId: string): void {
    this.botLastTradeTime.set(botId, new Date());
  }

  /**
   * Get bot statistics
   */
  async getBotStats(): Promise<any[]> {
    const bots = await prisma.tradingBot.findMany({
      include: {
        positions: {
          include: {
            botStock: true,
          },
        },
      },
    });

    return bots.map(bot => {
      const portfolioValue = bot.positions.reduce((sum, pos) => {
        const currentValue = Number(pos.botStock.currentPrice) * pos.shares;
        return sum + currentValue;
      }, 0);

      const totalValue = Number(bot.cash) + portfolioValue;
      const profitLoss = totalValue - Number(bot.initialCash);
      const profitPercent = (profitLoss / Number(bot.initialCash)) * 100;

      return {
        id: bot.id,
        name: bot.name,
        botType: bot.botType,
        strategy: bot.strategy,
        personality: bot.personality,
        cash: Number(bot.cash),
        portfolioValue,
        totalValue,
        initialCash: Number(bot.initialCash),
        profitLoss,
        profitPercent,
        tradesExecuted: bot.tradesExecuted,
        positions: bot.positions.length,
        lastTradeAt: bot.lastTradeAt,
      };
    });
  }
}

export const enhancedBotTraderService = new EnhancedBotTraderService();
