import { useState, useEffect } from 'react';
import { formatCurrency } from '@mint/utils';

interface DividendData {
  todayEarnings: number;
  weekEarnings: number;
  allTimeEarnings: number;
  lastPayoutAt: string | null;
  nextPayoutIn: number; // seconds until next payout
}

interface DividendSummaryProps {
  data: DividendData;
  onRefresh?: () => void;
}

// Animated counter component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = displayValue;
    const end = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const current = start + (end - start) * progress;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{formatCurrency(displayValue)}</span>;
}

export function DividendSummary({ data, onRefresh }: DividendSummaryProps) {
  const [timeUntilPayout, setTimeUntilPayout] = useState<string>('');

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      if (data.nextPayoutIn <= 0) {
        setTimeUntilPayout('Due now');
        return;
      }

      const hours = Math.floor(data.nextPayoutIn / 3600);
      const minutes = Math.floor((data.nextPayoutIn % 3600) / 60);
      const seconds = data.nextPayoutIn % 60;

      if (hours > 0) {
        setTimeUntilPayout(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeUntilPayout(`${minutes}m ${seconds}s`);
      } else {
        setTimeUntilPayout(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [data.nextPayoutIn]);

  const lastPayoutTime = data.lastPayoutAt
    ? new Date(data.lastPayoutAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <div className="bg-dark-card border-2 border-mint/20 rounded-xl p-5 shadow-lg shadow-mint/10 hover:shadow-mint/20 transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <span className="text-2xl">💰</span>
          Dividend Summary
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-zinc-400 hover:text-mint transition-colors"
            aria-label="Refresh dividends"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Earnings Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-dark-bg border border-dark-border rounded-lg p-3 text-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Today</p>
          <p className="text-xl font-bold font-mono text-green-400">
            <AnimatedCounter value={data.todayEarnings} />
          </p>
        </div>
        <div className="bg-dark-bg border border-dark-border rounded-lg p-3 text-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">This Week</p>
          <p className="text-xl font-bold font-mono text-cyan">
            <AnimatedCounter value={data.weekEarnings} />
          </p>
        </div>
        <div className="bg-dark-bg border border-dark-border rounded-lg p-3 text-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">All-Time</p>
          <p className="text-xl font-bold font-mono text-mint">
            <AnimatedCounter value={data.allTimeEarnings} />
          </p>
        </div>
      </div>

      {/* Last Payout & Next Payout */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-dark-border">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Last Payout</p>
          <p className="text-sm font-medium text-zinc-300">{lastPayoutTime}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500 mb-1">Next Payout</p>
          <p className="text-sm font-bold font-mono text-mint">{timeUntilPayout}</p>
        </div>
      </div>

      {/* Glow border animation */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-mint/0 via-mint/20 to-mint/0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
}
