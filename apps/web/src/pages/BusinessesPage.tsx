import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { formatCurrency } from '@mint/utils';
import type { BusinessType, PlayerBusiness } from '../api/game';

type Tab = 'owned' | 'shop';

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

  useEffect(() => {
    fetchBusinessTypes();
    fetchPlayerBusinesses();
    fetchStats();
  }, [fetchBusinessTypes, fetchPlayerBusinesses, fetchStats]);

  // Refresh businesses every 5 seconds for cycle progress
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPlayerBusinesses();
    }, 5000);
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

  const handleCollect = async (businessId: string) => {
    setActionLoading(`collect-${businessId}`);
    await collectBusinessRevenue(businessId);
    setActionLoading(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
          <p className="text-gray-600">Run businesses and collect revenue each cycle</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Your Cash</p>
          <p className="text-2xl font-bold text-mint-600">{formatCurrency(cash)}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-600">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-600">
            &times;
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('owned')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'owned'
              ? 'bg-white text-mint-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Businesses ({playerBusinesses.length})
        </button>
        <button
          onClick={() => setActiveTab('shop')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'shop'
              ? 'bg-white text-mint-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Available
        </button>
      </div>

      {/* Owned Businesses */}
      {activeTab === 'owned' && (
        <div className="space-y-4">
          {playerBusinesses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <p className="text-gray-500 mb-4">You don't own any businesses yet</p>
              <button
                onClick={() => setActiveTab('shop')}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white rounded-lg transition-colors"
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
                  onCollect={() => handleCollect(business.id)}
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
    <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-purple-500">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900">{business.businessType.name}</h3>
          <p className="text-sm text-gray-500 capitalize">{business.businessType.category}</p>
        </div>
        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
          Level {business.level}
        </span>
      </div>

      {/* Cycle Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">Cycle Progress</span>
          <span className="font-medium">
            {business.cycleComplete ? 'Ready!' : `${Math.floor(business.cycleProgress * 100)}%`}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              business.cycleComplete ? 'bg-green-500' : 'bg-purple-500'
            }`}
            style={{ width: `${business.cycleProgress * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Cycle time: {formatTime(business.cycleSeconds)}
        </p>
      </div>

      {/* Revenue Info */}
      <div className="bg-green-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-green-600">Revenue per cycle</p>
        <p className="text-xl font-bold text-green-700">
          {formatCurrency(parseFloat(business.currentRevenue))}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">Cycles Completed</p>
          <p className="font-bold text-gray-900">{business.cyclesCompleted}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500">Employees</p>
          <p className="font-bold text-gray-900">{business.employeeCount}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {business.cycleComplete && (
          <button
            onClick={onCollect}
            disabled={isLoading}
            className="w-full py-2 px-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Collecting...' : `Collect ${formatCurrency(parseFloat(business.currentRevenue))}`}
          </button>
        )}

        {levelCost !== null && (
          <button
            onClick={onLevelUp}
            disabled={!canLevelUp || isLoading}
            className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              canLevelUp
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
      className={`bg-white rounded-xl shadow-lg p-5 ${
        isLocked || isOwned ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900">{type.name}</h3>
          <p className="text-sm text-gray-500 capitalize">{type.category}</p>
        </div>
        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
          Tier {type.tier}
        </span>
      </div>

      {isLocked ? (
        <div className="text-center py-4 text-gray-500">
          <span className="text-2xl">🔒</span>
          <p className="text-sm mt-2">Unlock at higher level</p>
        </div>
      ) : isOwned ? (
        <div className="text-center py-4 text-green-600">
          <span className="text-2xl">✓</span>
          <p className="text-sm mt-2">Already owned</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Revenue/Cycle</span>
              <span className="font-medium text-green-600">
                {formatCurrency(parseFloat(type.baseRevenue))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cycle Time</span>
              <span className="font-medium">{formatTime(type.cycleSeconds)}</span>
            </div>
          </div>

          <button
            onClick={onBuy}
            disabled={!canAfford || isLoading}
            className={`w-full py-2 px-3 rounded-lg font-medium transition-colors ${
              canAfford
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Buying...' : `Buy - ${formatCurrency(cost)}`}
          </button>
        </>
      )}
    </div>
  );
}
