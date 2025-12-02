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
  speed?: number;
}

export function StockTickerTape({ onTickerClick, speed = 40 }: StockTickerTapeProps) {
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
    const interval = setInterval(fetchStocks, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || stocks.length === 0) {
    return null;
  }

  // Duplicate for seamless loop
  const duplicatedStocks = [...stocks, ...stocks];
  const duration = duplicatedStocks.length * (80 / speed);

  return (
    <div className="cyberpunk-card overflow-hidden py-2.5 relative">
      {/* Edge fade */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#12121a] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#12121a] to-transparent z-10 pointer-events-none" />

      {/* Scrolling content */}
      <div
        className="flex gap-6 ticker-animate"
        style={{
          animationDuration: `${duration}s`,
          width: 'max-content'
        }}
      >
        {duplicatedStocks.map((stock, index) => {
          const isPositive = stock.change >= 0;
          return (
            <div
              key={`${stock.ticker}-${index}`}
              onClick={() => onTickerClick?.(stock.ticker)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <span className="font-semibold text-cyan-400 text-sm">{stock.ticker}</span>
              <span className="font-mono text-white text-sm">${stock.price.toFixed(2)}</span>
              <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-animate {
          animation: ticker-scroll linear infinite;
        }
        .ticker-animate:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
