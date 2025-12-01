import { ReactNode } from 'react';
import { Sparkline } from './GradientChart';

export type StatCardColor = 'mint' | 'cyan' | 'blue' | 'purple' | 'pink' | 'amber';

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  color?: StatCardColor;
  badge?: string;
  badgeColor?: 'green' | 'amber' | 'red' | 'blue' | 'purple';
  sparklineData?: number[];
  subtitle?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const colorClasses: Record<StatCardColor, {
  border: string;
  text: string;
  glow: string;
  bg: string;
}> = {
  mint: {
    border: 'border-l-mint',
    text: 'text-mint',
    glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    bg: 'bg-mint/5',
  },
  cyan: {
    border: 'border-l-cyan',
    text: 'text-cyan',
    glow: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    bg: 'bg-cyan/5',
  },
  blue: {
    border: 'border-l-blue',
    text: 'text-blue',
    glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    bg: 'bg-blue/5',
  },
  purple: {
    border: 'border-l-purple',
    text: 'text-purple',
    glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    bg: 'bg-purple/5',
  },
  pink: {
    border: 'border-l-pink',
    text: 'text-pink',
    glow: 'hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    bg: 'bg-pink/5',
  },
  amber: {
    border: 'border-l-amber',
    text: 'text-amber',
    glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    bg: 'bg-amber/5',
  },
};

const badgeClasses: Record<string, string> = {
  green: 'bg-mint/20 text-mint border-mint/30',
  amber: 'bg-amber/20 text-amber border-amber/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  blue: 'bg-blue/20 text-blue border-blue/30',
  purple: 'bg-purple/20 text-purple border-purple/30',
};

export function StatCard({
  icon,
  value,
  label,
  color = 'mint',
  badge,
  badgeColor = 'green',
  sparklineData,
  subtitle,
  onClick,
  className = '',
}: StatCardProps) {
  const classes = colorClasses[color];
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        bg-dark-card border border-dark-border rounded-2xl
        border-l-[3px] ${classes.border}
        p-4 transition-all duration-300
        ${classes.glow}
        ${isClickable ? 'cursor-pointer hover:bg-dark-elevated' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {badge && (
          <span className={`
            text-xs font-medium px-2 py-0.5 rounded-full border
            ${badgeClasses[badgeColor]}
          `}>
            {badge}
          </span>
        )}
      </div>

      {/* Value */}
      <p className={`text-2xl font-bold font-mono ${classes.text}`}>
        {value}
      </p>

      {/* Label */}
      <p className="text-sm text-zinc-500 mt-1">{label}</p>

      {/* Subtitle / Additional Info */}
      {subtitle && (
        <div className="mt-3 pt-3 border-t border-dark-border text-xs">
          {subtitle}
        </div>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-3 -mx-2 -mb-2">
          <Sparkline data={sparklineData} color={color} height={50} />
        </div>
      )}
    </div>
  );
}

// Compact stat row for inside cards
interface StatRowProps {
  label: string;
  value: string | number;
  valueColor?: 'mint' | 'cyan' | 'amber' | 'red' | 'zinc';
}

export function StatRow({ label, value, valueColor = 'zinc' }: StatRowProps) {
  const textColors: Record<string, string> = {
    mint: 'text-mint',
    cyan: 'text-cyan',
    amber: 'text-amber',
    red: 'text-red-400',
    zinc: 'text-zinc-300',
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-medium font-mono ${textColors[valueColor]}`}>{value}</span>
    </div>
  );
}
