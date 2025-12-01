import { Router, Response } from 'express';
import { prisma } from '@mint/database';
import { AdminRequest } from '../middleware';
import { logger } from '../services/logger';

const router: ReturnType<typeof Router> = Router();

// Trading halt state
let tradingHalted = false;
let tradingHaltReason = '';

/**
 * GET /admin/stocks/status
 * Get stock market status
 */
router.get('/status', async (req: AdminRequest, res: Response) => {
  try {
    const [botStocks, playerStocks, recentTrades] = await Promise.all([
      prisma.botStock.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.playerStock.count({ where: { isListed: true } }),
      prisma.stockOrder.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        tradingHalted,
        tradingHaltReason,
        botStocks: botStocks.map(s => ({
          ...s,
          currentPrice: s.currentPrice.toString(),
          previousClose: s.previousClose.toString(),
          highPrice24h: s.highPrice24h.toString(),
          lowPrice24h: s.lowPrice24h.toString(),
          basePrice: s.basePrice.toString(),
        })),
        playerStocksCount: playerStocks,
        tradesLast24h: recentTrades,
      },
    });
  } catch (error) {
    logger.error('Error getting stock status', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get stock status' },
    });
  }
});

/**
 * POST /admin/stocks/halt-trading
 * Halt or resume trading
 */
router.post('/halt-trading', async (req: AdminRequest, res: Response) => {
  try {
    const { halt, reason } = req.body;

    if (typeof halt !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_VALUE', message: 'halt must be a boolean' },
      });
    }

    tradingHalted = halt;
    tradingHaltReason = reason || (halt ? 'Trading halted by admin' : '');

    logger.info('Trading halt toggled', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      halted: tradingHalted,
      reason: tradingHaltReason,
    });

    res.json({
      success: true,
      data: {
        tradingHalted,
        tradingHaltReason,
      },
    });
  } catch (error) {
    logger.error('Error toggling trading halt', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle trading halt' },
    });
  }
});

/**
 * GET /admin/stocks/bot
 * List all bot stocks
 */
router.get('/bot', async (req: AdminRequest, res: Response) => {
  try {
    const stocks = await prisma.botStock.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: stocks.map(s => ({
        ...s,
        currentPrice: s.currentPrice.toString(),
        previousClose: s.previousClose.toString(),
        highPrice24h: s.highPrice24h.toString(),
        lowPrice24h: s.lowPrice24h.toString(),
        basePrice: s.basePrice.toString(),
      })),
    });
  } catch (error) {
    logger.error('Error listing bot stocks', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list bot stocks' },
    });
  }
});

/**
 * PATCH /admin/stocks/bot/:id
 * Update a bot stock
 */
router.patch('/bot/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPrice, basePrice, volatility, trend, trendStrength, isActive } = req.body;

    const updateData: any = {};
    if (currentPrice !== undefined) {
      updateData.currentPrice = parseFloat(currentPrice);
      // Update high/low if needed
      const stock = await prisma.botStock.findUnique({ where: { id } });
      if (stock) {
        if (parseFloat(currentPrice) > Number(stock.highPrice24h)) {
          updateData.highPrice24h = parseFloat(currentPrice);
        }
        if (parseFloat(currentPrice) < Number(stock.lowPrice24h)) {
          updateData.lowPrice24h = parseFloat(currentPrice);
        }
      }
    }
    if (basePrice !== undefined) updateData.basePrice = parseFloat(basePrice);
    if (volatility !== undefined) updateData.volatility = parseFloat(volatility);
    if (trend !== undefined) updateData.trend = trend;
    if (trendStrength !== undefined) updateData.trendStrength = parseInt(trendStrength);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const stock = await prisma.botStock.update({
      where: { id },
      data: updateData,
    });

    logger.info('Bot stock updated', {
      adminId: req.admin?.id,
      stockId: id,
      ticker: stock.tickerSymbol,
      changes: updateData,
    });

    res.json({
      success: true,
      data: {
        ...stock,
        currentPrice: stock.currentPrice.toString(),
        basePrice: stock.basePrice.toString(),
      },
    });
  } catch (error) {
    logger.error('Error updating bot stock', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update bot stock' },
    });
  }
});

/**
 * POST /admin/stocks/bot/:id/reset-price
 * Reset a bot stock price to base price
 */
router.post('/bot/:id/reset-price', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;

    const stock = await prisma.botStock.findUnique({ where: { id } });
    if (!stock) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stock not found' },
      });
    }

    const updated = await prisma.botStock.update({
      where: { id },
      data: {
        currentPrice: stock.basePrice,
        previousClose: stock.basePrice,
        highPrice24h: stock.basePrice,
        lowPrice24h: stock.basePrice,
        trend: 'neutral',
        trendStrength: 1,
      },
    });

    logger.info('Bot stock price reset', {
      adminId: req.admin?.id,
      stockId: id,
      ticker: stock.tickerSymbol,
      newPrice: stock.basePrice.toString(),
    });

    res.json({
      success: true,
      data: {
        ...updated,
        currentPrice: updated.currentPrice.toString(),
      },
    });
  } catch (error) {
    logger.error('Error resetting bot stock price', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to reset stock price' },
    });
  }
});

/**
 * GET /admin/stocks/player
 * List all player stocks
 */
router.get('/player', async (req: AdminRequest, res: Response) => {
  try {
    const stocks = await prisma.playerStock.findMany({
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: stocks.map(s => ({
        ...s,
        currentPrice: s.currentPrice.toString(),
        previousClose: s.previousClose.toString(),
        marketCap: s.marketCap.toString(),
      })),
    });
  } catch (error) {
    logger.error('Error listing player stocks', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list player stocks' },
    });
  }
});

/**
 * PATCH /admin/stocks/player/:id
 * Update a player stock
 */
router.patch('/player/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPrice, isListed } = req.body;

    const updateData: any = {};
    if (currentPrice !== undefined) updateData.currentPrice = parseFloat(currentPrice);
    if (typeof isListed === 'boolean') updateData.isListed = isListed;

    const stock = await prisma.playerStock.update({
      where: { id },
      data: updateData,
    });

    logger.info('Player stock updated', {
      adminId: req.admin?.id,
      stockId: id,
      ticker: stock.tickerSymbol,
      changes: updateData,
    });

    res.json({
      success: true,
      data: {
        ...stock,
        currentPrice: stock.currentPrice.toString(),
      },
    });
  } catch (error) {
    logger.error('Error updating player stock', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update player stock' },
    });
  }
});

/**
 * DELETE /admin/stocks/player/:id
 * Delist a player stock (remove from market)
 */
router.delete('/player/:id', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const stock = await prisma.playerStock.update({
      where: { id },
      data: { isListed: false },
    });

    logger.info('Player stock delisted', {
      adminId: req.admin?.id,
      stockId: id,
      ticker: stock.tickerSymbol,
      reason,
    });

    res.json({
      success: true,
      message: 'Stock has been delisted',
    });
  } catch (error) {
    logger.error('Error delisting player stock', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delist stock' },
    });
  }
});

/**
 * GET /admin/stocks/suspicious
 * Detect potentially suspicious trading activity
 */
router.get('/suspicious', async (req: AdminRequest, res: Response) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find users with unusually high trading volume
    const highVolumeTraders = await prisma.stockOrder.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: oneDayAgo },
      },
      _count: true,
      _sum: {
        totalAmount: true,
      },
      having: {
        _count: {
          _all: { gt: 50 }, // More than 50 trades in 24h
        },
      },
    });

    // Get user details for high volume traders
    const userIds = highVolumeTraders.map(t => t.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, createdAt: true },
    });

    const suspicious = highVolumeTraders.map(t => ({
      user: users.find(u => u.id === t.userId),
      tradeCount: t._count,
      totalVolume: t._sum.totalAmount?.toString() || '0',
    }));

    res.json({
      success: true,
      data: suspicious,
    });
  } catch (error) {
    logger.error('Error detecting suspicious activity', { error });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to detect suspicious activity' },
    });
  }
});

// Export trading halt checker
export function isTradingHalted() {
  return tradingHalted;
}

export default router;
