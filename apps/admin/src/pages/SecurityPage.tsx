import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface FailedLogin {
  id: string;
  ipAddress: string;
  attemptedUsername: string;
  createdAt: string;
  userAgent?: string;
}

interface FailedLoginByIP {
  ipAddress: string;
  failedAttempts: number;
}

interface BlockedIP {
  id?: string;
  ipAddress: string;
  reason: string;
  blockedAt?: Date;
  blockedBy?: string;
  isActive?: boolean;
  source?: string;
}

export function SecurityPage() {
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [failedByIP, setFailedByIP] = useState<FailedLoginByIP[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<{ persistent: BlockedIP[]; temporary: BlockedIP[] }>({
    persistent: [],
    temporary: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'failed' | 'blocked' | 'suspicious'>('failed');

  // Block IP form
  const [newBlockIP, setNewBlockIP] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');
  const [blockPersistent, setBlockPersistent] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [failedRes, byIPRes, blockedRes] = await Promise.all([
        api.getFailedLogins(24, 100),
        api.getFailedLoginsByIP(24),
        api.getBlockedIPs(),
      ]);

      if (failedRes.success) setFailedLogins(failedRes.data as FailedLogin[]);
      if (byIPRes.success) setFailedByIP(byIPRes.data as FailedLoginByIP[]);
      if (blockedRes.success) setBlockedIPs(blockedRes.data as typeof blockedIPs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBlockIP = async () => {
    if (!newBlockIP) return;

    const result = await api.blockIP(newBlockIP, newBlockReason, blockPersistent);
    if (result.success) {
      setNewBlockIP('');
      setNewBlockReason('');
      setBlockPersistent(false);
      fetchData();
    }
  };

  const handleUnblockIP = async (ip: string) => {
    if (!confirm(`Unblock IP ${ip}?`)) return;
    const result = await api.unblockIP(ip);
    if (result.success) fetchData();
  };

  const handleQuickBlock = async (ip: string) => {
    const reason = prompt(`Block IP ${ip}. Enter reason:`);
    if (!reason) return;
    const result = await api.blockIP(ip, reason, true);
    if (result.success) fetchData();
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
      <h1 className="text-2xl font-bold text-zinc-100">Security</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Failed Logins (24h)</p>
          <p className="text-2xl font-bold text-red-400">{failedLogins.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Unique IPs (24h)</p>
          <p className="text-2xl font-bold text-orange-400">{failedByIP.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Blocked IPs</p>
          <p className="text-2xl font-bold text-zinc-100">{blockedIPs.persistent.length + blockedIPs.temporary.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Suspicious IPs</p>
          <p className="text-2xl font-bold text-yellow-400">{failedByIP.filter(ip => ip.failedAttempts >= 5).length}</p>
        </div>
      </div>

      {/* Block IP Form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Block IP Address</h2>
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">IP Address</label>
            <input
              type="text"
              value={newBlockIP}
              onChange={(e) => setNewBlockIP(e.target.value)}
              placeholder="192.168.1.1"
              className="w-48 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-zinc-400 mb-2">Reason</label>
            <input
              type="text"
              value={newBlockReason}
              onChange={(e) => setNewBlockReason(e.target.value)}
              placeholder="Reason for blocking..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="persistent"
              checked={blockPersistent}
              onChange={(e) => setBlockPersistent(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700"
            />
            <label htmlFor="persistent" className="text-sm text-zinc-400">Persistent</label>
          </div>
          <button
            onClick={handleBlockIP}
            disabled={!newBlockIP}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            Block IP
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('failed')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'failed'
              ? 'bg-zinc-800 text-purple-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Failed Logins
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'blocked'
              ? 'bg-zinc-800 text-purple-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Blocked IPs
        </button>
        <button
          onClick={() => setActiveTab('suspicious')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'suspicious'
              ? 'bg-zinc-800 text-purple-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Suspicious Activity
        </button>
      </div>

      {/* Failed Logins Table */}
      {activeTab === 'failed' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="p-4 font-medium">Time</th>
                <th className="p-4 font-medium">IP Address</th>
                <th className="p-4 font-medium">Username Attempted</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {failedLogins.map((login) => (
                <tr key={login.id} className="text-zinc-300">
                  <td className="p-4 text-sm text-zinc-500">
                    {new Date(login.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 font-mono">{login.ipAddress}</td>
                  <td className="p-4">{login.attemptedUsername}</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleQuickBlock(login.ipAddress)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Block IP
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Blocked IPs Table */}
      {activeTab === 'blocked' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="p-4 font-medium">IP Address</th>
                <th className="p-4 font-medium">Reason</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Blocked By</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {[...blockedIPs.persistent, ...blockedIPs.temporary].map((ip, i) => (
                <tr key={ip.ipAddress + i} className="text-zinc-300">
                  <td className="p-4 font-mono">{ip.ipAddress}</td>
                  <td className="p-4 text-sm">{ip.reason}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      ip.source === 'memory'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {ip.source === 'memory' ? 'Temporary' : 'Persistent'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-500">{ip.blockedBy || 'Admin'}</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleUnblockIP(ip.ipAddress)}
                      className="text-xs text-green-400 hover:text-green-300"
                    >
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
              {blockedIPs.persistent.length === 0 && blockedIPs.temporary.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    No blocked IPs
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Suspicious Activity */}
      {activeTab === 'suspicious' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold text-zinc-100">IPs with High Failed Login Counts</h3>
            <p className="text-sm text-zinc-500">IPs with 5+ failed logins in the last 24 hours</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="p-4 font-medium">IP Address</th>
                <th className="p-4 font-medium">Failed Attempts</th>
                <th className="p-4 font-medium">Risk Level</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {failedByIP
                .filter(ip => ip.failedAttempts >= 5)
                .sort((a, b) => b.failedAttempts - a.failedAttempts)
                .map((ip) => (
                  <tr key={ip.ipAddress} className="text-zinc-300">
                    <td className="p-4 font-mono">{ip.ipAddress}</td>
                    <td className="p-4 font-bold text-red-400">{ip.failedAttempts}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        ip.failedAttempts >= 20 ? 'bg-red-500/20 text-red-400' :
                        ip.failedAttempts >= 10 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {ip.failedAttempts >= 20 ? 'Critical' : ip.failedAttempts >= 10 ? 'High' : 'Medium'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleQuickBlock(ip.ipAddress)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Block IP
                      </button>
                    </td>
                  </tr>
                ))}
              {failedByIP.filter(ip => ip.failedAttempts >= 5).length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    No suspicious activity detected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
