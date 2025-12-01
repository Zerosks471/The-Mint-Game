import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { formatCurrency } from '@mint/utils';
import type { PropertyType, PlayerProperty } from '../api/game';

type Tab = 'owned' | 'shop';

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
}

function OwnedPropertyCard({
  property,
  cash,
  onUpgrade,
  onHireManager,
  onSell,
  isLoading,
  isSelling,
}: OwnedPropertyCardProps) {
  const upgradeCost = property.nextUpgradeCost ? parseFloat(property.nextUpgradeCost) : null;
  const managerCost = property.propertyType.managerCost
    ? parseFloat(property.propertyType.managerCost)
    : null;
  // Sell value is 50% of base cost per unit
  const sellValue = parseFloat(property.propertyType.baseCost) * 0.5;

  const canUpgrade = upgradeCost !== null && cash >= upgradeCost;
  const canHireManager = !property.managerHired && managerCost !== null && cash >= managerCost;

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5 border-l-4 border-mint-500">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-zinc-100">{property.propertyType.name}</h3>
          <p className="text-sm text-zinc-500 capitalize">{property.propertyType.category}</p>
        </div>
        <span className="px-2 py-1 bg-mint/20 text-mint text-xs font-medium rounded-full">
          Tier {property.propertyType.tier}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div className="bg-dark-elevated rounded-xl p-2">
          <p className="text-zinc-500">Quantity</p>
          <p className="font-bold text-zinc-100">{property.quantity}</p>
        </div>
        <div className="bg-dark-elevated rounded-xl p-2">
          <p className="text-zinc-500">Level</p>
          <p className="font-bold text-zinc-100">{property.upgradeLevel}</p>
        </div>
        <div className="bg-mint/10 rounded-xl p-2 col-span-2">
          <p className="text-mint">Income/Hour</p>
          <p className="font-bold text-mint">
            +{formatCurrency(parseFloat(property.currentIncomeHour))}
          </p>
          <p className="text-xs text-mint mt-1">
            ≈ {formatCurrency(parseFloat(property.currentIncomeHour) / 3600)}/sec
          </p>
        </div>
      </div>

      {/* Manager Status */}
      {property.managerHired ? (
        <div className="flex items-center space-x-2 mb-4 text-sm bg-blue/10 text-blue rounded-xl p-2">
          <span>👔</span>
          <span>
            {property.propertyType.managerName} is managing (earns offline)
          </span>
        </div>
      ) : managerCost !== null ? (
        <button
          onClick={onHireManager}
          disabled={!canHireManager || isLoading}
          className={`w-full mb-2 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
            canHireManager
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-dark-elevated text-zinc-600 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Hiring...' : `Hire ${property.propertyType.managerName} - ${formatCurrency(managerCost)}`}
        </button>
      ) : null}

      {/* Upgrade Button */}
      {upgradeCost !== null && (
        <button
          onClick={onUpgrade}
          disabled={!canUpgrade || isLoading}
          className={`w-full py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
            canUpgrade
              ? 'bg-mint-500 hover:bg-mint-600 text-white'
              : 'bg-dark-elevated text-zinc-600 cursor-not-allowed'
          }`}
        >
          {isLoading && !isSelling ? 'Upgrading...' : `Upgrade - ${formatCurrency(upgradeCost)}`}
        </button>
      )}

      {/* Sell Button */}
      <button
        onClick={onSell}
        disabled={isLoading}
        className="w-full mt-2 py-2 px-3 rounded-xl text-sm font-medium transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
      >
        {isSelling ? 'Selling...' : `Sell 1 - +${formatCurrency(sellValue)}`}
      </button>
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

  return (
    <div
      className={`bg-dark-card border border-dark-border rounded-2xl p-5 ${
        isLocked ? 'opacity-60' : ''
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
      ) : (
        <>
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Base Income</span>
              <span className="font-medium text-mint">
                +{formatCurrency(parseFloat(type.baseIncomeHour))}/hr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Per Second</span>
              <span className="font-medium text-mint text-xs">
                ≈ {formatCurrency(parseFloat(type.baseIncomeHour) / 3600)}/sec
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">You own</span>
              <span className={`font-medium ${isMaxed ? 'text-amber' : 'text-zinc-200'}`}>
                {currentQuantity} / {type.maxQuantity}
              </span>
            </div>
          </div>

          {isMaxed ? (
            <div className="w-full py-2 px-3 rounded-xl font-medium bg-amber/20 text-amber text-center">
              Max Owned
            </div>
          ) : (
            <button
              onClick={onBuy}
              disabled={!canBuy || isLoading}
              className={`w-full py-2 px-3 rounded-xl font-medium transition-colors ${
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
