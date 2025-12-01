import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface EconomyData {
  users: {
    byStatus: Record<string, number>;
    dailyActive: number;
    newToday: number;
  };
  economy: {
    totalCashInCirculation: string;
    averageCash: string;
    maxCash: string;
    averageLevel: number;
    maxLevel: number;
  };
  properties: {
    totalOwned: number;
    hourlyIncome: string;
  };
  businesses: {
    totalOwned: number;
    totalRevenue: string;
  };
  purchases: {
    totalTransactions: number;
    totalRevenue: number;
  };
  stockMarket: {
    totalTrades: number;
    totalVolume: string;
  };
}

interface HealthData {
  status: string;
  services: {
    database: { status: string; latency: number };
  };
  system: {
    memory: {
      system: { usedPercent: string };
    };
    cpu: {
      loadAverage: { '1min': string };
    };
    uptime: { process: number };
  };
}

export function DashboardPage() {
  const [economy, setEconomy] = useState<EconomyData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [economyRes, healthRes] = await Promise.all([
        api.getEconomyOverview(),
        api.getHealth(),
      ]);

      if (economyRes.success) setEconomy(economyRes.data as EconomyData);
      if (healthRes.success) setHealth(healthRes.data as HealthData);
      setLoading(false);
    }

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  const totalUsers = economy
    ? Object.values(economy.users.byStatus).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-zinc-500">Overview of The Mint game statistics</p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${
          health?.status === 'healthy'
            ? 'bg-green-500/10 border-green-500/20'
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          <div className="text-sm text-zinc-400">System Status</div>
          <div className={`text-2xl font-bold ${
            health?.status === 'healthy' ? 'text-green-400' : 'text-red-400'
          }`}>
            {health?.status === 'healthy' ? '✓ Healthy' : '✗ Degraded'}
          </div>
        </div>

        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400">Database Latency</div>
          <div className="text-2xl font-bold text-zinc-100">
            {health?.services.database.latency}ms
          </div>
        </div>

        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400">Memory Usage</div>
          <div className="text-2xl font-bold text-zinc-100">
            {health?.system.memory.system.usedPercent}
          </div>
        </div>

        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400">Server Uptime</div>
          <div className="text-2xl font-bold text-zinc-100">
            {health ? formatUptime(health.system.uptime.process) : '-'}
          </div>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400">Total Users</div>
          <div className="text-2xl font-bold text-zinc-100">{totalUsers.toLocaleString()}</div>
        </div>

        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400">Daily Active</div>
          <div className="text-2xl font-bold text-blue-400">
            {economy?.users.dailyActive.toLocaleString()}
          </div>
        </div>

        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400">New Today</div>
          <div className="text-2xl font-bold text-green-400">
            +{economy?.users.newToday.toLocaleString()}
          </div>
        </div>

        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400">Avg Level</div>
          <div className="text-2xl font-bold text-purple-400">
            {economy?.economy.averageLevel.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Economy Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400 mb-1">Total Cash in Circulation</div>
          <div className="text-3xl font-bold text-amber-400">
            {economy ? formatCurrency(economy.economy.totalCashInCirculation) : '-'}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Avg: {economy ? formatCurrency(economy.economy.averageCash) : '-'} per player
          </div>
        </div>

        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400 mb-1">Properties Owned</div>
          <div className="text-3xl font-bold text-blue-400">
            {economy?.properties.totalOwned.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Generating {economy ? formatCurrency(economy.properties.hourlyIncome) : '-'}/hr
          </div>
        </div>

        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400 mb-1">Businesses Owned</div>
          <div className="text-3xl font-bold text-green-400">
            {economy?.businesses.totalOwned.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Total revenue: {economy ? formatCurrency(economy.businesses.totalRevenue) : '-'}
          </div>
        </div>
      </div>

      {/* Stock Market & Purchases */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400 mb-1">Stock Market Activity</div>
          <div className="text-3xl font-bold text-purple-400">
            {economy?.stockMarket.totalTrades.toLocaleString()} trades
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Volume: {economy ? formatCurrency(economy.stockMarket.totalVolume) : '-'}
          </div>
        </div>

        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-sm text-zinc-400 mb-1">IAP Revenue</div>
          <div className="text-3xl font-bold text-green-400">
            ${economy?.purchases.totalRevenue.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            {economy?.purchases.totalTransactions} transactions
          </div>
        </div>
      </div>
    </div>
  );
}
