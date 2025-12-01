import { useMemo } from 'react';
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
import { formatCurrency } from '@mint/utils';

interface PricePoint {
  time: number;
  price: number;
}

interface IPOChartProps {
  priceHistory: PricePoint[];
  ipoPrice: number;
  currentPrice: number;
  isPositive: boolean;
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
  const time = label ? new Date(Number(label)).toLocaleTimeString() : '';

  return (
    <div className="bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-zinc-400 text-xs">{time}</p>
      <p className={`font-bold font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

export function IPOChart({ priceHistory, ipoPrice, currentPrice, isPositive }: IPOChartProps) {
  const chartData = useMemo(
    () =>
      priceHistory.map((point) => ({
        time: point.time,
        price: point.price,
      })),
    [priceHistory]
  );

  const strokeColor = isPositive ? '#22c55e' : '#ef4444';
  const gradientId = isPositive ? 'ipoPositiveGradient' : 'ipoNegativeGradient';

  // Calculate domain with some padding
  const prices = priceHistory.map((p) => p.price);
  const minPrice = Math.min(...prices, ipoPrice) * 0.95;
  const maxPrice = Math.max(...prices, ipoPrice) * 1.05;

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="ipoPositiveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ipoNegativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              strokeOpacity={0.5}
              vertical={false}
            />

            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              dy={10}
            />

            <YAxis
              domain={[minPrice, maxPrice]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(value) => formatCurrency(value)}
              width={80}
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
              y={ipoPrice}
              stroke="#6366f1"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `IPO ${formatCurrency(ipoPrice)}`,
                fill: '#6366f1',
                fontSize: 11,
                position: 'right',
              }}
            />

            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              style={{ filter: `drop-shadow(0 0 6px ${strokeColor}50)` }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-indigo-500" style={{ borderStyle: 'dashed' }} />
            <span className="text-slate-400">IPO Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-slate-400">Current</span>
          </div>
        </div>
        <div className={`font-mono font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(currentPrice)}
        </div>
      </div>
    </div>
  );
}
