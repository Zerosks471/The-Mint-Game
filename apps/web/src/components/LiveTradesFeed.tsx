import { useEffect, useState } from 'react';
import { formatCurrency } from '@mint/utils';
import { gameApi } from '../api/game';

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
}

export function LiveTradesFeed({ maxTrades }: LiveTradesFeedProps) {
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

        // Replace with latest snapshot from server (API already returns newest first)
        setTrades(formattedTrades);
      } else {
        console.warn('Trades API returned unexpected response:', res);
        // Only clear if we got an explicit error
        if (!res.success) {
          setTrades([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err);
      // Don't clear trades on error, keep showing last successful fetch
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchTrades(true);

    // Poll for new trades every 3 seconds
    const interval = setInterval(() => {
      fetchTrades();
    }, 3000);

    return () => clearInterval(interval);
  }, [maxTrades]);

  return (
    <div className="bg-[#0f0f15] border border-[#1a1a24] rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <p className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Live Trades</p>
        </div>
        <span className="text-xs text-zinc-500">{trades.length} trades</span>
      </div>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar flex-1">
        {isLoading ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            <p>Loading trades...</p>
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            <p>No trades yet. Start trading to see activity!</p>
          </div>
        ) : (
          trades.map((trade) => (
            <div
              key={trade.id}
              className="flex flex-col gap-2 py-2.5 px-3 bg-[#0a0a0f] rounded-lg border border-[#1a1a24] hover:border-mint/30 transition-all duration-300 ease-out animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-100 text-base">{trade.ticker}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      trade.type === 'buy'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {trade.type.toUpperCase()}
                  </span>
                  {trade.traderType === 'bot' && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                      BOT
                    </span>
                  )}
                </div>
                <span className="text-sm font-mono font-bold text-zinc-100">
                  ${parseFloat(trade.price).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">
                  {trade.shares.toLocaleString()} shares
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">
                    {trade.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </span>
                  <span className={`text-[10px] max-w-[100px] truncate ${
                    trade.traderType === 'bot' ? 'text-blue-400' : 'text-zinc-400'
                  }`} title={trade.trader}>
                    {trade.trader}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

