import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface SystemStatus {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceEndTime: string | null;
  stats: {
    totalUsers: number;
    activeSessions: number;
  };
}

interface OnlineUser {
  id: string;
  username: string;
  displayName: string;
  isPremium: boolean;
  sessionId: string;
  deviceType: string;
  lastActivityAt: string;
}

export function SystemPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Maintenance form
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceEndTime, setMaintenanceEndTime] = useState('');

  // Announcement form
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementSending, setAnnouncementSending] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, onlineRes] = await Promise.all([
        api.getSystemStatus(),
        api.getOnlineUsers(50),
      ]);

      if (statusRes.success && statusRes.data) {
        const data = statusRes.data as SystemStatus;
        setStatus(data);
        setMaintenanceEnabled(data.maintenanceMode);
        setMaintenanceMessage(data.maintenanceMessage);
        setMaintenanceEndTime(data.maintenanceEndTime || '');
      }

      if (onlineRes.success && onlineRes.data) {
        setOnlineUsers((onlineRes.data as { users: OnlineUser[] }).users || []);
      }
    } catch {
      setError('Failed to load system status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMaintenanceToggle = async () => {
    const result = await api.setMaintenanceMode(
      !maintenanceEnabled,
      maintenanceMessage,
      maintenanceEndTime || undefined
    );

    if (result.success) {
      setMaintenanceEnabled(!maintenanceEnabled);
      fetchData();
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle || !announcementMessage) return;

    setAnnouncementSending(true);
    const result = await api.sendAnnouncement(announcementTitle, announcementMessage);
    setAnnouncementSending(false);

    if (result.success) {
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      alert(`Announcement sent to ${(result.data as { sent: number }).sent} users`);
    }
  };

  const handleForceLogoutAll = async () => {
    if (!confirm('Are you sure you want to log out ALL users? This cannot be undone.')) return;

    const reason = prompt('Enter reason for force logout:');
    const result = await api.forceLogoutAll(reason || undefined);

    if (result.success) {
      alert(`${(result.data as { sessionsRevoked: number }).sessionsRevoked} sessions revoked`);
      fetchData();
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">System Management</h1>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-zinc-100">{status?.stats.totalUsers.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Active Sessions</p>
          <p className="text-2xl font-bold text-green-400">{status?.stats.activeSessions.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Maintenance Mode</p>
          <p className={`text-2xl font-bold ${maintenanceEnabled ? 'text-red-400' : 'text-green-400'}`}>
            {maintenanceEnabled ? 'ACTIVE' : 'OFF'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Mode */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Maintenance Mode</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Status Message</label>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                rows={3}
                placeholder="The game is currently under maintenance..."
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Expected End Time (optional)</label>
              <input
                type="datetime-local"
                value={maintenanceEndTime}
                onChange={(e) => setMaintenanceEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleMaintenanceToggle}
              className={`w-full py-2 rounded-lg font-medium transition-colors ${
                maintenanceEnabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {maintenanceEnabled ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
            </button>
          </div>
        </div>

        {/* Send Announcement */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Send Announcement</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Title</label>
              <input
                type="text"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                placeholder="Important Update"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Message</label>
              <textarea
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                rows={4}
                placeholder="Write your announcement message..."
              />
            </div>

            <button
              onClick={handleSendAnnouncement}
              disabled={announcementSending || !announcementTitle || !announcementMessage}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {announcementSending ? 'Sending...' : 'Send to All Users'}
            </button>
          </div>
        </div>
      </div>

      {/* Online Users */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Online Users</h2>
          <span className="text-sm text-zinc-500">{onlineUsers.length} users online</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Device</th>
                <th className="pb-3 font-medium">Last Activity</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {onlineUsers.map((user) => (
                <tr key={user.sessionId} className="text-zinc-300">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      {user.isPremium && <span className="text-xs text-yellow-400">PRO</span>}
                    </div>
                  </td>
                  <td className="py-3 text-zinc-500">{user.deviceType || 'Unknown'}</td>
                  <td className="py-3 text-zinc-500">
                    {new Date(user.lastActivityAt).toLocaleString()}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => api.forceLogoutUser(user.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Force Logout
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
        <p className="text-zinc-400 text-sm mb-4">
          These actions are irreversible. Use with extreme caution.
        </p>
        <button
          onClick={handleForceLogoutAll}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          Force Logout All Users
        </button>
      </div>
    </div>
  );
}
