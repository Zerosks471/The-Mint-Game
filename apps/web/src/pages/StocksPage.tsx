import { useEffect, useState, useCallback } from 'react';
import { gameApi, IPOStatus, PrestigeStatus } from '../api/game';
import { formatCurrency } from '@mint/utils';
import { IPODashboard } from '../components/IPODashboard';

export function StocksPage() {
  const [ipoStatus, setIpoStatus] = useState<IPOStatus | null>(null);
  const [prestigeStatus, setPrestigeStatus] = useState<PrestigeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLaunchingIPO, setIsLaunchingIPO] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    pointsEarned: number;
    newPrestigeLevel: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ipoRes, prestigeRes] = await Promise.all([
        gameApi.getIPOStatus(),
        gameApi.getPrestigeStatus(),
      ]);

      if (ipoRes.success) {
        setIpoStatus(ipoRes.data || null);
      }
      if (prestigeRes.success && prestigeRes.data) {
        setPrestigeStatus(prestigeRes.data);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for IPO updates when active
  useEffect(() => {
    if (!ipoStatus) return;

    const interval = setInterval(async () => {
      try {
        const res = await gameApi.getIPOStatus();
        if (res.success) {
          if (res.data) {
            setIpoStatus(res.data);
          } else {
            setIpoStatus(null);
            await fetchData();
          }
        }
      } catch {
        // Silently fail
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [ipoStatus, fetchData]);

  const handleLaunchIPO = async () => {
    if (!prestigeStatus?.canPrestige) return;

    setIsLaunchingIPO(true);
    try {
      const res = await gameApi.launchIPO();
      if (res.success && res.data) {
        setIpoStatus(res.data);
      } else {
        setError(res.error?.message || 'Failed to launch IPO');
      }
    } catch {
      setError('Failed to launch IPO');
    } finally {
      setIsLaunchingIPO(false);
    }
  };

  const handleSellIPO = async () => {
    if (!ipoStatus) return;

    setIsProcessing(true);
    try {
      const res = await gameApi.sellIPOShares();
      if (res.success && res.data) {
        setResult({
          pointsEarned: res.data.pointsEarned,
          newPrestigeLevel: res.data.newPrestigeLevel,
        });
        setIpoStatus(null);
        await fetchData();
      } else {
        setError(res.error?.message || 'Failed to sell shares');
      }
    } catch {
      setError('Failed to sell shares');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelIPO = async () => {
    if (!ipoStatus) return;

    setIsProcessing(true);
    try {
      const res = await gameApi.cancelIPO();
      if (res.success && res.data) {
        setResult({
          pointsEarned: res.data.pointsEarned,
          newPrestigeLevel: res.data.newPrestigeLevel,
        });
        setIpoStatus(null);
        await fetchData();
      } else {
        setError(res.error?.message || 'Failed to cancel IPO');
      }
    } catch {
      setError('Failed to cancel IPO');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Result Modal */}
      {result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              IPO Complete!
            </h2>
            <p className="text-gray-600 mb-4">Your company has gone public!</p>
            <div className="space-y-2 mb-6">
              <p className="text-lg">
                <span className="text-purple-600 font-bold">
                  +{result.pointsEarned}
                </span>{' '}
                prestige points earned
              </p>
              <p className="text-lg">
                Now at{' '}
                <span className="text-purple-600 font-bold">
                  Prestige Level {result.newPrestigeLevel}
                </span>
              </p>
            </div>
            <button
              onClick={() => setResult(null)}
              className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Active IPO Dashboard */}
      {ipoStatus ? (
        <IPODashboard
          status={ipoStatus}
          onSell={handleSellIPO}
          onCancel={handleCancelIPO}
          isLoading={isProcessing}
        />
      ) : (
        <>
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">Stock Market</h1>
                <p className="text-slate-400">Take your company public with an IPO</p>
              </div>
              <span className="text-5xl">📈</span>
            </div>
          </div>

          {/* Launch IPO Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Launch Your IPO</h2>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Current Net Worth</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(parseFloat(prestigeStatus?.currentNetWorth || '0'))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Required to IPO</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(prestigeStatus?.minimumNetWorth || 100000)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Base Prestige Points</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {prestigeStatus?.potentialPoints || 0} PP
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IPO Multiplier Range</p>
                  <p className="text-2xl font-bold text-green-600">0.7x - 1.5x</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-3xl">⚠️</span>
                <div>
                  <p className="font-medium text-amber-800">IPO Risk Warning</p>
                  <p className="text-sm text-amber-700">
                    Launching an IPO will reset your properties, businesses, and cash.
                    Your stock price will fluctuate for 8 hours. Sell at the right time to maximize points!
                  </p>
                </div>
              </div>
            </div>

            {/* Potential Points Preview */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-sm text-red-600">Minimum (0.7x)</p>
                <p className="text-2xl font-bold text-red-700">
                  {Math.floor((prestigeStatus?.potentialPoints || 0) * 0.7)} PP
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">Base (1.0x)</p>
                <p className="text-2xl font-bold text-gray-700">
                  {prestigeStatus?.potentialPoints || 0} PP
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-sm text-green-600">Maximum (1.5x)</p>
                <p className="text-2xl font-bold text-green-700">
                  {Math.floor((prestigeStatus?.potentialPoints || 0) * 1.5)} PP
                </p>
              </div>
            </div>

            <button
              onClick={handleLaunchIPO}
              disabled={!prestigeStatus?.canPrestige || isLaunchingIPO}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                prestigeStatus?.canPrestige
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLaunchingIPO
                ? 'Launching IPO...'
                : prestigeStatus?.canPrestige
                  ? `Launch IPO (${prestigeStatus.potentialPoints} base PP)`
                  : `Need ${formatCurrency(prestigeStatus?.minimumNetWorth || 100000)} Net Worth`}
            </button>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">How IPO Works</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-3xl mb-2">1️⃣</div>
                <h3 className="font-bold text-gray-900 mb-1">Launch IPO</h3>
                <p className="text-sm text-gray-600">
                  Your company goes public with a generated ticker symbol based on your username.
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-3xl mb-2">2️⃣</div>
                <h3 className="font-bold text-gray-900 mb-1">Watch the Market</h3>
                <p className="text-sm text-gray-600">
                  Stock price fluctuates over 8 hours. Market events affect your price positively or negatively.
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-3xl mb-2">3️⃣</div>
                <h3 className="font-bold text-gray-900 mb-1">Time Your Exit</h3>
                <p className="text-sm text-gray-600">
                  Sell when the price is high for up to 1.5x prestige points, or cut losses at 0.7x minimum.
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-3xl mb-2">4️⃣</div>
                <h3 className="font-bold text-gray-900 mb-1">Prestige & Grow</h3>
                <p className="text-sm text-gray-600">
                  Cash out your points and use them to buy permanent perks on the Go Public page.
                </p>
              </div>
            </div>
          </div>

          {/* Market Events Preview */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Possible Market Events</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                  <span>📈</span> Positive Events
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Analyst Upgrade - Major firm raises rating
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Earnings Beat - Better than expected results
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Viral Moment - Social media buzz
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Acquisition Rumor - Buyout speculation
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                  <span>📉</span> Negative Events
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Analyst Downgrade - Rating cut
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Earnings Miss - Below expectations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Competitor Launch - New rival product
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Market Correction - Sector-wide selloff
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
