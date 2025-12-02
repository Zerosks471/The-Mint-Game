import { useState, useEffect } from 'react';
import { formatCurrency } from '@mint/utils';

interface IndexData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  sparklineData?: number[];
}

interface StockIndexCardProps {
  index: IndexData;
  onClick?: () => void;
}

// Mini sparkline chart using SVG
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;

  const width = 100;
  const height = 30;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - 2 * padding) + padding;
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="opacity-80">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function StockIndexCard({ index, onClick }: StockIndexCardProps) {
  const [glowing, setGlowing] = useState(false);
  const isPositive = index.change >= 0;
  const glowColor = isPositive ? 'shadow-green-500/30' : 'shadow-red-500/30';
  const strokeColor = isPositive ? '#22c55e' : '#ef4444';

  // Trigger glow effect on significant changes
  useEffect(() => {
    if (Math.abs(index.changePercent) > 0.1) {
      setGlowing(true);
      const timer = setTimeout(() => setGlowing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [index.changePercent]);

  return (
    <div
      onClick={onClick}
      className={`bg-dark-card border border-dark-border rounded-xl p-4 hover:border-mint/50 transition-all duration-300 cursor-pointer ${
        glowing ? `shadow-lg ${glowColor} border-${isPositive ? 'green' : 'red'}-500/50` : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-zinc-100 text-xl tracking-tight">{index.symbol}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{index.name}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono text-zinc-100">
            {index.value.toFixed(2)}
          </p>
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            <span>{isPositive ? '▲' : '▼'}</span>
            <span>
              {isPositive ? '+' : ''}
              {index.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {index.sparklineData && index.sparklineData.length > 0 && (
        <div className="mb-3 flex justify-center">
          <MiniSparkline data={index.sparklineData} color={strokeColor} />
        </div>
      )}

      {/* 24h High/Low */}
      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-dark-border">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">24h High</p>
          <p className="text-sm font-mono font-bold text-green-400">
            {index.high24h.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">24h Low</p>
          <p className="text-sm font-mono font-bold text-red-400">
            {index.low24h.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Change indicator */}
      <div className="mt-3 pt-3 border-t border-dark-border">
        <div className={`text-xs font-medium text-center ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}
          {formatCurrency(Math.abs(index.change))} today
        </div>
      </div>
    </div>
  );
}
