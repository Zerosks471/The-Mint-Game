import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  rewardType: string;
  rewardAmount: string | null;
  rewardData: unknown;
  maxRedemptions: number | null;
  maxPerUser: number;
  expiresAt: string | null;
  requiresPremium: boolean;
  minLevel: number | null;
  isActive: boolean;
  createdAt: string;
  redemptionCount: number;
}

interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  redemptionsLast24h: number;
}

export function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    code: '',
    description: '',
    rewardType: 'cash',
    rewardAmount: '',
    maxRedemptions: '',
    maxPerUser: '1',
    expiresAt: '',
    requiresPremium: false,
    minLevel: '',
  });

  // Bulk form
  const [bulkForm, setBulkForm] = useState({
    count: '10',
    prefix: '',
    rewardType: 'cash',
    rewardAmount: '',
    maxRedemptions: '1',
    description: '',
    expiresAt: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [couponsRes, statsRes] = await Promise.all([
        api.getCoupons(1, 100),
        api.getCouponStats(),
      ]);

      if (couponsRes.success) {
        setCoupons((couponsRes.data as { coupons: Coupon[] }).coupons || []);
      }
      if (statsRes.success) setStats(statsRes.data as CouponStats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    const result = await api.createCoupon({
      code: createForm.code || undefined,
      description: createForm.description || undefined,
      rewardType: createForm.rewardType,
      rewardAmount: createForm.rewardAmount ? parseFloat(createForm.rewardAmount) : undefined,
      maxRedemptions: createForm.maxRedemptions ? parseInt(createForm.maxRedemptions) : undefined,
      maxPerUser: parseInt(createForm.maxPerUser),
      expiresAt: createForm.expiresAt || undefined,
      requiresPremium: createForm.requiresPremium,
      minLevel: createForm.minLevel ? parseInt(createForm.minLevel) : undefined,
    });

    if (result.success) {
      setShowCreateModal(false);
      setCreateForm({
        code: '',
        description: '',
        rewardType: 'cash',
        rewardAmount: '',
        maxRedemptions: '',
        maxPerUser: '1',
        expiresAt: '',
        requiresPremium: false,
        minLevel: '',
      });
      fetchData();
    }
  };

  const handleBulkCreate = async () => {
    const result = await api.createBulkCoupons({
      count: parseInt(bulkForm.count),
      prefix: bulkForm.prefix || undefined,
      rewardType: bulkForm.rewardType,
      rewardAmount: bulkForm.rewardAmount ? parseFloat(bulkForm.rewardAmount) : undefined,
      maxRedemptions: bulkForm.maxRedemptions ? parseInt(bulkForm.maxRedemptions) : undefined,
      description: bulkForm.description || undefined,
      expiresAt: bulkForm.expiresAt || undefined,
    });

    if (result.success) {
      const data = result.data as { created: number; codes: string[] };
      alert(`Created ${data.created} coupons`);
      setShowBulkModal(false);
      fetchData();
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this coupon?')) return;
    const result = await api.deactivateCoupon(id);
    if (result.success) fetchData();
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const result = await api.updateCoupon(coupon.id, { isActive: !coupon.isActive });
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Coupon Codes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium transition-colors"
          >
            Bulk Create
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Create Coupon
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Total Coupons</p>
          <p className="text-2xl font-bold text-zinc-100">{stats?.totalCoupons}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Active Coupons</p>
          <p className="text-2xl font-bold text-green-400">{stats?.activeCoupons}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Total Redemptions</p>
          <p className="text-2xl font-bold text-blue-400">{stats?.totalRedemptions}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-500 text-sm">Redemptions (24h)</p>
          <p className="text-2xl font-bold text-purple-400">{stats?.redemptionsLast24h}</p>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
              <th className="p-4 font-medium">Code</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Reward</th>
              <th className="p-4 font-medium">Redemptions</th>
              <th className="p-4 font-medium">Expires</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="text-zinc-300">
                <td className="p-4 font-mono font-bold text-purple-400">{coupon.code}</td>
                <td className="p-4 capitalize">{coupon.rewardType}</td>
                <td className="p-4">
                  {coupon.rewardType === 'cash' && coupon.rewardAmount && (
                    <span className="text-green-400">${parseFloat(coupon.rewardAmount).toLocaleString()}</span>
                  )}
                  {coupon.rewardType === 'premium' && <span className="text-yellow-400">Premium Access</span>}
                  {coupon.rewardType === 'item' && <span className="text-blue-400">Game Item</span>}
                </td>
                <td className="p-4">
                  <span className="text-zinc-400">{coupon.redemptionCount}</span>
                  {coupon.maxRedemptions && <span className="text-zinc-600"> / {coupon.maxRedemptions}</span>}
                </td>
                <td className="p-4 text-sm text-zinc-500">
                  {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    coupon.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {coupon.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(coupon)}
                      className={`text-xs ${coupon.isActive ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'}`}
                    >
                      {coupon.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeactivate(coupon.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Create Coupon</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Code (auto-generated if empty)</label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2024"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Description</label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Summer promotion"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Reward Type</label>
                  <select
                    value={createForm.rewardType}
                    onChange={(e) => setCreateForm({ ...createForm, rewardType: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="premium">Premium</option>
                    <option value="item">Item</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Amount</label>
                  <input
                    type="number"
                    value={createForm.rewardAmount}
                    onChange={(e) => setCreateForm({ ...createForm, rewardAmount: e.target.value })}
                    placeholder="10000"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Max Redemptions</label>
                  <input
                    type="number"
                    value={createForm.maxRedemptions}
                    onChange={(e) => setCreateForm({ ...createForm, maxRedemptions: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Max Per User</label>
                  <input
                    type="number"
                    value={createForm.maxPerUser}
                    onChange={(e) => setCreateForm({ ...createForm, maxPerUser: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Expires At</label>
                <input
                  type="datetime-local"
                  value={createForm.expiresAt}
                  onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresPremium"
                  checked={createForm.requiresPremium}
                  onChange={(e) => setCreateForm({ ...createForm, requiresPremium: e.target.checked })}
                  className="rounded bg-zinc-800 border-zinc-700"
                />
                <label htmlFor="requiresPremium" className="text-sm text-zinc-400">Requires Premium</label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Bulk Create Coupons</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Number of Codes</label>
                  <input
                    type="number"
                    value={bulkForm.count}
                    onChange={(e) => setBulkForm({ ...bulkForm, count: e.target.value })}
                    max={1000}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Prefix (optional)</label>
                  <input
                    type="text"
                    value={bulkForm.prefix}
                    onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value.toUpperCase() })}
                    placeholder="PROMO"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Reward Type</label>
                  <select
                    value={bulkForm.rewardType}
                    onChange={(e) => setBulkForm({ ...bulkForm, rewardType: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="premium">Premium</option>
                    <option value="item">Item</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Amount</label>
                  <input
                    type="number"
                    value={bulkForm.rewardAmount}
                    onChange={(e) => setBulkForm({ ...bulkForm, rewardAmount: e.target.value })}
                    placeholder="10000"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Max Redemptions Per Code</label>
                <input
                  type="number"
                  value={bulkForm.maxRedemptions}
                  onChange={(e) => setBulkForm({ ...bulkForm, maxRedemptions: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Description</label>
                <input
                  type="text"
                  value={bulkForm.description}
                  onChange={(e) => setBulkForm({ ...bulkForm, description: e.target.value })}
                  placeholder="Bulk generated promo codes"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Expires At</label>
                <input
                  type="datetime-local"
                  value={bulkForm.expiresAt}
                  onChange={(e) => setBulkForm({ ...bulkForm, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCreate}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Create {bulkForm.count} Codes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
