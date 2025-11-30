// Cosmetics domain types

export type CosmeticType = 'avatar' | 'avatar_frame' | 'property_skin' | 'effect' | 'badge';
export type CosmeticRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Cosmetic {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: CosmeticType;
  rarity: CosmeticRarity;
  imageUrl: string;
  previewUrl: string | null;
  coinCost: number | null;
  cashCost: number | null;
  unlockRequirement: CosmeticUnlockRequirement | null;
  sortOrder: number;
  isActive: boolean;
  isPremiumOnly: boolean;
  createdAt: Date;
}

export interface CosmeticUnlockRequirement {
  type: 'achievement' | 'prestige' | 'level' | 'event';
  value: string | number;
}

export interface PlayerCosmetic {
  id: string;
  userId: string;
  cosmeticId: string;
  equippedSlot: string | null;
  acquiredAt: Date;
}

export interface CosmeticWithOwnership extends Cosmetic {
  owned: boolean;
  equipped: boolean;
  equippedSlot: string | null;
  canPurchase: boolean;
  canUnlock: boolean;
}

export interface EquippedCosmetics {
  avatar: string | null;
  avatarFrame: string | null;
  badge: string | null;
}
