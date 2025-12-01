import { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { formatCurrency } from '@mint/utils';
import { PlayerStats, PlayerBusiness } from '../api/game';
import { UpgradeButton } from '../components/UpgradeButton';
import { useAuthStore } from '../stores/authStore';
import { StatCard, StatRow, ProgressRing } from '../components/ui';

// Smooth cash ticker component with real-time updates
function CashTicker() {
  const { stats, displayedCash, incomePerSecond, startTicker, stopTicker } = useGameStore();
  const [localCash, setLocalCash] = useState(0);
  const [minuteProgress, setMinuteProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const minuteStartRef = useRef<number>(Date.now());

  const incomePerHour = parseFloat(stats?.effectiveIncomeHour || '0');
  const incomePerSec = incomePerHour / 3600;
  const incomePerMin = incomePerSec * 60;

  // Generate fake sparkline data based on income trend
  const sparklineData = useMemo(() => {
    const baseValue = localCash;
    const data: number[] = [];
    for (let i = 0; i < 12; i++) {
      const variation = (Math.random() - 0.3) * incomePerMin;
      data.push(Math.max(0, baseValue - (12 - i) * incomePerMin + variation));
    }
    return data;
  }, [Math.floor(localCash / 100)]); // Update every $100

  useEffect(() => {
    if (stats) {
      startTicker();
      setLocalCash(displayedCash || parseFloat(stats.cash));
    }
    return () => stopTicker();
  }, [stats, startTicker, stopTicker]);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const deltaMs = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      if (incomePerSecond > 0) {
        const increment = incomePerSecond * (deltaMs / 1000);
        setLocalCash((prev) => prev + increment);
      }

      const elapsedInMinute = (now - minuteStartRef.current) % 60000;
      setMinuteProgress(elapsedInMinute / 60000);

      animationRef.current = requestAnimationFrame(animate);
    };

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

  const formatSmallCurrency = (amount: number) => {
    if (amount < 0.01) return `$${amount.toFixed(4)}`;
    if (amount < 1) return `$${amount.toFixed(3)}`;
    return formatCurrency(amount);
  };

  const formattedCash = localCash.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <StatCard
      icon="💵"
      value={formattedCash}
      label="Total Cash"
      color="mint"
      badge={incomePerHour > 0 ? 'earning' : undefined}
      badgeColor="green"
      sparklineData={incomePerHour > 0 ? sparklineData : undefined}
      subtitle={
        incomePerHour > 0 ? (
          <div className="space-y-1">
            <StatRow label="Per Minute" value={`+${formatSmallCurrency(incomePerMin)}`} valueColor="mint" />
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">This Minute</span>
              <div className="flex items-center gap-2">
                <ProgressRing value={minuteProgress * 100} color="mint" size={16} strokeWidth={2} />
                <span className="font-mono text-zinc-300">{Math.floor(minuteProgress * 60)}s</span>
              </div>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}

// Income stat card
function IncomeCard({ stats }: { stats: PlayerStats | null }) {
  const incomePerHour = parseFloat(stats?.effectiveIncomeHour || '0');
  const incomePerDay = incomePerHour * 24;
  const multiplier = parseFloat(stats?.currentMultiplier || '1');
  const bonusPercent = Math.round((multiplier - 1) * 100);

  return (
    <StatCard
      icon="📈"
      value={`+${formatCurrency(incomePerHour)}`}
      label="Per Hour"
      color="cyan"
      badge={bonusPercent > 0 ? `+${bonusPercent}% bonus` : undefined}
      badgeColor="green"
      subtitle={
        <div className="space-y-1">
          <StatRow label="Per Day" value={formatCurrency(incomePerDay)} valueColor="cyan" />
          <StatRow label="Multiplier" value={`${multiplier.toFixed(2)}x`} />
        </div>
      }
    />
  );
}

// Properties stat card
function PropertiesCard({
  total,
  managed,
  income,
}: {
  total: number;
  managed: number;
  income: number;
}) {
  const managedPercent = total > 0 ? Math.round((managed / total) * 100) : 0;

  return (
    <StatCard
      icon="🏢"
      value={total}
      label="Properties"
      color="blue"
      badge={managed > 0 ? `👔 ${managed} managed` : undefined}
      badgeColor="blue"
      subtitle={
        <div className="space-y-1">
          <StatRow label="Income" value={`+${formatCurrency(income)}/hr`} valueColor="mint" />
          <StatRow label="Automated" value={`${managedPercent}%`} />
        </div>
      }
    />
  );
}

// Businesses stat card
function BusinessesCard({
  total,
  businesses,
}: {
  total: number;
  businesses: PlayerBusiness[];
}) {
  const readyCount = businesses.filter((b) => b.cycleComplete).length;
  const totalRevenue = businesses.reduce((sum, b) => sum + parseFloat(b.currentRevenue), 0);

  return (
    <StatCard
      icon="💼"
      value={total}
      label="Businesses"
      color="purple"
      badge={readyCount > 0 ? `${readyCount} ready!` : undefined}
      badgeColor="amber"
      subtitle={
        <div className="space-y-1">
          <StatRow label="Pending" value={formatCurrency(totalRevenue)} valueColor="mint" />
          <StatRow label="Ready" value={`${readyCount} / ${total}`} />
        </div>
      }
    />
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
    if (offlineStatus) {
      const pendingEarnings = parseFloat(offlineStatus.pendingEarnings);
      const wasAwayLongEnough = offlineStatus.elapsedHours >= 0.1;
      const hasMeaningfulEarnings = pendingEarnings >= 1;

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading your empire...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400">
        {error}
      </div>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">Welcome Back!</h2>
            {collectedAmount ? (
              <>
                <p className="text-zinc-400 mb-4">You collected:</p>
                <p className="text-4xl font-bold text-mint font-mono mb-6">
                  {formatCurrency(parseFloat(collectedAmount))}
                </p>
              </>
            ) : (
              <>
                <p className="text-zinc-400 mb-4">
                  While you were away for {offlineStatus.elapsedHours.toFixed(1)} hours, your
                  properties earned:
                </p>
                <p className="text-4xl font-bold text-mint font-mono mb-2">
                  {formatCurrency(parseFloat(offlineStatus.pendingEarnings))}
                </p>
                {offlineStatus.capped && !user?.isPremium && (
                  <div className="bg-amber/10 border border-amber/30 rounded-xl p-3 mb-4">
                    <p className="text-sm text-amber mb-2">
                      Your earnings were capped at {offlineStatus.capHours} hours.
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-amber/70">Get 24hr cap with Premium</p>
                      <UpgradeButton size="sm" />
                    </div>
                  </div>
                )}
                <button
                  onClick={handleCollectOffline}
                  className="w-full py-3 bg-mint hover:bg-mint-600 text-dark-base font-bold rounded-xl transition-colors"
                >
                  Collect Earnings
                </button>
                <button
                  onClick={() => setShowOfflineModal(false)}
                  className="mt-2 text-zinc-500 hover:text-zinc-300 text-sm"
                >
                  Dismiss
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CashTicker />
        <IncomeCard stats={stats} />
        <PropertiesCard
          total={stats?.totalPropertiesOwned || 0}
          managed={managedProperties.length}
          income={totalPropertyIncome}
        />
        <BusinessesCard total={stats?.totalBusinessesOwned || 0} businesses={playerBusinesses} />
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Properties Summary */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-100">Properties</h2>
            <Link
              to="/properties"
              className="text-sm text-mint hover:text-mint-400 font-medium transition-colors"
            >
              View All &rarr;
            </Link>
          </div>

          {playerProperties.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 mb-4">No properties yet</p>
              <Link
                to="/properties"
                className="inline-block px-4 py-2 bg-mint hover:bg-mint-600 text-dark-base font-medium rounded-xl transition-colors"
              >
                Buy Your First Property
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-zinc-500 pb-2 border-b border-dark-border">
                <span>Total Income</span>
                <span className="font-medium text-mint font-mono">
                  +{formatCurrency(totalPropertyIncome)}/hr
                </span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Managed Properties</span>
                <span className="font-medium text-zinc-300 font-mono">
                  {managedProperties.length} / {playerProperties.length}
                </span>
              </div>
              <div className="pt-2">
                {playerProperties.slice(0, 3).map((prop) => (
                  <div
                    key={prop.id}
                    className="flex items-center justify-between py-2 border-b border-dark-border last:border-0"
                  >
                    <div>
                      <p className="font-medium text-zinc-200">{prop.propertyType.name}</p>
                      <p className="text-xs text-zinc-500">
                        Qty: {prop.quantity} • Lv. {prop.upgradeLevel}
                        {prop.managerHired && ' • 👔'}
                      </p>
                    </div>
                    <p className="text-sm text-mint font-mono">
                      +{formatCurrency(parseFloat(prop.currentIncomeHour))}/hr
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Businesses Summary */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-100">Businesses</h2>
            <Link
              to="/businesses"
              className="text-sm text-mint hover:text-mint-400 font-medium transition-colors"
            >
              View All &rarr;
            </Link>
          </div>

          {playerBusinesses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 mb-4">No businesses yet</p>
              <Link
                to="/businesses"
                className="inline-block px-4 py-2 bg-mint hover:bg-mint-600 text-dark-base font-medium rounded-xl transition-colors"
              >
                Start a Business
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {playerBusinesses.slice(0, 4).map((biz) => (
                <div
                  key={biz.id}
                  className="flex items-center justify-between py-2 border-b border-dark-border last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-zinc-200">{biz.businessType.name}</p>
                    <p className="text-xs text-zinc-500">Level {biz.level}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-dark-border rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          biz.cycleComplete ? 'bg-mint' : 'bg-purple'
                        }`}
                        style={{ width: `${biz.cycleProgress * 100}%` }}
                      />
                    </div>
                    {biz.cycleComplete && (
                      <span className="text-xs text-mint font-medium">Ready!</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Player Progress */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-dark-elevated rounded-xl">
            <p className="text-3xl font-bold text-pink font-mono">{stats?.playerLevel || 1}</p>
            <p className="text-sm text-zinc-500 mt-1">Player Level</p>
          </div>
          <div className="p-4 bg-dark-elevated rounded-xl">
            <p className="text-3xl font-bold text-mint font-mono">
              {formatCurrency(parseFloat(stats?.lifetimeCashEarned || '0'))}
            </p>
            <p className="text-sm text-zinc-500 mt-1">Lifetime Earnings</p>
          </div>
          <div className="p-4 bg-dark-elevated rounded-xl">
            <p className="text-3xl font-bold text-cyan font-mono">
              {(parseFloat(stats?.currentMultiplier || '1') * 100 - 100).toFixed(0)}%
            </p>
            <p className="text-sm text-zinc-500 mt-1">Income Bonus</p>
          </div>
          <div className="p-4 bg-dark-elevated rounded-xl">
            <p className="text-3xl font-bold text-amber font-mono">{stats?.premiumCurrency || 0}</p>
            <p className="text-sm text-zinc-500 mt-1">Gold Coins</p>
          </div>
        </div>
      </div>
    </div>
  );
}
