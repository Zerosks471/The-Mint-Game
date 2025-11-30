import { useEffect, useState, useCallback } from 'react';
import { gameApi, PrestigeStatus, PrestigePerk, IPOStatus } from '../api/game';
import { formatCurrency } from '@mint/utils';
import { IPODashboard } from '../components/IPODashboard';

export function PrestigePage() {
  const [status, setStatus] = useState<PrestigeStatus | null>(null);
  const [perks, setPerks] = useState<PrestigePerk[]>([]);
  const [ipoStatus, setIpoStatus] = useState<IPOStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isPrestiging, setIsPrestiging] = useState(false);
  const [isLaunchingIPO, setIsLaunchingIPO] = useState(false);
  const [prestigeResult, setPrestigeResult] = useState<{
    pointsEarned: number;
    newPrestigeLevel: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statusRes, perksRes, ipoRes] = await Promise.all([
        gameApi.getPrestigeStatus(),
        gameApi.getPrestigePerks(),
        gameApi.getIPOStatus(),
      ]);

      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      }
      if (perksRes.success && perksRes.data) {
        setPerks(perksRes.data);
      }
      if (ipoRes.success && ipoRes.data) {
        setIpoStatus(ipoRes.data);
      }
    } catch {
      setError('Failed to load prestige data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
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
            // IPO no longer exists (expired or sold)
            setIpoStatus(null);
            await fetchData();
          }
        }
      } catch {
        // Silently fail on polling errors
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [ipoStatus, fetchData]);

  const handleGoPublic = async () => {
    if (!status?.canPrestige) return;

    setIsPrestiging(true);
    try {
      const res = await gameApi.goPublic();
      if (res.success && res.data) {
        setPrestigeResult(res.data);
        await fetchData();
      } else {
        setError(res.error?.message || 'Failed to go public');
      }
    } catch {
      setError('Failed to go public');
    } finally {
      setIsPrestiging(false);
      setShowConfirmModal(false);
    }
  };

  const handleLaunchIPO = async () => {
    if (!status?.canPrestige) return;

    setIsLaunchingIPO(true);
    try {
      const res = await gameApi.launchIPO();
      if (res.success && res.data) {
        setIpoStatus(res.data);
        setShowChoiceModal(false);
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

    setIsPrestiging(true);
    try {
      const res = await gameApi.sellIPOShares();
      if (res.success && res.data) {
        setPrestigeResult({
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
      setIsPrestiging(false);
    }
  };

  const handleCancelIPO = async () => {
    if (!ipoStatus) return;

    setIsPrestiging(true);
    try {
      const res = await gameApi.cancelIPO();
      if (res.success && res.data) {
        setPrestigeResult({
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
      setIsPrestiging(false);
    }
  };

  const handleBuyPerk = async (perkId: string) => {
    try {
      const res = await gameApi.buyPerk(perkId);
      if (res.success && res.data) {
        setPerks((prev) =>
          prev.map((p) => (p.id === perkId ? res.data!.perk : p))
        );
        setStatus((prev) =>
          prev ? { ...prev, prestigePoints: res.data!.remainingPoints } : null
        );
      } else {
        setError(res.error?.message || 'Failed to buy perk');
      }
    } catch {
      setError('Failed to buy perk');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-500"></div>
      </div>
    );
  }

  const categoryIcons: Record<string, string> = {
    income: '💰',
    offline: '🌙',
    speed: '⚡',
    cosmetic: '✨',
  };

  const tierColors: Record<number, string> = {
    1: 'border-gray-300 bg-gray-50',
    2: 'border-green-300 bg-green-50',
    3: 'border-purple-300 bg-purple-50',
    4: 'border-yellow-400 bg-yellow-50',
  };

  // If there's an active IPO, show the IPO dashboard
  if (ipoStatus) {
    return (
      <div className="space-y-6">
        {/* Prestige Result Modal */}
        {prestigeResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                IPO Complete!
              </h2>
              <p className="text-gray-600 mb-4">Your company has gone public!</p>
              <div className="space-y-2 mb-6">
                <p className="text-lg">
                  <span className="text-purple-600 font-bold">
                    +{prestigeResult.pointsEarned}
                  </span>{' '}
                  prestige points earned
                </p>
                <p className="text-lg">
                  Now at{' '}
                  <span className="text-purple-600 font-bold">
                    Prestige Level {prestigeResult.newPrestigeLevel}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setPrestigeResult(null)}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors"
              >
                Continue Building
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

        <IPODashboard
          status={ipoStatus}
          onSell={handleSellIPO}
          onCancel={handleCancelIPO}
          isLoading={isPrestiging}
        />

        {/* Perks Shop (always visible) */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Prestige Perks</h2>
            <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-lg">
              <span className="text-purple-600 font-bold">
                {status?.prestigePoints || 0}
              </span>
              <span className="text-purple-600 text-sm">PP Available</span>
            </div>
          </div>

          {perks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No perks available yet. Prestige to unlock perks!
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {perks.map((perk) => (
                <div
                  key={perk.id}
                  className={`rounded-xl border-2 p-4 ${tierColors[perk.tier] || tierColors[1]}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {categoryIcons[perk.category] || '🎯'}
                      </span>
                      <div>
                        <h3 className="font-bold text-gray-900">{perk.name}</h3>
                        <p className="text-xs text-gray-500">Tier {perk.tier}</p>
                      </div>
                    </div>
                    {perk.currentLevel > 0 && (
                      <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                        Lv.{perk.currentLevel}/{perk.maxLevel}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{perk.description}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {perk.currentLevel >= perk.maxLevel
                        ? 'Max Level'
                        : `Cost: ${perk.totalCost} PP`}
                    </span>
                    {perk.currentLevel < perk.maxLevel && (
                      <button
                        onClick={() => handleBuyPerk(perk.id)}
                        disabled={!perk.canPurchase}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          perk.canPurchase
                            ? 'bg-purple-500 hover:bg-purple-600 text-white'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {perk.currentLevel > 0 ? 'Upgrade' : 'Buy'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Normal prestige page (no active IPO)
  return (
    <div className="space-y-6">
      {/* Prestige Result Modal */}
      {prestigeResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Congratulations!
            </h2>
            <p className="text-gray-600 mb-4">You went public!</p>
            <div className="space-y-2 mb-6">
              <p className="text-lg">
                <span className="text-purple-600 font-bold">
                  +{prestigeResult.pointsEarned}
                </span>{' '}
                prestige points earned
              </p>
              <p className="text-lg">
                Now at{' '}
                <span className="text-purple-600 font-bold">
                  Prestige Level {prestigeResult.newPrestigeLevel}
                </span>
              </p>
            </div>
            <button
              onClick={() => setPrestigeResult(null)}
              className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors"
            >
              Continue Building
            </button>
          </div>
        </div>
      )}

      {/* Choice Modal: Take Points vs Go Public as IPO */}
      {showChoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Choose Your Exit Strategy
              </h2>
              <p className="text-gray-600">
                How would you like to go public?
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* Safe Option */}
              <button
                onClick={() => {
                  setShowChoiceModal(false);
                  setShowConfirmModal(true);
                }}
                className="w-full p-4 border-2 border-green-300 bg-green-50 rounded-xl hover:border-green-400 hover:bg-green-100 transition-all text-left"
                disabled={isLaunchingIPO}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">💵</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">Take Points Now</h3>
                    <p className="text-sm text-gray-600">
                      Guaranteed {status?.potentialPoints || 0} PP. Safe and instant.
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    +{status?.potentialPoints || 0} PP
                  </span>
                </div>
              </button>

              {/* Risky IPO Option */}
              <button
                onClick={handleLaunchIPO}
                className="w-full p-4 border-2 border-purple-300 bg-purple-50 rounded-xl hover:border-purple-400 hover:bg-purple-100 transition-all text-left"
                disabled={isLaunchingIPO}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">📈</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">
                      {isLaunchingIPO ? 'Launching IPO...' : 'Launch IPO'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Trade your stock for 8 hours. Earn 0.7x to 1.5x points.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        Min: {Math.floor((status?.potentialPoints || 0) * 0.7)} PP
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Max: {Math.floor((status?.potentialPoints || 0) * 1.5)} PP
                      </span>
                    </div>
                  </div>
                  <span className="text-2xl">🎰</span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowChoiceModal(false)}
              className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
              disabled={isLaunchingIPO}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal (for instant prestige) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Go Public?
              </h2>
              <p className="text-gray-600 mb-4">
                This will reset your properties, businesses, and cash. You will
                keep your prestige perks.
              </p>
              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600">You will earn:</p>
                <p className="text-3xl font-bold text-purple-600">
                  +{status?.potentialPoints || 0} PP
                </p>
                <p className="text-xs text-gray-500">Prestige Points</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
                  disabled={isPrestiging}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGoPublic}
                  className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                  disabled={isPrestiging}
                >
                  {isPrestiging ? 'Going Public...' : 'Go Public!'}
                </button>
              </div>
            </div>
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

      {/* Status Card */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Go Public</h1>
          <span className="text-4xl">🚀</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">Prestige Level</p>
            <p className="text-2xl font-bold">{status?.prestigeLevel || 0}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">Prestige Points</p>
            <p className="text-2xl font-bold">{status?.prestigePoints || 0}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">Income Multiplier</p>
            <p className="text-2xl font-bold">
              {((parseFloat(status?.prestigeMultiplier || '1') - 1) * 100).toFixed(0)}%
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">Times Prestiged</p>
            <p className="text-2xl font-bold">{status?.timesPrestiged || 0}</p>
          </div>
        </div>

        <div className="bg-white/10 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Current Net Worth</span>
            <span className="font-bold">
              {formatCurrency(parseFloat(status?.currentNetWorth || '0'))}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Minimum to Prestige</span>
            <span className="font-bold">
              {formatCurrency(status?.minimumNetWorth || 100000)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Points on Prestige</span>
            <span className="font-bold text-yellow-300">
              +{status?.potentialPoints || 0} PP
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowChoiceModal(true)}
          disabled={!status?.canPrestige}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
            status?.canPrestige
              ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900 shadow-lg hover:shadow-xl'
              : 'bg-white/20 text-white/50 cursor-not-allowed'
          }`}
        >
          {status?.canPrestige
            ? `Go Public (+${status.potentialPoints} PP)`
            : `Need ${formatCurrency(status?.minimumNetWorth || 100000)} Net Worth`}
        </button>
      </div>

      {/* Perks Shop */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Prestige Perks</h2>
          <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-lg">
            <span className="text-purple-600 font-bold">
              {status?.prestigePoints || 0}
            </span>
            <span className="text-purple-600 text-sm">PP Available</span>
          </div>
        </div>

        {perks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No perks available yet. Prestige to unlock perks!
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {perks.map((perk) => (
              <div
                key={perk.id}
                className={`rounded-xl border-2 p-4 ${tierColors[perk.tier] || tierColors[1]}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {categoryIcons[perk.category] || '🎯'}
                    </span>
                    <div>
                      <h3 className="font-bold text-gray-900">{perk.name}</h3>
                      <p className="text-xs text-gray-500">Tier {perk.tier}</p>
                    </div>
                  </div>
                  {perk.currentLevel > 0 && (
                    <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                      Lv.{perk.currentLevel}/{perk.maxLevel}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3">{perk.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {perk.currentLevel >= perk.maxLevel
                      ? 'Max Level'
                      : `Cost: ${perk.totalCost} PP`}
                  </span>
                  {perk.currentLevel < perk.maxLevel && (
                    <button
                      onClick={() => handleBuyPerk(perk.id)}
                      disabled={!perk.canPurchase}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        perk.canPurchase
                          ? 'bg-purple-500 hover:bg-purple-600 text-white'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {perk.currentLevel > 0 ? 'Upgrade' : 'Buy'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-bold text-gray-900 mb-3">How Prestige Works</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-purple-500">1.</span>
            Build your net worth to at least $100,000
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500">2.</span>
            Choose: Take points instantly OR launch an IPO for bigger gains
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500">3.</span>
            IPO lets you trade your stock for 8 hours - timing matters!
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500">4.</span>
            Spend points on permanent perks that boost your empire
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500">5.</span>
            Each prestige level gives you +5% base income bonus
          </li>
        </ul>
      </div>
    </div>
  );
}
