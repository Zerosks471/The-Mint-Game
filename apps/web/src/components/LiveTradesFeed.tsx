import { useEffect, useState } from 'react';
import { gameApi, MarketSummaryData, MarketEvent } from '../api/game';

interface LiveTrade {
  id: string;
  ticker: string;
  type: 'buy' | 'sell';
  shares: number;
  price: string;
  timestamp: Date;
  trader: string;
  traderType: 'player' | 'bot';
}

interface LiveTradesFeedProps {
  maxTrades?: number;
  showMarketActivity?: boolean;
}

export function LiveTradesFeed({ maxTrades, showMarketActivity = true }: LiveTradesFeedProps) {
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [marketSummary, setMarketSummary] = useState<MarketSummaryData | null>(null);
  const [activeTab, setActiveTab] = useState<'trades' | 'movers' | 'volume' | 'events'>('trades');

  const fetchTrades = async (isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setIsLoading(true);
      }
      const limit = maxTrades ?? 300;
      const res = await gameApi.getRecentTrades(limit);
      if (res.success && res.data && Array.isArray(res.data)) {
        const formattedTrades: LiveTrade[] = res.data.map((trade) => ({
          id: trade.id,
          ticker: trade.tickerSymbol,
          type: trade.orderType,
          shares: trade.shares,
          price: trade.pricePerShare,
          timestamp: new Date(trade.createdAt),
          trader: trade.traderName || 'Unknown',
          traderType: trade.traderType || 'player',
        }));

        setTrades(formattedTrades);
      } else {
        console.warn('Trades API returned unexpected response:', res);
        if (!res.success) {
          setTrades([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  };

  const fetchMarketSummary = async () => {
    try {
      const res = await gameApi.getMarketSummary();
      if (res.success && res.data) {
        setMarketSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch market summary:', err);
    }
  };

  useEffect(() => {
    fetchTrades(true);
    if (showMarketActivity) {
      fetchMarketSummary();
    }

    // Poll for new trades every 3 seconds
    const tradesInterval = setInterval(() => {
      fetchTrades();
    }, 3000);

    // Poll for market summary every 5 seconds
    const summaryInterval = showMarketActivity
      ? setInterval(() => {
          fetchMarketSummary();
        }, 5000)
      : null;

    return () => {
      clearInterval(tradesInterval);
      if (summaryInterval) clearInterval(summaryInterval);
    };
  }, [maxTrades, showMarketActivity]);

  const getEventIcon = (type: MarketEvent['type']) => {
    switch (type) {
      case 'pump':
        return '🚀';
      case 'dump':
        return '💥';
      case 'news_positive':
        return '📰';
      case 'news_negative':
        return '📉';
      default:
        return '📊';
    }
  };

  const getEventLabel = (type: MarketEvent['type']) => {
    switch (type) {
      case 'pump':
        return 'PUMP';
      case 'dump':
        return 'DUMP';
      case 'news_positive':
        return 'GOOD NEWS';
      case 'news_negative':
        return 'BAD NEWS';
      default:
        return 'EVENT';
    }
  };

  const getEventColor = (type: MarketEvent['type']) => {
    switch (type) {
      case 'pump':
      case 'news_positive':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'dump':
      case 'news_negative':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'text-zinc-400 bg-zinc-500/20 border-zinc-500/30';
    }
  };

  return (
    <div className="bg-[#0f0f15] border border-[#1a1a24] rounded-lg h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b border-[#1a1a24]">
        <button
          onClick={() => setActiveTab('trades')}
          className={`flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'trades'
              ? 'text-mint border-b-2 border-mint bg-mint/5'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'trades' ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`}></div>
            Trades
          </div>
        </button>
        {showMarketActivity && (
          <>
            <button
              onClick={() => setActiveTab('movers')}
              className={`flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'movers'
                  ? 'text-mint border-b-2 border-mint bg-mint/5'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Movers
            </button>
            <button
              onClick={() => setActiveTab('volume')}
              className={`flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'volume'
                  ? 'text-mint border-b-2 border-mint bg-mint/5'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Volume
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`relative flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'events'
                  ? 'text-mint border-b-2 border-mint bg-mint/5'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Events
              {marketSummary?.activeEvents && marketSummary.activeEvents.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {marketSummary.activeEvents.length}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Trades Tab */}
        {activeTab === 'trades' && (
          <div className="p-3 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Live Feed</span>
              <span className="text-[10px] text-zinc-500">{trades.length} trades</span>
            </div>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar flex-1">
              {isLoading ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-mint mx-auto mb-2"></div>
                  <p>Loading trades...</p>
                </div>
              ) : trades.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  <p>No trades yet</p>
                </div>
              ) : (
                trades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between py-2 px-2.5 bg-[#0a0a0f] rounded-lg border border-[#1a1a24] hover:border-mint/30 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-100 text-sm">{trade.ticker}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          trade.type === 'buy'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {trade.type.toUpperCase()}
                      </span>
                      {trade.traderType === 'bot' && (
                        <span className="text-[9px] px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                          BOT
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-zinc-100">
                        ${parseFloat(trade.price).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {trade.shares.toLocaleString()} shares
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Movers Tab */}
        {activeTab === 'movers' && marketSummary && (
          <div className="p-3 h-full flex flex-col">
            {/* Market Overview */}
            <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-[#0a0a0f] rounded-lg border border-[#1a1a24]">
              <div className="text-center">
                <p className="text-lg font-bold text-green-400">{marketSummary.overview.gainersCount}</p>
                <p className="text-[10px] text-zinc-500">Gainers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-400">{marketSummary.overview.losersCount}</p>
                <p className="text-[10px] text-zinc-500">Losers</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${marketSummary.overview.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {marketSummary.overview.avgChange >= 0 ? '+' : ''}{marketSummary.overview.avgChange.toFixed(2)}%
                </p>
                <p className="text-[10px] text-zinc-500">Avg</p>
              </div>
            </div>

            {/* Top Gainers */}
            <div className="mb-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Top Gainers</p>
              <div className="space-y-1">
                {marketSummary.topGainers.slice(0, 3).map((stock) => (
                  <div
                    key={stock.tickerSymbol}
                    className="flex items-center justify-between py-1.5 px-2 bg-green-500/5 rounded border border-green-500/10"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-100 text-xs">{stock.tickerSymbol}</span>
                      {stock.stockType === 'player' && (
                        <span className="text-[8px] px-1 py-0.5 bg-purple-500/20 text-purple-400 rounded">P</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-green-400">
                      +{stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Losers */}
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Top Losers</p>
              <div className="space-y-1">
                {marketSummary.topLosers.slice(0, 3).map((stock) => (
                  <div
                    key={stock.tickerSymbol}
                    className="flex items-center justify-between py-1.5 px-2 bg-red-500/5 rounded border border-red-500/10"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-100 text-xs">{stock.tickerSymbol}</span>
                      {stock.stockType === 'player' && (
                        <span className="text-[8px] px-1 py-0.5 bg-purple-500/20 text-purple-400 rounded">P</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-red-400">
                      {stock.changePercent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Volume Tab */}
        {activeTab === 'volume' && marketSummary && (
          <div className="p-3 h-full flex flex-col">
            {/* Total Volume */}
            <div className="mb-3 p-2 bg-[#0a0a0f] rounded-lg border border-[#1a1a24] text-center">
              <p className="text-2xl font-bold text-cyan font-mono">
                {marketSummary.overview.totalVolume.toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase">Total 24h Volume</p>
            </div>

            {/* Volume Leaders */}
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Volume Leaders</p>
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {marketSummary.volumeLeaders.map((stock, index) => (
                <div
                  key={stock.tickerSymbol}
                  className="flex items-center justify-between py-2 px-2.5 bg-[#0a0a0f] rounded-lg border border-[#1a1a24]"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-cyan/20 text-cyan text-[10px] font-bold rounded">
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-bold text-zinc-100 text-xs">{stock.tickerSymbol}</span>
                      {stock.stockType === 'player' && (
                        <span className="ml-1 text-[8px] px-1 py-0.5 bg-purple-500/20 text-purple-400 rounded">P</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-cyan">
                      {stock.volume24h.toLocaleString()}
                    </p>
                    <p className={`text-[10px] ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="p-3 h-full flex flex-col">
            {marketSummary?.activeEvents && marketSummary.activeEvents.length > 0 ? (
              <>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Active Market Events</p>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {marketSummary.activeEvents.map((event, index) => {
                    const remainingSeconds = Math.ceil(event.remainingMs / 1000);
                    const remainingFormatted =
                      remainingSeconds > 60
                        ? `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s`
                        : `${remainingSeconds}s`;

                    return (
                      <div
                        key={`${event.tickerSymbol}-${index}`}
                        className={`p-3 rounded-lg border ${getEventColor(event.type)} animate-pulse`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getEventIcon(event.type)}</span>
                            <span className="font-bold text-sm">{event.tickerSymbol}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/30">
                            {getEventLabel(event.type)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span>Impact: {(event.magnitude * 100).toFixed(1)}%</span>
                          <span className="font-mono">{remainingFormatted} left</span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1 bg-black/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-current transition-all duration-1000"
                            style={{
                              width: `${Math.max(0, Math.min(100, (event.remainingMs / 300000) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <span className="text-4xl mb-2">📊</span>
                <p className="text-zinc-400 text-sm font-medium">No Active Events</p>
                <p className="text-zinc-500 text-xs mt-1">
                  Market events like pumps, dumps, and news will appear here
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
