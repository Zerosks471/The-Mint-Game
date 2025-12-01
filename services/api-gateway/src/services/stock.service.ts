import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';

interface StockMarketData {
  tickerSymbol: string;
  companyName: string;
  stockType: 'player' | 'bot';
  currentPrice: string;
  previousClose: string;
  highPrice24h: string;
  lowPrice24h: string;
  change: string;
  changePercent: number;
  volume24h: number;
  trend: string;
  marketCap?: string;
  sector?: string;
  description?: string;
}

interface StockDetail extends StockMarketData {
  totalShares?: number;
  floatShares?: number;
  ownerShares?: number;
  basePrice?: string;
  volatility?: string;
}

interface StockHoldingData {
  id: string;
  tickerSymbol: string;
  companyName: string;
  stockType: 'player' | 'bot';
  shares: number;
  avgBuyPrice: string;
  totalInvested: string;
  currentPrice: string;
  currentValue: string;
  profitLoss: string;
  profitLossPercent: number;
}

interface StockOrderData {
  id: string;
  tickerSymbol: string;
  companyName: string;
  stockType: 'player' | 'bot';
  orderType: 'buy' | 'sell';
  shares: number;
  pricePerShare: string;
  totalAmount: string;
  createdAt: string;
}

export class StockService {
  private static TICK_INTERVAL_MIN_MS = 5 * 60 * 1000; // 5 minutes
  private static TICK_INTERVAL_MAX_MS = 15 * 60 * 1000; // 15 minutes
  private static PLAYER_PRICE_VOLATILITY = 0.05; // ±5% per tick
  private static MEAN_REVERSION_RATE = 0.1; // 10% reversion per tick

  /**
   * Update bot stock prices with mean reversion and volatility
   */
  async updateBotStockPrices(): Promise<void> {
    const botStocks = await prisma.botStock.findMany({
      where: { isActive: true },
    });

    const now = new Date();

    for (const stock of botStocks) {
      const lastTick = new Date(stock.lastTickAt);
      const elapsed = now.getTime() - lastTick.getTime();
      const avgTickInterval =
        (StockService.TICK_INTERVAL_MIN_MS + StockService.TICK_INTERVAL_MAX_MS) / 2;
      const ticksToProcess = Math.floor(elapsed / avgTickInterval);

      if (ticksToProcess === 0) continue;

      let currentPrice = Number(stock.currentPrice);
      const basePrice = Number(stock.basePrice);
      const volatility = Number(stock.volatility);
      let highPrice = Number(stock.highPrice24h);
      let lowPrice = Number(stock.lowPrice24h);
      let trend = stock.trend;
      let trendStrength = stock.trendStrength;

      // Use deterministic seed based on stock ID and time
      const baseSeed = stock.id.charCodeAt(0) + Math.floor(now.getTime() / (1000 * 60 * 60)); // Hour-based seed

      for (let i = 0; i < ticksToProcess && i < 50; i++) {
        // Seeded random
        let seed = baseSeed + i;
        const random = () => {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          return seed / 0x7fffffff;
        };

        // Roll for trend change (30% chance)
        if (random() < 0.3) {
          const trendRoll = random();
          if (trendRoll < 0.33) trend = 'bullish';
          else if (trendRoll < 0.66) trend = 'bearish';
          else trend = 'neutral';
          trendStrength = Math.floor(random() * 5) + 1;
        }

        // Mean reversion: pull price toward base price
        const deviation = (currentPrice - basePrice) / basePrice;
        const reversion = -deviation * StockService.MEAN_REVERSION_RATE;

        // Random volatility
        const randomChange = (random() - 0.5) * 2 * volatility;

        // Trend bias
        let trendBias = 0;
        if (trend === 'bullish') trendBias = 0.005 * trendStrength;
        else if (trend === 'bearish') trendBias = -0.005 * trendStrength;

        // Apply changes
        const totalChange = reversion + randomChange + trendBias;
        currentPrice = currentPrice * (1 + totalChange);

        // Update high/low
        highPrice = Math.max(highPrice, currentPrice);
        lowPrice = Math.min(lowPrice, currentPrice);
      }

      // Update database
      await prisma.botStock.update({
        where: { id: stock.id },
        data: {
          previousClose: stock.currentPrice,
          currentPrice: new Decimal(Math.round(currentPrice * 100) / 100),
          highPrice24h: new Decimal(Math.round(highPrice * 100) / 100),
          lowPrice24h: new Decimal(Math.round(lowPrice * 100) / 100),
          trend,
          trendStrength,
          lastTickAt: now,
        },
      });
    }
  }

  /**
   * Update player stock price based on net worth
   */
  async updatePlayerStockPrice(userId: string): Promise<void> {
    const playerStock = await prisma.playerStock.findUnique({
      where: { userId },
    });

    if (!playerStock || !playerStock.isListed) return;

    // Import prestige service to calculate net worth
    const { prestigeService } = await import('./prestige.service');
    const netWorth = await prestigeService.calculateNetWorth(userId);

    // Base price: $1 per $10K net worth
    const targetBasePrice = netWorth.div(10000);
    const currentBasePrice = new Decimal(playerStock.currentPrice);

    const now = new Date();
    const lastTick = new Date(playerStock.lastTickAt);
    const elapsed = now.getTime() - lastTick.getTime();
    const avgTickInterval =
      (StockService.TICK_INTERVAL_MIN_MS + StockService.TICK_INTERVAL_MAX_MS) / 2;
    const ticksToProcess = Math.floor(elapsed / avgTickInterval);

    let currentPrice = Number(playerStock.currentPrice);
    let highPrice = Number(playerStock.highPrice24h);
    let lowPrice = Number(playerStock.lowPrice24h);
    let trend = playerStock.trend;

    // Use deterministic seed
    const baseSeed = playerStock.id.charCodeAt(0) + Math.floor(now.getTime() / (1000 * 60 * 60));

    for (let i = 0; i < ticksToProcess && i < 50; i++) {
      let seed = baseSeed + i;
      const random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      // Roll for trend change
      if (random() < 0.3) {
        const trendRoll = random();
        if (trendRoll < 0.33) trend = 'bullish';
        else if (trendRoll < 0.66) trend = 'bearish';
        else trend = 'neutral';
      }

      // Mean reversion toward target base price
      const targetPrice = Number(targetBasePrice);
      const deviation = (currentPrice - targetPrice) / targetPrice;
      const reversion = -deviation * StockService.MEAN_REVERSION_RATE;

      // Random volatility
      const randomChange = (random() - 0.5) * 2 * StockService.PLAYER_PRICE_VOLATILITY;

      // Trend bias
      let trendBias = 0;
      if (trend === 'bullish') trendBias = 0.01;
      else if (trend === 'bearish') trendBias = -0.01;

      // Apply changes
      const totalChange = reversion + randomChange + trendBias;
      currentPrice = currentPrice * (1 + totalChange);

      // Ensure price doesn't go below 0.01
      currentPrice = Math.max(0.01, currentPrice);

      // Update high/low
      highPrice = Math.max(highPrice, currentPrice);
      lowPrice = Math.min(lowPrice, currentPrice);
    }

    // Update market cap
    const marketCap = new Decimal(currentPrice).mul(playerStock.totalShares);

    await prisma.playerStock.update({
      where: { id: playerStock.id },
      data: {
        previousClose: playerStock.currentPrice,
        currentPrice: new Decimal(Math.round(currentPrice * 100) / 100),
        highPrice24h: new Decimal(Math.round(highPrice * 100) / 100),
        lowPrice24h: new Decimal(Math.round(lowPrice * 100) / 100),
        marketCap,
        trend,
        lastTickAt: now,
      },
    });
  }

  /**
   * Get all stocks (player + bot) for market view
   */
  async getMarketStocks(): Promise<StockMarketData[]> {
    // Update prices first
    await this.updateBotStockPrices();

    const [botStocks, playerStocks] = await Promise.all([
      prisma.botStock.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.playerStock.findMany({
        where: { isListed: true },
        include: { user: true },
      }),
    ]);

    // Update player stock prices
    for (const stock of playerStocks) {
      await this.updatePlayerStockPrice(stock.userId);
    }

    // Re-fetch to get updated prices
    const updatedPlayerStocks = await prisma.playerStock.findMany({
      where: { isListed: true },
      include: { user: true },
    });

    const marketData: StockMarketData[] = [];

    // Add bot stocks
    for (const stock of botStocks) {
      const currentPrice = Number(stock.currentPrice);
      const previousClose = Number(stock.previousClose);
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      marketData.push({
        tickerSymbol: stock.tickerSymbol,
        companyName: stock.companyName,
        stockType: 'bot',
        currentPrice: stock.currentPrice.toString(),
        previousClose: stock.previousClose.toString(),
        highPrice24h: stock.highPrice24h.toString(),
        lowPrice24h: stock.lowPrice24h.toString(),
        change: change.toFixed(2),
        changePercent: Math.round(changePercent * 100) / 100,
        volume24h: stock.volume24h,
        trend: stock.trend,
        sector: stock.sector,
        description: stock.description || undefined,
      });
    }

    // Add player stocks
    for (const stock of updatedPlayerStocks) {
      const currentPrice = Number(stock.currentPrice);
      const previousClose = Number(stock.previousClose);
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      marketData.push({
        tickerSymbol: stock.tickerSymbol,
        companyName: stock.companyName,
        stockType: 'player',
        currentPrice: stock.currentPrice.toString(),
        previousClose: stock.previousClose.toString(),
        highPrice24h: stock.highPrice24h.toString(),
        lowPrice24h: stock.lowPrice24h.toString(),
        change: change.toFixed(2),
        changePercent: Math.round(changePercent * 100) / 100,
        volume24h: stock.volume24h,
        trend: stock.trend,
        marketCap: stock.marketCap.toString(),
      });
    }

    return marketData;
  }

  /**
   * Get single stock details by ticker
   */
  async getStockByTicker(tickerSymbol: string): Promise<StockDetail | null> {
    const upperTicker = tickerSymbol.toUpperCase();

    // Try bot stock first
    let botStock = await prisma.botStock.findUnique({
      where: { tickerSymbol: upperTicker },
    });

    if (botStock) {
      await this.updateBotStockPrices();
      botStock = await prisma.botStock.findUnique({
        where: { tickerSymbol: upperTicker },
      });

      if (!botStock) return null;

      const currentPrice = Number(botStock.currentPrice);
      const previousClose = Number(botStock.previousClose);
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        tickerSymbol: botStock.tickerSymbol,
        companyName: botStock.companyName,
        stockType: 'bot',
        currentPrice: botStock.currentPrice.toString(),
        previousClose: botStock.previousClose.toString(),
        highPrice24h: botStock.highPrice24h.toString(),
        lowPrice24h: botStock.lowPrice24h.toString(),
        change: change.toFixed(2),
        changePercent: Math.round(changePercent * 100) / 100,
        volume24h: botStock.volume24h,
        trend: botStock.trend,
        sector: botStock.sector,
        description: botStock.description || undefined,
        basePrice: botStock.basePrice.toString(),
        volatility: botStock.volatility.toString(),
      };
    }

    // Try player stock
    let playerStock = await prisma.playerStock.findFirst({
      where: {
        tickerSymbol: upperTicker,
        isListed: true,
      },
      include: { user: true },
    });

    if (playerStock) {
      await this.updatePlayerStockPrice(playerStock.userId);
      playerStock = await prisma.playerStock.findFirst({
        where: {
          tickerSymbol: upperTicker,
          isListed: true,
        },
        include: { user: true },
      });

      if (!playerStock) return null;

      const currentPrice = Number(playerStock.currentPrice);
      const previousClose = Number(playerStock.previousClose);
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        tickerSymbol: playerStock.tickerSymbol,
        companyName: playerStock.companyName,
        stockType: 'player',
        currentPrice: playerStock.currentPrice.toString(),
        previousClose: playerStock.previousClose.toString(),
        highPrice24h: playerStock.highPrice24h.toString(),
        lowPrice24h: playerStock.lowPrice24h.toString(),
        change: change.toFixed(2),
        changePercent: Math.round(changePercent * 100) / 100,
        volume24h: playerStock.volume24h,
        trend: playerStock.trend,
        marketCap: playerStock.marketCap.toString(),
        totalShares: playerStock.totalShares,
        floatShares: playerStock.floatShares,
        ownerShares: playerStock.ownerShares,
      };
    }

    return null;
  }

  /**
   * Get player's own stock (if listed)
   */
  async getPlayerStock(userId: string): Promise<StockDetail | null> {
    const playerStock = await prisma.playerStock.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!playerStock || !playerStock.isListed) return null;

    await this.updatePlayerStockPrice(userId);

    const updated = await prisma.playerStock.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!updated) return null;

    const currentPrice = Number(updated.currentPrice);
    const previousClose = Number(updated.previousClose);
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      tickerSymbol: updated.tickerSymbol,
      companyName: updated.companyName,
      stockType: 'player',
      currentPrice: updated.currentPrice.toString(),
      previousClose: updated.previousClose.toString(),
      highPrice24h: updated.highPrice24h.toString(),
      lowPrice24h: updated.lowPrice24h.toString(),
      change: change.toFixed(2),
      changePercent: Math.round(changePercent * 100) / 100,
      volume24h: updated.volume24h,
      trend: updated.trend,
      marketCap: updated.marketCap.toString(),
      totalShares: updated.totalShares,
      floatShares: updated.floatShares,
      ownerShares: updated.ownerShares,
    };
  }

  /**
   * List player's company stock
   */
  async listPlayerStock(
    userId: string,
    tickerSymbol: string,
    companyName: string
  ): Promise<StockDetail> {
    // Validate ticker symbol (3-4 uppercase letters)
    const cleanTicker = tickerSymbol.toUpperCase().trim();
    if (!/^[A-Z]{3,4}$/.test(cleanTicker)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Ticker symbol must be 3-4 uppercase letters',
        400
      );
    }

    // Check if ticker is already taken
    const existingBot = await prisma.botStock.findUnique({
      where: { tickerSymbol: cleanTicker },
    });
    const existingPlayer = await prisma.playerStock.findFirst({
      where: { tickerSymbol: cleanTicker },
    });

    if (existingBot || existingPlayer) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Ticker symbol already taken', 400);
    }

    // Get user and calculate net worth
    const { prestigeService } = await import('./prestige.service');
    const netWorth = await prestigeService.calculateNetWorth(userId);

    // Base price: $1 per $10K net worth
    const basePrice = netWorth.div(10000);
    const initialPrice = basePrice.greaterThan(0.01) ? basePrice : new Decimal(0.01);

    // Check if player already has a stock
    const existing = await prisma.playerStock.findUnique({
      where: { userId },
    });

    if (existing) {
      // Update existing
      const updated = await prisma.playerStock.update({
        where: { userId },
        data: {
          tickerSymbol: cleanTicker,
          companyName: companyName.trim(),
          currentPrice: initialPrice,
          previousClose: initialPrice,
          highPrice24h: initialPrice,
          lowPrice24h: initialPrice,
          marketCap: initialPrice.mul(1000000), // totalShares default
          isListed: true,
        },
      });

      return this.getPlayerStock(userId) as Promise<StockDetail>;
    }

    // Create new
    const created = await prisma.playerStock.create({
      data: {
        userId,
        tickerSymbol: cleanTicker,
        companyName: companyName.trim(),
        currentPrice: initialPrice,
        previousClose: initialPrice,
        highPrice24h: initialPrice,
        lowPrice24h: initialPrice,
        marketCap: initialPrice.mul(1000000),
      },
    });

    return this.getPlayerStock(userId) as Promise<StockDetail>;
  }

  /**
   * Update player stock company name
   */
  async updatePlayerStockName(userId: string, companyName: string): Promise<StockDetail> {
    const playerStock = await prisma.playerStock.findUnique({
      where: { userId },
    });

    if (!playerStock) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Player stock not found', 404);
    }

    await prisma.playerStock.update({
      where: { userId },
      data: {
        companyName: companyName.trim(),
      },
    });

    return this.getPlayerStock(userId) as Promise<StockDetail>;
  }

  /**
   * Delist player stock
   */
  async delistPlayerStock(userId: string): Promise<void> {
    await prisma.playerStock.update({
      where: { userId },
      data: {
        isListed: false,
      },
    });
  }

  /**
   * Get user's portfolio (holdings)
   */
  async getPortfolio(userId: string): Promise<StockHoldingData[]> {
    const holdings = await prisma.stockHolding.findMany({
      where: { userId, shares: { gt: 0 } },
      include: {
        playerStock: true,
        botStock: true,
      },
    });

    const portfolio: StockHoldingData[] = [];

    for (const holding of holdings) {
      let stock: StockDetail | null = null;

      if (holding.stockType === 'bot' && holding.botStockId) {
        stock = await this.getStockByTicker(holding.botStock!.tickerSymbol);
      } else if (holding.stockType === 'player' && holding.playerStockId) {
        stock = await this.getStockByTicker(holding.playerStock!.tickerSymbol);
      }

      if (!stock) continue;

      const currentPrice = new Decimal(stock.currentPrice);
      const avgBuyPrice = holding.avgBuyPrice;
      const shares = holding.shares;
      const currentValue = currentPrice.mul(shares);
      const totalInvested = holding.totalInvested;
      const profitLoss = currentValue.sub(totalInvested);
      const profitLossPercent = totalInvested.greaterThan(0)
        ? profitLoss.div(totalInvested).mul(100).toNumber()
        : 0;

      portfolio.push({
        id: holding.id,
        tickerSymbol: stock.tickerSymbol,
        companyName: stock.companyName,
        stockType: stock.stockType,
        shares,
        avgBuyPrice: avgBuyPrice.toString(),
        totalInvested: totalInvested.toString(),
        currentPrice: stock.currentPrice,
        currentValue: currentValue.toString(),
        profitLoss: profitLoss.toString(),
        profitLossPercent: Math.round(profitLossPercent * 100) / 100,
      });
    }

    return portfolio;
  }

  /**
   * Buy shares
   */
  async buyShares(
    userId: string,
    tickerSymbol: string,
    shares: number
  ): Promise<{ holding: StockHoldingData; order: StockOrderData }> {
    if (shares <= 0 || !Number.isInteger(shares)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Shares must be a positive integer', 400);
    }

    // Get stock
    const stock = await this.getStockByTicker(tickerSymbol);
    if (!stock) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Stock not found', 404);
    }

    // Update prices
    if (stock.stockType === 'bot') {
      await this.updateBotStockPrices();
    } else {
      const playerStock = await prisma.playerStock.findFirst({
        where: { tickerSymbol: stock.tickerSymbol.toUpperCase() },
      });
      if (playerStock) {
        await this.updatePlayerStockPrice(playerStock.userId);
      }
    }

    // Re-fetch stock to get updated price
    const updatedStock = await this.getStockByTicker(tickerSymbol);
    if (!updatedStock) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Stock not found', 404);
    }

    const pricePerShare = new Decimal(updatedStock.currentPrice);
    const totalCost = pricePerShare.mul(shares);

    // Check player has enough cash
    const stats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
    }

    if (new Decimal(stats.cash).lessThan(totalCost)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Insufficient cash', 400);
    }

    // Check available shares (for player stocks)
    if (updatedStock.stockType === 'player') {
      const playerStock = await prisma.playerStock.findFirst({
        where: { tickerSymbol: updatedStock.tickerSymbol.toUpperCase() },
      });
      if (playerStock && shares > playerStock.floatShares) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Not enough shares available', 400);
      }
    }

    return prisma.$transaction(async (tx) => {
      // Deduct cash
      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { decrement: totalCost },
        },
      });

      // Get or create holding
      let holding;
      if (updatedStock.stockType === 'bot') {
        const botStock = await tx.botStock.findUnique({
          where: { tickerSymbol: updatedStock.tickerSymbol.toUpperCase() },
        });
        if (!botStock) throw new AppError(ErrorCodes.NOT_FOUND, 'Bot stock not found', 404);

        const existingHolding = await tx.stockHolding.findUnique({
          where: {
            userId_stockType_botStockId: {
              userId,
              stockType: 'bot',
              botStockId: botStock.id,
            },
          },
        });

        if (existingHolding) {
          // Recalculate average buy price
          const oldShares = existingHolding.shares;
          const oldTotalInvested = existingHolding.totalInvested;
          const newShares = oldShares + shares;
          const newTotalInvested = oldTotalInvested.add(totalCost);
          const newAvgBuyPrice = newTotalInvested.div(newShares);

          holding = await tx.stockHolding.update({
            where: {
              userId_stockType_botStockId: {
                userId,
                stockType: 'bot',
                botStockId: botStock.id,
              },
            },
            data: {
              shares: newShares,
              avgBuyPrice: newAvgBuyPrice,
              totalInvested: newTotalInvested,
            },
          });
        } else {
          holding = await tx.stockHolding.create({
            data: {
              userId,
              stockType: 'bot',
              botStockId: botStock.id,
              shares,
              avgBuyPrice: pricePerShare,
              totalInvested: totalCost,
            },
          });
        }
      } else {
        const playerStock = await tx.playerStock.findFirst({
          where: { tickerSymbol: updatedStock.tickerSymbol.toUpperCase() },
        });
        if (!playerStock) throw new AppError(ErrorCodes.NOT_FOUND, 'Player stock not found', 404);

        // Update float shares
        await tx.playerStock.update({
          where: { id: playerStock.id },
          data: {
            floatShares: { decrement: shares },
            volume24h: { increment: shares },
          },
        });

        const existingHolding = await tx.stockHolding.findUnique({
          where: {
            userId_stockType_playerStockId: {
              userId,
              stockType: 'player',
              playerStockId: playerStock.id,
            },
          },
        });

        if (existingHolding) {
          // Recalculate average buy price
          const oldShares = existingHolding.shares;
          const oldTotalInvested = existingHolding.totalInvested;
          const newShares = oldShares + shares;
          const newTotalInvested = oldTotalInvested.add(totalCost);
          const newAvgBuyPrice = newTotalInvested.div(newShares);

          holding = await tx.stockHolding.update({
            where: {
              userId_stockType_playerStockId: {
                userId,
                stockType: 'player',
                playerStockId: playerStock.id,
              },
            },
            data: {
              shares: newShares,
              avgBuyPrice: newAvgBuyPrice,
              totalInvested: newTotalInvested,
            },
          });
        } else {
          holding = await tx.stockHolding.create({
            data: {
              userId,
              stockType: 'player',
              playerStockId: playerStock.id,
              shares,
              avgBuyPrice: pricePerShare,
              totalInvested: totalCost,
            },
          });
        }
      }

      // Create order
      const order = await tx.stockOrder.create({
        data: {
          userId,
          stockType: updatedStock.stockType,
          playerStockId: updatedStock.stockType === 'player' ? holding.playerStockId : null,
          botStockId: updatedStock.stockType === 'bot' ? holding.botStockId : null,
          tickerSymbol: updatedStock.tickerSymbol.toUpperCase(),
          orderType: 'buy',
          shares,
          pricePerShare,
          totalAmount: totalCost,
        },
      });

      // Update bot stock volume if applicable
      if (updatedStock.stockType === 'bot') {
        const botStock = await tx.botStock.findUnique({
          where: { tickerSymbol: updatedStock.tickerSymbol.toUpperCase() },
        });
        if (botStock) {
          await tx.botStock.update({
            where: { id: botStock.id },
            data: {
              volume24h: { increment: shares },
            },
          });
        }
      }

      // Get holding data
      const holdingData: StockHoldingData = {
        id: holding.id,
        tickerSymbol: updatedStock.tickerSymbol,
        companyName: updatedStock.companyName,
        stockType: updatedStock.stockType,
        shares: holding.shares,
        avgBuyPrice: holding.avgBuyPrice.toString(),
        totalInvested: holding.totalInvested.toString(),
        currentPrice: updatedStock.currentPrice,
        currentValue: new Decimal(updatedStock.currentPrice).mul(holding.shares).toString(),
        profitLoss: new Decimal(0).toString(),
        profitLossPercent: 0,
      };

      // Get order data
      const orderData: StockOrderData = {
        id: order.id,
        tickerSymbol: order.tickerSymbol,
        companyName: updatedStock.companyName,
        stockType: order.stockType,
        orderType: order.orderType,
        shares: order.shares,
        pricePerShare: order.pricePerShare.toString(),
        totalAmount: order.totalAmount.toString(),
        createdAt: order.createdAt.toISOString(),
      };

      return { holding: holdingData, order: orderData };
    });
  }

  /**
   * Sell shares
   */
  async sellShares(
    userId: string,
    tickerSymbol: string,
    shares: number
  ): Promise<{ holding: StockHoldingData; order: StockOrderData }> {
    if (shares <= 0 || !Number.isInteger(shares)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Shares must be a positive integer', 400);
    }

    // Get stock
    const stock = await this.getStockByTicker(tickerSymbol);
    if (!stock) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Stock not found', 404);
    }

    // Update prices
    if (stock.stockType === 'bot') {
      await this.updateBotStockPrices();
    } else {
      const playerStock = await prisma.playerStock.findFirst({
        where: { tickerSymbol: stock.tickerSymbol.toUpperCase() },
      });
      if (playerStock) {
        await this.updatePlayerStockPrice(playerStock.userId);
      }
    }

    // Re-fetch stock to get updated price
    const updatedStock = await this.getStockByTicker(tickerSymbol);
    if (!updatedStock) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Stock not found', 404);
    }

    const pricePerShare = new Decimal(updatedStock.currentPrice);
    const totalRevenue = pricePerShare.mul(shares);

    // Check holding exists and has enough shares
    let holding;
    if (updatedStock.stockType === 'bot') {
      const botStock = await prisma.botStock.findUnique({
        where: { tickerSymbol: updatedStock.tickerSymbol.toUpperCase() },
      });
      if (!botStock) throw new AppError(ErrorCodes.NOT_FOUND, 'Bot stock not found', 404);

      holding = await prisma.stockHolding.findUnique({
        where: {
          userId_stockType_botStockId: {
            userId,
            stockType: 'bot',
            botStockId: botStock.id,
          },
        },
      });
    } else {
      const playerStock = await prisma.playerStock.findFirst({
        where: { tickerSymbol: updatedStock.tickerSymbol.toUpperCase() },
      });
      if (!playerStock) throw new AppError(ErrorCodes.NOT_FOUND, 'Player stock not found', 404);

      holding = await prisma.stockHolding.findUnique({
        where: {
          userId_stockType_playerStockId: {
            userId,
            stockType: 'player',
            playerStockId: playerStock.id,
          },
        },
      });
    }

    if (!holding || holding.shares < shares) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Not enough shares to sell', 400);
    }

    return prisma.$transaction(async (tx) => {
      // Add cash
      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { increment: totalRevenue },
        },
      });

      // Update holding
      const newShares = holding!.shares - shares;
      const soldValue = holding!.avgBuyPrice.mul(shares);
      const newTotalInvested = holding!.totalInvested.sub(soldValue);

      if (newShares === 0) {
        await tx.stockHolding.delete({
          where: { id: holding!.id },
        });
      } else {
        await tx.stockHolding.update({
          where: { id: holding!.id },
          data: {
            shares: newShares,
            totalInvested: newTotalInvested,
            // Keep avgBuyPrice the same (only changes on buys)
          },
        });
      }

      // Update float shares for player stocks
      if (updatedStock.stockType === 'player') {
        const playerStock = await tx.playerStock.findFirst({
          where: { tickerSymbol: updatedStock.tickerSymbol.toUpperCase() },
        });
        if (playerStock) {
          await tx.playerStock.update({
            where: { id: playerStock.id },
            data: {
              floatShares: { increment: shares },
              volume24h: { increment: shares },
            },
          });
        }
      }

      // Create order
      const order = await tx.stockOrder.create({
        data: {
          userId,
          stockType: updatedStock.stockType,
          playerStockId: updatedStock.stockType === 'player' ? holding!.playerStockId : null,
          botStockId: updatedStock.stockType === 'bot' ? holding!.botStockId : null,
          tickerSymbol: updatedStock.tickerSymbol.toUpperCase(),
          orderType: 'sell',
          shares,
          pricePerShare,
          totalAmount: totalRevenue,
        },
      });

      // Update bot stock volume if applicable
      if (updatedStock.stockType === 'bot') {
        const botStock = await tx.botStock.findUnique({
          where: { tickerSymbol: updatedStock.tickerSymbol.toUpperCase() },
        });
        if (botStock) {
          await tx.botStock.update({
            where: { id: botStock.id },
            data: {
              volume24h: { increment: shares },
            },
          });
        }
      }

      // Get holding data (or null if sold all)
      let holdingData: StockHoldingData | null = null;
      if (newShares > 0) {
        const updatedHolding = await tx.stockHolding.findUnique({
          where: { id: holding!.id },
        });
        if (updatedHolding) {
          holdingData = {
            id: updatedHolding.id,
            tickerSymbol: updatedStock.tickerSymbol,
            companyName: updatedStock.companyName,
            stockType: updatedStock.stockType,
            shares: updatedHolding.shares,
            avgBuyPrice: updatedHolding.avgBuyPrice.toString(),
            totalInvested: updatedHolding.totalInvested.toString(),
            currentPrice: updatedStock.currentPrice,
            currentValue: new Decimal(updatedStock.currentPrice)
              .mul(updatedHolding.shares)
              .toString(),
            profitLoss: new Decimal(0).toString(),
            profitLossPercent: 0,
          };
        }
      }

      // Get order data
      const orderData: StockOrderData = {
        id: order.id,
        tickerSymbol: order.tickerSymbol,
        companyName: updatedStock.companyName,
        stockType: order.stockType,
        orderType: order.orderType,
        shares: order.shares,
        pricePerShare: order.pricePerShare.toString(),
        totalAmount: order.totalAmount.toString(),
        createdAt: order.createdAt.toISOString(),
      };

      return { holding: holdingData!, order: orderData };
    });
  }

  /**
   * Get order history
   */
  async getOrderHistory(userId: string, limit: number = 50): Promise<StockOrderData[]> {
    const orders = await prisma.stockOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get stock names
    const orderData: StockOrderData[] = [];

    for (const order of orders) {
      let companyName = order.tickerSymbol;

      if (order.stockType === 'bot' && order.botStockId) {
        const botStock = await prisma.botStock.findUnique({
          where: { id: order.botStockId },
        });
        if (botStock) companyName = botStock.companyName;
      } else if (order.stockType === 'player' && order.playerStockId) {
        const playerStock = await prisma.playerStock.findUnique({
          where: { id: order.playerStockId },
        });
        if (playerStock) companyName = playerStock.companyName;
      }

      orderData.push({
        id: order.id,
        tickerSymbol: order.tickerSymbol,
        companyName,
        stockType: order.stockType,
        orderType: order.orderType,
        shares: order.shares,
        pricePerShare: order.pricePerShare.toString(),
        totalAmount: order.totalAmount.toString(),
        createdAt: order.createdAt.toISOString(),
      });
    }

    return orderData;
  }
}

export const stockService = new StockService();
