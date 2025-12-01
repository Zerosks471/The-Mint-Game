import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface HealthData {
  status: string;
  timestamp: string;
  serverStartedAt: string;
  responseTime: number;
  services: {
    database: {
      status: string;
      latency: number;
    };
  };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    uptime: {
      process: number;
      system: number;
    };
    memory: {
      process: {
        heapUsed: string;
        heapTotal: string;
        rss: string;
      };
      system: {
        total: string;
        free: string;
        usedPercent: string;
      };
    };
    cpu: {
      cores: number;
      model: string;
      loadAverage: {
        '1min': string;
        '5min': string;
        '15min': string;
      };
    };
  };
}

interface DatabaseStats {
  tables: Record<string, number>;
  connection: { status: string };
}

interface Metrics {
  activity: {
    dailyActiveUsers: number;
    hourlyActiveUsers: number;
    newUsersToday: number;
    tradesLast24h: number;
  };
}

export function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [healthRes, dbRes, metricsRes] = await Promise.all([
      api.getHealth(),
      api.getDatabaseStats(),
      api.getMetrics(),
    ]);

    if (healthRes.success) setHealth(healthRes.data as HealthData);
    if (dbRes.success) setDbStats(dbRes.data as DatabaseStats);
    if (metricsRes.success) setMetrics(metricsRes.data as Metrics);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${mins}m ${secs}s`;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">System Health</h1>
          <p className="text-zinc-500">Real-time system monitoring</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center gap-2"
        >
          <span>🔄</span>
          Refresh
        </button>
      </div>

      {/* Status Banner */}
      <div className={`p-6 rounded-xl border ${
        health?.status === 'healthy'
          ? 'bg-green-500/10 border-green-500/20'
          : 'bg-red-500/10 border-red-500/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
              health?.status === 'healthy' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {health?.status === 'healthy' ? '✓' : '✗'}
            </div>
            <div>
              <div className={`text-2xl font-bold ${
                health?.status === 'healthy' ? 'text-green-400' : 'text-red-400'
              }`}>
                System {health?.status === 'healthy' ? 'Healthy' : 'Degraded'}
              </div>
              <div className="text-zinc-400">
                Last checked: {health ? new Date(health.timestamp).toLocaleTimeString() : '-'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-zinc-400">Response Time</div>
            <div className="text-2xl font-mono text-zinc-100">{health?.responseTime}ms</div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">Database</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-zinc-400">Status</span>
              <span className={health?.services.database.status === 'healthy' ? 'text-green-400' : 'text-red-400'}>
                {health?.services.database.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Latency</span>
              <span className="text-zinc-100 font-mono">{health?.services.database.latency}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Connection</span>
              <span className="text-green-400">{dbStats?.connection.status}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">Activity Metrics</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-zinc-400">Daily Active Users</span>
              <span className="text-zinc-100 font-mono">{metrics?.activity.dailyActiveUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Hourly Active Users</span>
              <span className="text-zinc-100 font-mono">{metrics?.activity.hourlyActiveUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">New Users Today</span>
              <span className="text-green-400 font-mono">+{metrics?.activity.newUsersToday}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Trades (24h)</span>
              <span className="text-zinc-100 font-mono">{metrics?.activity.tradesLast24h}</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">CPU</h2>
          <div className="space-y-3">
            <div className="text-sm text-zinc-400 truncate">{health?.system.cpu.model}</div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Cores</span>
              <span className="text-zinc-100">{health?.system.cpu.cores}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Load (1m)</span>
              <span className="text-zinc-100">{health?.system.cpu.loadAverage['1min']}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Load (5m)</span>
              <span className="text-zinc-100">{health?.system.cpu.loadAverage['5min']}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">Memory</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-zinc-400">System Used</span>
              <span className="text-zinc-100">{health?.system.memory.system.usedPercent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total</span>
              <span className="text-zinc-100">{health?.system.memory.system.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Free</span>
              <span className="text-zinc-100">{health?.system.memory.system.free}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Process Heap</span>
              <span className="text-zinc-100">{health?.system.memory.process.heapUsed}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">Uptime</h2>
          <div className="space-y-3">
            <div>
              <div className="text-zinc-400 text-sm">Process</div>
              <div className="text-zinc-100 font-mono">{health ? formatUptime(health.system.uptime.process) : '-'}</div>
            </div>
            <div>
              <div className="text-zinc-400 text-sm">System</div>
              <div className="text-zinc-100 font-mono">{health ? formatUptime(health.system.uptime.system) : '-'}</div>
            </div>
            <div>
              <div className="text-zinc-400 text-sm">Started At</div>
              <div className="text-zinc-100 text-xs">{health ? new Date(health.serverStartedAt).toLocaleString() : '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Database Tables */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">Database Tables</h2>
        <div className="grid grid-cols-6 gap-4">
          {dbStats && Object.entries(dbStats.tables).map(([table, count]) => (
            <div key={table} className="p-3 bg-zinc-800 rounded-lg">
              <div className="text-xs text-zinc-400 capitalize">{table.replace(/([A-Z])/g, ' $1').trim()}</div>
              <div className="text-lg font-mono text-zinc-100">{count.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* System Info Footer */}
      <div className="flex gap-4 text-sm text-zinc-500">
        <span>Platform: {health?.system.platform}</span>
        <span>•</span>
        <span>Arch: {health?.system.arch}</span>
        <span>•</span>
        <span>Node: {health?.system.nodeVersion}</span>
      </div>
    </div>
  );
}
