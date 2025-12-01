import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface AnalyticsOverview {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    activeToday: number;
    activeThisWeek: number;
    premium: number;
  };
  revenue: {
    total: string;
  };
}

interface RetentionData {
  day1Retention: number;
  day30Retention: number;
  newUsersAnalyzed: number;
  cohortSize: number;
}

interface EconomyData {
  totalCashInCirculation: string;
  averagePlayerCash: string;
  richestPlayerCash: string;
  totalProperties: number;
  totalBusinesses: number;
  totalStockHoldings: number;
  averagePrestigeLevel: number;
  maxPrestigeLevel: number;
}

interface LeaderboardEntry {
  user: { id: string; username: string; displayName: string };
  cash?: string;
  count?: number;
  prestigeLevel?: number;
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [retention, setRetention] = useState<RetentionData | null>(null);
  const [economy, setEconomy] = useState<EconomyData | null>(null);
  const [leaderboard, setLeaderboard] = useState<{
    richest: LeaderboardEntry[];
    mostProperties: LeaderboardEntry[];
    highestPrestige: LeaderboardEntry[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, retentionRes, economyRes, leaderboardRes] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getRetentionStats(),
        api.getEconomyStats(),
        api.getLeaderboard(10),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data as AnalyticsOverview);
      if (retentionRes.success) setRetention(retentionRes.data as RetentionData);
      if (economyRes.success) setEconomy(economyRes.data as EconomyData);
      if (leaderboardRes.success) setLeaderboard(leaderboardRes.data as typeof leaderboard);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">Analytics</h1>

      {/* User Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-zinc-100">{overview?.users.total.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">New Today</p>
          <p className="text-2xl font-bold text-green-400">+{overview?.users.newToday.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Active Today</p>
          <p className="text-2xl font-bold text-blue-400">{overview?.users.activeToday.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Premium Users</p>
          <p className="text-2xl font-bold text-yellow-400">{overview?.users.premium.toLocaleString()}</p>
        </div>
      </div>

      {/* Retention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">User Retention</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-400">Day 1 Retention</span>
                <span className="text-zinc-100 font-medium">{retention?.day1Retention.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${retention?.day1Retention || 0}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">Based on {retention?.newUsersAnalyzed} new users</p>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-400">Day 30 Retention</span>
                <span className="text-zinc-100 font-medium">{retention?.day30Retention.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${retention?.day30Retention || 0}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">Cohort size: {retention?.cohortSize}</p>
            </div>
          </div>
        </div>

        {/* Growth Stats */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Growth</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-sm">This Week</p>
              <p className="text-xl font-bold text-green-400">+{overview?.users.newThisWeek}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm">This Month</p>
              <p className="text-xl font-bold text-green-400">+{overview?.users.newThisMonth}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Active This Week</p>
              <p className="text-xl font-bold text-blue-400">{overview?.users.activeThisWeek}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Total Revenue</p>
              <p className="text-xl font-bold text-yellow-400">{formatCurrency(overview?.revenue.total || '0')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Economy Stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Economy Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-zinc-500 text-sm">Total Cash in Circulation</p>
            <p className="text-xl font-bold text-green-400">{formatCurrency(economy?.totalCashInCirculation || '0')}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Average Player Cash</p>
            <p className="text-xl font-bold text-zinc-100">{formatCurrency(economy?.averagePlayerCash || '0')}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Richest Player</p>
            <p className="text-xl font-bold text-yellow-400">{formatCurrency(economy?.richestPlayerCash || '0')}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Max Prestige Level</p>
            <p className="text-xl font-bold text-purple-400">{economy?.maxPrestigeLevel || 0}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-zinc-800">
          <div>
            <p className="text-zinc-500 text-sm">Total Properties</p>
            <p className="text-xl font-bold text-zinc-100">{economy?.totalProperties.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Total Businesses</p>
            <p className="text-xl font-bold text-zinc-100">{economy?.totalBusinesses.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Stock Holdings</p>
            <p className="text-xl font-bold text-zinc-100">{economy?.totalStockHoldings.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Richest */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Richest Players</h2>
          <div className="space-y-2">
            {leaderboard?.richest.map((entry, i) => (
              <div key={entry.user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 w-6">{i + 1}.</span>
                  <span className="text-zinc-100">{entry.user.username}</span>
                </div>
                <span className="text-green-400 font-medium">{formatCurrency(entry.cash || '0')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Properties */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Most Properties</h2>
          <div className="space-y-2">
            {leaderboard?.mostProperties.map((entry, i) => (
              <div key={entry.user?.id || i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 w-6">{i + 1}.</span>
                  <span className="text-zinc-100">{entry.user?.username || 'Unknown'}</span>
                </div>
                <span className="text-blue-400 font-medium">{entry.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Prestige */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Highest Prestige</h2>
          <div className="space-y-2">
            {leaderboard?.highestPrestige.map((entry, i) => (
              <div key={entry.user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 w-6">{i + 1}.</span>
                  <span className="text-zinc-100">{entry.user.username}</span>
                </div>
                <span className="text-purple-400 font-medium">Lv. {entry.prestigeLevel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
