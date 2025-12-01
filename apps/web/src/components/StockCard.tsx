import { useState, useEffect } from 'react';
import { StockMarketData } from '../api/game';
import { formatCurrency } from '@mint/utils';

interface StockCardProps {
  stock: StockMarketData;
  onBuy?: (ticker: string) => void;
  onSell?: (ticker: string) => void;
  onView?: (ticker: string) => void;
  showActions?: boolean;
}

export function StockCard({ stock, onBuy, onSell, onView, showActions = true }: StockCardProps) {
  const [displayPrice, setDisplayPrice] = useState(parseFloat(stock.currentPrice));
  const [priceChange, setPriceChange] = useState<'up' | 'down' | null>(null);

  // Update price in real-time with smooth transitions
  useEffect(() => {
    const currentPrice = parseFloat(stock.currentPrice);
    if (currentPrice !== displayPrice) {
      if (currentPrice > displayPrice) {
        setPriceChange('up');
      } else if (currentPrice < displayPrice) {
        setPriceChange('down');
      }
      setDisplayPrice(currentPrice);
      
      // Reset price change indicator after animation
      setTimeout(() => setPriceChange(null), 1000);
    }
  }, [stock.currentPrice, displayPrice]);

  const isPositive = parseFloat(stock.change) >= 0;
  const trendColor =
    stock.trend === 'bullish'
      ? 'text-green-400'
      : stock.trend === 'bearish'
        ? 'text-red-400'
        : 'text-zinc-400';

  return (
    <div
      className="bg-dark-card border border-dark-border rounded-xl p-4 hover:border-mint/50 transition-colors cursor-pointer"
      onClick={() => onView?.(stock.tickerSymbol)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-zinc-100 text-lg">{stock.tickerSymbol}</h3>
            {stock.stockType === 'player' && (
              <span className="text-xs bg-mint/20 text-mint px-2 py-0.5 rounded">Player</span>
            )}
            {stock.sector && (
              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase">
                {stock.sector}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400">{stock.companyName}</p>
        </div>
        <div className="text-right">
          <p
            className={`text-xl font-bold font-mono transition-all duration-300 ${
              priceChange === 'up'
                ? 'text-green-400 scale-105'
                : priceChange === 'down'
                  ? 'text-red-400 scale-105'
                  : 'text-zinc-100'
            }`}
          >
            ${displayPrice.toFixed(2)}
          </p>
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            <span>{isPositive ? '↑' : '↓'}</span>
            <span>
              {isPositive ? '+' : ''}
              {stock.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
        <div className="flex items-center gap-4">
          <span>Vol: {stock.volume24h.toLocaleString()}</span>
          {stock.marketCap && (
            <span>Mkt Cap: {formatCurrency(parseFloat(stock.marketCap))}</span>
          )}
        </div>
        <span className={`${trendColor}`}>
          {stock.trend === 'bullish' ? '📈' : stock.trend === 'bearish' ? '📉' : '➡️'} {stock.trend}
        </span>
      </div>

      {showActions && (onBuy || onSell) && (
        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          {onBuy && (
            <button
              onClick={() => onBuy(stock.tickerSymbol)}
              className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
            >
              Buy
            </button>
          )}
          {onSell && (
            <button
              onClick={() => onSell(stock.tickerSymbol)}
              className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
            >
              Sell
            </button>
          )}
        </div>
      )}
    </div>
  );
}

