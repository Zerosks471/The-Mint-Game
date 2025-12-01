import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export type DonutColor = 'mint' | 'cyan' | 'blue' | 'purple' | 'pink' | 'amber';

interface DonutChartProps {
  value: number; // 0-100 percentage
  maxValue?: number;
  color?: DonutColor;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  showGlow?: boolean;
  className?: string;
}

const colorConfig: Record<DonutColor, { primary: string; glow: string }> = {
  mint: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  cyan: { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
  blue: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  purple: { primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' },
  pink: { primary: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)' },
  amber: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
};

export function DonutChart({
  value,
  maxValue = 100,
  color = 'mint',
  size = 120,
  strokeWidth = 12,
  label,
  sublabel,
  showGlow = true,
  className = '',
}: DonutChartProps) {
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  const config = colorConfig[color];

  const data = useMemo(
    () => [
      { name: 'progress', value: percentage },
      { name: 'remaining', value: 100 - percentage },
    ],
    [percentage]
  );

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id={`donutGradient-${color}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={config.primary} />
              <stop offset="100%" stopColor={color === 'pink' ? '#a855f7' : config.primary} />
            </linearGradient>
            {showGlow && (
              <filter id={`donutGlow-${color}`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={config.glow} />
              </filter>
            )}
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size / 2 - strokeWidth}
            outerRadius={size / 2 - 4}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
            cornerRadius={6}
          >
            <Cell
              fill={`url(#donutGradient-${color})`}
              style={showGlow ? { filter: `url(#donutGlow-${color})` } : undefined}
            />
            <Cell fill="#1f1f2a" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span className={`text-2xl font-bold text-${color} font-mono`}>
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-xs text-zinc-500 mt-0.5">{sublabel}</span>
        )}
      </div>
    </div>
  );
}

// Progress ring - simpler version without recharts
interface ProgressRingProps {
  value: number;
  maxValue?: number;
  color?: DonutColor;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({
  value,
  maxValue = 100,
  color = 'mint',
  size = 40,
  strokeWidth = 4,
  className = '',
}: ProgressRingProps) {
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  const config = colorConfig[color];
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  return (
    <svg
      width={size}
      height={size}
      className={`transform -rotate-90 ${className}`}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1f1f2a"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={config.primary}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{
          filter: `drop-shadow(0 0 4px ${config.glow})`,
          transition: 'stroke-dashoffset 0.5s ease',
        }}
      />
    </svg>
  );
}
