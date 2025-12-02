import { useEffect, useState, useCallback } from 'react';
import {
  gameApi,
  StockMarketData,
  StockDetail,
  StockHoldingData,
  StockOrderData,
} from '../api/game';
import { formatCurrency } from '@mint/utils';
import { StockTradingModal } from '../components/StockTradingModal';
import { StockChart } from '../components/StockChart';
import { MarketStatus } from '../components/MarketStatus';
import { LiveTradesFeed } from '../components/LiveTradesFeed';
import { useGameStore } from '../stores/gameStore';
import { MiniSparkline } from '../components/ui';

// New cyberpunk stock components
import { StockTickerTape } from '../components/stocks/StockTickerTape';
import { HaltedStocksBanner } from '../components/stocks/HaltedStocksBanner';
import { StockIndexCard } from '../components/stocks/StockIndexCard';
import { MarketEventsFeed } from '../components/stocks/MarketEventsFeed';
import { DividendSummary } from '../components/stocks/DividendSummary';

// Import cyberpunk CSS
import '../styles/cyberpunk-stocks.css';

// Generate simulated price history for sparkline based on current price and trend
function generateSparklineData(currentPrice: number, changePercent: number, points: number = 12): number[] {
  const startPrice = currentPrice / (1 + changePercent / 100);
  const data: number[] = [];

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    // Add some random noise but trend towards current price
    const trendPrice = startPrice + (currentPrice - startPrice) * progress;
    const noise = trendPrice * (Math.random() - 0.5) * 0.02; // 2% noise
    data.push(trendPrice + noise);
  }

  // Ensure last point is exactly current price
  data[data.length - 1] = currentPrice;
  return data;
}

type TabType = 'market' | 'portfolio' | 'company' | 'dividends';

export function StocksPage() {
  const [activeTab, setActiveTab] = useState<TabType>('market');
  const [stocks, setStocks] = useState<StockMarketData[]>([]);
  const [portfolio, setPortfolio] = useState<StockHoldingData[]>([]);
  const [orders, setOrders] = useState<StockOrderData[]>([]);
  const [playerStock, setPlayerStock] = useState<StockDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradingModal, setTradingModal] = useState<{
    stock: StockDetail | null;
    type: 'buy' | 'sell';
    maxShares?: number;
  } | null>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [listModal, setListModal] = useState(false);
  const [tickerSymbol, setTickerSymbol] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isListing, setIsListing] = useState(false);
  const [marketCap, setMarketCap] = useState<string>('');
  const [marketCapPreset, setMarketCapPreset] = useState<string>('custom');
  const [sharePrice, setSharePrice] = useState<string>('');
  const [floatPercentage, setFloatPercentage] = useState<number>(50);
  const [selectedStock, setSelectedStock] = useState<StockDetail | null>(null);
  const [priceHistory, setPriceHistory] = useState<Array<{ time: number; price: number }>>([]);
  const [showDelistConfirm, setShowDelistConfirm] = useState(false);
  const refreshStats = useGameStore((s) => s.refreshStats);

  const fetchMarketStocks = useCallback(async () => {
    try {
      const res = await gameApi.getMarketStocks();
      if (res.success && res.data) {
        setStocks(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch market stocks:', err);
    }
  }, []);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await gameApi.getPortfolio();
      if (res.success && res.data) {
        setPortfolio(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await gameApi.getStockOrderHistory(50);
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  }, []);

  const fetchPlayerStock = useCallback(async () => {
    try {
      const res = await gameApi.getPlayerStock();
      if (res.success) {
        setPlayerStock(res.data || null);
      }
    } catch (err) {
      console.error('Failed to fetch player stock:', err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchMarketStocks(),
        fetchPortfolio(),
        fetchOrders(),
        fetchPlayerStock(),
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchMarketStocks, fetchPortfolio, fetchOrders, fetchPlayerStock]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Poll for market updates - more frequent for real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'market') {
        fetchMarketStocks();
      }
      if (activeTab === 'portfolio') {
        fetchPortfolio();
        fetchMarketStocks(); // To get updated prices
      }
    }, 5000); // Every 5 seconds for more real-time updates

    return () => clearInterval(interval);
  }, [activeTab, fetchMarketStocks, fetchPortfolio]);


  const handleBuy = async (ticker: string) => {
    try {
      const res = await gameApi.getStockByTicker(ticker);
      if (res.success && res.data) {
        setTradingModal({
          stock: res.data,
          type: 'buy',
        });
      }
    } catch (err) {
      setError('Failed to load stock details');
    }
  };

  const handleSell = async (ticker: string) => {
    try {
      const holding = portfolio.find((h) => h.tickerSymbol === ticker);
      if (!holding) return;

      const res = await gameApi.getStockByTicker(ticker);
      if (res.success && res.data) {
        setTradingModal({
          stock: res.data,
          type: 'sell',
          maxShares: holding.shares,
        });
      }
    } catch (err) {
      setError('Failed to load stock details');
    }
  };

  const handleViewStock = async (ticker: string) => {
    try {
      const res = await gameApi.getStockByTicker(ticker);
      if (res.success && res.data) {
        setSelectedStock(res.data);
        // Generate deterministic price history based on stock data
        // TODO: Replace with API-backed history when available
        const history: Array<{ time: number; price: number }> = [];
        const now = Date.now() / 1000;
        const currentPrice = parseFloat(res.data.currentPrice);
        const highPrice = parseFloat(res.data.highPrice24h);
        const lowPrice = parseFloat(res.data.lowPrice24h);

        // Create a deterministic seed from ticker symbol
        const seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        for (let i = 24; i >= 0; i--) {
          const time = now - i * 3600; // Every hour for 24 hours
          // Generate deterministic variation based on seed and index
          const deterministicValue = Math.sin(seed + i * 0.5) * 0.5 + 0.5; // 0 to 1

          // Interpolate between low and high prices with deterministic variation
          const priceRange = highPrice - lowPrice;
          const baseForHour = lowPrice + (priceRange * deterministicValue);

          // Smooth transition toward current price at end
          const progressToNow = 1 - (i / 24);
          const price = i === 0
            ? currentPrice
            : baseForHour * (1 - progressToNow * 0.3) + currentPrice * progressToNow * 0.3;

          history.push({
            time: Math.floor(time),
            price: Math.max(0.01, price),
          });
        }
        setPriceHistory(history);
      }
    } catch (err) {
      setError('Failed to load stock details');
    }
  };

  const handleTradeConfirm = async (shares: number) => {
    if (!tradingModal?.stock) return;

    setIsTrading(true);
    try {
      if (tradingModal.type === 'buy') {
        const res = await gameApi.buyStockShares(tradingModal.stock.tickerSymbol, shares);
        if (res.success) {
          await Promise.all([fetchMarketStocks(), fetchPortfolio(), fetchOrders()]);
          refreshStats();
          setTradingModal(null);
          } else {
          throw new Error(res.error?.message || 'Failed to buy shares');
        }
      } else {
        const res = await gameApi.sellStockShares(tradingModal.stock.tickerSymbol, shares);
        if (res.success) {
          await Promise.all([fetchMarketStocks(), fetchPortfolio(), fetchOrders()]);
        refreshStats();
          setTradingModal(null);
        } else {
          throw new Error(res.error?.message || 'Failed to sell shares');
        }
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${tradingModal.type} shares`);
    } finally {
      setIsTrading(false);
    }
  };

  const handleListStock = async () => {
    if (!tickerSymbol || !companyName) {
      setError('Ticker symbol and company name are required');
      return;
    }

    setIsListing(true);
    try {
      const options: {
        marketCap?: number;
        sharePrice?: number;
        floatPercentage?: number;
      } = {
        floatPercentage: floatPercentage,
      };

      if (marketCap) {
        options.marketCap = parseFloat(marketCap);
      }
      if (sharePrice) {
        options.sharePrice = parseFloat(sharePrice);
      }

      const res = await gameApi.listPlayerStock(tickerSymbol.toUpperCase(), companyName, options);
      if (res.success && res.data) {
        setPlayerStock(res.data);
        setListModal(false);
        setTickerSymbol('');
        setCompanyName('');
        setMarketCap('');
        setMarketCapPreset('custom');
        setSharePrice('');
        setFloatPercentage(50);
        await fetchMarketStocks();
      } else {
        throw new Error(res.error?.message || 'Failed to list stock');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to list stock');
    } finally {
      setIsListing(false);
    }
  };

  // Calculate derived values for display
  const calculateDerivedValues = () => {
    const cap = marketCap ? parseFloat(marketCap) : null;
    const price = sharePrice ? parseFloat(sharePrice) : null;

    if (cap && price && price > 0) {
      const totalShares = Math.floor(cap / price);
      const floatShares = Math.floor((totalShares * floatPercentage) / 100);
      const ownerShares = totalShares - floatShares;
      return { totalShares, floatShares, ownerShares };
    }
    return null;
  };

  const derivedValues = calculateDerivedValues();

  const handleUpdateCompanyName = async () => {
    if (!companyName) {
      setError('Company name is required');
      return;
    }

    setIsListing(true);
    try {
      const res = await gameApi.updatePlayerStockName(companyName);
      if (res.success && res.data) {
        setPlayerStock(res.data);
        setListModal(false);
        setCompanyName('');
        await fetchMarketStocks();
      } else {
        throw new Error(res.error?.message || 'Failed to update company name');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update company name');
    } finally {
      setIsListing(false);
    }
  };

  const handleDelistConfirm = async () => {
    setShowDelistConfirm(false);
    setIsListing(true);
    try {
      const res = await gameApi.delistPlayerStock();
      if (res.success) {
        setPlayerStock(null);
        await fetchMarketStocks();
      } else {
        throw new Error(res.error?.message || 'Failed to delist stock');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delist stock');
    } finally {
      setIsListing(false);
    }
  };

  const handleDelist = () => {
    setShowDelistConfirm(true);
  };

  // Calculate MINT35 Index (mock data for now)
  const calculateMINT35Index = () => {
    if (stocks.length === 0) return null;

    const totalValue = stocks.reduce((sum, stock) => sum + parseFloat(stock.currentPrice), 0);
    const avgChange = stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / stocks.length;
    const avgPrice = totalValue / stocks.length;

    return {
      symbol: 'MINT35',
      name: 'MINT 35 Index',
      value: avgPrice * 10, // Scale for visual effect
      change: avgChange,
      changePercent: avgChange,
      high24h: avgPrice * 10 * 1.05,
      low24h: avgPrice * 10 * 0.95,
      sparklineData: generateSparklineData(avgPrice * 10, avgChange),
    };
  };

  // Calculate Sector ETFs (mock data based on sectors)
  const calculateSectorETFs = () => {
    const sectors = ['MTEK', 'MFIN', 'MHLTH', 'MENR', 'MCON', 'MIND'];
    const sectorNames: Record<string, string> = {
      MTEK: 'Tech Sector ETF',
      MFIN: 'Finance Sector ETF',
      MHLTH: 'Health Sector ETF',
      MENR: 'Energy Sector ETF',
      MCON: 'Consumer Sector ETF',
      MIND: 'Industrial Sector ETF',
    };

    return sectors.map((sector) => {
      const baseValue = 100 + Math.random() * 50;
      const change = (Math.random() - 0.5) * 10;
      return {
        symbol: sector,
        name: sectorNames[sector] || `${sector} ETF`,
        value: baseValue,
        change: change,
        changePercent: (change / baseValue) * 100,
        high24h: baseValue * 1.03,
        low24h: baseValue * 0.97,
        sparklineData: generateSparklineData(baseValue, (change / baseValue) * 100),
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="cyberpunk-spinner"></div>
      </div>
    );
  }

  const totalPortfolioValue = portfolio.reduce(
    (sum, h) => sum + parseFloat(h.currentValue),
    0
  );
  const totalProfitLoss = portfolio.reduce((sum, h) => sum + parseFloat(h.profitLoss), 0);
  const totalProfitLossPercent =
    portfolio.reduce((sum, h) => sum + parseFloat(h.totalInvested), 0) > 0
      ? (totalProfitLoss / portfolio.reduce((sum, h) => sum + parseFloat(h.totalInvested), 0)) * 100
      : 0;

  const mint35Index = calculateMINT35Index();
  const sectorETFs = calculateSectorETFs();

  // Mock dividend data (TODO: Connect to real API)
  const dividendData = {
    todayEarnings: 125.50,
    weekEarnings: 892.30,
    allTimeEarnings: 5420.75,
    lastPayoutAt: new Date(Date.now() - 3600000).toISOString(),
    nextPayoutIn: 7200, // 2 hours in seconds
  };

  return (
    <div className="cyberpunk-grid-bg min-h-screen pb-8">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Halted Stocks Banner - conditionally rendered */}
        {/* TODO: Connect to real halt data from API */}
        {/* <HaltedStocksBanner haltedStocks={[]} /> */}

        {/* Stock Ticker Tape */}
        <StockTickerTape onTickerClick={handleViewStock} speed={60} />

        {/* MINT35 Index and Sector ETFs */}
        {mint35Index && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Large MINT35 Index Card */}
            <div className="lg:col-span-1">
              <StockIndexCard index={mint35Index} onClick={() => setActiveTab('market')} />
            </div>

            {/* Sector ETF Grid */}
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
              {sectorETFs.map((etf) => (
                <StockIndexCard key={etf.symbol} index={etf} onClick={() => setActiveTab('market')} />
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-dark-border pb-2">
          <button
            onClick={() => setActiveTab('market')}
            className={`px-4 py-2 rounded-lg font-medium transition-all cyberpunk-btn-secondary ${
              activeTab === 'market'
                ? 'bg-mint/20 text-mint border-mint'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-dark-elevated'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 rounded-lg font-medium transition-all cyberpunk-btn-secondary ${
              activeTab === 'portfolio'
                ? 'bg-mint/20 text-mint border-mint'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-dark-elevated'
            }`}
          >
            Portfolio
            {portfolio.length > 0 && (
              <span className="ml-2 text-xs bg-mint/20 text-mint px-2 py-0.5 rounded">
                {portfolio.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`px-4 py-2 rounded-lg font-medium transition-all cyberpunk-btn-secondary ${
              activeTab === 'company'
                ? 'bg-mint/20 text-mint border-mint'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-dark-elevated'
            }`}
          >
            My Company
          </button>
          <button
            onClick={() => setActiveTab('dividends')}
            className={`px-4 py-2 rounded-lg font-medium transition-all cyberpunk-btn-secondary ${
              activeTab === 'dividends'
                ? 'bg-mint/20 text-mint border-mint'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-dark-elevated'
            }`}
          >
            Dividends
          </button>
        </div>

        {/* Market Tab */}
        {activeTab === 'market' && (
          <div className="space-y-4">
            {/* Market Status */}
            <MarketStatus />

            {/* Main Chart View */}
            {selectedStock ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedStock(null)}
                    className="px-4 py-2 bg-dark-elevated hover:bg-dark-border text-zinc-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    ← Back to Market
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBuy(selectedStock.tickerSymbol)}
                      className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      Buy
                    </button>
                    {portfolio.find((h) => h.tickerSymbol === selectedStock.tickerSymbol) && (
                      <button
                        onClick={() => handleSell(selectedStock.tickerSymbol)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        Sell
                      </button>
                    )}
                  </div>
                </div>

                {/* Professional Chart */}
                <div className="w-full min-w-0 cyberpunk-chart-container">
                  <StockChart
                    ticker={selectedStock.tickerSymbol}
                    priceHistory={priceHistory}
                    currentPrice={parseFloat(selectedStock.currentPrice)}
                    previousClose={parseFloat(selectedStock.previousClose)}
                    height={500}
                  />
                </div>

                {/* Stock Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="cyberpunk-card p-4">
                    <p className="text-xs text-zinc-500 uppercase mb-1">High 24h</p>
                    <p className="text-lg font-bold text-zinc-100 font-mono cyberpunk-price-positive">
                      ${parseFloat(selectedStock.highPrice24h).toFixed(2)}
                    </p>
              </div>
                  <div className="cyberpunk-card p-4">
                    <p className="text-xs text-zinc-500 uppercase mb-1">Low 24h</p>
                    <p className="text-lg font-bold text-zinc-100 font-mono cyberpunk-price-negative">
                      ${parseFloat(selectedStock.lowPrice24h).toFixed(2)}
                    </p>
              </div>
                  <div className="cyberpunk-card p-4">
                    <p className="text-xs text-zinc-500 uppercase mb-1">Volume</p>
                    <p className="text-lg font-bold text-zinc-100 font-mono">
                      {selectedStock.volume24h.toLocaleString()}
                    </p>
              </div>
                  {selectedStock.marketCap && (
                    <div className="cyberpunk-card p-4">
                      <p className="text-xs text-zinc-500 uppercase mb-1">Market Cap</p>
                      <p className="text-lg font-bold text-zinc-100">
                        {formatCurrency(parseFloat(selectedStock.marketCap))}
                      </p>
              </div>
                  )}
            </div>

                {/* Company Info */}
                <div className="cyberpunk-card p-4">
                  <h3 className="font-bold text-zinc-100 mb-2 cyberpunk-glow-text">{selectedStock.companyName}</h3>
                  {selectedStock.description && (
                    <p className="text-sm text-zinc-400">{selectedStock.description}</p>
                  )}
                  {selectedStock.sector && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Sector:</span>
                      <span className="text-xs bg-mint/20 text-mint px-2 py-1 rounded uppercase">
                        {selectedStock.sector}
                      </span>
              </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Market Overview - Professional Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* Main Market Table - Takes 3/4 width */}
                  <div className="lg:col-span-3">
            <div className="cyberpunk-card overflow-hidden">
                      {/* Table Header */}
                      <div className="bg-dark-elevated border-b border-dark-border px-4 py-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-bold text-zinc-100 cyberpunk-glow-text">Market</h2>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>{stocks.length} stocks</span>
              </div>
                        </div>
                      </div>

                      {/* Stocks Table */}
              <div className="overflow-x-auto cyberpunk-scrollbar">
                <table className="w-full cyberpunk-table">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                Symbol
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                Company
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                Price
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                Change
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                Volume
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                Actions
                              </th>
                    </tr>
                  </thead>
                          <tbody>
                            {stocks.map((stock) => {
                              const hasHolding = portfolio.find((h) => h.tickerSymbol === stock.tickerSymbol);

                              const currentPrice = parseFloat(stock.currentPrice);
                              const previousClose = parseFloat(stock.previousClose);
                              const hasValidPreviousClose =
                                Number.isFinite(previousClose) && previousClose > 0;
                              const priceChange = hasValidPreviousClose
                                ? currentPrice - previousClose
                                : 0;
                              const priceChangePercent = hasValidPreviousClose
                                ? (priceChange / previousClose) * 100
                                : 0;
                              const isPositive = priceChange >= 0;

                              return (
                                <tr
                                  key={stock.tickerSymbol}
                                  className="hover:bg-dark-elevated/30 transition-colors cursor-pointer border-b border-dark-border/50"
                                  onClick={() => handleViewStock(stock.tickerSymbol)}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-zinc-100 cyberpunk-glow-text-pink">{stock.tickerSymbol}</span>
                                      {stock.stockType === 'player' && (
                                        <span className="text-[10px] bg-mint/20 text-mint px-1.5 py-0.5 rounded uppercase">
                                          Player
                                        </span>
                                      )}
                                      {stock.sector && (
                                        <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded uppercase">
                                          {stock.sector}
                                        </span>
                                      )}
                                    </div>
                        </td>
                                  <td className="px-4 py-3">
                                    <p className="text-sm text-zinc-300">{stock.companyName}</p>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <p className="cyberpunk-price text-zinc-100 transition-colors duration-300">
                                      ${currentPrice.toFixed(2)}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className={`flex items-center justify-end gap-1 font-medium transition-colors duration-300 ${
                                      isPositive ? 'cyberpunk-price-positive' : 'cyberpunk-price-negative'
                                    }`}>
                                      <span>{isPositive ? '↑' : '↓'}</span>
                                      <span>
                                        {isPositive ? '+' : ''}
                                        {priceChangePercent.toFixed(2)}%
                                      </span>
                                      <span className="text-zinc-500 text-xs ml-1">
                                        ({isPositive ? '+' : ''}${Math.abs(priceChange).toFixed(2)})
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <p className="text-sm text-zinc-400 font-mono">
                                      {stock.volume24h.toLocaleString()}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => handleBuy(stock.tickerSymbol)}
                                        className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded text-xs font-medium transition-colors"
                                      >
                                        Buy
                                      </button>
                                      {hasHolding && (
                                        <button
                                          onClick={() => handleSell(stock.tickerSymbol)}
                                          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded text-xs font-medium transition-colors"
                                        >
                                          Sell
                                        </button>
                                      )}
                                    </div>
                        </td>
                      </tr>
                              );
                            })}
                  </tbody>
                </table>
                        {stocks.length === 0 && (
                          <div className="text-center py-12 text-zinc-500">
                            <p>No stocks available</p>
              </div>
                        )}
            </div>
                    </div>
                  </div>

                  {/* Market Events Feed & Live Trades - Takes 1/4 width */}
                  <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
                    <MarketEventsFeed onTickerClick={handleViewStock} maxEvents={5} />
                    <LiveTradesFeed />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
              <div className="space-y-6">
            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Portfolio Value */}
              <div className="bg-gradient-to-br from-dark-card to-dark-elevated border-l-4 border-l-cyan-500 border border-dark-border rounded-xl p-5 cyberpunk-card-pink">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Portfolio Value</p>
                </div>
                <p className="text-3xl font-bold text-zinc-100 mb-1 cyberpunk-price-large">
                  {formatCurrency(totalPortfolioValue)}
                </p>
                <p className="text-xs text-zinc-500">Current market value</p>
              </div>

              {/* Total Invested */}
              <div className="bg-gradient-to-br from-dark-card to-dark-elevated border-l-4 border-l-blue-500 border border-dark-border rounded-xl p-5 cyberpunk-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Invested</p>
                </div>
                <p className="text-3xl font-bold text-zinc-100 mb-1 cyberpunk-price-large">
                  {formatCurrency(
                    portfolio.reduce((sum, h) => sum + parseFloat(h.totalInvested), 0)
                  )}
                </p>
                <p className="text-xs text-zinc-500">Your initial investment</p>
              </div>

              {/* Total Profit/Loss */}
              <div className={`bg-gradient-to-br from-dark-card to-dark-elevated border-l-4 ${
                totalProfitLoss >= 0 ? 'border-l-green-500 cyberpunk-card-green' : 'border-l-red-500 cyberpunk-card-pink'
              } border border-dark-border rounded-xl p-5`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    totalProfitLoss >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <svg className={`w-4 h-4 ${totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {totalProfitLoss >= 0 ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      )}
                    </svg>
                  </div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Profit/Loss</p>
                </div>
                <p
                  className={`text-3xl font-bold mb-1 cyberpunk-price-large ${
                    totalProfitLoss >= 0 ? 'cyberpunk-price-positive' : 'cyberpunk-price-negative'
                  }`}
                >
                  {totalProfitLoss >= 0 ? '+' : ''}
                  {formatCurrency(totalProfitLoss)}
                </p>
                <p className={`text-xs ${totalProfitLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalProfitLossPercent >= 0 ? '+' : ''}
                  {totalProfitLossPercent.toFixed(2)}% return
                </p>
              </div>

              {/* Holdings Count */}
              <div className="bg-gradient-to-br from-dark-card to-dark-elevated border-l-4 border-l-purple-500 border border-dark-border rounded-xl p-5 cyberpunk-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Holdings</p>
                </div>
                <p className="text-3xl font-bold text-zinc-100 mb-1 cyberpunk-price-large">
                  {portfolio.length}
                </p>
                <p className="text-xs text-zinc-500">
                  {portfolio.reduce((sum, h) => sum + h.shares, 0).toLocaleString()} total shares
                </p>
              </div>
            </div>

            {/* Portfolio Performance Breakdown */}
            {portfolio.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Top Performers */}
                <div className="cyberpunk-card p-4">
                  <h3 className="text-sm font-bold text-zinc-300 mb-3 uppercase tracking-wider">Top Performers</h3>
                  <div className="space-y-2">
                    {[...portfolio]
                      .sort((a, b) => b.profitLossPercent - a.profitLossPercent)
                      .slice(0, 3)
                      .map((holding) => (
                        <div key={holding.id} className="flex items-center justify-between py-2 px-3 bg-dark-elevated rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-100 text-sm">{holding.tickerSymbol}</span>
                    </div>
                          <span className={`text-sm font-medium ${
                            parseFloat(holding.profitLoss) >= 0 ? 'cyberpunk-price-positive' : 'cyberpunk-price-negative'
                          }`}>
                            {holding.profitLossPercent >= 0 ? '+' : ''}
                            {holding.profitLossPercent.toFixed(2)}%
                          </span>
                    </div>
                      ))}
                    </div>
                </div>

                {/* Portfolio Allocation */}
                <div className="cyberpunk-card p-4">
                  <h3 className="text-sm font-bold text-zinc-300 mb-3 uppercase tracking-wider">Allocation</h3>
                  <div className="space-y-2">
                    {[...portfolio]
                      .sort((a, b) => parseFloat(b.currentValue) - parseFloat(a.currentValue))
                      .slice(0, 5)
                      .map((holding) => {
                        // Guard against division by zero
                        const percentage = totalPortfolioValue > 0
                          ? (parseFloat(holding.currentValue) / totalPortfolioValue) * 100
                          : 0;
                        return (
                          <div key={holding.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">{holding.tickerSymbol}</span>
                              <span className="text-zinc-300 font-medium">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 bg-dark-elevated rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-mint to-cyan-400 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                {/* Quick Stats */}
                <div className="cyberpunk-card p-4">
                  <h3 className="text-sm font-bold text-zinc-300 mb-3 uppercase tracking-wider">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Winning Positions</span>
                      <span className="text-sm font-bold text-green-400">
                        {portfolio.filter((h) => parseFloat(h.profitLoss) > 0).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Losing Positions</span>
                      <span className="text-sm font-bold text-red-400">
                        {portfolio.filter((h) => parseFloat(h.profitLoss) < 0).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Avg Return</span>
                      <span className={`text-sm font-bold ${
                        totalProfitLossPercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {totalProfitLossPercent >= 0 ? '+' : ''}
                        {totalProfitLossPercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Largest Position</span>
                      <span className="text-sm font-bold text-zinc-300">
                        {portfolio.length > 0
                          ? [...portfolio].sort((a, b) => parseFloat(b.currentValue) - parseFloat(a.currentValue))[0].tickerSymbol
                          : 'N/A'}
                      </span>
                  </div>
                  </div>
                </div>
              </div>
            )}

            {/* Holdings List */}
            {portfolio.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-zinc-100 cyberpunk-glow-text">Your Holdings</h2>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>Sort by:</span>
                    <select
                      onChange={(e) => {
                        // Client-side sorting - creates new array to avoid mutating state
                        // Note: Sort preference is purely for display, original order preserved on refetch
                        const sortedPortfolio = [...portfolio].sort((a, b) => {
                          switch (e.target.value) {
                            case 'value':
                              return parseFloat(b.currentValue) - parseFloat(a.currentValue);
                            case 'profit':
                              return parseFloat(b.profitLoss) - parseFloat(a.profitLoss);
                            case 'ticker':
                              return a.tickerSymbol.localeCompare(b.tickerSymbol);
                            default:
                              return 0;
                          }
                        });
                        setPortfolio(sortedPortfolio);
                      }}
                      className="bg-dark-elevated border border-dark-border rounded px-2 py-1 text-zinc-300"
                    >
                      <option value="value">Value</option>
                      <option value="profit">Profit/Loss</option>
                      <option value="ticker">Ticker</option>
                    </select>
                </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {portfolio.map((holding) => {
                    const stock = stocks.find((s) => s.tickerSymbol === holding.tickerSymbol);
                    if (!stock) return null;
                    const profitLoss = parseFloat(holding.profitLoss);
                    const profitLossPercent = holding.profitLossPercent;
                    const isProfit = profitLoss >= 0;
                    const sparklineData = generateSparklineData(
                      parseFloat(holding.currentPrice),
                      stock.changePercent
                    );

                    return (
                      <div
                        key={holding.id}
                        className={`bg-gradient-to-br from-dark-card to-dark-elevated border rounded-xl p-5 hover:border-mint/30 transition-all cyberpunk-card ${
                          isProfit ? 'border-l-green-500/50' : 'border-l-red-500/50'
                        } border-l-4`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-zinc-100 text-xl cyberpunk-glow-text-pink">{holding.tickerSymbol}</h3>
                              <MiniSparkline data={sparklineData} width={50} height={20} />
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                holding.stockType === 'bot'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-purple-500/20 text-purple-400'
                              } uppercase`}>
                                {holding.stockType}
                              </span>
                      </div>
                            <p className="text-sm text-zinc-400 mb-2">{holding.companyName}</p>

                            {/* Profit/Loss Badge */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                              isProfit
                                ? 'bg-green-500/10 border border-green-500/20'
                                : 'bg-red-500/10 border border-red-500/20'
                            }`}>
                              <span className={`text-lg font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                                {isProfit ? '↑' : '↓'}
                              </span>
                              <div>
                                <p className={`text-sm font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                                  {isProfit ? '+' : ''}
                                  {formatCurrency(profitLoss)}
                                </p>
                                <p className={`text-xs ${isProfit ? 'text-green-400/80' : 'text-red-400/80'}`}>
                                  {isProfit ? '+' : ''}
                                  {profitLossPercent.toFixed(2)}%
                                </p>
                    </div>
                      </div>
                    </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-zinc-100 font-mono mb-1 cyberpunk-price-large">
                              {formatCurrency(parseFloat(holding.currentValue))}
                            </p>
                            <p className="text-xs text-zinc-500">Current Value</p>
                      </div>
                    </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-dark-base/50 rounded-lg">
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Shares</p>
                            <p className="text-sm font-bold text-zinc-100">{holding.shares.toLocaleString()}</p>
                      </div>
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Avg Buy Price</p>
                            <p className="text-sm font-bold text-zinc-100 font-mono cyberpunk-price">
                              ${parseFloat(holding.avgBuyPrice).toFixed(2)}
                            </p>
                    </div>
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Current Price</p>
                            <p className="text-sm font-bold text-zinc-100 font-mono cyberpunk-price">
                              ${parseFloat(holding.currentPrice).toFixed(2)}
                            </p>
                  </div>
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Total Invested</p>
                            <p className="text-sm font-bold text-zinc-100 font-mono cyberpunk-price">
                              {formatCurrency(parseFloat(holding.totalInvested))}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewStock(holding.tickerSymbol)}
                            className="flex-1 py-2.5 bg-dark-elevated hover:bg-dark-border text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            View Chart
                          </button>
                          <button
                            onClick={() => handleSell(holding.tickerSymbol)}
                            className="flex-1 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                          >
                            Sell Shares
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="cyberpunk-card p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4">📈</div>
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">No Holdings Yet</h3>
                  <p className="text-zinc-400 mb-6">
                    Start building your portfolio by investing in stocks from the Market tab.
                  </p>
                  <button
                    onClick={() => setActiveTab('market')}
                    className="px-6 py-3 cyberpunk-btn transition-colors"
                  >
                    Browse Market
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Company Tab */}
        {activeTab === 'company' && (
          <div className="space-y-4">
            {playerStock ? (
              <div className="cyberpunk-card p-6">
                <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold text-zinc-100 cyberpunk-glow-text">{playerStock.tickerSymbol}</h2>
                      <span className="text-xs bg-mint/20 text-mint px-2 py-1 rounded">Listed</span>
                </div>
                    <p className="text-zinc-400">{playerStock.companyName}</p>
              </div>
                  <button
                    onClick={handleDelist}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    Delist
                  </button>
            </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-1">Current Price</p>
                    <p className="text-xl font-bold text-zinc-100 font-mono cyberpunk-price">
                      ${parseFloat(playerStock.currentPrice).toFixed(2)}
                    </p>
                      </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-1">Market Cap</p>
                    <p className="text-xl font-bold text-zinc-100">
                      {formatCurrency(parseFloat(playerStock.marketCap || '0'))}
                    </p>
                    </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-1">24h Change</p>
                    <p
                      className={`text-xl font-bold ${
                        parseFloat(playerStock.change) >= 0 ? 'cyberpunk-price-positive' : 'cyberpunk-price-negative'
                      }`}
                    >
                      {parseFloat(playerStock.change) >= 0 ? '+' : ''}
                      {playerStock.changePercent.toFixed(2)}%
                    </p>
                      </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-1">Volume</p>
                    <p className="text-xl font-bold text-zinc-100">
                      {playerStock.volume24h.toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCompanyName(playerStock.companyName);
                    setListModal(true);
                  }}
                  className="w-full py-3 cyberpunk-btn transition-colors"
                >
                  Update Company Name
                </button>
              </div>
            ) : (
              <div className="cyberpunk-card p-6">
                <h2 className="text-xl font-bold text-zinc-100 mb-4 cyberpunk-glow-text">List Your Company Stock</h2>
                <p className="text-zinc-400 mb-6">
                  Create a ticker symbol and list your company on the market for others to invest in.
                </p>
                <button
                  onClick={() => setListModal(true)}
                  className="w-full py-3 cyberpunk-btn transition-colors"
                >
                  List Your Stock
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dividends Tab */}
        {activeTab === 'dividends' && (
          <div className="space-y-6">
            {/* Dividend Summary */}
            <DividendSummary data={dividendData} onRefresh={fetchPortfolio} />

            {/* Dividend History Table */}
            <div className="cyberpunk-card overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-border bg-dark-bg">
                <h2 className="font-bold text-zinc-100 cyberpunk-glow-text">Dividend History</h2>
              </div>
              <div className="p-8 text-center">
                <span className="text-4xl mb-2 block">💵</span>
                <p className="text-zinc-400 text-sm">Dividend history coming soon</p>
                <p className="text-zinc-500 text-xs mt-1">Track your passive income earnings over time</p>
              </div>
            </div>
          </div>
        )}

        {/* Trading Modal */}
        {tradingModal && (
          <StockTradingModal
            stock={tradingModal.stock}
            type={tradingModal.type}
            maxShares={tradingModal.maxShares}
            onClose={() => setTradingModal(null)}
            onConfirm={handleTradeConfirm}
            isLoading={isTrading}
          />
        )}

        {/* List Stock Modal */}
        {listModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="cyberpunk-card max-w-2xl w-full my-8 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-zinc-100 cyberpunk-glow-text">
                  {playerStock ? 'Update Company' : 'IPO Listing'}
                </h2>
                <button
                  onClick={() => {
                    setListModal(false);
                    setTickerSymbol('');
                    setCompanyName('');
                    setMarketCap('');
                    setMarketCapPreset('custom');
                    setSharePrice('');
                    setFloatPercentage(50);
                  }}
                  className="text-zinc-400 hover:text-zinc-100 transition-colors text-2xl"
                >
                  ✕
                </button>
                    </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-zinc-200 border-b border-dark-border pb-2">
                    Company Information
                  </h3>

                  {!playerStock && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Ticker Symbol <span className="text-zinc-500">(3-4 letters)</span>
                      </label>
                      <input
                        type="text"
                        value={tickerSymbol}
                        onChange={(e) => setTickerSymbol(e.target.value.toUpperCase().slice(0, 4))}
                        className="w-full px-4 py-2.5 cyberpunk-input"
                        placeholder="AAPL"
                        maxLength={4}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-2.5 cyberpunk-input"
                      placeholder="Apple Inc."
                    />
                  </div>
                </div>

                {/* IPO Parameters */}
                {!playerStock && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-zinc-200 border-b border-dark-border pb-2">
                        IPO Parameters
                      </h3>

                      {/* Company Valuation */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Company Valuation <span className="text-zinc-500">(Market Cap)</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {[
                            { value: '100000', label: '$100K' },
                            { value: '500000', label: '$500K' },
                            { value: '1000000', label: '$1M' },
                            { value: '5000000', label: '$5M' },
                            { value: '10000000', label: '$10M' },
                            { value: 'custom', label: 'Custom' },
                          ].map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => {
                                setMarketCapPreset(preset.value);
                                if (preset.value !== 'custom') {
                                  setMarketCap(preset.value);
                                } else {
                                  setMarketCap('');
                                }
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                marketCapPreset === preset.value
                                  ? 'cyberpunk-btn'
                                  : 'bg-dark-elevated text-zinc-300 hover:bg-dark-border'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
              </div>
                        {marketCapPreset === 'custom' && (
                          <input
                            type="number"
                            value={marketCap}
                            onChange={(e) => setMarketCap(e.target.value)}
                            className="w-full px-4 py-2.5 cyberpunk-input"
                            placeholder="Enter custom valuation"
                            min="10000"
                            step="1000"
                          />
                        )}
                        <p className="text-xs text-zinc-500 mt-1">
                          Total company value. This determines your market capitalization.
                        </p>
                      </div>

                      {/* Share Price */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Share Price <span className="text-zinc-500">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          value={sharePrice}
                          onChange={(e) => setSharePrice(e.target.value)}
                          className="w-full px-4 py-2.5 cyberpunk-input"
                          placeholder="Auto-calculated if not set"
                          min="0.01"
                          step="0.01"
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                          Price per share. If not set, we'll suggest a price based on your valuation.
                        </p>
                      </div>

                      {/* Float Percentage */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Public Float <span className="text-zinc-500">({floatPercentage}%)</span>
                        </label>
                        <input
                          type="range"
                          value={floatPercentage}
                          onChange={(e) => setFloatPercentage(parseInt(e.target.value))}
                          min="10"
                          max="90"
                          step="5"
                          className="w-full h-2 bg-dark-elevated rounded-lg appearance-none cursor-pointer accent-mint"
                        />
                        <div className="flex justify-between text-xs text-zinc-500 mt-1">
                          <span>10% (Conservative)</span>
                          <span>50% (Balanced)</span>
                          <span>90% (Aggressive)</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          Percentage of shares available for public trading. You'll retain {100 - floatPercentage}%.
                        </p>
                      </div>
                    </div>

                    {/* Calculated Values Preview */}
                    {derivedValues && (
                      <div className="bg-dark-elevated border border-dark-border rounded-lg p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-zinc-300 mb-3">IPO Summary</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-zinc-500">Total Shares:</span>
                            <span className="ml-2 font-mono text-zinc-100">
                              {derivedValues.totalShares.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Public Float:</span>
                            <span className="ml-2 font-mono text-zinc-100">
                              {derivedValues.floatShares.toLocaleString()} shares
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Your Shares:</span>
                            <span className="ml-2 font-mono text-zinc-100">
                              {derivedValues.ownerShares.toLocaleString()} shares
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Market Cap:</span>
                            <span className="ml-2 font-mono text-zinc-100">
                              {formatCurrency(parseFloat(marketCap))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-dark-border">
                  <button
                    onClick={() => {
                      setListModal(false);
                      setTickerSymbol('');
                      setCompanyName('');
                      setMarketCap('');
                      setMarketCapPreset('custom');
                      setSharePrice('');
                      setFloatPercentage(50);
                    }}
                    className="flex-1 py-3 cyberpunk-btn-secondary transition-colors"
                    disabled={isListing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={playerStock ? handleUpdateCompanyName : handleListStock}
                    disabled={isListing || !companyName || (!playerStock && !tickerSymbol)}
                    className="flex-1 py-3 cyberpunk-btn transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isListing ? 'Processing...' : playerStock ? 'Update' : 'Launch IPO'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delist Confirmation Modal */}
        {showDelistConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="cyberpunk-card max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-zinc-100 mb-4 cyberpunk-glow-text">Confirm Delist</h2>
              <p className="text-zinc-400 mb-6">
                Are you sure you want to delist your stock? This action cannot be undone and your stock will be removed from the market.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDelistConfirm(false)}
                  className="flex-1 py-3 cyberpunk-btn-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelistConfirm}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Delist Stock
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
