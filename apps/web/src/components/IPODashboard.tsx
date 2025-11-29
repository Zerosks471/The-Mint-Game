import { useState } from 'react';
import { IPOChart } from './IPOChart';
import { formatCurrency } from '@mint/utils';
import type { IPOStatus } from '../api/game';

interface IPODashboardProps {
  status: IPOStatus;
  onSell: () => Promise<void>;
  onCancel: () => Promise<void>;
  isLoading: boolean;
}

export function IPODashboard({ status, onSell, onCancel, isLoading }: IPODashboardProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSellConfirm, setShowSellConfirm] = useState(false);

  const isPositive = status.percentChange >= 0;
  const timeRemaining = formatTimeRemaining(status.timeRemainingMs);

  const trendEmoji = {
    bullish: '📈',
    bearish: '📉',
    neutral: '➡️',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold font-mono">${status.tickerSymbol}</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isPositive ? '+' : ''}
                {status.percentChange.toFixed(2)}%
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">Your company is now trading!</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Time Remaining</p>
            <p className="text-2xl font-bold font-mono">{timeRemaining}</p>
          </div>
        </div>

        {/* Price Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-slate-400">IPO Price</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(parseFloat(status.ipoPrice))}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-slate-400">Current</p>
            <p className={`text-lg font-bold font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(parseFloat(status.currentPrice))}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-slate-400">Session High</p>
            <p className="text-lg font-bold font-mono text-green-400">
              {formatCurrency(parseFloat(status.highPrice))}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs text-slate-400">Session Low</p>
            <p className="text-lg font-bold font-mono text-red-400">
              {formatCurrency(parseFloat(status.lowPrice))}
            </p>
          </div>
        </div>
      </div>

      {/* Active Event Banner */}
      {status.activeEvent && (
        <div
          className={`rounded-xl p-4 flex items-center gap-4 ${
            status.activeEvent.isPositive
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}
        >
          <span className="text-3xl">{status.activeEvent.isPositive ? '🚀' : '⚠️'}</span>
          <div>
            <p className={`font-bold ${status.activeEvent.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {status.activeEvent.name}
            </p>
            <p className="text-sm text-slate-400">{status.activeEvent.description}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <IPOChart
        priceHistory={status.priceHistory}
        ipoPrice={parseFloat(status.ipoPrice)}
        currentPrice={parseFloat(status.currentPrice)}
        isPositive={isPositive}
      />

      {/* Trend Indicator */}
      <div className="flex items-center justify-center gap-6 text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{trendEmoji[status.trend]}</span>
          <span className="capitalize">{status.trend}</span>
          <span className="text-xs">
            (Strength: {'⚡'.repeat(status.trendStrength)})
          </span>
        </div>
      </div>

      {/* Points Preview */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6 text-center">
        <p className="text-purple-300 text-sm mb-2">If you sell now, you'll earn:</p>
        <p className="text-5xl font-bold text-purple-400">{status.potentialPoints}</p>
        <p className="text-purple-300">
          Prestige Points ({status.currentMultiplier}x multiplier)
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Base: {status.basePoints} PP × {status.currentMultiplier.toFixed(2)} = {status.potentialPoints} PP
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => setShowCancelConfirm(true)}
          disabled={isLoading}
          className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          Cancel IPO ({status.basePoints} PP)
        </button>
        <button
          onClick={() => setShowSellConfirm(true)}
          disabled={isLoading}
          className={`flex-1 py-4 font-bold rounded-xl transition-colors disabled:opacity-50 ${
            isPositive
              ? 'bg-green-500 hover:bg-green-400 text-white'
              : 'bg-red-500 hover:bg-red-400 text-white'
          }`}
        >
          Sell Shares ({status.potentialPoints} PP)
        </button>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🛑</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Cancel IPO?</h2>
              <p className="text-gray-600 mb-6">
                This will end your IPO early and give you {status.basePoints} base prestige points
                (no multiplier).
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg"
                  disabled={isLoading}
                >
                  Keep Trading
                </button>
                <button
                  onClick={async () => {
                    await onCancel();
                    setShowCancelConfirm(false);
                  }}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Cancel IPO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sell Confirmation Modal */}
      {showSellConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">{isPositive ? '🎉' : '💼'}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sell Shares?</h2>
              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600">You will earn:</p>
                <p className="text-4xl font-bold text-purple-600">+{status.potentialPoints} PP</p>
                <p className="text-sm text-gray-500">
                  {status.currentMultiplier}x multiplier applied
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSellConfirm(false)}
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg"
                  disabled={isLoading}
                >
                  Keep Trading
                </button>
                <button
                  onClick={async () => {
                    await onSell();
                    setShowSellConfirm(false);
                  }}
                  className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Selling...' : 'Sell Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
