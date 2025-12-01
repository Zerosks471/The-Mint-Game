import { useEffect, useState } from 'react';
import { gameApi, PrestigeStatus, PrestigePerk } from '../api/game';
import { formatCurrency } from '@mint/utils';

export function PrestigePage() {
  const [status, setStatus] = useState<PrestigeStatus | null>(null);
  const [perks, setPerks] = useState<PrestigePerk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isPrestiging, setIsPrestiging] = useState(false);
  const [prestigeResult, setPrestigeResult] = useState<{
    pointsEarned: number;
    newPrestigeLevel: number;
  } | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statusRes, perksRes] = await Promise.all([
        gameApi.getPrestigeStatus(),
        gameApi.getPrestigePerks(),
      ]);

      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      }
      if (perksRes.success && perksRes.data) {
        setPerks(perksRes.data);
      }
    } catch {
      setError('Failed to load prestige data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGoPublic = async () => {
    if (!status?.canPrestige) return;

    setIsPrestiging(true);
    try {
      const res = await gameApi.goPublic();
      if (res.success && res.data) {
        setPrestigeResult(res.data);
        // Refresh data
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

  const handleBuyPerk = async (perkId: string) => {
    try {
      const res = await gameApi.buyPerk(perkId);
      if (res.success && res.data) {
        // Update perks list
        setPerks((prev) =>
          prev.map((p) => (p.id === perkId ? res.data!.perk : p))
        );
        // Update status with remaining points
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
    1: 'border-zinc-600 bg-dark-elevated',
    2: 'border-mint bg-mint/10',
    3: 'border-purple-700 bg-purple-900/30',
    4: 'border-yellow-600 bg-yellow-900/30',
  };

  return (
    <div className="space-y-6">
      {/* Prestige Result Modal */}
      {prestigeResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">
              Congratulations!
            </h2>
            <p className="text-zinc-400 mb-4">You went public!</p>
            <div className="space-y-2 mb-6">
              <p className="text-lg text-zinc-100">
                <span className="text-purple font-bold">
                  +{prestigeResult.pointsEarned}
                </span>{' '}
                prestige points earned
              </p>
              <p className="text-lg text-zinc-100">
                Now at{' '}
                <span className="text-purple font-bold">
                  Prestige Level {prestigeResult.newPrestigeLevel}
                </span>
              </p>
            </div>
            <button
              onClick={() => setPrestigeResult(null)}
              className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-colors"
            >
              Continue Building
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                Go Public?
              </h2>
              <p className="text-zinc-400 mb-4">
                This will reset your properties, businesses, and cash. You will
                keep your prestige perks.
              </p>
              <div className="bg-purple-900/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-zinc-400">You will earn:</p>
                <p className="text-3xl font-bold text-purple">
                  +{status?.potentialPoints || 0} PP
                </p>
                <p className="text-xs text-zinc-500">Prestige Points</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 bg-dark-elevated hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl transition-colors"
                  disabled={isPrestiging}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGoPublic}
                  className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
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
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Go Public</h1>
          <span className="text-4xl">🚀</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-sm opacity-75">Prestige Level</p>
            <p className="text-2xl font-bold">{status?.prestigeLevel || 0}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-sm opacity-75">Prestige Points</p>
            <p className="text-2xl font-bold">{status?.prestigePoints || 0}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-sm opacity-75">Income Multiplier</p>
            <p className="text-2xl font-bold">
              {((parseFloat(status?.prestigeMultiplier || '1') - 1) * 100).toFixed(0)}%
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-sm opacity-75">Times Prestiged</p>
            <p className="text-2xl font-bold">{status?.timesPrestiged || 0}</p>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl p-4 mb-4">
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
          onClick={() => setShowConfirmModal(true)}
          disabled={!status?.canPrestige}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            status?.canPrestige
              ? 'bg-amber hover:bg-amber/80 text-dark-base'
              : 'bg-dark-elevated text-zinc-500 cursor-not-allowed'
          }`}
        >
          {status?.canPrestige
            ? `Go Public (+${status.potentialPoints} PP)`
            : `Need ${formatCurrency(status?.minimumNetWorth || 100000)} Net Worth`}
        </button>
      </div>

      {/* Perks Shop */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-100">Prestige Perks</h2>
          <div className="flex items-center gap-2 bg-purple-900/30 px-4 py-2 rounded-xl">
            <span className="text-purple font-bold">
              {status?.prestigePoints || 0}
            </span>
            <span className="text-purple text-sm">PP Available</span>
          </div>
        </div>

        {perks.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">
            No perks available yet. Prestige to unlock perks!
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {perks.map((perk) => (
              <div
                key={perk.id}
                className={`rounded-2xl border-2 p-4 ${tierColors[perk.tier] || tierColors[1]}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {categoryIcons[perk.category] || '🎯'}
                    </span>
                    <div>
                      <h3 className="font-bold text-zinc-100">{perk.name}</h3>
                      <p className="text-xs text-zinc-500">Tier {perk.tier}</p>
                    </div>
                  </div>
                  {perk.currentLevel > 0 && (
                    <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                      Lv.{perk.currentLevel}/{perk.maxLevel}
                    </span>
                  )}
                </div>

                <p className="text-sm text-zinc-400 mb-3">{perk.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">
                    {perk.currentLevel >= perk.maxLevel
                      ? 'Max Level'
                      : `Cost: ${perk.totalCost} PP`}
                  </span>
                  {perk.currentLevel < perk.maxLevel && (
                    <button
                      onClick={() => handleBuyPerk(perk.id)}
                      disabled={!perk.canPurchase}
                      className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                        perk.canPurchase
                          ? 'bg-purple-500 hover:bg-purple-600 text-white'
                          : 'bg-dark-elevated text-zinc-500 cursor-not-allowed'
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
      <div className="bg-dark-elevated rounded-2xl p-6">
        <h3 className="font-bold text-zinc-100 mb-3">How Prestige Works</h3>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="text-purple">1.</span>
            Build your net worth to at least $100,000
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple">2.</span>
            Click "Go Public" to reset and earn Prestige Points
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple">3.</span>
            Spend points on permanent perks that boost your empire
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple">4.</span>
            Each prestige level gives you +5% base income bonus
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple">5.</span>
            Or visit the Stocks page to launch an IPO for bigger multipliers!
          </li>
        </ul>
      </div>
    </div>
  );
}
