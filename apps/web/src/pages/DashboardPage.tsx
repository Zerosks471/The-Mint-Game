import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { formatCurrency } from '@mint/utils';
import { PlayerStats, PlayerBusiness } from '../api/game';
import { UpgradeButton } from '../components/UpgradeButton';
import { useAuthStore } from '../stores/authStore';

// Donut progress circle component - shows progress toward earning a cent
function EarningDonut({ progress }: { progress: number }) {
  const size = 16;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="opacity-20"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </svg>
  );
}

// Gas pump style rolling cash display - simple version
function RollingCash({ value }: { value: number }) {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <span className="tabular-nums font-mono text-2xl font-bold">
      ${formatted}
    </span>
  );
}

// Detailed Income card
function IncomeCard({ stats }: { stats: PlayerStats | null }) {
  const incomePerHour = parseFloat(stats?.effectiveIncomeHour || '0');
  const incomePerDay = incomePerHour * 24;
  const multiplier = parseFloat(stats?.currentMultiplier || '1');
  const bonusPercent = Math.round((multiplier - 1) * 100);

  return (
    <div className="rounded-xl border-2 p-4 bg-green-50 border-green-200 text-green-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">📈</span>
        {bonusPercent > 0 && (
          <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full font-medium">
            +{bonusPercent}% bonus
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">+{formatCurrency(incomePerHour)}</p>
      <p className="text-sm opacity-75">Per Hour</p>
      <div className="mt-2 pt-2 border-t border-green-200 text-xs space-y-0.5">
        <div className="flex justify-between">
          <span className="opacity-75">Per Day</span>
          <span className="font-medium">{formatCurrency(incomePerDay)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-75">Multiplier</span>
          <span className="font-medium">{multiplier.toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
}

// Detailed Properties card
function PropertiesCard({ total, managed, income }: { total: number; managed: number; income: number }) {
  const managedPercent = total > 0 ? Math.round((managed / total) * 100) : 0;

  return (
    <div className="rounded-xl border-2 p-4 bg-blue-50 border-blue-200 text-blue-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">🏢</span>
        {managed > 0 && (
          <span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full font-medium">
            👔 {managed} managed
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">{total}</p>
      <p className="text-sm opacity-75">Properties</p>
      <div className="mt-2 pt-2 border-t border-blue-200 text-xs space-y-0.5">
        <div className="flex justify-between">
          <span className="opacity-75">Income</span>
          <span className="font-medium text-green-600">+{formatCurrency(income)}/hr</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-75">Automated</span>
          <span className="font-medium">{managedPercent}%</span>
        </div>
      </div>
    </div>
  );
}

// Detailed Businesses card
function BusinessesCard({ total, businesses }: { total: number; businesses: PlayerBusiness[] }) {
  const readyCount = businesses.filter((b: PlayerBusiness) => b.cycleComplete).length;
  const totalRevenue = businesses.reduce((sum: number, b: PlayerBusiness) => sum + parseFloat(b.currentRevenue), 0);

  return (
    <div className="rounded-xl border-2 p-4 bg-purple-50 border-purple-200 text-purple-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">💼</span>
        {readyCount > 0 && (
          <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium animate-pulse">
            {readyCount} ready!
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">{total}</p>
      <p className="text-sm opacity-75">Businesses</p>
      <div className="mt-2 pt-2 border-t border-purple-200 text-xs space-y-0.5">
        <div className="flex justify-between">
          <span className="opacity-75">Pending</span>
          <span className="font-medium text-green-600">{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-75">Ready</span>
          <span className="font-medium">{readyCount} / {total}</span>
        </div>
      </div>
    </div>
  );
}

// Smooth cash ticker component with real-time updates
function CashTicker() {
  const { stats, displayedCash, incomePerSecond, startTicker, stopTicker } = useGameStore();
  const [localCash, setLocalCash] = useState(0);
  const [minuteProgress, setMinuteProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const minuteStartRef = useRef<number>(Date.now());

  // Calculate income rates
  const incomePerHour = parseFloat(stats?.effectiveIncomeHour || '0');
  const incomePerSec = incomePerHour / 3600;
  const incomePerMin = incomePerSec * 60;

  useEffect(() => {
    if (stats) {
      startTicker();
      setLocalCash(displayedCash || parseFloat(stats.cash));
    }
    return () => stopTicker();
  }, [stats, startTicker, stopTicker]);

  // Smooth animation loop using requestAnimationFrame for buttery updates
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const deltaMs = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      if (incomePerSecond > 0) {
        const increment = incomePerSecond * (deltaMs / 1000);
        setLocalCash(prev => prev + increment);
      }

      // Track progress through the current minute (0-100%)
      const elapsedInMinute = (now - minuteStartRef.current) % 60000;
      setMinuteProgress(elapsedInMinute / 60000);

      animationRef.current = requestAnimationFrame(animate);
    };

    // Sync with store's displayedCash periodically
    const syncInterval = setInterval(() => {
      if (displayedCash > 0) {
        setLocalCash(displayedCash);
      }
    }, 1000);

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearInterval(syncInterval);
    };
  }, [displayedCash, incomePerSecond]);

  // Format small amounts with more precision
  const formatSmallCurrency = (amount: number) => {
    if (amount < 0.01) {
      return `$${amount.toFixed(4)}`;
    } else if (amount < 1) {
      return `$${amount.toFixed(3)}`;
    }
    return formatCurrency(amount);
  };

  return (
    <div className="rounded-xl border-2 p-4 bg-mint-50 border-mint-200 text-mint-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">💵</span>
        {incomePerHour > 0 && (
          <span className="flex items-center gap-1 text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            earning
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tabular-nums">
        <RollingCash value={localCash} />
      </p>
      <p className="text-sm opacity-75">Total Cash</p>
      {incomePerHour > 0 && (
        <div className="mt-2 pt-2 border-t border-mint-200 text-xs space-y-0.5">
          <div className="flex justify-between">
            <span className="opacity-75">Per Minute</span>
            <span className="font-medium text-green-600">+{formatSmallCurrency(incomePerMin)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="opacity-75">This Minute</span>
            <div className="flex items-center gap-1">
              <EarningDonut progress={minuteProgress} />
              <span className="font-medium">{Math.floor(minuteProgress * 60)}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const {
    stats,
    playerProperties,
    playerBusinesses,
    offlineStatus,
    isLoading,
    error,
    fetchAll,
    collectOfflineEarnings,
  } = useGameStore();

  const { user } = useAuthStore();
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    // Show offline modal only if user was away for meaningful time (>5 min) AND has meaningful earnings (>$1)
    if (offlineStatus) {
      const pendingEarnings = parseFloat(offlineStatus.pendingEarnings);
      const wasAwayLongEnough = offlineStatus.elapsedHours >= 0.1; // At least 6 minutes
      const hasMeaningfulEarnings = pendingEarnings >= 1; // At least $1

      if (wasAwayLongEnough && hasMeaningfulEarnings) {
        setShowOfflineModal(true);
      }
    }
  }, [offlineStatus]);

  const handleCollectOffline = async () => {
    const collected = await collectOfflineEarnings();
    if (collected) {
      setCollectedAmount(collected);
      setTimeout(() => {
        setShowOfflineModal(false);
        setCollectedAmount(null);
      }, 2000);
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your empire...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>
    );
  }

  const managedProperties = playerProperties.filter((p) => p.managerHired);
  const totalPropertyIncome = playerProperties.reduce(
    (sum, p) => sum + parseFloat(p.currentIncomeHour),
    0
  );

  return (
    <div className="space-y-6">
      {/* Offline Earnings Modal */}
      {showOfflineModal && offlineStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
            {collectedAmount ? (
              <>
                <p className="text-gray-600 mb-4">You collected:</p>
                <p className="text-4xl font-bold text-mint-600 mb-6">
                  {formatCurrency(parseFloat(collectedAmount))}
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  While you were away for {offlineStatus.elapsedHours.toFixed(1)} hours, your
                  properties earned:
                </p>
                <p className="text-4xl font-bold text-mint-600 mb-2">
                  {formatCurrency(parseFloat(offlineStatus.pendingEarnings))}
                </p>
                {offlineStatus.capped && !user?.isPremium && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-amber-800 mb-2">
                      Your earnings were capped at {offlineStatus.capHours} hours.
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-amber-600">Get 24hr cap with Premium</p>
                      <UpgradeButton size="sm" />
                    </div>
                  </div>
                )}
                <button
                  onClick={handleCollectOffline}
                  className="w-full py-3 bg-mint-500 hover:bg-mint-600 text-white font-bold rounded-lg transition-colors"
                >
                  Collect Earnings
                </button>
                <button
                  onClick={() => setShowOfflineModal(false)}
                  className="mt-2 text-gray-500 hover:text-gray-700 text-sm"
                >
                  Dismiss
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CashTicker />
        <IncomeCard stats={stats} />
        <PropertiesCard
          total={stats?.totalPropertiesOwned || 0}
          managed={managedProperties.length}
          income={totalPropertyIncome}
        />
        <BusinessesCard
          total={stats?.totalBusinessesOwned || 0}
          businesses={playerBusinesses}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Properties Summary */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Properties</h2>
            <Link
              to="/properties"
              className="text-sm text-mint-600 hover:text-mint-700 font-medium"
            >
              View All &rarr;
            </Link>
          </div>

          {playerProperties.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No properties yet</p>
              <Link
                to="/properties"
                className="inline-block px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white rounded-lg transition-colors"
              >
                Buy Your First Property
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-500 pb-2 border-b">
                <span>Total Income</span>
                <span className="font-medium text-green-600">
                  +{formatCurrency(totalPropertyIncome)}/hr
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Managed Properties</span>
                <span className="font-medium">
                  {managedProperties.length} / {playerProperties.length}
                </span>
              </div>
              <div className="pt-2">
                {playerProperties.slice(0, 3).map((prop) => (
                  <div
                    key={prop.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{prop.propertyType.name}</p>
                      <p className="text-xs text-gray-500">
                        Qty: {prop.quantity} • Lv. {prop.upgradeLevel}
                        {prop.managerHired && ' • 👔'}
                      </p>
                    </div>
                    <p className="text-sm text-green-600">
                      +{formatCurrency(parseFloat(prop.currentIncomeHour))}/hr
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Businesses Summary */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Businesses</h2>
            <Link
              to="/businesses"
              className="text-sm text-mint-600 hover:text-mint-700 font-medium"
            >
              View All &rarr;
            </Link>
          </div>

          {playerBusinesses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No businesses yet</p>
              <Link
                to="/businesses"
                className="inline-block px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white rounded-lg transition-colors"
              >
                Start a Business
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {playerBusinesses.slice(0, 4).map((biz) => (
                <div key={biz.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{biz.businessType.name}</p>
                    <p className="text-xs text-gray-500">Level {biz.level}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          biz.cycleComplete ? 'bg-green-500' : 'bg-mint-500'
                        }`}
                        style={{ width: `${biz.cycleProgress * 100}%` }}
                      />
                    </div>
                    {biz.cycleComplete && (
                      <span className="text-xs text-green-600 font-medium">Ready!</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Player Progress */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-purple-600">{stats?.playerLevel || 1}</p>
            <p className="text-sm text-gray-500">Player Level</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-mint-600">
              {formatCurrency(parseFloat(stats?.lifetimeCashEarned || '0'))}
            </p>
            <p className="text-sm text-gray-500">Lifetime Earnings</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600">
              {(parseFloat(stats?.currentMultiplier || '1') * 100 - 100).toFixed(0)}%
            </p>
            <p className="text-sm text-gray-500">Income Bonus</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-amber-600">{stats?.premiumCurrency || 0}</p>
            <p className="text-sm text-gray-500">Gold Coins</p>
          </div>
        </div>
      </div>
    </div>
  );
}

