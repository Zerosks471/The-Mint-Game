import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface BotStock {
  id: string;
  tickerSymbol: string;
  companyName: string;
  currentPrice: string;
  previousClose: string;
  highPrice24h: string;
  lowPrice24h: string;
  basePrice: string;
  volatility: number;
  trend: string;
  trendStrength: number;
  isActive: boolean;
}

interface PlayerStock {
  id: string;
  tickerSymbol: string;
  companyName: string;
  currentPrice: string;
  previousClose: string;
  marketCap: string;
  isListed: boolean;
  user: { id: string; username: string };
}

interface StockStatus {
  tradingHalted: boolean;
  tradingHaltReason: string;
  botStocks: BotStock[];
  playerStocksCount: number;
  tradesLast24h: number;
}

export function StocksPage() {
  const [status, setStatus] = useState<StockStatus | null>(null);
  const [botStocks, setBotStocks] = useState<BotStock[]>([]);
  const [playerStocks, setPlayerStocks] = useState<PlayerStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bot' | 'player'>('bot');
  const [haltReason, setHaltReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, botRes, playerRes] = await Promise.all([
        api.getStockStatus(),
        api.getBotStocks(),
        api.getPlayerStocks(),
      ]);

      if (statusRes.success) {
        setStatus(statusRes.data as StockStatus);
        setHaltReason((statusRes.data as StockStatus).tradingHaltReason || '');
      }
      if (botRes.success) setBotStocks(botRes.data as BotStock[]);
      if (playerRes.success) setPlayerStocks(playerRes.data as PlayerStock[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleHaltTrading = async () => {
    const halt = !status?.tradingHalted;
    const result = await api.haltTrading(halt, haltReason);
    if (result.success) {
      fetchData();
    }
  };

  const handleResetPrice = async (stockId: string) => {
    if (!confirm('Reset this stock price to base value?')) return;
    const result = await api.resetBotStockPrice(stockId);
    if (result.success) fetchData();
  };

  const handleDelistStock = async (stockId: string) => {
    const reason = prompt('Enter reason for delisting:');
    if (!reason) return;
    const result = await api.delistPlayerStock(stockId, reason);
    if (result.success) fetchData();
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const getPriceChange = (current: string, previous: string) => {
    const curr = parseFloat(current);
    const prev = parseFloat(previous);
    if (prev === 0) return { value: 0, percent: 0 };
    const change = curr - prev;
    const percent = (change / prev) * 100;
    return { value: change, percent };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">Stock Market Control</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Trading Status</p>
          <p className={`text-2xl font-bold ${status?.tradingHalted ? 'text-red-400' : 'text-green-400'}`}>
            {status?.tradingHalted ? 'HALTED' : 'ACTIVE'}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Bot Stocks</p>
          <p className="text-2xl font-bold text-zinc-100">{botStocks.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Player Stocks</p>
          <p className="text-2xl font-bold text-zinc-100">{status?.playerStocksCount}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Trades (24h)</p>
          <p className="text-2xl font-bold text-blue-400">{status?.tradesLast24h.toLocaleString()}</p>
        </div>
      </div>

      {/* Trading Halt Control */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Trading Control</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-zinc-400 mb-2">Halt Reason</label>
            <input
              type="text"
              value={haltReason}
              onChange={(e) => setHaltReason(e.target.value)}
              placeholder="Enter reason for halting trading..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            onClick={handleHaltTrading}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              status?.tradingHalted
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {status?.tradingHalted ? 'Resume Trading' : 'Halt Trading'}
          </button>
        </div>
        {status?.tradingHalted && status.tradingHaltReason && (
          <p className="mt-3 text-sm text-red-400">Current reason: {status.tradingHaltReason}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('bot')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'bot'
              ? 'bg-zinc-800 text-purple-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Bot Stocks ({botStocks.length})
        </button>
        <button
          onClick={() => setActiveTab('player')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'player'
              ? 'bg-zinc-800 text-purple-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Player Stocks ({playerStocks.length})
        </button>
      </div>

      {/* Bot Stocks Table */}
      {activeTab === 'bot' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="p-4 font-medium">Symbol</th>
                <th className="p-4 font-medium">Company</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Change</th>
                <th className="p-4 font-medium">24h Range</th>
                <th className="p-4 font-medium">Trend</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {botStocks.map((stock) => {
                const change = getPriceChange(stock.currentPrice, stock.previousClose);
                return (
                  <tr key={stock.id} className="text-zinc-300">
                    <td className="p-4 font-mono font-bold text-purple-400">{stock.tickerSymbol}</td>
                    <td className="p-4">{stock.companyName}</td>
                    <td className="p-4 font-mono">{formatCurrency(stock.currentPrice)}</td>
                    <td className={`p-4 font-mono ${change.percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {change.percent >= 0 ? '+' : ''}{change.percent.toFixed(2)}%
                    </td>
                    <td className="p-4 text-sm text-zinc-500">
                      {formatCurrency(stock.lowPrice24h)} - {formatCurrency(stock.highPrice24h)}
                    </td>
                    <td className="p-4">
                      <span className={`text-sm ${
                        stock.trend === 'bullish' ? 'text-green-400' :
                        stock.trend === 'bearish' ? 'text-red-400' : 'text-zinc-400'
                      }`}>
                        {stock.trend} ({stock.trendStrength})
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleResetPrice(stock.id)}
                        className="text-xs text-orange-400 hover:text-orange-300"
                      >
                        Reset Price
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Player Stocks Table */}
      {activeTab === 'player' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="p-4 font-medium">Symbol</th>
                <th className="p-4 font-medium">Company</th>
                <th className="p-4 font-medium">Owner</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Market Cap</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {playerStocks.map((stock) => (
                <tr key={stock.id} className="text-zinc-300">
                  <td className="p-4 font-mono font-bold text-blue-400">{stock.tickerSymbol}</td>
                  <td className="p-4">{stock.companyName}</td>
                  <td className="p-4">{stock.user.username}</td>
                  <td className="p-4 font-mono">{formatCurrency(stock.currentPrice)}</td>
                  <td className="p-4 font-mono">{formatCurrency(stock.marketCap)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      stock.isListed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {stock.isListed ? 'Listed' : 'Delisted'}
                    </span>
                  </td>
                  <td className="p-4">
                    {stock.isListed && (
                      <button
                        onClick={() => handleDelistStock(stock.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delist
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
