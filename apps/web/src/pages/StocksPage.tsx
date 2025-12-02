import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { LiveTradesFeed } from '../components/LiveTradesFeed';
import { useGameStore } from '../stores/gameStore';
import { MiniSparkline } from '../components/ui';

// New cyberpunk stock components
import { StockTickerTape } from '../components/stocks/StockTickerTape';
import { MarketEventsFeed } from '../components/stocks/MarketEventsFeed';
import { DividendSummary } from '../components/stocks/DividendSummary';

// Import cyberpunk CSS
import '../styles/cyberpunk-stocks.css';

type MarketSortOption = 'symbol' | 'price_high' | 'price_low' | 'change_high' | 'change_low' | 'volume';
type PortfolioSortOption = 'symbol' | 'value_high' | 'value_low' | 'profit_high' | 'profit_low' | 'shares';

// Generate simulated price history for sparkline based on current price and trend
function generateSparklineData(currentPrice: number, changePercent: number, points: number = 12): number[] {
  const startPrice = currentPrice / (1 + changePercent / 100);
  const data: number[] = [];

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const trendPrice = startPrice + (currentPrice - startPrice) * progress;
    const noise = trendPrice * (Math.random() - 0.5) * 0.02;
    data.push(trendPrice + noise);
  }

  data[data.length - 1] = currentPrice;
  return data;
}

type TabType = 'market' | 'portfolio' | 'company' | 'dividends';

export function StocksPage() {
  const [activeTab, setActiveTab] = useState<TabType>('market');
  const [stocks, setStocks] = useState<StockMarketData[]>([]);
  const [portfolio, setPortfolio] = useState<StockHoldingData[]>([]);
  const [_orders, setOrders] = useState<StockOrderData[]>([]);
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
  const [marketSort, setMarketSort] = useState<MarketSortOption>('symbol');
  const [portfolioSort, setPortfolioSort] = useState<PortfolioSortOption>('value_high');
  const refreshStats = useGameStore((s) => s.refreshStats);

  // Sorted market stocks
  const sortedStocks = useMemo(() => {
    const sorted = [...stocks];
    switch (marketSort) {
      case 'symbol':
        return sorted.sort((a, b) => a.tickerSymbol.localeCompare(b.tickerSymbol));
      case 'price_high':
        return sorted.sort((a, b) => parseFloat(b.currentPrice) - parseFloat(a.currentPrice));
      case 'price_low':
        return sorted.sort((a, b) => parseFloat(a.currentPrice) - parseFloat(b.currentPrice));
      case 'change_high':
        return sorted.sort((a, b) => b.changePercent - a.changePercent);
      case 'change_low':
        return sorted.sort((a, b) => a.changePercent - b.changePercent);
      case 'volume':
        return sorted.sort((a, b) => b.volume24h - a.volume24h);
      default:
        return sorted;
    }
  }, [stocks, marketSort]);

  // Sorted portfolio
  const sortedPortfolio = useMemo(() => {
    const sorted = [...portfolio];
    switch (portfolioSort) {
      case 'symbol':
        return sorted.sort((a, b) => a.tickerSymbol.localeCompare(b.tickerSymbol));
      case 'value_high':
        return sorted.sort((a, b) => parseFloat(b.currentValue) - parseFloat(a.currentValue));
      case 'value_low':
        return sorted.sort((a, b) => parseFloat(a.currentValue) - parseFloat(b.currentValue));
      case 'profit_high':
        return sorted.sort((a, b) => parseFloat(b.profitLoss) - parseFloat(a.profitLoss));
      case 'profit_low':
        return sorted.sort((a, b) => parseFloat(a.profitLoss) - parseFloat(b.profitLoss));
      case 'shares':
        return sorted.sort((a, b) => b.shares - a.shares);
      default:
        return sorted;
    }
  }, [portfolio, portfolioSort]);

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

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'market') {
        fetchMarketStocks();
      }
      if (activeTab === 'portfolio') {
        fetchPortfolio();
        fetchMarketStocks();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, fetchMarketStocks, fetchPortfolio]);

  const handleBuy = async (ticker: string) => {
    try {
      const res = await gameApi.getStockByTicker(ticker);
      if (res.success && res.data) {
        setTradingModal({ stock: res.data, type: 'buy' });
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
        setTradingModal({ stock: res.data, type: 'sell', maxShares: holding.shares });
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
        const history: Array<{ time: number; price: number }> = [];
        const now = Date.now() / 1000;
        const currentPrice = parseFloat(res.data.currentPrice);
        const highPrice = parseFloat(res.data.highPrice24h);
        const lowPrice = parseFloat(res.data.lowPrice24h);
        const seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        for (let i = 24; i >= 0; i--) {
          const time = now - i * 3600;
          const deterministicValue = Math.sin(seed + i * 0.5) * 0.5 + 0.5;
          const priceRange = highPrice - lowPrice;
          const baseForHour = lowPrice + (priceRange * deterministicValue);
          const progressToNow = 1 - (i / 24);
          const price = i === 0
            ? currentPrice
            : baseForHour * (1 - progressToNow * 0.3) + currentPrice * progressToNow * 0.3;

          history.push({ time: Math.floor(time), price: Math.max(0.01, price) });
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
      const options: { marketCap?: number; sharePrice?: number; floatPercentage?: number } = {
        floatPercentage: floatPercentage,
      };

      if (marketCap) options.marketCap = parseFloat(marketCap);
      if (sharePrice) options.sharePrice = parseFloat(sharePrice);

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

  if (isLoading) {
    return (
      <div className="cyberpunk-page flex items-center justify-center">
        <div className="cyberpunk-spinner" />
      </div>
    );
  }

  const totalPortfolioValue = portfolio.reduce((sum, h) => sum + parseFloat(h.currentValue), 0);
  const totalInvested = portfolio.reduce((sum, h) => sum + parseFloat(h.totalInvested), 0);
  const totalProfitLoss = portfolio.reduce((sum, h) => sum + parseFloat(h.profitLoss), 0);
  const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  const dividendData = {
    todayEarnings: 125.50,
    weekEarnings: 892.30,
    allTimeEarnings: 5420.75,
    lastPayoutAt: new Date(Date.now() - 3600000).toISOString(),
    nextPayoutIn: 7200,
  };

  return (
    <div className="cyberpunk-page pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-red-400 text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-sm">
              Dismiss
            </button>
          </div>
        )}

        {/* Scrolling Stock Ticker */}
        <StockTickerTape onTickerClick={handleViewStock} speed={35} />

        {/* Tab Navigation */}
        <div className="cyberpunk-tabs max-w-lg">
          {(['market', 'portfolio', 'company', 'dividends'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`cyberpunk-tab ${activeTab === tab ? 'cyberpunk-tab-active' : ''}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'portfolio' && portfolio.length > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({portfolio.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Market Tab */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            {selectedStock ? (
              /* Stock Detail View */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedStock(null)}
                    className="cyberpunk-btn-secondary text-sm"
                  >
                    ← Back to Market
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => handleBuy(selectedStock.tickerSymbol)} className="cyberpunk-btn-buy">
                      Buy
                    </button>
                    {portfolio.find((h) => h.tickerSymbol === selectedStock.tickerSymbol) && (
                      <button onClick={() => handleSell(selectedStock.tickerSymbol)} className="cyberpunk-btn-sell">
                        Sell
                      </button>
                    )}
                  </div>
                </div>

                <div className="cyberpunk-chart-container">
                  <StockChart
                    ticker={selectedStock.tickerSymbol}
                    priceHistory={priceHistory}
                    currentPrice={parseFloat(selectedStock.currentPrice)}
                    previousClose={parseFloat(selectedStock.previousClose)}
                    height={400}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="cyberpunk-stat-card">
                    <p className="cyberpunk-stat-label">High 24h</p>
                    <p className="cyberpunk-stat-value cyberpunk-price-positive">
                      ${parseFloat(selectedStock.highPrice24h).toFixed(2)}
                    </p>
                  </div>
                  <div className="cyberpunk-stat-card">
                    <p className="cyberpunk-stat-label">Low 24h</p>
                    <p className="cyberpunk-stat-value cyberpunk-price-negative">
                      ${parseFloat(selectedStock.lowPrice24h).toFixed(2)}
                    </p>
                  </div>
                  <div className="cyberpunk-stat-card">
                    <p className="cyberpunk-stat-label">Volume</p>
                    <p className="cyberpunk-stat-value">{selectedStock.volume24h.toLocaleString()}</p>
                  </div>
                  {selectedStock.marketCap && (
                    <div className="cyberpunk-stat-card">
                      <p className="cyberpunk-stat-label">Market Cap</p>
                      <p className="cyberpunk-stat-value">{formatCurrency(parseFloat(selectedStock.marketCap))}</p>
                    </div>
                  )}
                </div>

                <div className="cyberpunk-card p-5">
                  <h3 className="text-lg font-semibold text-white mb-2">{selectedStock.companyName}</h3>
                  {selectedStock.description && (
                    <p className="text-zinc-400 text-sm mb-3">{selectedStock.description}</p>
                  )}
                  {selectedStock.sector && (
                    <span className="cyberpunk-sector-tag">{selectedStock.sector}</span>
                  )}
                </div>
              </div>
            ) : (
              /* Market Table View */
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                  <div className="cyberpunk-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-800">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Market</h2>
                        <div className="flex items-center gap-3">
                          <select
                            value={marketSort}
                            onChange={(e) => setMarketSort(e.target.value as MarketSortOption)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                          >
                            <option value="symbol">A-Z</option>
                            <option value="price_high">Price: High to Low</option>
                            <option value="price_low">Price: Low to High</option>
                            <option value="change_high">Gainers</option>
                            <option value="change_low">Losers</option>
                            <option value="volume">Volume</option>
                          </select>
                          <span className="text-xs text-zinc-500">{stocks.length} stocks</span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto cyberpunk-scrollbar">
                      <table className="cyberpunk-table">
                        <thead>
                          <tr>
                            <th>Symbol</th>
                            <th>Company</th>
                            <th className="text-right">Price</th>
                            <th className="text-right">Change</th>
                            <th className="text-right">Volume</th>
                            <th className="text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedStocks.map((stock) => {
                            const hasHolding = portfolio.find((h) => h.tickerSymbol === stock.tickerSymbol);
                            const currentPrice = parseFloat(stock.currentPrice);
                            const previousClose = parseFloat(stock.previousClose);
                            const hasValidPreviousClose = Number.isFinite(previousClose) && previousClose > 0;
                            const priceChange = hasValidPreviousClose ? currentPrice - previousClose : 0;
                            const priceChangePercent = hasValidPreviousClose ? (priceChange / previousClose) * 100 : 0;
                            const isPositive = priceChange >= 0;

                            return (
                              <tr
                                key={stock.tickerSymbol}
                                className="cursor-pointer"
                                onClick={() => handleViewStock(stock.tickerSymbol)}
                              >
                                <td>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-cyan-400">{stock.tickerSymbol}</span>
                                    {stock.stockType === 'player' && (
                                      <span className="cyberpunk-player-badge">Player</span>
                                    )}
                                  </div>
                                </td>
                                <td className="text-zinc-400">{stock.companyName}</td>
                                <td className="text-right font-mono text-white">
                                  ${currentPrice.toFixed(2)}
                                </td>
                                <td className="text-right">
                                  <span className={`font-mono ${isPositive ? 'cyberpunk-price-positive' : 'cyberpunk-price-negative'}`}>
                                    {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                                  </span>
                                </td>
                                <td className="text-right text-zinc-400 font-mono">
                                  {stock.volume24h.toLocaleString()}
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleBuy(stock.tickerSymbol)} className="cyberpunk-btn-buy">
                                      Buy
                                    </button>
                                    {hasHolding && (
                                      <button onClick={() => handleSell(stock.tickerSymbol)} className="cyberpunk-btn-sell">
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
                        <div className="cyberpunk-empty-state">
                          <p className="text-zinc-500">No stocks available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <MarketEventsFeed onTickerClick={handleViewStock} maxEvents={5} />
                  <LiveTradesFeed />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {/* Portfolio Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="cyberpunk-stat-card cyberpunk-card-accent-cyan">
                <p className="cyberpunk-stat-label">Portfolio Value</p>
                <p className="cyberpunk-stat-value">{formatCurrency(totalPortfolioValue)}</p>
              </div>
              <div className="cyberpunk-stat-card">
                <p className="cyberpunk-stat-label">Total Invested</p>
                <p className="cyberpunk-stat-value">{formatCurrency(totalInvested)}</p>
              </div>
              <div className={`cyberpunk-stat-card ${totalProfitLoss >= 0 ? 'cyberpunk-card-accent-green' : 'cyberpunk-card-accent-red'}`}>
                <p className="cyberpunk-stat-label">Profit/Loss</p>
                <p className={`cyberpunk-stat-value ${totalProfitLoss >= 0 ? 'cyberpunk-price-positive' : 'cyberpunk-price-negative'}`}>
                  {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(totalProfitLoss)}
                </p>
                <p className={`text-xs mt-1 ${totalProfitLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalProfitLossPercent >= 0 ? '+' : ''}{totalProfitLossPercent.toFixed(2)}%
                </p>
              </div>
              <div className="cyberpunk-stat-card">
                <p className="cyberpunk-stat-label">Holdings</p>
                <p className="cyberpunk-stat-value">{portfolio.length}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {portfolio.reduce((sum, h) => sum + h.shares, 0).toLocaleString()} shares
                </p>
              </div>
            </div>

            {/* Holdings */}
            {portfolio.length > 0 ? (
              <div className="cyberpunk-card overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Your Holdings</h2>
                    <select
                      value={portfolioSort}
                      onChange={(e) => setPortfolioSort(e.target.value as PortfolioSortOption)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    >
                      <option value="value_high">Value: High to Low</option>
                      <option value="value_low">Value: Low to High</option>
                      <option value="profit_high">Profit: High to Low</option>
                      <option value="profit_low">Profit: Low to High</option>
                      <option value="shares">Most Shares</option>
                      <option value="symbol">A-Z</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto cyberpunk-scrollbar">
                  <table className="cyberpunk-table">
                    <thead>
                      <tr>
                        <th>Stock</th>
                        <th className="text-right">Shares</th>
                        <th className="text-right">Avg Price</th>
                        <th className="text-right">Current</th>
                        <th className="text-right">Value</th>
                        <th className="text-right">P/L</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPortfolio.map((holding) => {
                        const stock = stocks.find((s) => s.tickerSymbol === holding.tickerSymbol);
                        const profitLoss = parseFloat(holding.profitLoss);
                        const isProfit = profitLoss >= 0;
                        const sparklineData = stock
                          ? generateSparklineData(parseFloat(holding.currentPrice), stock.changePercent)
                          : [];

                        return (
                          <tr key={holding.id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-pink-400">{holding.tickerSymbol}</span>
                                    {sparklineData.length > 0 && (
                                      <MiniSparkline data={sparklineData} width={48} height={16} />
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-500">{holding.companyName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="text-right font-mono">{holding.shares.toLocaleString()}</td>
                            <td className="text-right font-mono text-zinc-400">
                              ${parseFloat(holding.avgBuyPrice).toFixed(2)}
                            </td>
                            <td className="text-right font-mono">
                              ${parseFloat(holding.currentPrice).toFixed(2)}
                            </td>
                            <td className="text-right font-mono font-semibold">
                              {formatCurrency(parseFloat(holding.currentValue))}
                            </td>
                            <td className="text-right">
                              <div className={isProfit ? 'cyberpunk-price-positive' : 'cyberpunk-price-negative'}>
                                <p className="font-mono font-semibold">
                                  {isProfit ? '+' : ''}{formatCurrency(profitLoss)}
                                </p>
                                <p className="text-xs opacity-80">
                                  {isProfit ? '+' : ''}{holding.profitLossPercent.toFixed(2)}%
                                </p>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleViewStock(holding.tickerSymbol)}
                                  className="cyberpunk-btn-secondary text-xs px-3 py-1.5"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleSell(holding.tickerSymbol)}
                                  className="cyberpunk-btn-sell"
                                >
                                  Sell
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="cyberpunk-card cyberpunk-empty-state">
                <div className="cyberpunk-empty-icon">📈</div>
                <h3 className="cyberpunk-empty-title">No Holdings Yet</h3>
                <p className="cyberpunk-empty-description">
                  Start building your portfolio by investing in stocks from the Market tab.
                </p>
                <button onClick={() => setActiveTab('market')} className="cyberpunk-btn">
                  Browse Market
                </button>
              </div>
            )}
          </div>
        )}

        {/* Company Tab */}
        {activeTab === 'company' && (
          <div className="max-w-2xl">
            {playerStock ? (
              <div className="cyberpunk-card p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-cyan-400">{playerStock.tickerSymbol}</h2>
                      <span className="cyberpunk-player-badge">Listed</span>
                    </div>
                    <p className="text-zinc-400">{playerStock.companyName}</p>
                  </div>
                  <button
                    onClick={() => setShowDelistConfirm(true)}
                    className="cyberpunk-btn-sell"
                  >
                    Delist
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-1">Current Price</p>
                    <p className="text-xl font-bold text-white font-mono">
                      ${parseFloat(playerStock.currentPrice).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-1">Market Cap</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(parseFloat(playerStock.marketCap || '0'))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-1">24h Change</p>
                    <p className={`text-xl font-bold ${parseFloat(playerStock.change) >= 0 ? 'cyberpunk-price-positive' : 'cyberpunk-price-negative'}`}>
                      {parseFloat(playerStock.change) >= 0 ? '+' : ''}{playerStock.changePercent.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-1">Volume</p>
                    <p className="text-xl font-bold text-white">{playerStock.volume24h.toLocaleString()}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCompanyName(playerStock.companyName);
                    setListModal(true);
                  }}
                  className="w-full cyberpunk-btn"
                >
                  Update Company Name
                </button>
              </div>
            ) : (
              <div className="cyberpunk-card p-6 space-y-4">
                <h2 className="text-xl font-bold text-white">List Your Company Stock</h2>
                <p className="text-zinc-400">
                  Create a ticker symbol and list your company on the market for others to invest in.
                </p>
                <button onClick={() => setListModal(true)} className="w-full cyberpunk-btn">
                  List Your Stock
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dividends Tab */}
        {activeTab === 'dividends' && (
          <div className="space-y-6 max-w-4xl">
            <DividendSummary data={dividendData} onRefresh={fetchPortfolio} />

            <div className="cyberpunk-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Dividend History</h2>
              <div className="cyberpunk-empty-state">
                <div className="cyberpunk-empty-icon">💵</div>
                <p className="cyberpunk-empty-title">Coming Soon</p>
                <p className="cyberpunk-empty-description">Track your passive income earnings over time</p>
              </div>
            </div>
          </div>
        )}
      </div>

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
        <div className="cyberpunk-modal-overlay">
          <div className="cyberpunk-modal p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
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
                className="text-zinc-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              {!playerStock && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Ticker Symbol <span className="text-zinc-500">(3-4 letters)</span>
                  </label>
                  <input
                    type="text"
                    value={tickerSymbol}
                    onChange={(e) => setTickerSymbol(e.target.value.toUpperCase().slice(0, 4))}
                    className="cyberpunk-input"
                    placeholder="AAPL"
                    maxLength={4}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="cyberpunk-input"
                  placeholder="Apple Inc."
                />
              </div>

              {!playerStock && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Company Valuation</label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
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
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            marketCapPreset === preset.value
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
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
                        className="cyberpunk-input"
                        placeholder="Enter custom valuation"
                        min="10000"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Share Price <span className="text-zinc-500">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      value={sharePrice}
                      onChange={(e) => setSharePrice(e.target.value)}
                      className="cyberpunk-input"
                      placeholder="Auto-calculated if not set"
                      min="0.01"
                      step="0.01"
                    />
                  </div>

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
                      className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex justify-between text-xs text-zinc-500 mt-1">
                      <span>10%</span>
                      <span>50%</span>
                      <span>90%</span>
                    </div>
                  </div>

                  {derivedValues && (
                    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2 text-sm">
                      <h4 className="font-medium text-zinc-300 mb-2">IPO Summary</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-zinc-500">Total Shares:</div>
                        <div className="font-mono text-white">{derivedValues.totalShares.toLocaleString()}</div>
                        <div className="text-zinc-500">Public Float:</div>
                        <div className="font-mono text-white">{derivedValues.floatShares.toLocaleString()}</div>
                        <div className="text-zinc-500">Your Shares:</div>
                        <div className="font-mono text-white">{derivedValues.ownerShares.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-2">
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
                  className="flex-1 cyberpunk-btn-secondary"
                  disabled={isListing}
                >
                  Cancel
                </button>
                <button
                  onClick={playerStock ? handleUpdateCompanyName : handleListStock}
                  disabled={isListing || !companyName || (!playerStock && !tickerSymbol)}
                  className="flex-1 cyberpunk-btn disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="cyberpunk-modal-overlay">
          <div className="cyberpunk-modal p-6 max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Confirm Delist</h2>
            <p className="text-zinc-400 mb-6">
              Are you sure you want to delist your stock? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelistConfirm(false)}
                className="flex-1 cyberpunk-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelistConfirm}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 font-medium transition-colors"
              >
                Delist Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
