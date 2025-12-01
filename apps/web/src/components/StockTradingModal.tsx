import { useState, useMemo } from 'react';
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

  // Trading recommendation algorithm
  const recommendation = useMemo(() => {
    if (!isBuy) return null; // Only show for buys

    const currentPrice = parseFloat(stock.currentPrice);
    const previousClose = parseFloat(stock.previousClose);
    const changePercent = stock.changePercent || 0;
    const high24h = parseFloat(stock.highPrice24h);
    const low24h = parseFloat(stock.lowPrice24h);
    const trend = stock.trend || 'neutral';
    const volume24h = stock.volume24h || 0;

    // Calculate position in 24h range (0 = at low, 1 = at high)
    const priceRange = high24h - low24h;
    const positionInRange = priceRange > 0 ? (currentPrice - low24h) / priceRange : 0.5;

    // Base price analysis (for bot stocks with basePrice)
    let meanReversionScore = 0;
    if (stock.basePrice) {
      const basePrice = parseFloat(stock.basePrice);
      const deviationFromBase = (currentPrice - basePrice) / basePrice;
      // If price is below base, higher chance of going up (mean reversion)
      meanReversionScore = -deviationFromBase * 0.3; // -30% to +30% contribution
    }

    // Trend analysis
    let trendScore = 0;
    if (trend === 'bullish') trendScore = 0.15;
    else if (trend === 'bearish') trendScore = -0.15;
    // neutral = 0

    // Momentum analysis (recent change)
    const momentumScore = Math.max(-0.2, Math.min(0.2, changePercent / 100 * 0.5));

    // Position in range analysis (buy low, sell high)
    const rangeScore = (0.5 - positionInRange) * 0.2; // Prefer buying when closer to low

    // Volume analysis (higher volume = more confidence)
    const volumeScore = Math.min(0.1, Math.log10(volume24h + 1) / 100);

    // Position size risk (larger positions = higher risk)
    const positionSizeRisk = Math.min(0.2, shares / 10000 * 0.05); // Penalty for large positions

    // Calculate base win probability (50% neutral)
    let winProbability = 0.5;
    winProbability += meanReversionScore;
    winProbability += trendScore;
    winProbability += momentumScore;
    winProbability += rangeScore;
    winProbability += volumeScore;
    winProbability -= positionSizeRisk;

    // Clamp between 20% and 80% (never guarantee or doom)
    winProbability = Math.max(0.2, Math.min(0.8, winProbability));
    const lossProbability = 1 - winProbability;

    // Generate recommendation
    let recommendation: string;
    let recommendationType: 'strong-buy' | 'buy' | 'hold' | 'caution' | 'avoid';
    
    if (winProbability >= 0.65) {
      recommendationType = 'strong-buy';
      recommendation = 'Strong buy signal detected. Multiple indicators suggest upward movement.';
    } else if (winProbability >= 0.55) {
      recommendationType = 'buy';
      recommendation = 'Buy signal. Stock shows positive momentum and favorable conditions.';
    } else if (winProbability >= 0.45) {
      recommendationType = 'hold';
      recommendation = 'Neutral signal. Mixed indicators suggest waiting for clearer direction.';
    } else if (winProbability >= 0.35) {
      recommendationType = 'caution';
      recommendation = 'Caution advised. Stock shows weak signals, consider smaller position.';
    } else {
      recommendationType = 'avoid';
      recommendation = 'Weak buy signal. Multiple indicators suggest downward pressure.';
    }

    // Add specific reasons
    const reasons: string[] = [];
    if (meanReversionScore > 0.1) reasons.push('Price below base (mean reversion potential)');
    if (trend === 'bullish') reasons.push('Bullish trend active');
    if (momentumScore > 0.1) reasons.push('Positive momentum');
    if (positionInRange < 0.3) reasons.push('Near 24h low (good entry point)');
    if (volume24h > 10000) reasons.push('High trading volume');
    
    if (meanReversionScore < -0.1) reasons.push('Price above base (overvalued risk)');
    if (trend === 'bearish') reasons.push('Bearish trend active');
    if (momentumScore < -0.1) reasons.push('Negative momentum');
    if (positionInRange > 0.7) reasons.push('Near 24h high (risky entry)');
    if (shares > 5000) reasons.push('Large position size increases risk');

    return {
      winProbability,
      lossProbability,
      recommendation,
      recommendationType,
      reasons: reasons.slice(0, 3), // Show top 3 reasons
    };
  }, [stock, shares, isBuy]);

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
      <div className="bg-dark-card border border-dark-border rounded-xl p-4 max-w-sm w-full max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-zinc-100">
            {isBuy ? 'Buy' : 'Sell'} {stock.tickerSymbol}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">{stock.companyName}</p>
              <p className="text-lg font-bold text-zinc-100 font-mono">
                ${price.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${parseFloat(stock.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {parseFloat(stock.change) >= 0 ? '+' : ''}
                {stock.changePercent.toFixed(2)}%
              </p>
              <p className="text-xs text-zinc-500">
                {parseFloat(stock.change) >= 0 ? '+' : ''}
                ${Math.abs(parseFloat(stock.change)).toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-zinc-400">Shares</label>
              {maxShares !== undefined && (
                <span className="text-xs text-zinc-500">Max: {maxShares.toLocaleString()}</span>
              )}
            </div>
            <input
              type="number"
              min="1"
              max={maxShares}
              value={shares || ''}
              onChange={(e) => handleSharesChange(e.target.value)}
              className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg text-zinc-100 focus:outline-none focus:border-mint text-sm"
              placeholder="Enter shares"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <button
                onClick={() => setShares(Math.max(1, Math.floor(shares / 2)))}
                className="px-2 py-1 text-xs bg-dark-elevated border border-dark-border rounded text-zinc-400 hover:text-zinc-100"
              >
                ½
              </button>
              <button
                onClick={() => setShares(Math.max(1, Math.floor(shares * 0.75)))}
                className="px-2 py-1 text-xs bg-dark-elevated border border-dark-border rounded text-zinc-400 hover:text-zinc-100"
              >
                ¾
              </button>
              {[10, 50, 100, 500, 1000].map((preset) => {
                const isDisabled = maxShares !== undefined && preset > maxShares;
                return (
                  <button
                    key={preset}
                    onClick={() => {
                      if (!isDisabled) {
                        setShares(Math.min(preset, maxShares || preset));
                      }
                    }}
                    disabled={isDisabled}
                    className={`px-2 py-1 text-xs bg-dark-elevated border border-dark-border rounded text-zinc-400 hover:text-zinc-100 transition-colors ${
                      isDisabled ? 'opacity-30 cursor-not-allowed' : ''
                    }`}
                  >
                    {preset >= 1000 ? `${preset / 1000}K` : preset}
                  </button>
                );
              })}
              {maxShares && (
                <button
                  onClick={() => setShares(maxShares)}
                  className="px-2 py-1 text-xs bg-dark-elevated border border-dark-border rounded text-zinc-400 hover:text-zinc-100"
                >
                  Max
                </button>
              )}
            </div>
          </div>

          <div className="bg-dark-elevated rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">Total {isBuy ? 'Cost' : 'Revenue'}</span>
              <span className="text-lg font-bold text-zinc-100 font-mono">
                {formatCurrency(totalCost)}
              </span>
            </div>
          </div>

          {/* Trading Recommendation */}
          {isBuy && recommendation && (
            <div className="bg-gradient-to-br from-dark-elevated to-dark-card border border-dark-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-300">Trading Recommendation</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  recommendation.recommendationType === 'strong-buy' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  recommendation.recommendationType === 'buy' ? 'bg-green-500/10 text-green-300 border border-green-500/20' :
                  recommendation.recommendationType === 'hold' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' :
                  recommendation.recommendationType === 'caution' ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20' :
                  'bg-red-500/10 text-red-300 border border-red-500/20'
                }`}>
                  {recommendation.recommendationType.replace('-', ' ').toUpperCase()}
                </span>
              </div>

              {/* Probability Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-400">Win Probability</span>
                  <span className="font-mono text-zinc-300">
                    {(recommendation.winProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="relative h-2 bg-dark-base rounded-full overflow-hidden">
                  <div className="absolute inset-0 flex">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                      style={{ width: `${recommendation.winProbability * 100}%` }}
                    />
                    <div
                      className="bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
                      style={{ width: `${recommendation.lossProbability * 100}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-zinc-100/50"
                    style={{ left: `${recommendation.winProbability * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-red-400">Loss Risk</span>
                  <span className="font-mono text-zinc-400">
                    {(recommendation.lossProbability * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-dark-base/50 rounded-lg p-2 border border-dark-border">
                <p className="text-xs text-zinc-300 mb-1.5 leading-relaxed">{recommendation.recommendation}</p>
                {recommendation.reasons.length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-zinc-500 mb-0.5">Key Factors:</p>
                    <ul className="space-y-0.5">
                      {recommendation.reasons.map((reason, idx) => (
                        <li key={idx} className="text-[10px] text-zinc-400 flex items-start gap-1.5">
                          <span className="text-mint mt-0.5">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-1.5">
                <p className="text-[10px] text-yellow-400/80 leading-relaxed">
                  ⚠️ <strong>Your Risk:</strong> This is a recommendation only, not financial advice. Market conditions can change rapidly and predictions may not be accurate. You are responsible for your own trading decisions and any losses incurred.
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-dark-elevated hover:bg-dark-border text-zinc-300 rounded-lg font-medium transition-colors text-sm"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || shares <= 0 || (maxShares !== undefined && shares > maxShares)}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm ${
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

