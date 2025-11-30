import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineData, Time, AreaSeries } from 'lightweight-charts';
import { gameApi, EarningsSnapshot, EarningsSummary } from '../api/game';
import { formatCurrency } from '@mint/utils';

type ChartType = 'netWorth' | 'cash' | 'income';
type TimeRange = '1H' | '24H' | '7D' | '30D' | 'ALL';

export function StatsPage() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

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
          // If no history exists, create initial snapshot
          if (historyRes.data.length === 0) {
            await gameApi.createSnapshot('hourly');
            // Refetch after creating
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

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a2e' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2d2d44' },
        horzLines: { color: '#2d2d44' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2d2d44',
      },
      rightPriceScale: {
        borderColor: '#2d2d44',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
      },
    });

    chartRef.current = chart;

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#10b981',
      topColor: 'rgba(16, 185, 129, 0.4)',
      bottomColor: 'rgba(16, 185, 129, 0.0)',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => formatCurrency(price),
      },
    });

    seriesRef.current = series;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || history.length === 0) return;

    // Filter by time range
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

    // Map to chart data
    const chartData: LineData[] = filteredHistory.map((snapshot) => {
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
      return {
        time: (new Date(snapshot.timestamp).getTime() / 1000) as Time,
        value,
      };
    });

    // Update series colors based on chart type
    const colors = {
      netWorth: { line: '#10b981', top: 'rgba(16, 185, 129, 0.4)' },
      cash: { line: '#6366f1', top: 'rgba(99, 102, 241, 0.4)' },
      income: { line: '#f59e0b', top: 'rgba(245, 158, 11, 0.4)' },
    };

    seriesRef.current.applyOptions({
      lineColor: colors[chartType].line,
      topColor: colors[chartType].top,
    });

    seriesRef.current.setData(chartData);

    if (chartRef.current && chartData.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [history, chartType, timeRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Stats</h1>
        <p className="text-gray-600">Track your empire's growth over time</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="Net Worth"
            value={formatCurrency(parseFloat(summary.currentNetWorth))}
            icon="💰"
            color="green"
          />
          <SummaryCard
            label="Cash"
            value={formatCurrency(parseFloat(summary.currentCash))}
            icon="💵"
            color="blue"
          />
          <SummaryCard
            label="Income/Hour"
            value={`+${formatCurrency(parseFloat(summary.currentIncomePerHour))}`}
            icon="📈"
            color="amber"
          />
          <SummaryCard
            label="Lifetime Earnings"
            value={formatCurrency(parseFloat(summary.lifetimeEarnings))}
            icon="🏆"
            color="purple"
          />
        </div>
      )}

      {/* Chart */}
      <div className="bg-gray-900 rounded-xl p-4 shadow-lg">
        {/* Chart Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          {/* Chart Type Selector */}
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            {(['netWorth', 'cash', 'income'] as ChartType[]).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  chartType === type
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {type === 'netWorth' ? 'Net Worth' : type === 'cash' ? 'Cash' : 'Income/hr'}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            {(['1H', '24H', '7D', '30D', 'ALL'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Container */}
        <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />

        {/* Chart Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                chartType === 'netWorth'
                  ? 'bg-emerald-500'
                  : chartType === 'cash'
                  ? 'bg-indigo-500'
                  : 'bg-amber-500'
              }`}
            />
            <span>
              {chartType === 'netWorth'
                ? 'Net Worth'
                : chartType === 'cash'
                ? 'Cash Balance'
                : 'Income Rate'}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      {summary && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Peak Stats */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Peak Performance</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Highest Net Worth</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(parseFloat(summary.peakNetWorth))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Peak Income/Hour</span>
                <span className="font-bold text-amber-600">
                  +{formatCurrency(parseFloat(summary.peakIncome))}/hr
                </span>
              </div>
            </div>
          </div>

          {/* Portfolio */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Portfolio</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Properties Owned</span>
                <span className="font-bold text-blue-600">{summary.propertiesOwned}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Businesses Owned</span>
                <span className="font-bold text-purple-600">{summary.businessesOwned}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Data Points</span>
                <span className="font-bold text-gray-600">{summary.snapshotCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {history.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No History Yet</h3>
          <p className="text-gray-600">
            Your earnings history will appear here as you play. Keep collecting income to see your
            progress over time!
          </p>
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  icon: string;
  color: 'green' | 'blue' | 'amber' | 'purple';
}

function SummaryCard({ label, value, icon, color }: SummaryCardProps) {
  const colorClasses = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className={`rounded-xl border-2 p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-sm opacity-75">{label}</p>
    </div>
  );
}
