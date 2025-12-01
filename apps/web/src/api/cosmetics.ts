import { apiClient } from './client';

export interface Cosmetic {
  id: string;
  name: string;
  description: string | null;
  type: 'avatar' | 'avatar_frame' | 'badge';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  premiumCost: number | null;
  previewUrl: string | null;
  owned: boolean;
  equipped: boolean;
}

export interface EquippedCosmetics {
  avatar: string | null;
  avatarFrame: string | null;
  badge: string | null;
}

export interface CatalogResponse {
  cosmetics: Cosmetic[];
  equipped: EquippedCosmetics;
  balance: number;
}

export interface PurchaseResponse {
  newBalance: number;
}

export interface EquipResponse {
  equipped: EquippedCosmetics;
}

export async function getCatalog() {
  const response = await apiClient.get<CatalogResponse>('/cosmetics/catalog');
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch cosmetics catalog');
  }
  return response.data;
}

export async function getOwned() {
  const response = await apiClient.get<{ cosmetics: Cosmetic[] }>('/cosmetics/owned');
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to fetch owned cosmetics');
  }
  return response.data.cosmetics;
}

export async function purchaseCosmetic(cosmeticId: string) {
  const response = await apiClient.post<PurchaseResponse>(`/cosmetics/${cosmeticId}/purchase`);
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to purchase cosmetic');
  }
  return response.data;
}

export async function equipCosmetic(cosmeticId: string | null, slot?: string) {
  const response = await apiClient.post<EquipResponse>('/cosmetics/equip', {
    cosmeticId,
    slot,
  });
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to equip cosmetic');
  }
  return response.data;
}
