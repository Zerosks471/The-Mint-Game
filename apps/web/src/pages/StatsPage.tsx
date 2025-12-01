import { useEffect, useState, useMemo } from 'react';
import { gameApi, EarningsSnapshot, EarningsSummary } from '../api/game';
import { createPortalSession } from '../api/subscriptions';
import { formatCurrency } from '@mint/utils';
import { useAuthStore } from '../stores/authStore';
import { PremiumBadge } from '../components/PremiumBadge';
import { UpgradeButton } from '../components/UpgradeButton';
import { StatCard, GradientChart, DonutChart, type ChartColor } from '../components/ui';

type ChartType = 'netWorth' | 'cash' | 'income';
type TimeRange = '1H' | '24H' | '7D' | '30D' | 'ALL';

const chartTypeConfig: Record<ChartType, { label: string; color: ChartColor }> = {
  netWorth: { label: 'Net Worth', color: 'mint' },
  cash: { label: 'Cash', color: 'blue' },
  income: { label: 'Income/hr', color: 'cyan' },
};

export function StatsPage() {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<EarningsSnapshot[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<ChartType>('netWorth');
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [historyRes, summaryRes] = await Promise.all([
          gameApi.getEarningsHistory({ type: 'hourly', limit: 500 }),
          gameApi.getEarningsSummary(),
        ]);

        if (historyRes.success && historyRes.data) {
          if (historyRes.data.length === 0) {
            await gameApi.createSnapshot('hourly');
            const [refetchRes, refetchSummary] = await Promise.all([
              gameApi.getEarningsHistory({ type: 'hourly', limit: 500 }),
              gameApi.getEarningsSummary(),
            ]);
            if (refetchRes.success && refetchRes.data) {
              setHistory(refetchRes.data);
            }
            if (refetchSummary.success && refetchSummary.data) {
              setSummary(refetchSummary.data);
            }
          } else {
            setHistory(historyRes.data);
            if (summaryRes.success && summaryRes.data) {
              setSummary(summaryRes.data);
            }
          }
        } else if (summaryRes.success && summaryRes.data) {
          setSummary(summaryRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Process chart data
  const chartData = useMemo(() => {
    if (history.length === 0) return [];

    const now = new Date();
    let startTime: Date;

    switch (timeRange) {
      case '1H':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24H':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7D':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30D':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(0);
    }

    const filteredHistory = history.filter(
      (snapshot) => new Date(snapshot.timestamp) >= startTime
    );

    return filteredHistory.map((snapshot) => {
      let value: number;
      switch (chartType) {
        case 'netWorth':
          value = parseFloat(snapshot.netWorth);
          break;
        case 'cash':
          value = parseFloat(snapshot.totalCash);
          break;
        case 'income':
          value = parseFloat(snapshot.incomePerHour);
          break;
      }

      const date = new Date(snapshot.timestamp);
      const name = timeRange === '1H' || timeRange === '24H'
        ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return { name, value };
    });
  }, [history, chartType, timeRange]);

  // Calculate progress towards next level (mock data for now)
  const levelProgress = useMemo(() => {
    if (!summary) return 0;
    // Mock calculation - in real app this would come from backend
    const propertiesCount = typeof summary.propertiesOwned === 'string' ? parseInt(summary.propertiesOwned) : summary.propertiesOwned;
    const businessesCount = typeof summary.businessesOwned === 'string' ? parseInt(summary.businessesOwned) : summary.businessesOwned;
    const currentLevel = propertiesCount + businessesCount;
    return Math.min((currentLevel % 10) * 10, 100);
  }, [summary]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Financial Stats</h1>
        <p className="text-zinc-500">Track your empire's growth over time</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon="💰"
            value={formatCurrency(parseFloat(summary.currentNetWorth))}
            label="Net Worth"
            color="mint"
          />
          <StatCard
            icon="💵"
            value={formatCurrency(parseFloat(summary.currentCash))}
            label="Cash"
            color="blue"
          />
          <StatCard
            icon="📈"
            value={`+${formatCurrency(parseFloat(summary.currentIncomePerHour))}`}
            label="Income/Hour"
            color="cyan"
          />
          <StatCard
            icon="🏆"
            value={formatCurrency(parseFloat(summary.lifetimeEarnings))}
            label="Lifetime Earnings"
            color="amber"
          />
        </div>
      )}

      {/* Main Chart */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        {/* Chart Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Chart Type Selector */}
          <div className="flex space-x-1 bg-dark-elevated rounded-xl p-1">
            {(['netWorth', 'cash', 'income'] as ChartType[]).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  chartType === type
                    ? `bg-${chartTypeConfig[type].color}/20 text-${chartTypeConfig[type].color} border border-${chartTypeConfig[type].color}/30`
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-dark-border'
                }`}
              >
                {chartTypeConfig[type].label}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          <div className="flex space-x-1 bg-dark-elevated rounded-xl p-1">
            {(['1H', '24H', '7D', '30D', 'ALL'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-mint/20 text-mint border border-mint/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-dark-border'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <GradientChart
            data={chartData}
            color={chartTypeConfig[chartType].color}
            height={350}
            showGrid={true}
            showXAxis={true}
            showYAxis={true}
            showTooltip={true}
            formatValue={(value) => formatCurrency(value)}
          />
        ) : (
          <div className="h-[350px] flex items-center justify-center text-zinc-500">
            No data available for this time range
          </div>
        )}

        {/* Chart Legend */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-400">
          <div className={`w-3 h-3 rounded-full bg-${chartTypeConfig[chartType].color}`} />
          <span>{chartTypeConfig[chartType].label}</span>
        </div>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Properties Chart */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🏢</span>
            <span className="font-medium text-zinc-200">Properties</span>
          </div>
          <p className="text-2xl font-bold text-blue font-mono mb-2">{summary?.propertiesOwned || 0}</p>
          <p className="text-xs text-zinc-500">Total owned</p>
        </div>

        {/* Businesses Chart */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💼</span>
            <span className="font-medium text-zinc-200">Businesses</span>
          </div>
          <p className="text-2xl font-bold text-purple font-mono mb-2">{summary?.businessesOwned || 0}</p>
          <p className="text-xs text-zinc-500">Active ventures</p>
        </div>

        {/* Level Progress */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 flex flex-col items-center justify-center">
          <DonutChart
            value={levelProgress}
            color="pink"
            size={80}
            strokeWidth={8}
            label={`${levelProgress}%`}
            sublabel="Progress"
          />
          <p className="text-xs text-zinc-500 mt-2">To next level</p>
        </div>

        {/* Data Points */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📊</span>
            <span className="font-medium text-zinc-200">Data Points</span>
          </div>
          <p className="text-2xl font-bold text-cyan font-mono mb-2">{summary?.snapshotCount || 0}</p>
          <p className="text-xs text-zinc-500">Snapshots recorded</p>
        </div>
      </div>

      {/* Peak Performance & Portfolio */}
      {summary && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Peak Stats */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <span>⚡</span> Peak Performance
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-dark-border">
                <span className="text-zinc-400">Highest Net Worth</span>
                <span className="font-bold text-mint font-mono">
                  {formatCurrency(parseFloat(summary.peakNetWorth))}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-400">Peak Income/Hour</span>
                <span className="font-bold text-cyan font-mono">
                  +{formatCurrency(parseFloat(summary.peakIncome))}/hr
                </span>
              </div>
            </div>
          </div>

          {/* Portfolio Breakdown */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <span>📁</span> Portfolio
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-dark-border">
                <span className="text-zinc-400">Properties Owned</span>
                <span className="font-bold text-blue font-mono">{summary.propertiesOwned}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dark-border">
                <span className="text-zinc-400">Businesses Owned</span>
                <span className="font-bold text-purple font-mono">{summary.businessesOwned}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-400">History Snapshots</span>
                <span className="font-bold text-zinc-300 font-mono">{summary.snapshotCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Status Section */}
      {user?.isPremium ? (
        <div className="bg-gradient-to-r from-amber/10 to-purple/10 border border-amber/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <PremiumBadge size="md" />
              <h2 className="text-lg font-bold text-zinc-100">Premium Benefits Active</h2>
            </div>
            <button
              onClick={async () => {
                try {
                  const { portalUrl } = await createPortalSession();
                  window.location.href = portalUrl;
                } catch {
                  alert('Failed to open billing portal');
                }
              }}
              className="px-4 py-2 text-sm font-medium text-amber bg-dark-elevated border border-amber/30 rounded-xl hover:bg-amber/10 transition-colors"
            >
              Manage Subscription
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: '💰', title: '+10% Income Bonus', desc: 'Applied to all earnings' },
              { icon: '🌙', title: '24hr Offline Cap', desc: 'Earn while you sleep' },
              { icon: '⭐', title: 'Premium Badge', desc: 'Show off your status' },
              { icon: '🪙', title: '500 Mint Coins/Month', desc: 'Premium currency' },
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 bg-dark-elevated/50 rounded-xl p-3">
                <span className="text-2xl">{benefit.icon}</span>
                <div>
                  <p className="font-semibold text-zinc-100 text-sm">{benefit.title}</p>
                  <p className="text-xs text-zinc-500">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-100 mb-2">Upgrade to Premium</h2>
              <p className="text-zinc-400 mb-4">
                Get +10% income, 24hr offline cap, 500 Mint Coins monthly, and an exclusive badge.
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1"><span>💰</span> +10% Income</span>
                <span className="flex items-center gap-1"><span>🌙</span> 24hr Offline</span>
                <span className="flex items-center gap-1"><span>⭐</span> Premium Badge</span>
                <span className="flex items-center gap-1"><span>🪙</span> 500 Coins/mo</span>
              </div>
            </div>
            <div className="flex-shrink-0 ml-4">
              <UpgradeButton size="md" />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {history.length === 0 && (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-zinc-100 mb-2">No History Yet</h3>
          <p className="text-zinc-500">
            Your earnings history will appear here as you play. Keep collecting income to see your
            progress over time!
          </p>
        </div>
      )}
    </div>
  );
}
