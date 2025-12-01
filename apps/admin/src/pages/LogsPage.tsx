import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type LogTab = 'audit' | 'activity' | 'trades' | 'server';

interface AuditLog {
  id: string;
  timestamp: string;
  adminUsername: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ip: string;
  responseStatus?: number;
  duration?: number;
}

interface ActivityLog {
  id: string;
  user: { id: string; username: string };
  deviceType: string | null;
  ipAddress: string | null;
  isActive: boolean;
  lastActivityAt: string;
  createdAt: string;
}

interface TradeLogs {
  id: string;
  user: { id: string; username: string };
  ticker: string;
  type: string;
  shares: number;
  pricePerShare: string;
  totalAmount: string;
  createdAt: string;
}

export function LogsPage() {
  const [tab, setTab] = useState<LogTab>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [tradeLogs, setTradeLogs] = useState<TradeLogs[]>([]);
  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      switch (tab) {
        case 'audit':
          const auditRes = await api.getAuditLogs({ limit: 50 });
          if (auditRes.success) setAuditLogs((auditRes.data as any).logs || []);
          break;
        case 'activity':
          const activityRes = await api.getActivityLogs(50);
          if (activityRes.success) setActivityLogs(activityRes.data as ActivityLog[]);
          break;
        case 'trades':
          const tradesRes = await api.getStockTrades(50);
          if (tradesRes.success) setTradeLogs(tradesRes.data as TradeLogs[]);
          break;
        case 'server':
          const serverRes = await api.getServerLogs('audit', 100);
          if (serverRes.success) setServerLogs((serverRes.data as any).logs || []);
          break;
      }
      setLoading(false);
    }
    fetchLogs();
  }, [tab]);

  const tabs = [
    { id: 'audit' as LogTab, label: 'Admin Audit', icon: '🔐' },
    { id: 'activity' as LogTab, label: 'User Activity', icon: '👤' },
    { id: 'trades' as LogTab, label: 'Stock Trades', icon: '📈' },
    { id: 'server' as LogTab, label: 'Server Logs', icon: '🖥️' },
  ];

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'text-blue-400';
      case 'POST': return 'text-green-400';
      case 'PUT':
      case 'PATCH': return 'text-amber-400';
      case 'DELETE': return 'text-red-400';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Logs</h1>
        <p className="text-zinc-500">System and user activity logs</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              tab === t.id
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : (
          <div className="max-h-[600px] overflow-auto">
            {tab === 'audit' && (
              <table className="w-full">
                <thead className="bg-zinc-800/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Time</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Admin</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Method</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Path</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Status</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 font-mono text-sm">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-400 text-xs">{formatTime(log.timestamp)}</td>
                      <td className="px-4 py-2 text-zinc-100">{log.adminUsername}</td>
                      <td className={`px-4 py-2 ${getMethodColor(log.method)}`}>{log.method}</td>
                      <td className="px-4 py-2 text-zinc-300 max-w-xs truncate">{log.path}</td>
                      <td className={`px-4 py-2 ${log.responseStatus && log.responseStatus < 400 ? 'text-green-400' : 'text-red-400'}`}>
                        {log.responseStatus}
                      </td>
                      <td className="px-4 py-2 text-zinc-400">{log.duration}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'activity' && (
              <table className="w-full">
                <thead className="bg-zinc-800/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">User</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Device</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">IP</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Status</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-sm">
                  {activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-100">{log.user.username}</td>
                      <td className="px-4 py-2 text-zinc-400">{log.deviceType || 'Unknown'}</td>
                      <td className="px-4 py-2 text-zinc-400 font-mono text-xs">{log.ipAddress || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${log.isActive ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                          {log.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-zinc-400 text-xs">{formatTime(log.lastActivityAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'trades' && (
              <table className="w-full">
                <thead className="bg-zinc-800/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Time</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">User</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Ticker</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Type</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Shares</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Price</th>
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-sm">
                  {tradeLogs.map((trade) => (
                    <tr key={trade.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-400 text-xs">{formatTime(trade.createdAt)}</td>
                      <td className="px-4 py-2 text-zinc-100">{trade.user.username}</td>
                      <td className="px-4 py-2 font-mono text-purple-400">{trade.ticker}</td>
                      <td className={`px-4 py-2 ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.type.toUpperCase()}
                      </td>
                      <td className="px-4 py-2 text-zinc-300">{trade.shares.toLocaleString()}</td>
                      <td className="px-4 py-2 text-zinc-300 font-mono">${parseFloat(trade.pricePerShare).toFixed(2)}</td>
                      <td className="px-4 py-2 text-amber-400 font-mono">${parseFloat(trade.totalAmount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'server' && (
              <div className="p-4 space-y-2 font-mono text-xs">
                {serverLogs.length === 0 ? (
                  <div className="text-zinc-500 text-center py-8">No server logs available</div>
                ) : (
                  serverLogs.map((log, i) => (
                    <div key={i} className="p-2 bg-zinc-800 rounded text-zinc-300 whitespace-pre-wrap">
                      {typeof log === 'object' ? JSON.stringify(log, null, 2) : log}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
