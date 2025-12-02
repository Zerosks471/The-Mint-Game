import { useState, useEffect, useMemo } from 'react';
import { BuyCoinsModal } from '../components/BuyCoinsModal';
import {
  getCatalog,
  purchaseCosmetic,
  equipCosmetic,
  Cosmetic,
  EquippedCosmetics,
} from '../api/cosmetics';

type TabType = 'avatar' | 'avatar_frame' | 'badge';
type SortOption = 'default' | 'price_low' | 'price_high' | 'rarity' | 'owned';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'avatar', label: 'Avatars', icon: '👤' },
  { key: 'avatar_frame', label: 'Frames', icon: '🖼️' },
  { key: 'badge', label: 'Badges', icon: '🏷️' },
];

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const RARITY_CONFIG: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  common: {
    bg: 'bg-zinc-800/50',
    border: 'border-zinc-600/30',
    text: 'text-zinc-400',
    glow: '',
  },
  uncommon: {
    bg: 'bg-mint-900/20',
    border: 'border-mint/30',
    text: 'text-mint',
    glow: 'shadow-mint/10',
  },
  rare: {
    bg: 'bg-blue-900/20',
    border: 'border-blue/30',
    text: 'text-blue',
    glow: 'shadow-blue/20',
  },
  epic: {
    bg: 'bg-purple-900/20',
    border: 'border-purple/30',
    text: 'text-purple',
    glow: 'shadow-purple/20',
  },
  legendary: {
    bg: 'bg-amber-900/20',
    border: 'border-amber/30',
    text: 'text-amber',
    glow: 'shadow-amber/30',
  },
};

// Type-specific placeholder styles (no hardcoded per-item emojis)
const TYPE_PLACEHOLDERS: Record<string, { bg: string; icon: string; border: string }> = {
  avatar: {
    bg: 'bg-gradient-to-br from-purple-900/50 to-purple-700/30',
    icon: '👤',
    border: 'border-purple-500/30'
  },
  avatar_frame: {
    bg: 'bg-gradient-to-br from-amber-900/50 to-amber-700/30',
    icon: '🖼️',
    border: 'border-amber-500/30'
  },
  badge: {
    bg: 'bg-gradient-to-br from-cyan-900/50 to-cyan-700/30',
    icon: '🏷️',
    border: 'border-cyan-500/30'
  },
};

// Equipped slot component for the preview section
function EquippedSlot({
  label,
  cosmeticId,
  cosmetics,
  type,
}: {
  label: string;
  cosmeticId: string | null;
  cosmetics: Cosmetic[];
  type: string;
}) {
  const cosmetic = cosmeticId ? cosmetics.find(c => c.id === cosmeticId) : null;
  const placeholder = TYPE_PLACEHOLDERS[type] || TYPE_PLACEHOLDERS.avatar;

  return (
    <div className="flex flex-col items-center">
      {cosmetic ? (
        <CosmeticPreview cosmetic={cosmetic} size="lg" className="border-2 border-dark-border" />
      ) : (
        <div className={`w-20 h-20 rounded-xl border-2 border-dark-border flex items-center justify-center ${placeholder.bg}`}>
          <span className="text-4xl opacity-40">{placeholder.icon}</span>
        </div>
      )}
      <span className="text-xs text-zinc-500 mt-2">{label}</span>
    </div>
  );
}

// Cosmetic preview component with image support
function CosmeticPreview({
  cosmetic,
  size = 'md',
  className = ''
}: {
  cosmetic: { id: string; type: string; previewUrl?: string | null; name?: string };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const placeholder = TYPE_PLACEHOLDERS[cosmetic.type] || TYPE_PLACEHOLDERS.avatar;

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  // If there's a preview URL and no error, show the image
  if (cosmetic.previewUrl && !imageError) {
    return (
      <div className={`${sizeClasses[size]} rounded-xl overflow-hidden ${placeholder.bg} border ${placeholder.border} ${className}`}>
        <img
          src={cosmetic.previewUrl}
          alt={cosmetic.name || ''}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback to type-based placeholder icon
  return (
    <div className={`${sizeClasses[size]} rounded-xl flex items-center justify-center ${placeholder.bg} border ${placeholder.border} ${className}`}>
      <span className={`${iconSizes[size]} opacity-60`}>
        {placeholder.icon}
      </span>
    </div>
  );
}

export function ShopPage() {
  const [activeTab, setActiveTab] = useState<TabType>('avatar');
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [equipped, setEquipped] = useState<EquippedCosmetics>({
    avatar: null,
    avatarFrame: null,
    badge: null,
  });
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);

  useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog() {
    try {
      setLoading(true);
      setError(null);
      const data = await getCatalog();
      setCosmetics(data.cosmetics);
      setEquipped(data.equipped);
      setBalance(data.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cosmetics');
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(cosmetic: Cosmetic) {
    try {
      setActionLoading(cosmetic.id);
      const result = await purchaseCosmetic(cosmetic.id);
      setBalance(result.newBalance);
      setCosmetics((prev) =>
        prev.map((c) => (c.id === cosmetic.id ? { ...c, owned: true } : c))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEquip(cosmetic: Cosmetic) {
    try {
      setActionLoading(cosmetic.id);
      const result = await equipCosmetic(cosmetic.id);
      setEquipped(result.equipped);
      setCosmetics((prev) =>
        prev.map((c) => ({
          ...c,
          equipped:
            c.type === cosmetic.type ? c.id === cosmetic.id : c.equipped,
        }))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Equip failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnequip(cosmetic: Cosmetic) {
    try {
      setActionLoading(cosmetic.id);
      const result = await equipCosmetic(null, cosmetic.type);
      setEquipped(result.equipped);
      setCosmetics((prev) =>
        prev.map((c) => ({
          ...c,
          equipped: c.type === cosmetic.type ? false : c.equipped,
        }))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unequip failed');
    } finally {
      setActionLoading(null);
    }
  }

  const filteredAndSortedCosmetics = useMemo(() => {
    let filtered = cosmetics.filter((c) => c.type === activeTab);

    if (showOwnedOnly) {
      filtered = filtered.filter((c) => c.owned);
    }

    switch (sortBy) {
      case 'price_low':
        filtered = [...filtered].sort((a, b) => (a.premiumCost || 0) - (b.premiumCost || 0));
        break;
      case 'price_high':
        filtered = [...filtered].sort((a, b) => (b.premiumCost || 0) - (a.premiumCost || 0));
        break;
      case 'rarity':
        filtered = [...filtered].sort(
          (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)
        );
        break;
      case 'owned':
        filtered = [...filtered].sort((a, b) => {
          if (a.owned && !b.owned) return -1;
          if (!a.owned && b.owned) return 1;
          return 0;
        });
        break;
    }

    return filtered;
  }, [cosmetics, activeTab, sortBy, showOwnedOnly]);

  const ownedCount = useMemo(() => {
    return cosmetics.filter((c) => c.type === activeTab && c.owned).length;
  }, [cosmetics, activeTab]);

  const totalCount = useMemo(() => {
    return cosmetics.filter((c) => c.type === activeTab).length;
  }, [cosmetics, activeTab]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber border-t-transparent mb-4"></div>
        <p className="text-zinc-500">Loading shop...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-5xl mb-2">😢</div>
        <p className="text-red-400 text-lg">{error}</p>
        <button
          onClick={loadCatalog}
          className="px-6 py-2.5 bg-mint hover:bg-mint-600 text-dark-base font-semibold rounded-xl transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            <span className="text-3xl">🛍️</span>
            Cosmetics Shop
          </h1>
          <p className="text-zinc-400 mt-1">Customize your profile with unique items</p>
        </div>

        {/* Coin Balance & Buy */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber/30 rounded-xl">
            <span className="text-2xl">🪙</span>
            <div>
              <p className="text-xs text-amber/70 uppercase tracking-wider">Balance</p>
              <p className="text-xl font-bold text-amber font-mono">
                {balance.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCoinsModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-dark-base font-bold rounded-xl transition-all shadow-lg shadow-amber/20"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Get Coins
          </button>
        </div>
      </div>

      {/* Currently Equipped Preview */}
      <div className="bg-gradient-to-br from-dark-card to-dark-elevated border border-dark-border rounded-2xl p-6">
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
          Currently Equipped
        </h3>
        <div className="flex items-center gap-8">
          <EquippedSlot
            label="Avatar"
            cosmeticId={equipped.avatar}
            cosmetics={cosmetics}
            type="avatar"
          />
          <EquippedSlot
            label="Frame"
            cosmeticId={equipped.avatarFrame}
            cosmetics={cosmetics}
            type="avatar_frame"
          />
          <EquippedSlot
            label="Badge"
            cosmeticId={equipped.badge}
            cosmetics={cosmetics}
            type="badge"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all
              ${activeTab === tab.key
                ? 'bg-mint text-dark-base shadow-lg shadow-mint/20'
                : 'bg-dark-card border border-dark-border text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }
            `}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-dark-card border border-dark-border rounded-xl">
        <div className="flex items-center gap-4">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-zinc-500">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-sm text-zinc-100 focus:ring-2 focus:ring-mint focus:border-mint outline-none"
            >
              <option value="default">Default</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rarity">By Rarity</option>
              <option value="owned">Owned First</option>
            </select>
          </div>

          {/* Owned Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={showOwnedOnly}
                onChange={(e) => setShowOwnedOnly(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-10 h-6 rounded-full transition-colors ${showOwnedOnly ? 'bg-mint' : 'bg-dark-border'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${showOwnedOnly ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
            </div>
            <span className="text-sm text-zinc-400">Owned only</span>
          </label>
        </div>

        {/* Collection Progress */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">Collection:</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-dark-border rounded-full overflow-hidden">
              <div
                className="h-full bg-mint rounded-full transition-all"
                style={{ width: `${totalCount > 0 ? (ownedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-medium text-mint">
              {ownedCount}/{totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Cosmetics Grid */}
      {filteredAndSortedCosmetics.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-zinc-400 text-lg">No items found</p>
          <p className="text-zinc-500 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAndSortedCosmetics.map((cosmetic) => (
            <CosmeticCard
              key={cosmetic.id}
              cosmetic={cosmetic}
              balance={balance}
              isLoading={actionLoading === cosmetic.id}
              onPurchase={() => handlePurchase(cosmetic)}
              onEquip={() => handleEquip(cosmetic)}
              onUnequip={() => handleUnequip(cosmetic)}
            />
          ))}
        </div>
      )}

      {/* Buy Coins Modal */}
      <BuyCoinsModal
        isOpen={showCoinsModal}
        onClose={() => setShowCoinsModal(false)}
      />
    </div>
  );
}

interface CosmeticCardProps {
  cosmetic: Cosmetic;
  balance: number;
  isLoading: boolean;
  onPurchase: () => void;
  onEquip: () => void;
  onUnequip: () => void;
}

function CosmeticCard({
  cosmetic,
  balance,
  isLoading,
  onPurchase,
  onEquip,
  onUnequip,
}: CosmeticCardProps) {
  const isFree = !cosmetic.premiumCost || cosmetic.premiumCost === 0;
  const canAfford = isFree || balance >= (cosmetic.premiumCost || 0);
  const config = RARITY_CONFIG[cosmetic.rarity] || RARITY_CONFIG.common;

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border-2 transition-all duration-300
        ${cosmetic.equipped
          ? 'border-mint bg-mint/10 shadow-lg shadow-mint/20 scale-[1.02]'
          : `${config.border} ${config.bg}`
        }
        hover:scale-[1.02] hover:shadow-lg ${config.glow}
      `}
    >
      {/* Equipped indicator */}
      {cosmetic.equipped && (
        <div className="absolute top-2 right-2 bg-mint text-dark-base text-xs font-bold px-2 py-0.5 rounded-full z-10">
          Equipped
        </div>
      )}

      {/* Rarity indicator */}
      <div className={`absolute top-2 left-2 ${config.text} text-xs font-bold uppercase px-2 py-0.5 rounded-full ${config.bg} border ${config.border}`}>
        {cosmetic.rarity}
      </div>

      {/* Preview */}
      <div className="pt-10 pb-4 px-4 flex items-center justify-center">
        <CosmeticPreview cosmetic={cosmetic} size="lg" />
      </div>

      {/* Info */}
      <div className="px-4 pb-4">
        <h3 className="font-bold text-zinc-100 text-center truncate">
          {cosmetic.name}
        </h3>

        {cosmetic.description && (
          <p className="text-xs text-zinc-500 text-center mt-1 line-clamp-2">
            {cosmetic.description}
          </p>
        )}

        {/* Action Button */}
        <div className="mt-4">
          {cosmetic.owned ? (
            <button
              onClick={cosmetic.equipped ? onUnequip : onEquip}
              disabled={isLoading}
              className={`
                w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all
                ${cosmetic.equipped
                  ? 'bg-dark-elevated text-zinc-400 hover:bg-dark-border'
                  : 'bg-mint text-dark-base hover:bg-mint-600'
                }
                disabled:opacity-50
              `}
            >
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : cosmetic.equipped ? (
                'Unequip'
              ) : (
                'Equip'
              )}
            </button>
          ) : (
            <button
              onClick={onPurchase}
              disabled={isLoading || !canAfford}
              className={`
                w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all
                ${canAfford
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-dark-base'
                  : 'bg-dark-elevated text-zinc-500 cursor-not-allowed'
                }
                disabled:opacity-50
              `}
            >
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : isFree ? (
                'Get Free'
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <span>🪙</span>
                  <span>{cosmetic.premiumCost?.toLocaleString()}</span>
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
