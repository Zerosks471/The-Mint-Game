import { useEffect, useRef, useState } from 'react';
import { StockMarketData } from '../api/game';

interface StockTickerProps {
  stocks: StockMarketData[];
  speed?: number; // pixels per second
}

export function StockTicker({ stocks, speed = 50 }: StockTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!contentRef.current || stocks.length === 0) return;

    const content = contentRef.current;
    let animationFrameId: number;
    let startTime: number;
    let position = 0;

    // Duplicate content for seamless loop
    const clone = content.cloneNode(true) as HTMLElement;
    content.parentElement?.appendChild(clone);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      if (!isPaused) {
        position -= (speed * (timestamp - startTime)) / 1000;
        startTime = timestamp;

        // Reset position when first copy is completely off screen
        if (Math.abs(position) >= content.offsetWidth) {
          position = 0;
        }

        content.style.transform = `translateX(${position}px)`;
        clone.style.transform = `translateX(${position + content.offsetWidth}px)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clone.remove();
    };
  }, [stocks, speed, isPaused]);

  if (stocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-12 text-zinc-500">
        <p>Loading market data...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden h-12 bg-dark-elevated border-b border-dark-border"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div ref={contentRef} className="flex items-center gap-8 h-full whitespace-nowrap">
        {stocks.map((stock, index) => {
          const isPositive = parseFloat(stock.change) >= 0;
          return (
            <div
              key={`${stock.tickerSymbol}-${index}`}
              className="flex items-center gap-3 px-4 py-2 hover:bg-dark-card/50 transition-colors cursor-pointer"
            >
              <span className="font-bold text-zinc-100 text-sm">{stock.tickerSymbol}</span>
              <span className="text-zinc-300 font-mono text-sm">
                ${parseFloat(stock.currentPrice).toFixed(2)}
              </span>
              <span
                className={`text-xs font-medium flex items-center gap-1 ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}
              >
                <span>{isPositive ? '▲' : '▼'}</span>
                <span>
                  {isPositive ? '+' : ''}
                  {stock.changePercent.toFixed(2)}%
                </span>
              </span>
              {stock.stockType === 'player' && (
                <span className="text-xs bg-mint/20 text-mint px-1.5 py-0.5 rounded">P</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

