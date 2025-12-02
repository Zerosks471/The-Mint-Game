import { Router, Response, NextFunction } from 'express';
import { stockService } from '../services/stock.service';
import { indexService } from '../services/index.service';
import { dividendService } from '../services/dividend.service';
import { circuitBreakerService } from '../services/circuitBreaker.service';
import { marketEventService } from '../services/marketEvent.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All stock routes require authentication
router.use(authenticate);

// GET /api/v1/stocks/market - Get all stocks (player + bot) with prices
router.get('/market', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stocks = await stockService.getMarketStocks();
    res.json({
      success: true,
      data: stocks,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/market/:ticker - Get single stock details
router.get(
  '/market/:ticker',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const ticker = req.params.ticker;
      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required',
        });
      }
      const stock = await stockService.getStockByTicker(ticker);
      if (!stock) {
        return res.status(404).json({
          success: false,
          error: 'Stock not found',
        });
      }
      res.json({
        success: true,
        data: stock,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/stocks/player - Get your own stock (if listed)
router.get('/player', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stock = await stockService.getPlayerStock(req.user!.id);
    res.json({
      success: true,
      data: stock,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/player/:userId - Get another player's stock (if listed)
router.get(
  '/player/:userId',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
      }
      const stock = await stockService.getPlayerStock(userId);
      res.json({
        success: true,
        data: stock,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/stocks/list - List your company stock
router.post('/list', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { tickerSymbol, companyName, marketCap, sharePrice, floatPercentage } = req.body;
    if (!tickerSymbol || !companyName) {
      return res.status(400).json({
        success: false,
        error: 'Ticker symbol and company name are required',
      });
    }
    const stock = await stockService.listPlayerStock(req.user!.id, tickerSymbol, companyName, {
      marketCap: marketCap ? parseFloat(marketCap) : undefined,
      sharePrice: sharePrice ? parseFloat(sharePrice) : undefined,
      floatPercentage: floatPercentage ? parseFloat(floatPercentage) : undefined,
    });
    res.json({
      success: true,
      data: stock,
      message: `Stock ${stock.tickerSymbol} listed successfully!`,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/stocks/list - Update company name
router.put('/list', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { companyName } = req.body;
    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required',
      });
    }
    const stock = await stockService.updatePlayerStockName(req.user!.id, companyName);
    res.json({
      success: true,
      data: stock,
      message: 'Company name updated successfully!',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/stocks/list - Delist your stock
router.delete('/list', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await stockService.delistPlayerStock(req.user!.id);
    res.json({
      success: true,
      message: 'Stock delisted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/portfolio - Get user's holdings
router.get('/portfolio', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const portfolio = await stockService.getPortfolio(req.user!.id);
    res.json({
      success: true,
      data: portfolio,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/stocks/buy - Buy shares
router.post('/buy', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { ticker, shares } = req.body;
    if (!ticker || !shares) {
      return res.status(400).json({
        success: false,
        error: 'Ticker and shares are required',
      });
    }
    const result = await stockService.buyShares(req.user!.id, ticker, shares);
    res.json({
      success: true,
      data: result,
      message: `Bought ${shares} shares of ${result.holding.tickerSymbol} for $${Number(result.order.totalAmount).toLocaleString()}`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/stocks/sell - Sell shares
router.post('/sell', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { ticker, shares } = req.body;
    if (!ticker || !shares) {
      return res.status(400).json({
        success: false,
        error: 'Ticker and shares are required',
      });
    }
    const result = await stockService.sellShares(req.user!.id, ticker, shares);
    res.json({
      success: true,
      data: result,
      message: `Sold ${shares} shares of ${result.order.tickerSymbol} for $${Number(result.order.totalAmount).toLocaleString()}`,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/orders - Get order history
router.get('/orders', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const orders = await stockService.getOrderHistory(req.user!.id, limit);
    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/trades - Get recent trades (all users, for live feed)
// No limit - show all trades for complete market visibility
router.get('/trades', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Optional limit from query, but default to no limit (undefined = all trades)
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const trades = await stockService.getRecentTrades(limit);
    res.json({
      success: true,
      data: trades,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/market-summary - Get market summary (top movers, volume leaders, active events)
router.get('/market-summary', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { botTraderService } = await import('../services/botTrader.service');

    // Get all stocks
    const stocks = await stockService.getMarketStocks();

    // Get active market events
    const activeEvents = botTraderService.getActiveEvents();

    // Calculate top gainers (sorted by positive change percentage)
    const topGainers = [...stocks]
      .filter(s => s.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5)
      .map(s => ({
        tickerSymbol: s.tickerSymbol,
        companyName: s.companyName,
        currentPrice: s.currentPrice,
        changePercent: s.changePercent,
        stockType: s.stockType,
      }));

    // Calculate top losers (sorted by negative change percentage)
    const topLosers = [...stocks]
      .filter(s => s.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5)
      .map(s => ({
        tickerSymbol: s.tickerSymbol,
        companyName: s.companyName,
        currentPrice: s.currentPrice,
        changePercent: s.changePercent,
        stockType: s.stockType,
      }));

    // Calculate volume leaders
    const volumeLeaders = [...stocks]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 5)
      .map(s => ({
        tickerSymbol: s.tickerSymbol,
        companyName: s.companyName,
        volume24h: s.volume24h,
        currentPrice: s.currentPrice,
        changePercent: s.changePercent,
        stockType: s.stockType,
      }));

    // Format active events
    const formattedEvents = activeEvents.map(e => ({
      tickerSymbol: e.tickerSymbol,
      type: e.type,
      magnitude: e.magnitude,
      startedAt: e.startedAt,
      remainingMs: Math.max(0, e.duration - (Date.now() - e.startedAt.getTime())),
    }));

    // Market overview stats
    const totalStocks = stocks.length;
    const gainersCount = stocks.filter(s => s.changePercent > 0).length;
    const losersCount = stocks.filter(s => s.changePercent < 0).length;
    const unchangedCount = totalStocks - gainersCount - losersCount;
    const totalVolume = stocks.reduce((sum, s) => sum + s.volume24h, 0);
    const avgChange = stocks.length > 0
      ? stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalStocks,
          gainersCount,
          losersCount,
          unchangedCount,
          totalVolume,
          avgChange,
        },
        topGainers,
        topLosers,
        volumeLeaders,
        activeEvents: formattedEvents,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/indices - Get all indices
router.get('/indices', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const indices = await indexService.getAllIndices();
    res.json({
      success: true,
      data: indices,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/indices/:ticker - Get index detail with components
router.get(
  '/indices/:ticker',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const ticker = req.params.ticker;
      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: 'Ticker symbol is required',
        });
      }
      const index = await indexService.getIndexByTicker(ticker);
      if (!index) {
        return res.status(404).json({
          success: false,
          error: 'Index not found',
        });
      }
      res.json({
        success: true,
        data: index,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/stocks/dividends - Get player dividend summary (auth required)
router.get('/dividends', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const summary = await dividendService.getPlayerDividendSummary(req.user!.id);
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/dividends/history - Get dividend history (auth required)
router.get(
  '/dividends/history',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const history = await dividendService.getPlayerDividendHistory(req.user!.id, limit);
      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/stocks/events - Get active market events
router.get('/events', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const events = await marketEventService.getActiveEvents(limit);
    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/halts - Get circuit breaker status
router.get('/halts', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = circuitBreakerService.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
