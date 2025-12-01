import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@mint/database';
import { AppError } from '../middleware/errorHandler';
import { ErrorCodes } from '@mint/types';

/**
 * Trading Rules Service
 * Prevents exploits and maintains market integrity
 */
export class TradingRulesService {
  // Rate limiting
  private static MAX_TRADES_PER_MINUTE = 10;
  private static MAX_TRADES_PER_HOUR = 50;
  private static MIN_SECONDS_BETWEEN_TRADES = 3;

  // Position limits
  private static MAX_POSITION_PERCENTAGE = 25; // Max 25% of any stock
  private static MAX_SINGLE_TRADE_SHARES = 100000; // Max shares per trade
  private static MIN_HOLDING_PERIOD_SECONDS = 60; // Must hold for 60 seconds before selling

  // Price manipulation limits
  private static MAX_PRICE_IMPACT_PERCENT = 5; // Max 5% price move per trade
  private static WASH_TRADE_DETECTION_WINDOW_SECONDS = 300; // 5 minutes

  // Market cap limits
  private static MIN_MARKET_CAP = 10000; // $10K minimum
  private static MAX_MARKET_CAP_MULTIPLIER = 100; // Can't be more than 100x net worth

  /**
   * Check if user is a bot (exempt from some rules)
   */
  private static isBotUser(userId: string): boolean {
    return (
      userId === 'system-bot-trader' ||
      userId.includes('bot') ||
      userId.startsWith('system-')
    );
  }

  /**
   * Validate a buy order
   */
  static async validateBuy(
    userId: string,
    tickerSymbol: string,
    shares: number,
    pricePerShare: Decimal
  ): Promise<void> {
    const isBot = this.isBotUser(userId);

    // 1. Check if buying own stock (self-trading prevention) - skip for bots
    if (!isBot) {
      const playerStock = await prisma.playerStock.findFirst({
        where: { tickerSymbol: tickerSymbol.toUpperCase() },
      });

      if (playerStock && playerStock.userId === userId) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          'You cannot buy shares of your own company',
          400
        );
      }
    }

    // 2. Check rate limiting - skip for bots
    if (!isBot) {
      await this.checkRateLimit(userId);
    }

    // 3. Check position size limits
    await this.checkPositionLimits(userId, tickerSymbol, shares, 'buy');

    // 4. Check trade size limits
    if (shares > this.MAX_SINGLE_TRADE_SHARES) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Maximum ${this.MAX_SINGLE_TRADE_SHARES.toLocaleString()} shares per trade`,
        400
      );
    }

    // 5. Check wash trading (rapid buy/sell cycles) - skip for bots
    if (!isBot) {
      await this.checkWashTrading(userId, tickerSymbol, 'buy');
    }

    // 6. Check price impact (for large trades) - skip for bots (they can move markets)
    if (!isBot) {
      await this.checkPriceImpact(tickerSymbol, shares, pricePerShare, 'buy');
    }
  }

  /**
   * Validate a sell order
   */
  static async validateSell(
    userId: string,
    tickerSymbol: string,
    shares: number,
    pricePerShare: Decimal,
    holdingCreatedAt: Date
  ): Promise<void> {
    const isBot = this.isBotUser(userId);

    // 1. Check rate limiting - skip for bots
    if (!isBot) {
      await this.checkRateLimit(userId);
    }

    // 2. Check minimum holding period (prevent day trading exploits) - skip for bots
    if (!isBot) {
      const holdingAge = (Date.now() - holdingCreatedAt.getTime()) / 1000;
      if (holdingAge < this.MIN_HOLDING_PERIOD_SECONDS) {
        const remaining = Math.ceil(this.MIN_HOLDING_PERIOD_SECONDS - holdingAge);
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          `Must hold shares for at least ${this.MIN_HOLDING_PERIOD_SECONDS} seconds. Wait ${remaining} more seconds.`,
          400
        );
      }
    }

    // 3. Check trade size limits
    if (shares > this.MAX_SINGLE_TRADE_SHARES) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Maximum ${this.MAX_SINGLE_TRADE_SHARES.toLocaleString()} shares per trade`,
        400
      );
    }

    // 4. Check wash trading - skip for bots
    if (!isBot) {
      await this.checkWashTrading(userId, tickerSymbol, 'sell');
    }

    // 5. Check price impact - skip for bots (they can move markets)
    if (!isBot) {
      await this.checkPriceImpact(tickerSymbol, shares, pricePerShare, 'sell');
    }
  }

  /**
   * Validate IPO listing parameters
   */
  static async validateIPOListing(
    userId: string,
    marketCap: Decimal,
    sharePrice: Decimal,
    totalShares: number
  ): Promise<void> {
    // 1. Check minimum market cap
    if (marketCap.lessThan(this.MIN_MARKET_CAP)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Market cap must be at least $${this.MIN_MARKET_CAP.toLocaleString()}`,
        400
      );
    }

    // 2. Check market cap vs net worth (prevent unrealistic valuations)
    const { prestigeService } = await import('./prestige.service');
    const netWorth = await prestigeService.calculateNetWorth(userId);

    if (marketCap.greaterThan(netWorth.mul(this.MAX_MARKET_CAP_MULTIPLIER))) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Market cap cannot exceed ${this.MAX_MARKET_CAP_MULTIPLIER}x your net worth (${formatCurrency(netWorth.mul(this.MAX_MARKET_CAP_MULTIPLIER).toNumber())})`,
        400
      );
    }

    // 3. Check share price is reasonable
    if (sharePrice.lessThan(0.01)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Share price must be at least $0.01', 400);
    }

    if (sharePrice.greaterThan(10000)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Share price cannot exceed $10,000', 400);
    }

    // 4. Check total shares is reasonable
    if (totalShares < 1000) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Must have at least 1,000 total shares', 400);
    }

    if (totalShares > 1000000000) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Cannot have more than 1 billion shares',
        400
      );
    }
  }

  /**
   * Check rate limiting
   */
  private static async checkRateLimit(userId: string): Promise<void> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check trades in last minute
    const recentTrades = await prisma.stockOrder.count({
      where: {
        userId,
        createdAt: { gte: oneMinuteAgo },
      },
    });

    if (recentTrades >= this.MAX_TRADES_PER_MINUTE) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Too many trades. Maximum ${this.MAX_TRADES_PER_MINUTE} trades per minute.`,
        429
      );
    }

    // Check trades in last hour
    const hourlyTrades = await prisma.stockOrder.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (hourlyTrades >= this.MAX_TRADES_PER_HOUR) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Too many trades. Maximum ${this.MAX_TRADES_PER_HOUR} trades per hour.`,
        429
      );
    }

    // Check minimum time between trades
    const lastTrade = await prisma.stockOrder.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastTrade) {
      const timeSinceLastTrade = (now.getTime() - lastTrade.createdAt.getTime()) / 1000;
      if (timeSinceLastTrade < this.MIN_SECONDS_BETWEEN_TRADES) {
        const remaining = Math.ceil(this.MIN_SECONDS_BETWEEN_TRADES - timeSinceLastTrade);
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          `Please wait ${remaining} seconds between trades`,
          429
        );
      }
    }
  }

  /**
   * Check position size limits
   */
  private static async checkPositionLimits(
    userId: string,
    tickerSymbol: string,
    shares: number,
    action: 'buy' | 'sell'
  ): Promise<void> {
    if (action === 'sell') return; // Only check on buys

    // Get stock info
    const botStock = await prisma.botStock.findUnique({
      where: { tickerSymbol: tickerSymbol.toUpperCase() },
    });
    const playerStock = await prisma.playerStock.findFirst({
      where: { tickerSymbol: tickerSymbol.toUpperCase() },
    });

    const stock = botStock || playerStock;
    if (!stock) return;

    // Get current holding
    let currentHolding;
    if (botStock) {
      currentHolding = await prisma.stockHolding.findUnique({
        where: {
          userId_stockType_botStockId: {
            userId,
            stockType: 'bot',
            botStockId: botStock.id,
          },
        },
      });
    } else if (playerStock) {
      currentHolding = await prisma.stockHolding.findUnique({
        where: {
          userId_stockType_playerStockId: {
            userId,
            stockType: 'player',
            playerStockId: playerStock.id,
          },
        },
      });
    }

    const currentShares = currentHolding?.shares || 0;
    const newTotalShares = currentShares + shares;

    // Bot stocks have effectively infinite supply, use a fixed large number
    // Player stocks have actual totalShares
    let totalShares: number;
    if (botStock) {
      // Bot stocks: Use 1 million shares as the base for position limit calculation
      totalShares = 1000000;
    } else if (playerStock) {
      // Player stocks: Use actual totalShares
      totalShares = playerStock.totalShares || 1000000;
    } else {
      // Fallback (shouldn't happen)
      totalShares = 1000000;
    }

    const maxAllowedShares = Math.floor((totalShares * this.MAX_POSITION_PERCENTAGE) / 100);

    if (newTotalShares > maxAllowedShares) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Cannot own more than ${this.MAX_POSITION_PERCENTAGE}% of ${tickerSymbol.toUpperCase()}. Maximum: ${maxAllowedShares.toLocaleString()} shares`,
        400
      );
    }
  }

  /**
   * Check for wash trading (rapid buy/sell cycles)
   */
  private static async checkWashTrading(
    userId: string,
    tickerSymbol: string,
    action: 'buy' | 'sell'
  ): Promise<void> {
    const windowStart = new Date(Date.now() - this.WASH_TRADE_DETECTION_WINDOW_SECONDS * 1000);

    // Find recent opposite trades
    const oppositeAction = action === 'buy' ? 'sell' : 'buy';
    const recentOppositeTrades = await prisma.stockOrder.findMany({
      where: {
        userId,
        tickerSymbol: tickerSymbol.toUpperCase(),
        orderType: oppositeAction,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // If there are multiple rapid opposite trades, flag as wash trading
    if (recentOppositeTrades.length >= 3) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Wash trading detected. Please wait before trading this stock again.',
        400
      );
    }
  }

  /**
   * Check price impact of large trades
   * Only applies to player stocks - bot stocks have infinite supply
   */
  private static async checkPriceImpact(
    tickerSymbol: string,
    shares: number,
    pricePerShare: Decimal,
    action: 'buy' | 'sell'
  ): Promise<void> {
    // Get stock
    const botStock = await prisma.botStock.findUnique({
      where: { tickerSymbol: tickerSymbol.toUpperCase() },
    });
    const playerStock = await prisma.playerStock.findFirst({
      where: { tickerSymbol: tickerSymbol.toUpperCase() },
    });

    // Skip price impact check for bot stocks - they have infinite supply
    // and prices are algorithmically determined, not by trade volume
    if (botStock) {
      return;
    }

    // Only check price impact for player stocks
    if (!playerStock) return;

    // Calculate trade value as percentage of market cap
    const tradeValue = pricePerShare.mul(shares);

    // Calculate market cap from player stock
    let marketCap: Decimal;
    if (playerStock.marketCap && new Decimal(playerStock.marketCap).greaterThan(0)) {
      marketCap = new Decimal(playerStock.marketCap);
    } else {
      // Fallback: calculate from current price and total shares
      const currentPrice = playerStock.currentPrice
        ? new Decimal(playerStock.currentPrice)
        : new Decimal(0);
      const totalShares = playerStock.totalShares || 1000000;
      marketCap = currentPrice.mul(totalShares);
    }

    // Skip validation if market cap is invalid
    if (marketCap.lessThanOrEqualTo(0)) {
      return;
    }

    const tradePercentage = tradeValue.div(marketCap).mul(100);

    // Large trades should have price impact, but we limit it
    if (tradePercentage.greaterThan(this.MAX_PRICE_IMPACT_PERCENT)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Trade size too large. This trade would move the price more than ${this.MAX_PRICE_IMPACT_PERCENT}%. Please split into smaller trades.`,
        400
      );
    }
  }
}

// Helper function for currency formatting
function formatCurrency(amount: number): string {
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}
