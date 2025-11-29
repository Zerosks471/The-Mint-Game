import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { formatCurrency } from '@mint/utils';

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

  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    // Show offline modal if there are pending earnings
    if (offlineStatus && parseFloat(offlineStatus.pendingEarnings) > 0) {
      setShowOfflineModal(true);
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
                {offlineStatus.capped && (
                  <p className="text-sm text-amber-600 mb-4">
                    (Capped at {offlineStatus.capHours} hours - Go Premium for 24h!)
                  </p>
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
        <StatCard
          label="Total Cash"
          value={formatCurrency(parseFloat(stats?.cash || '0'))}
          icon="💵"
          color="mint"
        />
        <StatCard
          label="Income/Hour"
          value={`+${formatCurrency(parseFloat(stats?.effectiveIncomeHour || '0'))}`}
          icon="📈"
          color="green"
        />
        <StatCard
          label="Properties"
          value={stats?.totalPropertiesOwned || 0}
          icon="🏢"
          color="blue"
        />
        <StatCard
          label="Businesses"
          value={stats?.totalBusinessesOwned || 0}
          icon="💼"
          color="purple"
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

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: 'mint' | 'green' | 'blue' | 'purple';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    mint: 'bg-mint-50 border-mint-200 text-mint-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className={`rounded-xl border-2 p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-75">{label}</p>
    </div>
  );
}
