import { useState, useEffect } from 'react';

interface HaltedStock {
  ticker: string;
  companyName: string;
  reason: string;
  haltedAt: Date;
  resumesAt: Date;
}

interface HaltedStocksBannerProps {
  haltedStocks: HaltedStock[];
  isMarketWideHalt?: boolean;
  marketResumeTime?: Date;
  onDismiss?: () => void;
}

export function HaltedStocksBanner({
  haltedStocks,
  isMarketWideHalt = false,
  marketResumeTime,
  onDismiss,
}: HaltedStocksBannerProps) {
  const [countdown, setCountdown] = useState<{ [ticker: string]: string }>({});

  // Update countdown for each halted stock
  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdown: { [ticker: string]: string } = {};

      if (isMarketWideHalt && marketResumeTime) {
        const remaining = marketResumeTime.getTime() - Date.now();
        if (remaining > 0) {
          const hours = Math.floor(remaining / 3600000);
          const minutes = Math.floor((remaining % 3600000) / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          newCountdown['market'] = hours > 0
            ? `${hours}h ${minutes}m ${seconds}s`
            : `${minutes}m ${seconds}s`;
        } else {
          newCountdown['market'] = 'Resuming...';
        }
      }

      haltedStocks.forEach((stock) => {
        const remaining = stock.resumesAt.getTime() - Date.now();
        if (remaining > 0) {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          newCountdown[stock.ticker] = minutes > 0
            ? `${minutes}m ${seconds}s`
            : `${seconds}s`;
        } else {
          newCountdown[stock.ticker] = 'Resuming...';
        }
      });

      setCountdown(newCountdown);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [haltedStocks, isMarketWideHalt, marketResumeTime]);

  if (isMarketWideHalt && marketResumeTime) {
    return (
      <div className="bg-red-600 border-2 border-red-500 shadow-lg shadow-red-500/50 animate-pulse">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                <span className="text-xl">⛔</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg uppercase tracking-wide">
                  MARKET-WIDE CIRCUIT BREAKER ACTIVATED
                </h3>
                <p className="text-red-100 text-sm">
                  All trading has been halted due to extreme volatility
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-red-100 text-xs uppercase tracking-wider mb-1">Resumes in</p>
              <p className="text-white font-mono font-bold text-2xl">
                {countdown['market'] || 'Calculating...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (haltedStocks.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg shadow-lg">
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center animate-pulse">
              <span className="text-lg">⚠️</span>
            </div>
            <h3 className="text-yellow-400 font-bold text-sm uppercase tracking-wide">
              Trading Halted
            </h3>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-zinc-400 hover:text-zinc-300 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Halted Stocks List */}
        <div className="space-y-2">
          {haltedStocks.map((stock) => (
            <div
              key={stock.ticker}
              className="bg-dark-card border border-yellow-500/30 rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-zinc-100">{stock.ticker}</span>
                  <span className="text-xs text-zinc-500">{stock.companyName}</span>
                </div>
                <p className="text-xs text-yellow-400">{stock.reason}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-xs text-zinc-500 mb-1">Resumes in</p>
                <p className="text-lg font-mono font-bold text-yellow-400 animate-pulse">
                  {countdown[stock.ticker] || 'Calculating...'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Info Footer */}
        <div className="mt-3 pt-3 border-t border-yellow-500/30">
          <p className="text-xs text-zinc-400 text-center">
            Trading will automatically resume when the halt period expires. Orders cannot be placed during halts.
          </p>
        </div>
      </div>

      {/* Pulsing animation border */}
      <style>{`
        @keyframes pulse-border {
          0%, 100% {
            border-color: rgba(234, 179, 8, 0.3);
          }
          50% {
            border-color: rgba(234, 179, 8, 0.6);
          }
        }
      `}</style>
    </div>
  );
}
