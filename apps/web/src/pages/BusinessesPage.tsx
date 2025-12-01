import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { formatCurrency } from '@mint/utils';
import type { BusinessType, PlayerBusiness } from '../api/game';
import { MiniGameModal, getBusinessTask } from '../components/minigames';
import { minigameApi, StartTaskResponse } from '../api/minigames';
import { CircularProgress } from '../components/ui';

type Tab = 'owned' | 'shop';

// Hook for real-time cycle progress
function useCycleProgress(cycleStart: string, cycleSeconds: number, cycleComplete: boolean) {
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

  return progress;
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
    sellBusiness,
    collectBusinessRevenue,
    clearError,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<Tab>('owned');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [instantCollectLoading, setInstantCollectLoading] = useState<string | null>(null);
  const [sellConfirm, setSellConfirm] = useState<string | null>(null);
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

  const handleInstantCollect = async (business: PlayerBusiness) => {
    setInstantCollectLoading(business.id);
    const result = await collectBusinessRevenue(business.id, 'instant');
    if (result) {
      // Show success message with management fee info
      console.log(`Instant Collection: $${parseFloat(result.collected).toLocaleString()}`);
      if (result.message) {
        // You could show a toast here with result.message
        console.log(result.message);
      }
    }
    setInstantCollectLoading(null);
  };

  const handleSellClick = (businessId: string) => {
    setSellConfirm(businessId);
  };

  const handleSellConfirm = async (businessId: string) => {
    setActionLoading(`sell-${businessId}`);
    const result = await sellBusiness(businessId);
    if (result) {
      console.log(`Sold ${result.businessName} for ${formatCurrency(parseFloat(result.cashReceived))}`);
    }
    setActionLoading(null);
    setSellConfirm(null);
  };

  const handleSellCancel = () => {
    setSellConfirm(null);
  };

  const handleTaskComplete = async (success: boolean, score: number) => {
    if (!activeTask) return;

    const result = await minigameApi.completeBusinessTask(
      activeTask.session.sessionId,
      success,
      score
    );

    if (result.success && result.data) {
      // Update the local session state with new attempt count
      const newAttemptsUsed = 3 - result.data.attemptsRemaining;
      setActiveTask({
        ...activeTask,
        session: {
          ...activeTask.session,
          attemptsUsed: newAttemptsUsed,
        },
      });

      if (result.data.success || (result.data.revenueMultiplier > 0)) {
        // Actually collect the revenue with full profit (minigame = 100%)
        const collectionResult = await collectBusinessRevenue(activeTask.business.id, 'minigame');
        if (collectionResult) {
          // Success - revenue collected
          console.log(
            `Revenue Collected: $${parseFloat(collectionResult.collected).toLocaleString()} (${Math.round(result.data.revenueMultiplier * 100)}%)`
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
                  onInstantCollect={() => handleInstantCollect(business)}
                  onSellClick={() => handleSellClick(business.id)}
                  onSellConfirm={() => handleSellConfirm(business.id)}
                  onSellCancel={handleSellCancel}
                  isLoading={
                    actionLoading === `level-${business.id}` ||
                    actionLoading === `collect-${business.id}` ||
                    actionLoading === `sell-${business.id}`
                  }
                  instantCollectLoading={instantCollectLoading === business.id}
                  showSellConfirm={sellConfirm === business.id}
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
  onInstantCollect: () => void;
  onSellClick: () => void;
  onSellConfirm: () => void;
  onSellCancel: () => void;
  isLoading: boolean;
  instantCollectLoading: boolean;
  showSellConfirm: boolean;
}

function OwnedBusinessCard({
  business,
  cash,
  onLevelUp,
  onCollect,
  onInstantCollect,
  onSellClick,
  onSellConfirm,
  onSellCancel,
  isLoading,
  instantCollectLoading,
  showSellConfirm,
}: OwnedBusinessCardProps) {
  const levelCost = business.nextLevelCost ? parseFloat(business.nextLevelCost) : null;
  const canLevelUp = levelCost !== null && cash >= levelCost;
  const progress = useCycleProgress(
    business.currentCycleStart,
    business.cycleSeconds,
    business.cycleComplete
  );
  const revenueAmount = formatCurrency(parseFloat(business.currentRevenue));
  const instantAmount = formatCurrency(parseFloat(business.currentRevenue) * 0.25);
  const totalInvested = parseFloat(business.totalInvested || '0');
  const sellValue = formatCurrency(totalInvested * 0.5);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5 border-l-4 border-purple-500">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-zinc-100">{business.businessType.name}</h3>
          <p className="text-sm text-zinc-500 capitalize">{business.businessType.category}</p>
        </div>
        <span className="px-2 py-1 bg-purple/20 text-purple text-xs font-medium rounded-full">
          Level {business.level}
        </span>
      </div>

      {/* Main content - Circular Progress centered with action buttons */}
      <div className="flex flex-col items-center mb-4">
        {/* Circular Progress with Wave Animation */}
        <div className="relative mb-3">
          <CircularProgress
            progress={progress}
            size={100}
            strokeWidth={6}
            color={business.cycleComplete ? '#4ade80' : '#a855f7'}
            isComplete={business.cycleComplete}
          />
          {/* Revenue overlay when complete */}
          {business.cycleComplete && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-green-400">{revenueAmount}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-500 mb-3">
          Cycle: {formatTime(business.cycleSeconds)}
        </p>

        {/* Collection Buttons - shown when cycle is complete */}
        {business.cycleComplete && (
          <div className="flex flex-col gap-2 w-full max-w-[220px]">
            {/* Mini-Game Collection - 100% Profit */}
            <button
              onClick={onCollect}
              disabled={isLoading || instantCollectLoading}
              className="flex items-center justify-between w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
            >
              {isLoading ? (
                <span className="w-full text-center">Starting...</span>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <span>🎮</span>
                    <span>Play</span>
                  </span>
                  <span className="font-bold">{revenueAmount}</span>
                </>
              )}
            </button>

            {/* Instant Collection - 25% Profit */}
            <button
              onClick={onInstantCollect}
              disabled={isLoading || instantCollectLoading}
              className="flex items-center justify-between w-full py-1.5 px-4 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              {instantCollectLoading ? (
                <span className="w-full text-center">Collecting...</span>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <span>⚡</span>
                    <span>Quick (25%)</span>
                  </span>
                  <span className="text-amber-200">{instantAmount}</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-zinc-600 text-center">
              Manager takes 75% fee for restocking
            </p>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
        <div className="bg-dark-elevated rounded-xl p-2 text-center">
          <p className="text-[10px] text-zinc-500">Revenue</p>
          <p className="font-bold text-mint text-xs">{revenueAmount}</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-2 text-center">
          <p className="text-[10px] text-zinc-500">Cycles</p>
          <p className="font-bold text-zinc-100 text-xs">{business.cyclesCompleted}</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-2 text-center">
          <p className="text-[10px] text-zinc-500">Staff</p>
          <p className="font-bold text-zinc-100 text-xs">{business.employeeCount}</p>
        </div>
      </div>

      {/* Level Up Button */}
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

      {/* Sell Business */}
      {showSellConfirm ? (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-xs text-red-400 mb-2 text-center">
            Sell for {sellValue}? (50% of invested)
          </p>
          <div className="flex gap-2">
            <button
              onClick={onSellCancel}
              className="flex-1 py-1.5 px-3 bg-dark-elevated hover:bg-dark-border text-zinc-300 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSellConfirm}
              disabled={isLoading}
              className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Selling...' : 'Confirm'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onSellClick}
          className="mt-3 w-full py-1.5 px-3 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          Sell Business ({sellValue})
        </button>
      )}
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
