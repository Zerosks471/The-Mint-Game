import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  accountStatus: string;
  isAdmin: boolean;
  isPremium: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  playerStats: {
    cash: string;
    playerLevel: number;
    currentPhase: number;
  } | null;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const result = await api.getUsers({
      page,
      limit: 20,
      search: search || undefined,
      status: statusFilter || undefined,
    });

    if (result.success && result.data) {
      const data = result.data as any;
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    const reason = prompt('Enter reason for status change:');
    if (!reason && newStatus !== 'active') return;

    const result = await api.updateUserStatus(userId, newStatus, reason || undefined);
    if (result.success) {
      fetchUsers();
      setSelectedUser(null);
    }
  };

  const formatCash = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/10';
      case 'suspended': return 'text-amber-400 bg-amber-500/10';
      case 'banned': return 'text-red-400 bg-red-500/10';
      default: return 'text-zinc-400 bg-zinc-500/10';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Users</h1>
        <p className="text-zinc-500">Manage player accounts</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username or email..."
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Level</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Cash</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Joined</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-100">{user.username}</span>
                        {user.isAdmin && (
                          <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                            Admin
                          </span>
                        )}
                        {user.isPremium && (
                          <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                            Premium
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user.accountStatus)}`}>
                      {user.accountStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {user.playerStats?.playerLevel || '-'}
                  </td>
                  <td className="px-4 py-3 text-amber-400 font-mono text-sm">
                    {user.playerStats ? formatCash(user.playerStats.cash) : '-'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="px-3 py-1 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 rounded-lg"
        >
          Previous
        </button>
        <span className="text-zinc-400">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 rounded-lg"
        >
          Next
        </button>
      </div>

      {/* User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-zinc-100">User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-zinc-500">Username</div>
                  <div className="text-zinc-100">{selectedUser.username}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Email</div>
                  <div className="text-zinc-100">{selectedUser.email}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Status</div>
                  <div className={getStatusColor(selectedUser.accountStatus) + ' inline-block px-2 py-0.5 rounded'}>
                    {selectedUser.accountStatus}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">User ID</div>
                  <div className="text-zinc-400 text-xs font-mono">{selectedUser.id}</div>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <div className="text-sm font-medium text-zinc-300 mb-2">Actions</div>
                <div className="flex gap-2 flex-wrap">
                  {selectedUser.accountStatus !== 'active' && (
                    <button
                      onClick={() => handleStatusChange(selectedUser.id, 'active')}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded"
                    >
                      Activate
                    </button>
                  )}
                  {selectedUser.accountStatus !== 'suspended' && (
                    <button
                      onClick={() => handleStatusChange(selectedUser.id, 'suspended')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded"
                    >
                      Suspend
                    </button>
                  )}
                  {selectedUser.accountStatus !== 'banned' && (
                    <button
                      onClick={() => handleStatusChange(selectedUser.id, 'banned')}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      Ban
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
