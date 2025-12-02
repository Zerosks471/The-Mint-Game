import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '@/lib/api';

interface Cosmetic {
  id: string;
  name: string;
  description: string | null;
  type: string;
  category: string | null;
  rarity: string;
  previewUrl: string | null;
  assetUrl: string | null;
  acquisitionType: string;
  premiumCost: number | null;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  ownedCount: number;
}

interface UploadedImage {
  filename: string;
  url: string;
  size: number;
  createdAt: string;
}

interface CosmeticStats {
  totalCosmetics: number;
  availableCosmetics: number;
  totalOwned: number;
  byType: { type: string; count: number }[];
  byRarity: { rarity: string; count: number }[];
}

type TabType = 'list' | 'create' | 'images';

const TYPES = ['avatar', 'avatar_frame', 'badge'];
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const ACQUISITION_TYPES = ['shop', 'achievement', 'event', 'free', 'premium'];

const RARITY_COLORS: Record<string, string> = {
  common: 'text-zinc-400 bg-zinc-500/20',
  uncommon: 'text-green-400 bg-green-500/20',
  rare: 'text-blue-400 bg-blue-500/20',
  epic: 'text-purple-400 bg-purple-500/20',
  legendary: 'text-amber-400 bg-amber-500/20',
};

const TYPE_ICONS: Record<string, string> = {
  avatar: '👤',
  avatar_frame: '🖼️',
  badge: '🏷️',
};

const PLACEHOLDER_IMAGES: Record<string, string> = {
  avatar: '/placeholders/avatar.png',
  avatar_frame: '/placeholders/frame.png',
  badge: '/placeholders/badge.png',
};

// API base for images - the uploads are served from api-gateway
const IMAGE_BASE = '/api';

export function CosmeticsPage() {
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [stats, setStats] = useState<CosmeticStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [filterType, setFilterType] = useState<string>('');
  const [filterRarity, setFilterRarity] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [createForm, setCreateForm] = useState({
    id: '',
    name: '',
    description: '',
    type: 'avatar',
    category: '',
    rarity: 'common',
    previewUrl: '',
    assetUrl: '',
    acquisitionType: 'shop',
    premiumCost: '',
    isAvailable: true,
    sortOrder: '0',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState<'preview' | 'asset' | 'edit-preview' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cosmeticsRes, statsRes, imagesRes] = await Promise.all([
        api.getCosmetics(filterType || undefined, filterRarity || undefined),
        api.getCosmeticStats(),
        api.listCosmeticImages(),
      ]);

      if (cosmeticsRes.success) setCosmetics(cosmeticsRes.data as Cosmetic[]);
      if (statsRes.success) setStats(statsRes.data as CosmeticStats);
      if (imagesRes.success) setUploadedImages(imagesRes.data as UploadedImage[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, filterRarity]);

  const filteredCosmetics = useMemo(() => {
    return cosmetics;
  }, [cosmetics]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const result = await api.uploadCosmeticImage(file);

    if (result.success) {
      setSuccess('Image uploaded successfully');
      setUploadedImages(prev => [{
        filename: result.data.filename,
        url: result.data.url,
        size: result.data.size,
        createdAt: new Date().toISOString(),
      }, ...prev]);

      // Auto-set the URL if picker is open
      if (showImagePicker === 'preview') {
        setCreateForm(prev => ({ ...prev, previewUrl: result.data.url }));
      } else if (showImagePicker === 'asset') {
        setCreateForm(prev => ({ ...prev, assetUrl: result.data.url }));
      }

      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error?.message || 'Failed to upload image');
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteImage = async (filename: string) => {
    if (!confirm('Delete this image? This cannot be undone.')) return;

    const result = await api.deleteCosmeticImage(filename);
    if (result.success) {
      setUploadedImages(prev => prev.filter(img => img.filename !== filename));
      setSuccess('Image deleted');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error?.message || 'Failed to delete image');
    }
  };

  const selectImage = (url: string) => {
    if (showImagePicker === 'preview') {
      setCreateForm(prev => ({ ...prev, previewUrl: url }));
    } else if (showImagePicker === 'asset') {
      setCreateForm(prev => ({ ...prev, assetUrl: url }));
    } else if (showImagePicker === 'edit-preview') {
      setEditForm(prev => ({ ...prev, previewUrl: url }));
    }
    setShowImagePicker(null);
  };

  const startEdit = (cosmetic: Cosmetic) => {
    setEditingId(cosmetic.id);
    setEditForm({ ...cosmetic });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setError(null);

    const result = await api.updateCosmetic(editingId, {
      name: editForm.name,
      description: editForm.description || null,
      category: editForm.category || null,
      rarity: editForm.rarity,
      previewUrl: editForm.previewUrl || null,
      assetUrl: editForm.assetUrl || null,
      premiumCost: editForm.premiumCost ? parseInt(editForm.premiumCost as string) : null,
      isAvailable: editForm.isAvailable,
      sortOrder: parseInt(editForm.sortOrder as string) || 0,
    });

    if (result.success) {
      setSuccess('Cosmetic updated successfully');
      cancelEdit();
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error?.message || 'Failed to update cosmetic');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!createForm.id || !createForm.name) {
      setError('ID and Name are required');
      return;
    }

    const result = await api.createCosmetic({
      id: createForm.id,
      name: createForm.name,
      description: createForm.description || undefined,
      type: createForm.type,
      category: createForm.category || undefined,
      rarity: createForm.rarity,
      previewUrl: createForm.previewUrl || undefined,
      assetUrl: createForm.assetUrl || undefined,
      acquisitionType: createForm.acquisitionType,
      premiumCost: createForm.premiumCost ? parseInt(createForm.premiumCost) : undefined,
      isAvailable: createForm.isAvailable,
      sortOrder: parseInt(createForm.sortOrder) || 0,
    });

    if (result.success) {
      setSuccess('Cosmetic created successfully');
      setCreateForm({
        id: '',
        name: '',
        description: '',
        type: 'avatar',
        category: '',
        rarity: 'common',
        previewUrl: '',
        assetUrl: '',
        acquisitionType: 'shop',
        premiumCost: '',
        isAvailable: true,
        sortOrder: '0',
      });
      setActiveTab('list');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error?.message || 'Failed to create cosmetic');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cosmetic? This cannot be undone.')) return;

    const result = await api.deleteCosmetic(id);
    if (result.success) {
      setSuccess('Cosmetic deleted successfully');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error?.message || 'Failed to delete cosmetic');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    // If it's an uploads URL, prepend the API base (for proxying)
    if (url.startsWith('/uploads/')) {
      return url;
    }
    return url;
  };

  if (loading && cosmetics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Cosmetics Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'list'
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            View All
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'create'
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            + Create New
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'images'
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Images ({uploadedImages.length})
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-300 hover:text-white">
            Dismiss
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-green-400">
          {success}
        </div>
      )}

      {/* Stats Cards */}
      {stats && activeTab === 'list' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-sm">Total Cosmetics</p>
            <p className="text-2xl font-bold text-zinc-100">{stats.totalCosmetics}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-sm">Available</p>
            <p className="text-2xl font-bold text-green-400">{stats.availableCosmetics}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-sm">Total Owned</p>
            <p className="text-2xl font-bold text-purple-400">{stats.totalOwned}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-sm">Uploaded Images</p>
            <p className="text-2xl font-bold text-cyan-400">{uploadedImages.length}</p>
          </div>
        </div>
      )}

      {/* Images Tab */}
      {activeTab === 'images' && (
        <div className="space-y-6">
          {/* Upload Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Upload New Image</h2>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className={`px-6 py-3 rounded-lg font-medium cursor-pointer transition-colors ${
                  uploading
                    ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
              >
                {uploading ? 'Uploading...' : 'Choose Image'}
              </label>
              <span className="text-zinc-500 text-sm">
                Max 5MB. Supported: JPEG, PNG, GIF, WebP, SVG
              </span>
            </div>
          </div>

          {/* Images Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {uploadedImages.map((img) => (
              <div
                key={img.filename}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group"
              >
                <div className="aspect-square bg-zinc-800 flex items-center justify-center">
                  <img
                    src={getImageUrl(img.url) || ''}
                    alt={img.filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">❓</text></svg>';
                    }}
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs text-zinc-400 truncate" title={img.filename}>
                    {img.filename}
                  </p>
                  <p className="text-xs text-zinc-600">{formatBytes(img.size)}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(img.url)}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Copy URL
                    </button>
                    <button
                      onClick={() => handleDeleteImage(img.filename)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {uploadedImages.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              No images uploaded yet. Upload your first cosmetic image above.
            </div>
          )}
        </div>
      )}

      {activeTab === 'list' && (
        <>
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-500">Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100"
              >
                <option value="">All Types</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_ICONS[t]} {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-500">Rarity:</label>
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100"
              >
                <option value="">All Rarities</option>
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-sm text-zinc-500 ml-auto">
              {filteredCosmetics.length} cosmetics
            </span>
          </div>

          {/* Cosmetics Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                  <th className="p-4 font-medium">Preview</th>
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Rarity</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Owned</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredCosmetics.map((cosmetic) => (
                  <tr key={cosmetic.id} className="text-zinc-300">
                    {editingId === cosmetic.id ? (
                      <>
                        <td className="p-4">
                          <button
                            onClick={() => setShowImagePicker('edit-preview')}
                            className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all group relative"
                            title="Click to change image"
                          >
                            {editForm.previewUrl ? (
                              <img
                                src={getImageUrl(editForm.previewUrl as string) || ''}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl">{TYPE_ICONS[cosmetic.type]}</span>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-xs">Edit</span>
                            </div>
                          </button>
                        </td>
                        <td className="p-4 font-mono text-xs">{cosmetic.id}</td>
                        <td className="p-4">
                          <input
                            type="text"
                            value={editForm.name as string}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                          />
                        </td>
                        <td className="p-4">
                          <span className="text-lg">{TYPE_ICONS[cosmetic.type]}</span>
                        </td>
                        <td className="p-4">
                          <select
                            value={editForm.rarity as string}
                            onChange={(e) => setEditForm({ ...editForm, rarity: e.target.value })}
                            className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                          >
                            {RARITIES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            value={editForm.premiumCost as string || ''}
                            onChange={(e) => setEditForm({ ...editForm, premiumCost: e.target.value })}
                            placeholder="Free"
                            className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                          />
                        </td>
                        <td className="p-4">{cosmetic.ownedCount}</td>
                        <td className="p-4">
                          <select
                            value={editForm.isAvailable ? 'available' : 'hidden'}
                            onChange={(e) =>
                              setEditForm({ ...editForm, isAvailable: e.target.value === 'available' })
                            }
                            className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                          >
                            <option value="available">Available</option>
                            <option value="hidden">Hidden</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              className="text-xs text-green-400 hover:text-green-300"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-xs text-zinc-400 hover:text-zinc-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4">
                          <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden">
                            {cosmetic.previewUrl ? (
                              <img
                                src={getImageUrl(cosmetic.previewUrl) || ''}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-2xl">${TYPE_ICONS[cosmetic.type]}</span>`;
                                }}
                              />
                            ) : (
                              <span className="text-2xl">{TYPE_ICONS[cosmetic.type]}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-zinc-500">{cosmetic.id}</td>
                        <td className="p-4 font-medium">{cosmetic.name}</td>
                        <td className="p-4">
                          <span className="text-lg" title={cosmetic.type}>
                            {TYPE_ICONS[cosmetic.type]}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${RARITY_COLORS[cosmetic.rarity]}`}
                          >
                            {cosmetic.rarity}
                          </span>
                        </td>
                        <td className="p-4 font-mono">
                          {cosmetic.premiumCost ? (
                            <span className="text-amber-400">{cosmetic.premiumCost}</span>
                          ) : (
                            <span className="text-zinc-500">Free</span>
                          )}
                        </td>
                        <td className="p-4 text-purple-400">{cosmetic.ownedCount}</td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              cosmetic.isAvailable
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {cosmetic.isAvailable ? 'Available' : 'Hidden'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(cosmetic)}
                              className="text-xs text-purple-400 hover:text-purple-300"
                            >
                              Edit
                            </button>
                            {cosmetic.ownedCount === 0 && (
                              <button
                                onClick={() => handleDelete(cosmetic.id)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'create' && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-6">Create New Cosmetic</h2>

          <div className="grid grid-cols-2 gap-6">
            {/* ID */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                ID (unique, e.g., avatar_tycoon)
              </label>
              <input
                type="text"
                value={createForm.id}
                onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="avatar_new_item"
                required
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Tycoon Avatar"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Type</label>
              <select
                value={createForm.type}
                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_ICONS[t]} {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Rarity */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Rarity</label>
              <select
                value={createForm.rarity}
                onChange={(e) => setCreateForm({ ...createForm, rarity: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Acquisition Type */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Acquisition Type
              </label>
              <select
                value={createForm.acquisitionType}
                onChange={(e) => setCreateForm({ ...createForm, acquisitionType: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {ACQUISITION_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Premium Cost */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Premium Cost (leave empty for free)
              </label>
              <input
                type="number"
                value={createForm.premiumCost}
                onChange={(e) => setCreateForm({ ...createForm, premiumCost: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="100"
                min="0"
              />
            </div>

            {/* Preview Image */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Preview Image
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={createForm.previewUrl}
                  onChange={(e) => setCreateForm({ ...createForm, previewUrl: e.target.value })}
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="/uploads/cosmetics/..."
                />
                <button
                  type="button"
                  onClick={() => setShowImagePicker('preview')}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
                >
                  Browse
                </button>
              </div>
              {createForm.previewUrl && (
                <div className="mt-2 w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden">
                  <img
                    src={getImageUrl(createForm.previewUrl) || ''}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Asset Image */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Full Asset Image
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={createForm.assetUrl}
                  onChange={(e) => setCreateForm({ ...createForm, assetUrl: e.target.value })}
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="/uploads/cosmetics/..."
                />
                <button
                  type="button"
                  onClick={() => setShowImagePicker('asset')}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
                >
                  Browse
                </button>
              </div>
              {createForm.assetUrl && (
                <div className="mt-2 w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden">
                  <img
                    src={getImageUrl(createForm.assetUrl) || ''}
                    alt="Asset"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="A stylish avatar for accomplished players"
                rows={2}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Category (optional)
              </label>
              <input
                type="text"
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="seasonal"
              />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Sort Order</label>
              <input
                type="number"
                value={createForm.sortOrder}
                onChange={(e) => setCreateForm({ ...createForm, sortOrder: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

            {/* Available Toggle */}
            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.isAvailable}
                  onChange={(e) => setCreateForm({ ...createForm, isAvailable: e.target.checked })}
                  className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-zinc-300">Available in shop immediately</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              type="submit"
              className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
            >
              Create Cosmetic
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Image Picker Modal */}
      {showImagePicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">
                Select {showImagePicker === 'preview' || showImagePicker === 'edit-preview' ? 'Preview' : 'Asset'} Image
              </h3>
              <button
                onClick={() => setShowImagePicker(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Upload in modal */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-800/50">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="modal-upload"
                />
                <label
                  htmlFor="modal-upload"
                  className={`px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
                    uploading
                      ? 'bg-zinc-700 text-zinc-400'
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}
                >
                  {uploading ? 'Uploading...' : 'Upload New'}
                </label>
                <span className="text-zinc-500 text-sm">Or select from existing images below</span>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {uploadedImages.map((img) => (
                  <button
                    key={img.filename}
                    onClick={() => selectImage(img.url)}
                    className="aspect-square bg-zinc-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
                  >
                    <img
                      src={getImageUrl(img.url) || ''}
                      alt={img.filename}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              {uploadedImages.length === 0 && (
                <p className="text-center text-zinc-500 py-8">
                  No images uploaded yet. Click "Upload New" above.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
