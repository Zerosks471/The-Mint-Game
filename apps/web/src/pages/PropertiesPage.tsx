import { useEffect, useState, useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { formatCurrency } from '@mint/utils';
import { MiniSparkline } from '../components/ui';
import type { PropertyType, PlayerProperty } from '../api/game';

type Tab = 'owned' | 'shop';

// Category icons mapping
const categoryIcons: Record<string, string> = {
  residential: '🏠',
  commercial: '🏢',
  industrial: '🏭',
  entertainment: '🎰',
  luxury: '💎',
  default: '🏗️',
};

// Generate fake sparkline data based on income (simulates trend)
function generateIncomeSparkline(income: number, quantity: number): number[] {
  const baseValue = income / quantity;
  const data: number[] = [];
  for (let i = 0; i < 12; i++) {
    // Simulate gradual growth with some variation
    const growth = 1 + (i / 11) * 0.2;
    const noise = 1 + (Math.random() - 0.5) * 0.1;
    data.push(baseValue * growth * noise * (i < 4 ? 0.7 + i * 0.1 : 1));
  }
  data[data.length - 1] = income; // End at current income
  return data;
}

// Format time duration
function formatDuration(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const days = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return h > 0 ? `${days}d ${h}h` : `${days}d`;
}

export function PropertiesPage() {
  const {
    stats,
    propertyTypes,
    playerProperties,
    isLoading,
    error,
    fetchPropertyTypes,
    fetchPlayerProperties,
    fetchStats,
    buyProperty,
    upgradeProperty,
    hireManager,
    sellProperty,
    clearError,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<Tab>('owned');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPropertyTypes();
    fetchPlayerProperties();
    fetchStats();
  }, [fetchPropertyTypes, fetchPlayerProperties, fetchStats]);

  const handleBuy = async (typeId: number) => {
    setActionLoading(`buy-${typeId}`);
    await buyProperty(typeId);
    setActionLoading(null);
  };

  const handleUpgrade = async (propertyId: string) => {
    setActionLoading(`upgrade-${propertyId}`);
    await upgradeProperty(propertyId);
    setActionLoading(null);
  };

  const handleHireManager = async (propertyId: string) => {
    setActionLoading(`manager-${propertyId}`);
    await hireManager(propertyId);
    setActionLoading(null);
  };

  const handleSell = async (propertyId: string) => {
    setActionLoading(`sell-${propertyId}`);
    await sellProperty(propertyId, 1);
    setActionLoading(null);
  };

  const cash = parseFloat(stats?.cash || '0');

  // Portfolio summary calculations
  const portfolioStats = useMemo(() => {
    if (playerProperties.length === 0) {
      return {
        totalProperties: 0,
        totalQuantity: 0,
        totalIncomeHour: 0,
        totalInvested: 0,
        bestPerformer: null as PlayerProperty | null,
        worstPerformer: null as PlayerProperty | null,
        avgEfficiency: 0,
      };
    }

    const totalQuantity = playerProperties.reduce((sum, p) => sum + p.quantity, 0);
    const totalIncomeHour = playerProperties.reduce(
      (sum, p) => sum + parseFloat(p.currentIncomeHour),
      0
    );

    // Estimate total invested (sum of base costs * quantities)
    const totalInvested = playerProperties.reduce(
      (sum, p) => sum + parseFloat(p.propertyType.baseCost) * p.quantity,
      0
    );

    // Find best and worst performers by income per unit
    const sorted = [...playerProperties].sort((a, b) => {
      const incomeA = parseFloat(a.currentIncomeHour) / a.quantity;
      const incomeB = parseFloat(b.currentIncomeHour) / b.quantity;
      return incomeB - incomeA;
    });

    return {
      totalProperties: playerProperties.length,
      totalQuantity,
      totalIncomeHour,
      totalInvested,
      bestPerformer: sorted[0] || null,
      worstPerformer: sorted.length > 1 ? sorted[sorted.length - 1] : null,
      avgEfficiency: totalIncomeHour / totalQuantity,
    };
  }, [playerProperties]);

  // Get owned property by type
  const getOwnedProperty = (typeId: number): PlayerProperty | undefined => {
    return playerProperties.find((p) => p.propertyTypeId === typeId);
  };

  // Calculate buy cost for a property type
  const getBuyCost = (type: PropertyType): number => {
    const owned = getOwnedProperty(type.id);
    if (owned && owned.nextPurchaseCost) {
      return parseFloat(owned.nextPurchaseCost);
    }
    return parseFloat(type.baseCost);
  };

  if (isLoading && propertyTypes.length === 0) {
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
          <h1 className="text-2xl font-bold text-zinc-100">Properties</h1>
          <p className="text-zinc-400">Buy and upgrade properties for passive income</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Your Cash</p>
          <p className="text-2xl font-bold text-mint">{formatCurrency(cash)}</p>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      {playerProperties.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Properties */}
          <div className="bg-gradient-to-br from-dark-card to-dark-elevated border-l-4 border-l-cyan-500 border border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <span className="text-lg">🏘️</span>
              </div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Properties</p>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{portfolioStats.totalQuantity}</p>
            <p className="text-xs text-zinc-500">{portfolioStats.totalProperties} types</p>
          </div>

          {/* Total Income */}
          <div className="bg-gradient-to-br from-dark-card to-dark-elevated border-l-4 border-l-green-500 border border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="text-lg">💰</span>
              </div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Income/Hour</p>
            </div>
            <p className="text-2xl font-bold text-green-400">
              +{formatCurrency(portfolioStats.totalIncomeHour)}
            </p>
            <p className="text-xs text-green-400/70">
              ≈ {formatCurrency(portfolioStats.totalIncomeHour / 3600)}/sec
            </p>
          </div>

          {/* Total Invested */}
          <div className="bg-gradient-to-br from-dark-card to-dark-elevated border-l-4 border-l-blue-500 border border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Invested</p>
            </div>
            <p className="text-2xl font-bold text-zinc-100">{formatCurrency(portfolioStats.totalInvested)}</p>
            <p className="text-xs text-zinc-500">
              ROI: {formatDuration(portfolioStats.totalInvested / portfolioStats.totalIncomeHour)}
            </p>
          </div>

          {/* Best Performer */}
          <div className="bg-gradient-to-br from-dark-card to-dark-elevated border-l-4 border-l-amber-500 border border-dark-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <span className="text-lg">🏆</span>
              </div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Top Performer</p>
            </div>
            {portfolioStats.bestPerformer ? (
              <>
                <p className="text-lg font-bold text-zinc-100 truncate">
                  {portfolioStats.bestPerformer.propertyType.name}
                </p>
                <p className="text-xs text-amber-400">
                  {formatCurrency(parseFloat(portfolioStats.bestPerformer.currentIncomeHour))}/hr
                </p>
              </>
            ) : (
              <p className="text-zinc-500">—</p>
            )}
          </div>
        </div>
      )}

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
          Owned ({playerProperties.length})
        </button>
        <button
          onClick={() => setActiveTab('shop')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'shop'
              ? 'bg-dark-card text-mint'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          Shop
        </button>
      </div>

      {/* Owned Properties */}
      {activeTab === 'owned' && (
        <div className="space-y-4">
          {playerProperties.length === 0 ? (
            <div className="bg-dark-card border border-dark-border rounded-2xl p-8 text-center">
              <p className="text-zinc-500 mb-4">You don't own any properties yet</p>
              <button
                onClick={() => setActiveTab('shop')}
                className="px-4 py-2 bg-mint-500 hover:bg-mint-600 text-white rounded-xl transition-colors"
              >
                Browse Properties
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playerProperties.map((property) => (
                <OwnedPropertyCard
                  key={property.id}
                  property={property}
                  cash={cash}
                  onUpgrade={() => handleUpgrade(property.id)}
                  onHireManager={() => handleHireManager(property.id)}
                  onSell={() => handleSell(property.id)}
                  isLoading={
                    actionLoading === `upgrade-${property.id}` ||
                    actionLoading === `manager-${property.id}` ||
                    actionLoading === `sell-${property.id}`
                  }
                  isSelling={actionLoading === `sell-${property.id}`}
                  isBestPerformer={portfolioStats.bestPerformer?.id === property.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shop */}
      {activeTab === 'shop' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {propertyTypes.map((type) => (
            <ShopPropertyCard
              key={type.id}
              type={type}
              owned={getOwnedProperty(type.id)}
              cost={getBuyCost(type)}
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

interface OwnedPropertyCardProps {
  property: PlayerProperty;
  cash: number;
  onUpgrade: () => void;
  onHireManager: () => void;
  onSell: () => void;
  isLoading: boolean;
  isSelling: boolean;
  isBestPerformer: boolean;
}

function OwnedPropertyCard({
  property,
  cash,
  onUpgrade,
  onHireManager,
  onSell,
  isLoading,
  isSelling,
  isBestPerformer,
}: OwnedPropertyCardProps) {
  const upgradeCost = property.nextUpgradeCost ? parseFloat(property.nextUpgradeCost) : null;
  const managerCost = property.propertyType.managerCost
    ? parseFloat(property.propertyType.managerCost)
    : null;
  // Sell value is 50% of base cost per unit
  const sellValue = parseFloat(property.propertyType.baseCost) * 0.5;
  const currentIncome = parseFloat(property.currentIncomeHour);
  const baseCost = parseFloat(property.propertyType.baseCost) * property.quantity;

  const canUpgrade = upgradeCost !== null && cash >= upgradeCost;
  const canHireManager = !property.managerHired && managerCost !== null && cash >= managerCost;

  // Calculate ROI (hours to pay back investment)
  const roiHours = currentIncome > 0 ? baseCost / currentIncome : 0;

  // Calculate efficiency (income per unit)
  const efficiency = currentIncome / property.quantity;

  // Status determination
  const status = property.managerHired ? 'auto' : 'active';
  const statusConfig = {
    auto: { label: 'Auto', color: 'bg-blue-500', textColor: 'text-blue-400' },
    active: { label: 'Active', color: 'bg-green-500', textColor: 'text-green-400' },
  };

  // Category icon
  const categoryIcon = categoryIcons[property.propertyType.category] || categoryIcons.default;

  // Max upgrade level (assume 10 if not specified)
  const maxLevel = 10;
  const upgradeProgress = (property.upgradeLevel / maxLevel) * 100;

  // Generate sparkline data
  const sparklineData = useMemo(
    () => generateIncomeSparkline(currentIncome, property.quantity),
    [currentIncome, property.quantity]
  );

  return (
    <div className={`bg-dark-card border rounded-2xl p-5 border-l-4 transition-all hover:border-mint/30 ${
      isBestPerformer ? 'border-l-amber-500 border-amber-500/30' : 'border-l-mint-500 border-dark-border'
    }`}>
      {/* Header with icon, name, and badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-elevated flex items-center justify-center text-xl">
            {categoryIcon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-zinc-100">{property.propertyType.name}</h3>
              {isBestPerformer && (
                <span className="text-amber-400 text-sm" title="Best Performer">🏆</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 capitalize">{property.propertyType.category}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusConfig[status].textColor} bg-dark-elevated`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusConfig[status].color} animate-pulse`}></div>
            <span className="text-[10px] font-medium uppercase">{statusConfig[status].label}</span>
          </div>
          {/* Tier Badge */}
          <span className="px-2 py-0.5 bg-mint/20 text-mint text-[10px] font-medium rounded-full">
            Tier {property.propertyType.tier}
          </span>
        </div>
      </div>

      {/* Income with Sparkline */}
      <div className="bg-gradient-to-r from-mint/10 to-transparent rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-mint/70 uppercase tracking-wider">Income/Hour</p>
            <p className="text-xl font-bold text-mint">
              +{formatCurrency(currentIncome)}
            </p>
            <p className="text-[10px] text-mint/70">
              ≈ {formatCurrency(currentIncome / 3600)}/sec
            </p>
          </div>
          <MiniSparkline data={sparklineData} width={60} height={28} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
        <div className="bg-dark-elevated rounded-lg p-2 text-center">
          <p className="text-zinc-500 mb-0.5">Qty</p>
          <p className="font-bold text-zinc-100">{property.quantity}</p>
        </div>
        <div className="bg-dark-elevated rounded-lg p-2 text-center">
          <p className="text-zinc-500 mb-0.5">Level</p>
          <p className="font-bold text-zinc-100">{property.upgradeLevel}</p>
        </div>
        <div className="bg-dark-elevated rounded-lg p-2 text-center">
          <p className="text-zinc-500 mb-0.5">ROI</p>
          <p className="font-bold text-cyan-400">{formatDuration(roiHours)}</p>
        </div>
        <div className="bg-dark-elevated rounded-lg p-2 text-center">
          <p className="text-zinc-500 mb-0.5">Eff.</p>
          <p className="font-bold text-purple-400">{formatCurrency(efficiency)}</p>
        </div>
      </div>

      {/* Upgrade Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span>Upgrade Progress</span>
          <span>Level {property.upgradeLevel}/{maxLevel}</span>
        </div>
        <div className="h-1.5 bg-dark-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-mint to-cyan-400 transition-all duration-500"
            style={{ width: `${upgradeProgress}%` }}
          />
        </div>
      </div>

      {/* Manager Status */}
      {property.managerHired ? (
        <div className="flex items-center gap-2 mb-3 text-xs bg-blue-500/10 text-blue-400 rounded-xl p-2.5 border border-blue-500/20">
          <span className="text-base">👔</span>
          <div>
            <p className="font-medium">{property.propertyType.managerName} managing</p>
            <p className="text-blue-400/70">Earns while offline</p>
          </div>
        </div>
      ) : managerCost !== null ? (
        <button
          onClick={onHireManager}
          disabled={!canHireManager || isLoading}
          className={`w-full mb-2 py-2 px-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            canHireManager
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-dark-elevated text-zinc-600 cursor-not-allowed'
          }`}
        >
          <span>👔</span>
          {isLoading ? 'Hiring...' : `Hire ${property.propertyType.managerName} - ${formatCurrency(managerCost)}`}
        </button>
      ) : null}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {/* Upgrade Button */}
        {upgradeCost !== null && (
          <button
            onClick={onUpgrade}
            disabled={!canUpgrade || isLoading}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              canUpgrade
                ? 'bg-mint-500 hover:bg-mint-600 text-white'
                : 'bg-dark-elevated text-zinc-600 cursor-not-allowed'
            }`}
          >
            {isLoading && !isSelling ? '...' : `⬆ ${formatCurrency(upgradeCost)}`}
          </button>
        )}

        {/* Sell Button */}
        <button
          onClick={onSell}
          disabled={isLoading}
          className="flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
        >
          {isSelling ? '...' : `Sell +${formatCurrency(sellValue)}`}
        </button>
      </div>
    </div>
  );
}

interface ShopPropertyCardProps {
  type: PropertyType;
  owned: PlayerProperty | undefined;
  cost: number;
  cash: number;
  onBuy: () => void;
  isLoading: boolean;
}

function ShopPropertyCard({ type, owned, cost, cash, onBuy, isLoading }: ShopPropertyCardProps) {
  const canAfford = cash >= cost;
  const isLocked = !type.isUnlocked;
  const currentQuantity = owned?.quantity ?? 0;
  const isMaxed = currentQuantity >= type.maxQuantity;
  const canBuy = canAfford && !isMaxed;

  // Category icon
  const categoryIcon = categoryIcons[type.category] || categoryIcons.default;

  // Calculate ROI for this property
  const baseIncome = parseFloat(type.baseIncomeHour);
  const roiHours = baseIncome > 0 ? cost / baseIncome : 0;

  return (
    <div
      className={`bg-dark-card border border-dark-border rounded-2xl p-5 transition-all hover:border-mint/30 ${
        isLocked ? 'opacity-60' : ''
      }`}
    >
      {/* Header with icon */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-elevated flex items-center justify-center text-xl">
            {isLocked ? '🔒' : categoryIcon}
          </div>
          <div>
            <h3 className="font-bold text-zinc-100">{type.name}</h3>
            <p className="text-xs text-zinc-500 capitalize">{type.category}</p>
          </div>
        </div>
        <span className="px-2 py-0.5 bg-dark-elevated text-zinc-400 text-[10px] font-medium rounded-full">
          Tier {type.tier}
        </span>
      </div>

      {isLocked ? (
        <div className="text-center py-6 text-zinc-500">
          <p className="text-sm">Unlock at higher level</p>
        </div>
      ) : (
        <>
          {/* Income Preview */}
          <div className="bg-gradient-to-r from-mint/10 to-transparent rounded-xl p-3 mb-3">
            <p className="text-xs text-mint/70 uppercase tracking-wider mb-1">Base Income</p>
            <p className="text-lg font-bold text-mint">
              +{formatCurrency(baseIncome)}/hr
            </p>
            <p className="text-[10px] text-mint/70">
              ≈ {formatCurrency(baseIncome / 3600)}/sec
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="bg-dark-elevated rounded-lg p-2">
              <p className="text-zinc-500 mb-0.5">Owned</p>
              <p className={`font-bold ${isMaxed ? 'text-amber-400' : 'text-zinc-200'}`}>
                {currentQuantity} / {type.maxQuantity}
              </p>
            </div>
            <div className="bg-dark-elevated rounded-lg p-2">
              <p className="text-zinc-500 mb-0.5">ROI</p>
              <p className="font-bold text-cyan-400">{formatDuration(roiHours)}</p>
            </div>
          </div>

          {/* Ownership Progress */}
          <div className="mb-3">
            <div className="h-1 bg-dark-elevated rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isMaxed ? 'bg-amber-500' : 'bg-gradient-to-r from-mint to-cyan-400'
                }`}
                style={{ width: `${(currentQuantity / type.maxQuantity) * 100}%` }}
              />
            </div>
          </div>

          {isMaxed ? (
            <div className="w-full py-2.5 px-3 rounded-xl font-medium bg-amber-500/20 text-amber-400 text-center text-sm border border-amber-500/30">
              ✓ Max Owned
            </div>
          ) : (
            <button
              onClick={onBuy}
              disabled={!canBuy || isLoading}
              className={`w-full py-2.5 px-3 rounded-xl font-medium transition-colors text-sm ${
                canBuy
                  ? 'bg-mint-500 hover:bg-mint-600 text-white'
                  : 'bg-dark-elevated text-zinc-600 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Buying...' : `Buy - ${formatCurrency(cost)}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
