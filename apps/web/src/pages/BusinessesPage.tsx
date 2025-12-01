import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { formatCurrency } from '@mint/utils';
import type { BusinessType, PlayerBusiness } from '../api/game';
import { MiniGameModal, getBusinessTask } from '../components/minigames';
import { minigameApi, StartTaskResponse } from '../api/minigames';

type Tab = 'owned' | 'shop';

// Animated cycle progress that updates in real-time
function AnimatedCycleProgress({
  cycleStart,
  cycleSeconds,
  cycleComplete
}: {
  cycleStart: string;
  cycleSeconds: number;
  cycleComplete: boolean;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (cycleComplete) {
      setProgress(100);
      return;
    }

    const updateProgress = () => {
      const startTime = new Date(cycleStart).getTime();
      const elapsed = (Date.now() - startTime) / 1000;
      const newProgress = Math.min(100, (elapsed / cycleSeconds) * 100);
      setProgress(newProgress);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100);

    return () => clearInterval(interval);
  }, [cycleStart, cycleSeconds, cycleComplete]);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-zinc-500">Cycle Progress</span>
        <span className="font-medium text-zinc-200">
          {cycleComplete ? 'Ready!' : `${Math.floor(progress)}%`}
        </span>
      </div>
      <div className="w-full bg-dark-border rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-100 ${
            cycleComplete ? 'bg-green-500' : 'bg-purple-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function BusinessesPage() {
  const {
    stats,
    businessTypes,
    playerBusinesses,
    isLoading,
    error,
    fetchBusinessTypes,
    fetchPlayerBusinesses,
    fetchStats,
    buyBusiness,
    levelUpBusiness,
    collectBusinessRevenue,
    clearError,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<Tab>('owned');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<{
    business: PlayerBusiness;
    session: StartTaskResponse;
  } | null>(null);

  useEffect(() => {
    fetchBusinessTypes();
    fetchPlayerBusinesses();
    fetchStats();
  }, [fetchBusinessTypes, fetchPlayerBusinesses, fetchStats]);

  // Refresh businesses every 10 seconds (progress is animated client-side)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPlayerBusinesses();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchPlayerBusinesses]);

  const handleBuy = async (typeId: number) => {
    setActionLoading(`buy-${typeId}`);
    await buyBusiness(typeId);
    setActionLoading(null);
  };

  const handleLevelUp = async (businessId: string) => {
    setActionLoading(`level-${businessId}`);
    await levelUpBusiness(businessId);
    setActionLoading(null);
  };

  const handleCollectClick = async (business: PlayerBusiness) => {
    setActionLoading(`collect-${business.id}`);
    // Start the mini-game task
    const response = await minigameApi.startBusinessTask(business.id);
    if (response.success && response.data) {
      setActiveTask({ business, session: response.data });
    } else {
      // Set error in store for display
      useGameStore.setState({
        error: response.error?.message || 'Failed to start task'
      });
    }
    setActionLoading(null);
  };

  const handleTaskComplete = async (success: boolean, score: number) => {
    if (!activeTask) return;

    const result = await minigameApi.completeBusinessTask(
      activeTask.session.sessionId,
      success,
      score
    );

    if (result.success && result.data) {
      if (result.data.success || (result.data.revenueMultiplier > 0)) {
        // Actually collect the revenue with multiplier
        const collected = await collectBusinessRevenue(activeTask.business.id);
        if (collected) {
          // Success - revenue collected
          console.log(
            `Revenue Collected: $${parseFloat(collected).toLocaleString()} (${Math.round(result.data.revenueMultiplier * 100)}%)`
          );
        }
      } else if (!result.data.canRetry) {
        // Failed all attempts - no collection
        useGameStore.setState({
          error: 'Task failed - better luck next cycle!'
        });
      }
    }
  };

  const handleCloseTask = () => {
    setActiveTask(null);
    fetchPlayerBusinesses(); // Refresh
  };

  const cash = parseFloat(stats?.cash || '0');

  // Check if business type is owned
  const isOwned = (typeId: number): boolean => {
    return playerBusinesses.some((b) => b.businessTypeId === typeId);
  };

  if (isLoading && businessTypes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Businesses</h1>
          <p className="text-zinc-400">Run businesses and collect revenue each cycle</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Your Cash</p>
          <p className="text-2xl font-bold text-mint">{formatCurrency(cash)}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-red-400">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            &times;
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-dark-elevated rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('owned')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'owned'
              ? 'bg-dark-card text-mint'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          My Businesses ({playerBusinesses.length})
        </button>
        <button
          onClick={() => setActiveTab('shop')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'shop'
              ? 'bg-dark-card text-mint'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          Available
        </button>
      </div>

      {/* Owned Businesses */}
      {activeTab === 'owned' && (
        <div className="space-y-4">
          {playerBusinesses.length === 0 ? (
            <div className="bg-dark-card border border-dark-border rounded-2xl p-8 text-center">
              <p className="text-zinc-500 mb-4">You don't own any businesses yet</p>
              <button
                onClick={() => setActiveTab('shop')}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white rounded-xl transition-colors"
              >
                Start a Business
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {playerBusinesses.map((business) => (
                <OwnedBusinessCard
                  key={business.id}
                  business={business}
                  cash={cash}
                  onLevelUp={() => handleLevelUp(business.id)}
                  onCollect={() => handleCollectClick(business)}
                  isLoading={
                    actionLoading === `level-${business.id}` ||
                    actionLoading === `collect-${business.id}`
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shop */}
      {activeTab === 'shop' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businessTypes.map((type) => (
            <ShopBusinessCard
              key={type.id}
              type={type}
              isOwned={isOwned(type.id)}
              cash={cash}
              onBuy={() => handleBuy(type.id)}
              isLoading={actionLoading === `buy-${type.id}`}
            />
          ))}
        </div>
      )}

      {/* Mini-Game Modal */}
      {activeTask && (
        <MiniGameModal
          isOpen={true}
          onClose={handleCloseTask}
          title={getBusinessTask(activeTask.business.businessType.slug).name}
          taskType={activeTask.session.taskType}
          difficulty={activeTask.session.difficulty}
          attemptsUsed={activeTask.session.attemptsUsed}
          maxAttempts={3}
          GameComponent={getBusinessTask(activeTask.business.businessType.slug).component}
          onTaskComplete={handleTaskComplete}
        />
      )}
    </div>
  );
}

interface OwnedBusinessCardProps {
  business: PlayerBusiness;
  cash: number;
  onLevelUp: () => void;
  onCollect: () => void;
  isLoading: boolean;
}

function OwnedBusinessCard({
  business,
  cash,
  onLevelUp,
  onCollect,
  isLoading,
}: OwnedBusinessCardProps) {
  const levelCost = business.nextLevelCost ? parseFloat(business.nextLevelCost) : null;
  const canLevelUp = levelCost !== null && cash >= levelCost;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5 border-l-4 border-purple-500">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-zinc-100">{business.businessType.name}</h3>
          <p className="text-sm text-zinc-500 capitalize">{business.businessType.category}</p>
        </div>
        <span className="px-2 py-1 bg-purple/20 text-purple text-xs font-medium rounded-full">
          Level {business.level}
        </span>
      </div>

      {/* Cycle Progress */}
      <AnimatedCycleProgress
        cycleStart={business.currentCycleStart}
        cycleSeconds={business.cycleSeconds}
        cycleComplete={business.cycleComplete}
      />
      <p className="text-xs text-zinc-600 -mt-3 mb-4">
        Cycle time: {formatTime(business.cycleSeconds)}
      </p>

      {/* Revenue Info */}
      <div className="bg-mint/10 rounded-xl p-3 mb-4">
        <p className="text-sm text-mint">Revenue per cycle</p>
        <p className="text-xl font-bold text-mint">
          {formatCurrency(parseFloat(business.currentRevenue))}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div className="bg-dark-elevated rounded-xl p-2">
          <p className="text-zinc-400">Cycles Completed</p>
          <p className="font-bold text-zinc-100">{business.cyclesCompleted}</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-2">
          <p className="text-zinc-400">Employees</p>
          <p className="font-bold text-zinc-100">{business.employeeCount}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {business.cycleComplete && (
          <button
            onClick={onCollect}
            disabled={isLoading}
            className="w-full py-2 px-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Collecting...' : `Collect ${formatCurrency(parseFloat(business.currentRevenue))}`}
          </button>
        )}

        {levelCost !== null && (
          <button
            onClick={onLevelUp}
            disabled={!canLevelUp || isLoading}
            className={`w-full py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              canLevelUp
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-dark-elevated text-zinc-600 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Upgrading...' : `Level Up - ${formatCurrency(levelCost)}`}
          </button>
        )}
      </div>
    </div>
  );
}

interface ShopBusinessCardProps {
  type: BusinessType;
  isOwned: boolean;
  cash: number;
  onBuy: () => void;
  isLoading: boolean;
}

function ShopBusinessCard({ type, isOwned, cash, onBuy, isLoading }: ShopBusinessCardProps) {
  const cost = parseFloat(type.baseCost);
  const canAfford = cash >= cost;
  const isLocked = !type.isUnlocked;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <div
      className={`bg-dark-card border border-dark-border rounded-2xl p-5 ${
        isLocked || isOwned ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-zinc-100">{type.name}</h3>
          <p className="text-sm text-zinc-500 capitalize">{type.category}</p>
        </div>
        <span className="px-2 py-1 bg-dark-elevated text-zinc-400 text-xs font-medium rounded-full">
          Tier {type.tier}
        </span>
      </div>

      {isLocked ? (
        <div className="text-center py-4 text-zinc-500">
          <span className="text-2xl">🔒</span>
          <p className="text-sm mt-2">Unlock at higher level</p>
        </div>
      ) : isOwned ? (
        <div className="text-center py-4 text-mint">
          <span className="text-2xl">✓</span>
          <p className="text-sm mt-2">Already owned</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Revenue/Cycle</span>
              <span className="font-medium text-mint">
                {formatCurrency(parseFloat(type.baseRevenue))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Cycle Time</span>
              <span className="font-medium text-zinc-200">{formatTime(type.cycleSeconds)}</span>
            </div>
          </div>

          <button
            onClick={onBuy}
            disabled={!canAfford || isLoading}
            className={`w-full py-2 px-3 rounded-xl font-medium transition-colors ${
              canAfford
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-dark-elevated text-zinc-600 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Buying...' : `Buy - ${formatCurrency(cost)}`}
          </button>
        </>
      )}
    </div>
  );
}
