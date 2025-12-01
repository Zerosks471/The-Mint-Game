import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface PropertyType {
  id: number;
  name: string;
  tier: number;
  baseCost: string;
  baseIncomeHour: string;
  costMultiplier: number;
  incomeMultiplier: number;
  isActive: boolean;
}

interface BusinessType {
  id: number;
  name: string;
  tier: number;
  baseCost: string;
  baseRevenue: string;
  cycleSeconds: number;
  isActive: boolean;
}

interface Upgrade {
  id: string;
  name: string;
  description: string;
  tier: number;
  baseCost: string;
  costMultiplier: number;
  effect: Record<string, unknown>;
  maxLevel: number;
  isActive: boolean;
}

type ConfigTab = 'properties' | 'businesses' | 'upgrades';

export function GameConfigPage() {
  const [properties, setProperties] = useState<PropertyType[]>([]);
  const [businesses, setBusinesses] = useState<BusinessType[]>([]);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ConfigTab>('properties');
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [propsRes, bizRes, upRes] = await Promise.all([
        api.getPropertyTypes(),
        api.getBusinessTypes(),
        api.getUpgrades(),
      ]);

      if (propsRes.success) setProperties(propsRes.data as PropertyType[]);
      if (bizRes.success) setBusinesses(bizRes.data as BusinessType[]);
      if (upRes.success) setUpgrades(upRes.data as Upgrade[]);
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

  const startEdit = (item: PropertyType | BusinessType | Upgrade) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    let result;
    if (activeTab === 'properties') {
      result = await api.updatePropertyType(editingId as number, editForm);
    } else if (activeTab === 'businesses') {
      result = await api.updateBusinessType(editingId as number, editForm);
    } else {
      result = await api.updateUpgrade(editingId as string, editForm);
    }

    if (result.success) {
      cancelEdit();
      fetchData();
    }
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
      <h1 className="text-2xl font-bold text-zinc-100">Game Configuration</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('properties')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'properties'
              ? 'bg-zinc-800 text-purple-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Properties ({properties.length})
        </button>
        <button
          onClick={() => setActiveTab('businesses')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'businesses'
              ? 'bg-zinc-800 text-purple-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Businesses ({businesses.length})
        </button>
        <button
          onClick={() => setActiveTab('upgrades')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'upgrades'
              ? 'bg-zinc-800 text-purple-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Upgrades ({upgrades.length})
        </button>
      </div>

      {/* Properties Table */}
      {activeTab === 'properties' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Tier</th>
                <th className="p-4 font-medium">Base Cost</th>
                <th className="p-4 font-medium">Income/Hour</th>
                <th className="p-4 font-medium">Cost Mult.</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {properties.map((prop) => (
                <tr key={prop.id} className="text-zinc-300">
                  {editingId === prop.id ? (
                    <>
                      <td className="p-4">{prop.name}</td>
                      <td className="p-4">{prop.tier}</td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={editForm.baseCost as string}
                          onChange={(e) => setEditForm({ ...editForm, baseCost: e.target.value })}
                          className="w-32 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={editForm.baseIncomeHour as string}
                          onChange={(e) => setEditForm({ ...editForm, baseIncomeHour: e.target.value })}
                          className="w-32 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.costMultiplier as number}
                          onChange={(e) => setEditForm({ ...editForm, costMultiplier: parseFloat(e.target.value) })}
                          className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                        />
                      </td>
                      <td className="p-4">
                        <select
                          value={editForm.isActive ? 'active' : 'inactive'}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                          className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="text-xs text-green-400 hover:text-green-300">Save</button>
                          <button onClick={cancelEdit} className="text-xs text-zinc-400 hover:text-zinc-300">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 font-medium">{prop.name}</td>
                      <td className="p-4">{prop.tier}</td>
                      <td className="p-4 font-mono text-green-400">{formatCurrency(prop.baseCost)}</td>
                      <td className="p-4 font-mono text-blue-400">{formatCurrency(prop.baseIncomeHour)}</td>
                      <td className="p-4">{prop.costMultiplier}x</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          prop.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {prop.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => startEdit(prop)}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Businesses Table */}
      {activeTab === 'businesses' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Tier</th>
                <th className="p-4 font-medium">Base Cost</th>
                <th className="p-4 font-medium">Revenue</th>
                <th className="p-4 font-medium">Cycle</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {businesses.map((biz) => (
                <tr key={biz.id} className="text-zinc-300">
                  {editingId === biz.id ? (
                    <>
                      <td className="p-4">{biz.name}</td>
                      <td className="p-4">{biz.tier}</td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={editForm.baseCost as string}
                          onChange={(e) => setEditForm({ ...editForm, baseCost: e.target.value })}
                          className="w-32 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={editForm.baseRevenue as string}
                          onChange={(e) => setEditForm({ ...editForm, baseRevenue: e.target.value })}
                          className="w-32 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          value={editForm.cycleSeconds as number}
                          onChange={(e) => setEditForm({ ...editForm, cycleSeconds: parseInt(e.target.value) })}
                          className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                        />
                      </td>
                      <td className="p-4">
                        <select
                          value={editForm.isActive ? 'active' : 'inactive'}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                          className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="text-xs text-green-400 hover:text-green-300">Save</button>
                          <button onClick={cancelEdit} className="text-xs text-zinc-400 hover:text-zinc-300">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 font-medium">{biz.name}</td>
                      <td className="p-4">{biz.tier}</td>
                      <td className="p-4 font-mono text-green-400">{formatCurrency(biz.baseCost)}</td>
                      <td className="p-4 font-mono text-blue-400">{formatCurrency(biz.baseRevenue)}</td>
                      <td className="p-4">{biz.cycleSeconds}s</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          biz.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {biz.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => startEdit(biz)}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upgrades Table */}
      {activeTab === 'upgrades' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Cost</th>
                <th className="p-4 font-medium">Max Level</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {upgrades.map((up) => (
                <tr key={up.id} className="text-zinc-300">
                  {editingId === up.id ? (
                    <>
                      <td className="p-4">{up.name}</td>
                      <td className="p-4 text-sm">{up.description}</td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={editForm.baseCost as string}
                          onChange={(e) => setEditForm({ ...editForm, baseCost: e.target.value })}
                          className="w-32 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          value={editForm.maxLevel as number}
                          onChange={(e) => setEditForm({ ...editForm, maxLevel: parseInt(e.target.value) })}
                          className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                        />
                      </td>
                      <td className="p-4">
                        <select
                          value={editForm.isActive ? 'active' : 'inactive'}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                          className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="text-xs text-green-400 hover:text-green-300">Save</button>
                          <button onClick={cancelEdit} className="text-xs text-zinc-400 hover:text-zinc-300">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 font-medium">{up.name}</td>
                      <td className="p-4 text-sm text-zinc-400 max-w-xs truncate">{up.description}</td>
                      <td className="p-4 font-mono text-green-400">{formatCurrency(up.baseCost)}</td>
                      <td className="p-4">{up.maxLevel}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          up.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {up.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => startEdit(up)}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
