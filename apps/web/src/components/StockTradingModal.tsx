import { useState } from 'react';
import { StockDetail } from '../api/game';
import { formatCurrency } from '@mint/utils';

interface StockTradingModalProps {
  stock: StockDetail | null;
  type: 'buy' | 'sell';
  maxShares?: number;
  onClose: () => void;
  onConfirm: (shares: number) => Promise<void>;
  isLoading?: boolean;
}

export function StockTradingModal({
  stock,
  type,
  maxShares,
  onClose,
  onConfirm,
  isLoading = false,
}: StockTradingModalProps) {
  const [shares, setShares] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  if (!stock) return null;

  const price = parseFloat(stock.currentPrice);
  const totalCost = price * shares;
  const isBuy = type === 'buy';

  const handleConfirm = async () => {
    if (shares <= 0 || !Number.isInteger(shares)) {
      setError('Shares must be a positive integer');
      return;
    }
    if (maxShares !== undefined && shares > maxShares) {
      setError(`You can only ${type} up to ${maxShares} shares`);
      return;
    }
    setError(null);
    try {
      await onConfirm(shares);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to ${type} shares`);
    }
  };

  const handleSharesChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      setShares(num);
      setError(null);
    } else if (value === '') {
      setShares(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zinc-100">
            {isBuy ? 'Buy' : 'Sell'} {stock.tickerSymbol}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-sm text-zinc-400 mb-1">Company</p>
            <p className="text-zinc-100 font-medium">{stock.companyName}</p>
          </div>

          <div>
            <p className="text-sm text-zinc-400 mb-1">Current Price</p>
            <p className="text-2xl font-bold text-zinc-100 font-mono">
              ${price.toFixed(2)}
            </p>
            <p className={`text-sm ${parseFloat(stock.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {parseFloat(stock.change) >= 0 ? '+' : ''}
              {stock.changePercent.toFixed(2)}% ({parseFloat(stock.change) >= 0 ? '+' : ''}
              ${Math.abs(parseFloat(stock.change)).toFixed(2)})
            </p>
          </div>

          {maxShares !== undefined && (
            <div>
              <p className="text-sm text-zinc-400 mb-1">Available to {type}</p>
              <p className="text-zinc-100 font-medium">{maxShares.toLocaleString()} shares</p>
            </div>
          )}

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Shares</label>
            <input
              type="number"
              min="1"
              max={maxShares}
              value={shares || ''}
              onChange={(e) => handleSharesChange(e.target.value)}
              className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg text-zinc-100 focus:outline-none focus:border-mint"
              placeholder="Enter shares"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShares(Math.max(1, Math.floor(shares / 2)))}
                className="px-3 py-1 text-xs bg-dark-elevated border border-dark-border rounded text-zinc-400 hover:text-zinc-100"
              >
                ½
              </button>
              <button
                onClick={() => setShares(Math.max(1, Math.floor(shares * 0.75)))}
                className="px-3 py-1 text-xs bg-dark-elevated border border-dark-border rounded text-zinc-400 hover:text-zinc-100"
              >
                ¾
              </button>
              {maxShares && (
                <button
                  onClick={() => setShares(maxShares)}
                  className="px-3 py-1 text-xs bg-dark-elevated border border-dark-border rounded text-zinc-400 hover:text-zinc-100"
                >
                  Max
                </button>
              )}
            </div>
          </div>

          <div className="bg-dark-elevated rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-zinc-400">Total {isBuy ? 'Cost' : 'Revenue'}</span>
              <span className="text-xl font-bold text-zinc-100 font-mono">
                {formatCurrency(totalCost)}
              </span>
            </div>
            {!isBuy && maxShares && (
              <p className="text-xs text-zinc-500">
                Avg buy price: ${(parseFloat(stock.currentPrice) * 0.95).toFixed(2)} (estimated)
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-dark-elevated hover:bg-dark-border text-zinc-300 rounded-lg font-medium transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || shares <= 0 || (maxShares !== undefined && shares > maxShares)}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              isBuy
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? 'Processing...' : `${isBuy ? 'Buy' : 'Sell'} Shares`}
          </button>
        </div>
      </div>
    </div>
  );
}

