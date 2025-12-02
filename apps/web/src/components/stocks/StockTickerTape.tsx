import { useEffect, useState } from 'react';
import { gameApi, StockMarketData } from '../../api/game';

interface TickerItem {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

interface StockTickerTapeProps {
  onTickerClick?: (ticker: string) => void;
  speed?: number; // pixels per second
}

export function StockTickerTape({ onTickerClick, speed = 50 }: StockTickerTapeProps) {
  const [stocks, setStocks] = useState<TickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStocks = async () => {
    try {
      const res = await gameApi.getMarketStocks();
      if (res.success && res.data) {
        const tickers: TickerItem[] = res.data.map((stock: StockMarketData) => ({
          ticker: stock.tickerSymbol,
          price: parseFloat(stock.currentPrice),
          change: parseFloat(stock.change),
          changePercent: stock.changePercent,
        }));
        setStocks(tickers);
      }
    } catch (err) {
      console.error('Failed to fetch stocks for ticker tape:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
    // Refresh every 10 seconds
    const interval = setInterval(fetchStocks, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-dark-card border-y border-dark-border py-3 overflow-hidden">
        <div className="text-center text-zinc-500 text-sm">Loading ticker...</div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return null;
  }

  // Duplicate stocks array for seamless loop
  const duplicatedStocks = [...stocks, ...stocks];

  return (
    <div className="bg-dark-card border-y border-dark-border py-3 overflow-hidden relative">
      {/* Gradient overlays for edge fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-dark-card to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-dark-card to-transparent z-10 pointer-events-none" />

      {/* Scrolling container */}
      <div className="ticker-scroll flex gap-8" style={{
        animation: `scroll ${duplicatedStocks.length * (100 / speed)}s linear infinite`
      }}>
        {duplicatedStocks.map((stock, index) => {
          const isPositive = stock.change >= 0;
          return (
            <div
              key={`${stock.ticker}-${index}`}
              onClick={() => onTickerClick?.(stock.ticker)}
              className="flex items-center gap-3 px-4 py-1.5 bg-dark-bg border border-dark-border rounded-lg cursor-pointer hover:border-mint/50 transition-colors flex-shrink-0"
            >
              <span className="font-bold text-zinc-100 text-sm">{stock.ticker}</span>
              <span className="font-mono font-bold text-zinc-100 text-sm">
                ${stock.price.toFixed(2)}
              </span>
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}
              >
                <span>{isPositive ? '▲' : '▼'}</span>
                <span>
                  {isPositive ? '+' : ''}
                  {stock.changePercent.toFixed(2)}%
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
