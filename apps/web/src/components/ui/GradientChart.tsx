import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export type ChartColor = 'mint' | 'cyan' | 'blue' | 'purple' | 'pink' | 'amber';

interface DataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface GradientChartProps {
  data: DataPoint[];
  dataKey?: string;
  color?: ChartColor;
  height?: number;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showTooltip?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

const colorConfig: Record<ChartColor, { stroke: string; fill: string; glow: string }> = {
  mint: {
    stroke: '#10b981',
    fill: 'url(#mintGradient)',
    glow: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))',
  },
  cyan: {
    stroke: '#06b6d4',
    fill: 'url(#cyanGradient)',
    glow: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.5))',
  },
  blue: {
    stroke: '#3b82f6',
    fill: 'url(#blueGradient)',
    glow: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))',
  },
  purple: {
    stroke: '#a855f7',
    fill: 'url(#purpleGradient)',
    glow: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.5))',
  },
  pink: {
    stroke: '#ec4899',
    fill: 'url(#pinkGradient)',
    glow: 'drop-shadow(0 0 6px rgba(236, 72, 153, 0.5))',
  },
  amber: {
    stroke: '#f59e0b',
    fill: 'url(#amberGradient)',
    glow: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))',
  },
};

// Gradient definitions for all colors
function ChartGradients() {
  return (
    <defs>
      <linearGradient id="mintGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  label,
  formatValue,
  color,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  formatValue?: (value: number) => string;
  color: ChartColor;
}) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value;
  const formattedValue = formatValue ? formatValue(value) : value.toLocaleString();

  return (
    <div className="bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-zinc-400 text-xs">{label}</p>
      <p className={`text-${color} font-bold font-mono`}>{formattedValue}</p>
    </div>
  );
}

export function GradientChart({
  data,
  dataKey = 'value',
  color = 'mint',
  height = 200,
  showGrid = true,
  showXAxis = true,
  showYAxis = false,
  showTooltip = true,
  formatValue,
  className = '',
}: GradientChartProps) {
  const config = colorConfig[color];

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <ChartGradients />

          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1f1f2a"
              strokeOpacity={0.5}
              vertical={false}
            />
          )}

          {showXAxis && (
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#52525b', fontSize: 11 }}
              dy={10}
            />
          )}

          {showYAxis && (
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#52525b', fontSize: 11 }}
              tickFormatter={(value) => formatValue ? formatValue(value) : value.toLocaleString()}
              width={60}
            />
          )}

          {showTooltip && (
            <Tooltip
              content={({ active, payload, label }) => (
                <CustomTooltip
                  active={active}
                  payload={payload as Array<{ value: number }>}
                  label={String(label ?? '')}
                  formatValue={formatValue}
                  color={color}
                />
              )}
            />
          )}

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={config.stroke}
            strokeWidth={2}
            fill={config.fill}
            style={{ filter: config.glow }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Mini sparkline variant for stat cards
interface SparklineProps {
  data: number[];
  color?: ChartColor;
  height?: number;
  className?: string;
}

export function Sparkline({ data, color = 'mint', height = 40, className = '' }: SparklineProps) {
  const chartData = useMemo(
    () => data.map((value, index) => ({ name: String(index), value })),
    [data]
  );

  return (
    <GradientChart
      data={chartData}
      color={color}
      height={height}
      showGrid={false}
      showXAxis={false}
      showYAxis={false}
      showTooltip={false}
      className={className}
    />
  );
}

// Inline mini sparkline for portfolio cards - auto-detects trend color
interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  positiveColor?: string;
  negativeColor?: string;
}

export function MiniSparkline({
  data,
  width = 60,
  height = 24,
  className = '',
  positiveColor = '#4ade80',
  negativeColor = '#f87171',
}: MiniSparklineProps) {
  // Determine trend: compare first and last values
  const isPositive = data.length >= 2 ? data[data.length - 1] >= data[0] : true;
  const color = isPositive ? positiveColor : negativeColor;

  // Normalize data to fit in the height
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Generate SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2; // 2px padding
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={`sparkGrad-${isPositive ? 'pos' : 'neg'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#sparkGrad-${isPositive ? 'pos' : 'neg'})`}
      />
      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
