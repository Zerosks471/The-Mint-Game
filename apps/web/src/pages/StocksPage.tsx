import { useEffect, useState, useCallback } from 'react';
import {
  gameApi,
  StockMarketData,
  StockDetail,
  StockHoldingData,
  StockOrderData,
} from '../api/game';
import { formatCurrency } from '@mint/utils';
import { StockCard } from '../components/StockCard';
import { StockTradingModal } from '../components/StockTradingModal';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';

type TabType = 'market' | 'portfolio' | 'company' | 'orders';

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
  const refreshStats = useGameStore((s) => s.refreshStats);
  const user = useAuthStore((s) => s.user);

  const fetchMarketStocks = useCallback(async () => {
    try {
      const res = await gameApi.getMarketStocks();
      if (res.success) {
        setStocks(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch market stocks:', err);
    }
  }, []);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await gameApi.getPortfolio();
      if (res.success) {
        setPortfolio(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await gameApi.getStockOrderHistory(50);
      if (res.success) {
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
        setPlayerStock(res.data);
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

  // Poll for market updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'market') {
        fetchMarketStocks();
      }
      if (activeTab === 'portfolio') {
        fetchPortfolio();
        fetchMarketStocks(); // To get updated prices
      }
    }, 10000); // Every 10 seconds

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
        setTradingModal({
          stock: res.data,
          type: 'buy',
        });
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
      const res = await gameApi.listPlayerStock(tickerSymbol.toUpperCase(), companyName);
      if (res.success) {
        setPlayerStock(res.data);
        setListModal(false);
        setTickerSymbol('');
        setCompanyName('');
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

  const handleUpdateCompanyName = async () => {
    if (!companyName) {
      setError('Company name is required');
      return;
    }

    setIsListing(true);
    try {
      const res = await gameApi.updatePlayerStockName(companyName);
      if (res.success) {
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

  const handleDelist = async () => {
    if (!confirm('Are you sure you want to delist your stock?')) return;

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-500"></div>
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

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Stock Ticker Bar */}
      <div className="bg-dark-elevated border border-dark-border rounded-xl overflow-hidden">
        <div className="flex items-center px-4 py-2 bg-dark-card border-b border-dark-border">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Market Overview</span>
          <span className="ml-auto text-xs text-zinc-600">
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex items-center gap-6 px-4 py-3 min-w-max">
            {stocks.slice(0, 8).map((stock) => (
              <div key={stock.tickerSymbol} className="flex items-center gap-3">
                <span className="font-bold text-zinc-100">{stock.tickerSymbol}</span>
                <span className="text-zinc-300 font-mono">
                  ${parseFloat(stock.currentPrice).toFixed(2)}
                </span>
                <span
                  className={`text-xs font-medium ${
                    parseFloat(stock.change) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {parseFloat(stock.change) >= 0 ? '+' : ''}
                  {stock.changePercent.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-dark-border pb-2">
        <button
          onClick={() => setActiveTab('market')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'market'
              ? 'bg-mint text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-dark-elevated'
          }`}
        >
          Market
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'portfolio'
              ? 'bg-mint text-white'
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
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'company'
              ? 'bg-mint text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-dark-elevated'
          }`}
        >
          My Company
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'orders'
              ? 'bg-mint text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-dark-elevated'
          }`}
        >
          Orders
        </button>
      </div>

      {/* Market Tab */}
      {activeTab === 'market' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.map((stock) => (
              <StockCard
                key={stock.tickerSymbol}
                stock={stock}
                onBuy={handleBuy}
                onSell={portfolio.find((h) => h.tickerSymbol === stock.tickerSymbol) ? handleSell : undefined}
                onView={handleViewStock}
              />
            ))}
          </div>
          {stocks.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p>No stocks available</p>
            </div>
          )}
        </div>
      )}

      {/* Portfolio Tab */}
      {activeTab === 'portfolio' && (
        <div className="space-y-4">
          {/* Portfolio Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase mb-1">Total Value</p>
              <p className="text-2xl font-bold text-zinc-100">
                {formatCurrency(totalPortfolioValue)}
              </p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase mb-1">Total Invested</p>
              <p className="text-2xl font-bold text-zinc-100">
                {formatCurrency(
                  portfolio.reduce((sum, h) => sum + parseFloat(h.totalInvested), 0)
                )}
              </p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase mb-1">Profit/Loss</p>
              <p
                className={`text-2xl font-bold ${
                  totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {totalProfitLoss >= 0 ? '+' : ''}
                {formatCurrency(totalProfitLoss)} ({totalProfitLossPercent >= 0 ? '+' : ''}
                {totalProfitLossPercent.toFixed(2)}%)
              </p>
            </div>
          </div>

          {/* Holdings */}
          {portfolio.length > 0 ? (
            <div className="space-y-4">
              {portfolio.map((holding) => {
                const stock = stocks.find((s) => s.tickerSymbol === holding.tickerSymbol);
                if (!stock) return null;
                return (
                  <div
                    key={holding.id}
                    className="bg-dark-card border border-dark-border rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-zinc-100 text-lg">{holding.tickerSymbol}</h3>
                          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase">
                            {holding.stockType}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400">{holding.companyName}</p>
            </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-zinc-100 font-mono">
                          {formatCurrency(parseFloat(holding.currentValue))}
                        </p>
                        <p
                          className={`text-sm ${
                            parseFloat(holding.profitLoss) >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {parseFloat(holding.profitLoss) >= 0 ? '+' : ''}
                          {formatCurrency(parseFloat(holding.profitLoss))} (
                          {holding.profitLossPercent >= 0 ? '+' : ''}
                          {holding.profitLossPercent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <p className="text-zinc-500 mb-1">Shares</p>
                        <p className="text-zinc-100 font-medium">{holding.shares.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 mb-1">Avg Buy Price</p>
                        <p className="text-zinc-100 font-medium font-mono">
                          ${parseFloat(holding.avgBuyPrice).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 mb-1">Current Price</p>
                        <p className="text-zinc-100 font-medium font-mono">
                          ${parseFloat(holding.currentPrice).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSell(holding.tickerSymbol)}
                        className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        Sell
                      </button>
                      <button
                        onClick={() => handleViewStock(holding.tickerSymbol)}
                        className="flex-1 py-2 bg-dark-elevated hover:bg-dark-border text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <p>No holdings yet. Start investing in the Market tab!</p>
          </div>
          )}
        </div>
      )}

      {/* My Company Tab */}
      {activeTab === 'company' && (
        <div className="space-y-4">
          {playerStock ? (
            <div className="bg-dark-card border border-dark-border rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                  <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-zinc-100">{playerStock.tickerSymbol}</h2>
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
                  <p className="text-xl font-bold text-zinc-100 font-mono">
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
                      parseFloat(playerStock.change) >= 0 ? 'text-green-400' : 'text-red-400'
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
                className="w-full py-3 bg-mint hover:bg-mint/80 text-white rounded-lg font-medium transition-colors"
              >
                Update Company Name
              </button>
            </div>
          ) : (
            <div className="bg-dark-card border border-dark-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-zinc-100 mb-4">List Your Company Stock</h2>
              <p className="text-zinc-400 mb-6">
                Create a ticker symbol and list your company on the market for others to invest in.
              </p>
              <button
                onClick={() => setListModal(true)}
                className="w-full py-3 bg-mint hover:bg-mint/80 text-white rounded-lg font-medium transition-colors"
              >
                List Your Stock
              </button>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length > 0 ? (
            <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-border">
                <h2 className="font-bold text-zinc-100">Order History</h2>
              </div>
              <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-dark-elevated text-xs text-zinc-500 uppercase">
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Symbol</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-right px-4 py-3">Shares</th>
                      <th className="text-right px-4 py-3">Price</th>
                      <th className="text-right px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-dark-border/50 hover:bg-dark-elevated/50"
                      >
                        <td className="px-4 py-3 text-zinc-400 text-sm">
                          {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-bold text-zinc-100">{order.tickerSymbol}</p>
                            <p className="text-xs text-zinc-500">{order.companyName}</p>
                        </div>
                      </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              order.orderType === 'buy'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {order.orderType.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-100">
                          {order.shares.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-100">
                          ${parseFloat(order.pricePerShare).toFixed(2)}
                      </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-100">
                          {formatCurrency(parseFloat(order.totalAmount))}
                    </td>
                  </tr>
                    ))}
              </tbody>
            </table>
          </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <p>No orders yet</p>
            </div>
          )}
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-zinc-100">
                {playerStock ? 'Update Company' : 'List Your Stock'}
              </h2>
              <button
                onClick={() => {
                  setListModal(false);
                  setTickerSymbol('');
                  setCompanyName('');
                }}
                className="text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                ✕
              </button>
                  </div>

            <div className="space-y-4">
              {!playerStock && (
                  <div>
                  <label className="block text-sm text-zinc-400 mb-2">Ticker Symbol (3-4 letters)</label>
                  <input
                    type="text"
                    value={tickerSymbol}
                    onChange={(e) => setTickerSymbol(e.target.value.toUpperCase().slice(0, 4))}
                    className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg text-zinc-100 focus:outline-none focus:border-mint"
                    placeholder="AAPL"
                    maxLength={4}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg text-zinc-100 focus:outline-none focus:border-mint"
                  placeholder="Apple Inc."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setListModal(false);
                    setTickerSymbol('');
                    setCompanyName('');
                  }}
                  className="flex-1 py-3 bg-dark-elevated hover:bg-dark-border text-zinc-300 rounded-lg font-medium transition-colors"
                  disabled={isListing}
                >
                  Cancel
                </button>
                <button
                  onClick={playerStock ? handleUpdateCompanyName : handleListStock}
                  disabled={isListing || !companyName || (!playerStock && !tickerSymbol)}
                  className="flex-1 py-3 bg-mint hover:bg-mint/80 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isListing ? 'Processing...' : playerStock ? 'Update' : 'List Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
