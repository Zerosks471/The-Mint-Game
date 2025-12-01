import { useMemo, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface StockChartProps {
  ticker: string;
  priceHistory?: Array<{ time: number; price: number }>;
  currentPrice: number;
  previousClose: number;
  height?: number;
  showVolume?: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
  isPositive,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  isPositive: boolean;
}) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value;
  const time = label ? new Date(Number(label) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

  return (
    <div className="bg-[#0f0f15] border border-[#1a1a24] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-zinc-400 text-xs mb-1">{time}</p>
      <p className={`font-bold font-mono text-lg ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        ${typeof value === 'number' ? value.toFixed(2) : value}
      </p>
    </div>
  );
}

export function StockChart({
  ticker,
  priceHistory = [],
  currentPrice,
  previousClose,
  height = 400,
  showVolume = false,
}: StockChartProps) {
  const [timeRange, setTimeRange] = useState<'1H' | '24H' | '7D' | '30D'>('24H');

  const [realTimePrice, setRealTimePrice] = useState(currentPrice);
  
  // Update real-time price every second
  useEffect(() => {
    const interval = setInterval(() => {
      const variation = (Math.random() - 0.5) * 0.002; // ±0.1% variation per second
      setRealTimePrice((prev) => {
        const newPrice = prev * (1 + variation);
        // Keep price within reasonable bounds (±50% from previous close)
        return Math.max(previousClose * 0.5, Math.min(previousClose * 2, newPrice));
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [previousClose]);

  // Sync real-time price with currentPrice prop
  useEffect(() => {
    setRealTimePrice(currentPrice);
  }, [currentPrice]);

  const isPositive = realTimePrice >= previousClose;
  const change = realTimePrice - previousClose;
  const changePercent = ((change / previousClose) * 100).toFixed(2);

  // Calculate time range in seconds
  const timeRangeSeconds = useMemo(() => {
    switch (timeRange) {
      case '1H':
        return 3600; // 1 hour
      case '24H':
        return 86400; // 24 hours
      case '7D':
        return 604800; // 7 days
      case '30D':
        return 2592000; // 30 days
      default:
        return 86400;
    }
  }, [timeRange]);

  // Prepare chart data filtered by time range
  const chartData = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const cutoffTime = now - timeRangeSeconds;

    if (priceHistory.length > 0) {
      // Filter price history by time range and add current real-time price
      const filtered = priceHistory
        .filter((point) => point.time >= cutoffTime)
        .map((point) => ({
          time: point.time,
          price: point.price,
        }));

      // Add current real-time price point
      filtered.push({
        time: now,
        price: realTimePrice,
      });

      // If we have filtered data, return it
      if (filtered.length > 0) {
        return filtered;
      }
    }

    // Generate mock data if no history or filtered data is empty
    const data = [];
    const points = timeRange === '1H' ? 60 : timeRange === '24H' ? 24 : timeRange === '7D' ? 168 : 720; // Points per range
    const interval = timeRangeSeconds / points;

    for (let i = points; i >= 0; i--) {
      const time = now - i * interval;
      const variation = (Math.random() - 0.5) * 0.1;
      data.push({
        time: Math.floor(time),
        price: previousClose * (1 + variation),
      });
    }
    
    // Add current real-time price
    data.push({
      time: now,
      price: realTimePrice,
    });
    
    return data;
  }, [priceHistory, previousClose, timeRangeSeconds, timeRange, realTimePrice]);

  const strokeColor = isPositive ? '#22c55e' : '#ef4444';
  const gradientId = isPositive ? 'stockPositiveGradient' : 'stockNegativeGradient';

  // Calculate domain with padding
  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices, previousClose) * 0.95;
  const maxPrice = Math.max(...prices, previousClose) * 1.05;

  return (
    <div className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg overflow-hidden">
      {/* Chart Header */}
      <div className="px-4 py-3 border-b border-[#1a1a24] bg-[#0f0f15]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-100">{ticker}</h3>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-2xl font-bold text-zinc-100 font-mono">
                ${realTimePrice.toFixed(2)}
              </span>
              <span
                className={`text-sm font-medium flex items-center gap-1 ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}
              >
                <span>{isPositive ? '▲' : '▼'}</span>
                <span>
                  {isPositive ? '+' : ''}
                  {change.toFixed(2)} ({isPositive ? '+' : ''}
                  {changePercent}%)
                </span>
              </span>
            </div>
          </div>
          <div className="flex gap-1 bg-[#1a1a24] rounded p-1">
            {(['1H', '24H', '7D', '30D'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  timeRange === range
                    ? 'bg-mint text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div style={{ height: `${height}px` }} className="relative bg-[#0a0a0f]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="stockPositiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="stockNegativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1a1a24"
                strokeOpacity={0.5}
                vertical={false}
              />

              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(value) => {
                  const date = new Date(value * 1000);
                  if (timeRange === '7D' || timeRange === '30D') {
                    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  }
                  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                }}
                dy={10}
              />

              <YAxis
                domain={[minPrice, maxPrice]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                width={70}
              />

              <Tooltip
                content={({ active, payload, label }) => (
                  <CustomTooltip
                    active={active}
                    payload={payload as Array<{ value: number }>}
                    label={String(label ?? '')}
                    isPositive={isPositive}
                  />
                )}
              />

              <ReferenceLine
                y={previousClose}
                stroke="#71717a"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                label={{ value: 'Prev Close', position: 'right', fill: '#71717a', fontSize: 10 }}
              />

              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: strokeColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-zinc-500 text-sm">Loading chart data...</div>
          </div>
        )}
      </div>

      {/* Chart Footer Info */}
      <div className="px-4 py-2 border-t border-[#1a1a24] bg-[#0f0f15]">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span>Prev Close: ${previousClose.toFixed(2)}</span>
            <span>Last Update: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span>Bullish</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span>Bearish</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
