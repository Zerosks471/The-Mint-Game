import { useEffect, useState } from 'react';
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

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 10) return 'now';
  if (diffSecs < 60) return `${diffSecs}s`;
  if (diffMins < 60) return `${diffMins}m`;
  return `${Math.floor(diffMins / 60)}h`;
}

interface LiveTradesFeedProps {
  maxTrades?: number;
}

export function LiveTradesFeed({ maxTrades = 50 }: LiveTradesFeedProps) {
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrades = async (isInitial: boolean = false) => {
    try {
      if (isInitial) setIsLoading(true);
      const res = await gameApi.getRecentTrades(maxTrades);
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
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades(true);
    const interval = setInterval(() => fetchTrades(), 3000);
    return () => clearInterval(interval);
  }, [maxTrades]);

  if (isLoading) {
    return (
      <div className="cyberpunk-card p-4">
        <div className="flex items-center justify-center py-6">
          <div className="cyberpunk-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="cyberpunk-card overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Recent Trades</h3>
        <span className="text-xs text-zinc-500">{trades.length}</span>
      </div>

      <div className="max-h-[300px] overflow-y-auto cyberpunk-scrollbar">
        {trades.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-zinc-500 text-sm">No trades yet</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {trades.slice(0, 20).map((trade) => {
              const isBuy = trade.type === 'buy';
              return (
                <div key={trade.id} className="px-4 py-2.5 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                        {isBuy ? '↑' : '↓'}
                      </span>
                      <span className="text-sm font-semibold text-white">{trade.ticker}</span>
                      {trade.traderType === 'bot' && (
                        <span className="text-[9px] px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded">BOT</span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">{formatRelativeTime(trade.timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-zinc-500">
                      {trade.shares.toLocaleString()} @ ${parseFloat(trade.price).toFixed(2)}
                    </span>
                    <span className={`text-xs font-mono ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                      ${(parseFloat(trade.price) * trade.shares).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
