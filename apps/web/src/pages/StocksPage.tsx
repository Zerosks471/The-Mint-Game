import { useEffect, useState, useCallback } from 'react';
import { gameApi, IPOStatus, PrestigeStatus, LeaderboardEntry } from '../api/game';
import { formatCurrency } from '@mint/utils';
import { IPODashboard } from '../components/IPODashboard';
import { useGameStore } from '../stores/gameStore';

// Mock market stocks for display
const MARKET_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 178.52, change: 2.34, changePercent: 1.33 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.91, change: -1.23, changePercent: -0.32 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 141.80, change: 3.15, changePercent: 2.27 },
  { symbol: 'AMZN', name: 'Amazon.com', price: 178.25, change: 1.87, changePercent: 1.06 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 495.22, change: 12.45, changePercent: 2.58 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: -5.20, changePercent: -2.05 },
  { symbol: 'META', name: 'Meta Platforms', price: 505.75, change: 8.92, changePercent: 1.80 },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', price: 363.45, change: 0.85, changePercent: 0.23 },
];

export function StocksPage() {
  const [ipoStatus, setIpoStatus] = useState<IPOStatus | null>(null);
  const [prestigeStatus, setPrestigeStatus] = useState<PrestigeStatus | null>(null);
  const [marketLeaders, setMarketLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLaunchingIPO, setIsLaunchingIPO] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'market' | 'my-ipo' | 'leaders'>('market');
  const [result, setResult] = useState<{
    cashEarned: string;
    multiplier?: number;
  } | null>(null);
  const refreshStats = useGameStore((s) => s.refreshStats);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ipoRes, prestigeRes, leadersRes] = await Promise.all([
        gameApi.getIPOStatus(),
        gameApi.getPrestigeStatus(),
        gameApi.getLeaderboard('net-worth', 10),
      ]);

      if (ipoRes.success) {
        setIpoStatus(ipoRes.data || null);
      }
      if (prestigeRes.success && prestigeRes.data) {
        setPrestigeStatus(prestigeRes.data);
      }
      if (leadersRes.success && leadersRes.data) {
        setMarketLeaders(leadersRes.data.entries || []);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for IPO updates when active
  useEffect(() => {
    if (!ipoStatus) return;

    const interval = setInterval(async () => {
      try {
        const res = await gameApi.getIPOStatus();
        if (res.success) {
          if (res.data) {
            setIpoStatus(res.data);
          } else {
            setIpoStatus(null);
            await fetchData();
          }
        }
      } catch {
        // Silently fail
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [ipoStatus, fetchData]);

  const handleLaunchIPO = async () => {
    if (!prestigeStatus?.canPrestige) return;

    setIsLaunchingIPO(true);
    try {
      const res = await gameApi.launchIPO();
      if (res.success && res.data) {
        setIpoStatus(res.data);
        setActiveTab('my-ipo');
      } else {
        setError(res.error?.message || 'Failed to launch IPO');
      }
    } catch {
      setError('Failed to launch IPO');
    } finally {
      setIsLaunchingIPO(false);
    }
  };

  const handleSellIPO = async () => {
    if (!ipoStatus) return;

    setIsProcessing(true);
    try {
      const res = await gameApi.sellIPOShares();
      if (res.success && res.data) {
        setResult({
          cashEarned: res.data.cashEarned,
          multiplier: res.data.multiplier,
        });
        setIpoStatus(null);
        await fetchData();
        refreshStats();
      } else {
        setError(res.error?.message || 'Failed to sell shares');
      }
    } catch {
      setError('Failed to sell shares');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelIPO = async () => {
    if (!ipoStatus) return;

    setIsProcessing(true);
    try {
      const res = await gameApi.cancelIPO();
      if (res.success && res.data) {
        setResult({
          cashEarned: res.data.cashEarned,
        });
        setIpoStatus(null);
        await fetchData();
        refreshStats();
      } else {
        setError(res.error?.message || 'Failed to cancel IPO');
      }
    } catch {
      setError('Failed to cancel IPO');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-500"></div>
      </div>
    );
  }

  const netWorth = parseFloat(prestigeStatus?.currentNetWorth || '0');
  const baseCashValue = netWorth * 0.1;

  return (
    <div className="space-y-4">
      {/* Result Modal */}
      {result && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">
              Shares Sold!
            </h2>
            <p className="text-zinc-400 mb-4">Your IPO has concluded.</p>
            <div className="space-y-2 mb-6">
              <p className="text-lg text-zinc-100">
                You earned{' '}
                <span className="text-mint font-bold">
                  {formatCurrency(parseFloat(result.cashEarned))}
                </span>
              </p>
              {result.multiplier && (
                <p className="text-sm text-zinc-400">
                  ({result.multiplier}x return on investment)
                </p>
              )}
            </div>
            <button
              onClick={() => setResult(null)}
              className="w-full py-3 bg-mint hover:bg-mint/80 text-white font-bold rounded-xl transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

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
            {MARKET_STOCKS.map((stock) => (
              <div key={stock.symbol} className="flex items-center gap-3">
                <span className="font-bold text-zinc-100">{stock.symbol}</span>
                <span className="text-zinc-300 font-mono">${stock.price.toFixed(2)}</span>
                <span
                  className={`text-xs font-medium ${
                    stock.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {stock.change >= 0 ? '+' : ''}
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
          onClick={() => setActiveTab('my-ipo')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'my-ipo'
              ? 'bg-mint text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-dark-elevated'
          }`}
        >
          My IPO
          {ipoStatus && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>}
        </button>
        <button
          onClick={() => setActiveTab('leaders')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'leaders'
              ? 'bg-mint text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-dark-elevated'
          }`}
        >
          Top Investors
        </button>
      </div>

      {/* Market Tab */}
      {activeTab === 'market' && (
        <div className="space-y-6">
          {/* Market Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase mb-1">S&P 500</p>
              <p className="text-xl font-bold text-zinc-100">4,567.23</p>
              <p className="text-sm text-green-400">+0.85%</p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase mb-1">NASDAQ</p>
              <p className="text-xl font-bold text-zinc-100">14,298.41</p>
              <p className="text-sm text-green-400">+1.12%</p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase mb-1">DOW</p>
              <p className="text-xl font-bold text-zinc-100">35,123.89</p>
              <p className="text-sm text-red-400">-0.23%</p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase mb-1">Your Net Worth</p>
              <p className="text-xl font-bold text-mint">{formatCurrency(netWorth)}</p>
              <p className="text-sm text-zinc-500">IPO Value: {formatCurrency(baseCashValue)}</p>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-dark-border">
              <h2 className="font-bold text-zinc-100">Market Movers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-dark-elevated text-xs text-zinc-500 uppercase">
                    <th className="text-left px-4 py-3">Symbol</th>
                    <th className="text-left px-4 py-3">Company</th>
                    <th className="text-right px-4 py-3">Price</th>
                    <th className="text-right px-4 py-3">Change</th>
                    <th className="text-right px-4 py-3">% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {MARKET_STOCKS.map((stock) => (
                    <tr key={stock.symbol} className="border-b border-dark-border/50 hover:bg-dark-elevated/50">
                      <td className="px-4 py-3 font-bold text-zinc-100">{stock.symbol}</td>
                      <td className="px-4 py-3 text-zinc-400">{stock.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-100">
                        ${stock.price.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono ${
                          stock.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {stock.change >= 0 ? '+' : ''}${Math.abs(stock.change).toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono ${
                          stock.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* My IPO Tab */}
      {activeTab === 'my-ipo' && (
        <>
          {ipoStatus ? (
            <IPODashboard
              status={ipoStatus}
              onSell={handleSellIPO}
              onCancel={handleCancelIPO}
              isLoading={isProcessing}
            />
          ) : (
            <div className="space-y-6">
              {/* Launch IPO Card */}
              <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                    <span className="text-3xl">📈</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-100">Launch Your IPO</h2>
                    <p className="text-zinc-400">Take your company public and trade shares</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-dark-elevated rounded-xl p-4">
                    <p className="text-xs text-zinc-500 uppercase mb-1">Net Worth</p>
                    <p className="text-lg font-bold text-zinc-100">{formatCurrency(netWorth)}</p>
                  </div>
                  <div className="bg-dark-elevated rounded-xl p-4">
                    <p className="text-xs text-zinc-500 uppercase mb-1">Required</p>
                    <p className="text-lg font-bold text-zinc-100">
                      {formatCurrency(prestigeStatus?.minimumNetWorth || 100000)}
                    </p>
                  </div>
                  <div className="bg-dark-elevated rounded-xl p-4">
                    <p className="text-xs text-zinc-500 uppercase mb-1">Base IPO Value</p>
                    <p className="text-lg font-bold text-mint">{formatCurrency(baseCashValue)}</p>
                  </div>
                  <div className="bg-dark-elevated rounded-xl p-4">
                    <p className="text-xs text-zinc-500 uppercase mb-1">Multiplier Range</p>
                    <p className="text-lg font-bold text-cyan">0.7x - 1.5x</p>
                  </div>
                </div>

                {/* Potential Returns */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-red-400 mb-1">Min (0.7x)</p>
                    <p className="text-lg font-bold text-red-400">{formatCurrency(baseCashValue * 0.7)}</p>
                  </div>
                  <div className="bg-dark-elevated border border-dark-border rounded-xl p-4 text-center">
                    <p className="text-xs text-zinc-400 mb-1">Base (1.0x)</p>
                    <p className="text-lg font-bold text-zinc-300">{formatCurrency(baseCashValue)}</p>
                  </div>
                  <div className="bg-mint/10 border border-mint/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-mint mb-1">Max (1.5x)</p>
                    <p className="text-lg font-bold text-mint">{formatCurrency(baseCashValue * 1.5)}</p>
                  </div>
                </div>

                <button
                  onClick={handleLaunchIPO}
                  disabled={!prestigeStatus?.canPrestige || isLaunchingIPO}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    prestigeStatus?.canPrestige
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white'
                      : 'bg-dark-border text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {isLaunchingIPO
                    ? 'Launching IPO...'
                    : prestigeStatus?.canPrestige
                      ? 'Launch IPO'
                      : `Need ${formatCurrency(prestigeStatus?.minimumNetWorth || 100000)} Net Worth`}
                </button>
              </div>

              {/* How It Works */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-6">
                <h3 className="font-bold text-zinc-100 mb-4">How Your IPO Works</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-mint/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-mint font-bold">1</span>
                    </div>
                    <p className="text-sm text-zinc-400">Launch your IPO with 100 shares</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-mint/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-mint font-bold">2</span>
                    </div>
                    <p className="text-sm text-zinc-400">Watch price fluctuate over 8 hours</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-mint/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-mint font-bold">3</span>
                    </div>
                    <p className="text-sm text-zinc-400">Sell when price is high</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-mint/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-mint font-bold">4</span>
                    </div>
                    <p className="text-sm text-zinc-400">Collect cash - no reset!</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Top Investors Tab */}
      {activeTab === 'leaders' && (
        <div className="space-y-6">
          {/* Leaderboard Header */}
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🏆</span>
              <div>
                <h2 className="text-xl font-bold text-zinc-100">Top Investors</h2>
                <p className="text-zinc-400">Players with the highest net worth portfolios</p>
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-dark-elevated text-xs text-zinc-500 uppercase">
                  <th className="text-left px-4 py-3 w-16">Rank</th>
                  <th className="text-left px-4 py-3">Investor</th>
                  <th className="text-right px-4 py-3">Net Worth</th>
                  <th className="text-right px-4 py-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                {marketLeaders.length > 0 ? (
                  marketLeaders.map((entry) => (
                    <tr
                      key={entry.userId}
                      className={`border-b border-dark-border/50 hover:bg-dark-elevated/50 ${
                        entry.isCurrentUser ? 'bg-mint/5' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-dark-elevated">
                          {entry.rank <= 3 ? (
                            <span className="text-lg">
                              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-zinc-400">#{entry.rank}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-mint to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                            {(entry.displayName || entry.username || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-100">
                              {entry.displayName || entry.username || 'Anonymous'}
                              {entry.isCurrentUser && (
                                <span className="ml-2 text-xs bg-mint/20 text-mint px-2 py-0.5 rounded">
                                  You
                                </span>
                              )}
                            </p>
                            {entry.isPremium && (
                              <p className="text-xs text-amber flex items-center gap-1">
                                <span>⭐</span> Premium
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-mono font-bold text-mint">
                          {formatCurrency(parseFloat(entry.score))}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {entry.previousRank !== null && entry.previousRank !== entry.rank ? (
                          <span
                            className={`flex items-center justify-end gap-1 text-sm ${
                              entry.previousRank > entry.rank ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {entry.previousRank > entry.rank ? '▲' : '▼'}
                            {Math.abs(entry.previousRank - entry.rank)}
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      No investors found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Your Position */}
          {marketLeaders.length > 0 && !marketLeaders.some((e) => e.isCurrentUser) && (
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dark-elevated rounded-full flex items-center justify-center">
                    <span className="text-zinc-500">?</span>
                  </div>
                  <div>
                    <p className="text-zinc-400">Your Position</p>
                    <p className="text-sm text-zinc-500">Not ranked in top 10</p>
                  </div>
                </div>
                <p className="font-mono text-zinc-300">{formatCurrency(netWorth)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
