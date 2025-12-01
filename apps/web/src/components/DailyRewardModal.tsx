import { useEffect, useState } from 'react';
import { gameApi, DailyStatus, DailyClaimResult } from '../api/game';
import { formatCurrency } from '@mint/utils';

interface DailyRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim?: (result: DailyClaimResult) => void;
}

export function DailyRewardModal({ isOpen, onClose, onClaim }: DailyRewardModalProps) {
  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<DailyClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await gameApi.getDailyStatus();
      if (res.success && res.data) {
        setStatus(res.data);
      }
    } catch {
      setError('Failed to load daily rewards');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!status?.canClaim) return;

    setIsClaiming(true);
    try {
      const res = await gameApi.claimDailyReward();
      if (res.success && res.data) {
        setClaimResult(res.data);
        onClaim?.(res.data);
        // Refresh status after claim
        await fetchStatus();
      } else {
        setError(res.error?.message || 'Failed to claim reward');
      }
    } catch {
      setError('Failed to claim reward');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Daily Rewards</h2>
              <p className="text-amber-100 text-sm">
                {status?.currentStreak || 0} day streak
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-bold"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchStatus}
                className="px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600"
              >
                Retry
              </button>
            </div>
          ) : claimResult ? (
            // Claim Success View
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎁</div>
              <h3 className="text-2xl font-bold text-zinc-100 mb-2">
                Day {claimResult.day} Claimed!
              </h3>
              {claimResult.streakBroken && (
                <p className="text-orange-400 text-sm mb-4">
                  Your streak was reset. Keep logging in daily!
                </p>
              )}
              <div className="bg-amber-900/20 rounded-xl p-6 mb-6">
                <p className="text-zinc-400 text-sm mb-2">You received:</p>
                <p className="text-3xl font-bold text-amber-400">
                  +{formatCurrency(claimResult.rewardData.amount)}
                </p>
                {claimResult.rewardData.bonusCoins && (
                  <p className="text-lg text-yellow-400 mt-2">
                    +{claimResult.rewardData.bonusCoins} Coins
                  </p>
                )}
                {claimResult.rewardData.prestigePoints && (
                  <p className="text-lg text-purple-400 mt-2">
                    +{claimResult.rewardData.prestigePoints} Prestige Points
                  </p>
                )}
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                {claimResult.newStreak} day streak! Come back tomorrow!
              </p>
              <button
                onClick={() => {
                  setClaimResult(null);
                  onClose();
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
              >
                Awesome!
              </button>
            </div>
          ) : (
            // Normal View
            <>
              {/* Current Reward */}
              {status?.nextReward && (
                <div className="mb-6">
                  <div
                    className={`rounded-xl p-6 text-center ${
                      status.canClaim
                        ? 'bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-2 border-amber-600'
                        : 'bg-dark-elevated border-2 border-dark-border'
                    }`}
                  >
                    <div className="text-5xl mb-3">
                      {status.canClaim ? '🎁' : '⏰'}
                    </div>
                    <p className="text-zinc-400 text-sm mb-1">
                      Day {status.currentDay}
                    </p>
                    <p className="text-2xl font-bold text-zinc-100 mb-2">
                      {formatCurrency(status.nextReward.rewardData.amount)}
                    </p>
                    {status.nextReward.rewardData.bonusCoins && (
                      <p className="text-yellow-400 text-sm">
                        +{status.nextReward.rewardData.bonusCoins} Coins
                      </p>
                    )}
                    {status.nextReward.rewardData.prestigePoints && (
                      <p className="text-purple-400 text-sm">
                        +{status.nextReward.rewardData.prestigePoints} PP
                      </p>
                    )}

                    <button
                      onClick={handleClaim}
                      disabled={!status.canClaim || isClaiming}
                      className={`mt-4 w-full py-3 rounded-xl font-bold text-lg transition-all ${
                        status.canClaim
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-dark-elevated text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {isClaiming
                        ? 'Claiming...'
                        : status.canClaim
                          ? 'Claim Reward!'
                          : 'Already Claimed Today'}
                    </button>
                  </div>
                </div>
              )}

              {/* Upcoming Rewards */}
              <div>
                <h3 className="font-bold text-zinc-100 mb-3">Upcoming Rewards</h3>
                <div className="grid grid-cols-7 gap-2">
                  {status?.upcomingRewards.map((reward, index) => (
                    <div
                      key={reward.day}
                      className={`rounded-xl p-2 text-center ${
                        index === 0
                          ? 'bg-amber-900/30 border-2 border-amber-600'
                          : reward.isMilestone
                            ? 'bg-purple-900/20 border border-purple-700'
                            : 'bg-dark-elevated border border-dark-border'
                      }`}
                    >
                      <p className="text-xs text-zinc-500">Day</p>
                      <p
                        className={`font-bold ${
                          reward.isMilestone ? 'text-purple-400' : 'text-zinc-100'
                        }`}
                      >
                        {reward.day}
                      </p>
                      <p className="text-xs text-green-400 truncate">
                        {reward.rewardData.amount >= 1000
                          ? `${(reward.rewardData.amount / 1000).toFixed(0)}K`
                          : reward.rewardData.amount}
                      </p>
                      {reward.isMilestone && (
                        <span className="text-xs">⭐</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 pt-4 border-t border-dark-border">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Current Streak</span>
                  <span className="font-bold text-amber-400">
                    {status?.currentStreak || 0} days
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-zinc-400">Longest Streak</span>
                  <span className="font-bold text-zinc-100">
                    {status?.longestStreak || 0} days
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
