import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { BuyCoinsModal } from '../components/BuyCoinsModal';
import {
  getCatalog,
  purchaseCosmetic,
  equipCosmetic,
  Cosmetic,
  EquippedCosmetics,
} from '../api/cosmetics';

type TabType = 'avatar' | 'avatar_frame' | 'badge';

const TABS: { key: TabType; label: string }[] = [
  { key: 'avatar', label: 'Avatars' },
  { key: 'avatar_frame', label: 'Frames' },
  { key: 'badge', label: 'Badges' },
];

const RARITY_COLORS: Record<string, string> = {
  common: 'text-gray-400 border-gray-400',
  uncommon: 'text-green-500 border-green-500',
  rare: 'text-blue-500 border-blue-500',
  epic: 'text-purple-500 border-purple-500',
  legendary: 'text-amber-500 border-amber-500',
};

const RARITY_BG: Record<string, string> = {
  common: 'bg-gray-100 dark:bg-gray-700',
  uncommon: 'bg-green-50 dark:bg-green-900/20',
  rare: 'bg-blue-50 dark:bg-blue-900/20',
  epic: 'bg-purple-50 dark:bg-purple-900/20',
  legendary: 'bg-amber-50 dark:bg-amber-900/20',
};

// Emoji placeholders for cosmetics until actual assets exist
const COSMETIC_EMOJIS: Record<string, string> = {
  avatar_default: '👤',
  avatar_investor: '💼',
  avatar_tycoon: '🎩',
  avatar_mogul: '👔',
  avatar_legend: '👑',
  frame_none: '⬜',
  frame_bronze: '🥉',
  frame_silver: '🥈',
  frame_gold: '🥇',
  frame_diamond: '💎',
  badge_newbie: '🌱',
  badge_trader: '📈',
  badge_whale: '🐋',
  badge_vip: '⭐',
  badge_founder: '🏆',
};

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
      // Mark as owned in local state
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
      // Update equipped status in local state
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
      // Clear equipped status for this type
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

  const filteredCosmetics = cosmetics.filter((c) => c.type === activeTab);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-red-500">{error}</p>
          <button
            onClick={loadCatalog}
            className="px-4 py-2 bg-mint-500 text-white rounded-lg hover:bg-mint-600"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cosmetics Shop
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <span className="text-xl">🪙</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {balance.toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => setShowCoinsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-white font-semibold rounded-lg hover:from-amber-500 hover:to-yellow-500 transition-all shadow-md"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Get Coins
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-mint-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Currently Equipped */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Currently Equipped
          </h3>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl mb-1">
                {equipped.avatar
                  ? COSMETIC_EMOJIS[equipped.avatar] || '👤'
                  : '👤'}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Avatar</span>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">
                {equipped.avatarFrame
                  ? COSMETIC_EMOJIS[equipped.avatarFrame] || '⬜'
                  : '⬜'}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Frame</span>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">
                {equipped.badge
                  ? COSMETIC_EMOJIS[equipped.badge] || '🌱'
                  : '—'}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Badge</span>
            </div>
          </div>
        </div>

        {/* Cosmetics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredCosmetics.map((cosmetic) => (
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

        {filteredCosmetics.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No cosmetics available in this category.
          </div>
        )}
      </div>

      {/* Buy Coins Modal */}
      <BuyCoinsModal
        isOpen={showCoinsModal}
        onClose={() => setShowCoinsModal(false)}
      />
    </Layout>
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

  return (
    <div
      className={`relative p-4 rounded-xl border-2 ${
        cosmetic.equipped
          ? 'border-mint-500 bg-mint-50 dark:bg-mint-900/20'
          : `border-transparent ${RARITY_BG[cosmetic.rarity]}`
      }`}
    >
      {/* Equipped badge */}
      {cosmetic.equipped && (
        <div className="absolute -top-2 -right-2 bg-mint-500 text-white text-xs px-2 py-0.5 rounded-full">
          Equipped
        </div>
      )}

      {/* Preview */}
      <div className="text-5xl text-center mb-3">
        {COSMETIC_EMOJIS[cosmetic.id] || '❓'}
      </div>

      {/* Name & Rarity */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-center truncate">
        {cosmetic.name}
      </h3>
      <p
        className={`text-xs text-center font-medium capitalize ${
          RARITY_COLORS[cosmetic.rarity]?.split(' ')[0] || 'text-gray-400'
        }`}
      >
        {cosmetic.rarity}
      </p>

      {/* Description */}
      {cosmetic.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1 line-clamp-2">
          {cosmetic.description}
        </p>
      )}

      {/* Price / Owned / Actions */}
      <div className="mt-3">
        {cosmetic.owned ? (
          <button
            onClick={cosmetic.equipped ? onUnequip : onEquip}
            disabled={isLoading}
            className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
              cosmetic.equipped
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                : 'bg-mint-500 text-white hover:bg-mint-600'
            } disabled:opacity-50`}
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
            className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
              canAfford
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <span className="animate-pulse">...</span>
            ) : isFree ? (
              'Get Free'
            ) : (
              <span className="flex items-center justify-center gap-1">
                <span>🪙</span>
                <span>{cosmetic.premiumCost?.toLocaleString()}</span>
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
