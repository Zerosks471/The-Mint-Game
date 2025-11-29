import type { ApiResponse } from '@mint/types';
import { apiClient } from './client';

// Types for API responses
export interface PropertyType {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  tier: number;
  baseCost: string;
  baseIncomeHour: string;
  managerCost: string | null;
  managerName: string | null;
  maxQuantity: number;
  maxUpgradeLevel: number;
  isUnlocked: boolean;
}

export interface PlayerProperty {
  id: string;
  userId: string;
  propertyTypeId: number;
  quantity: number;
  upgradeLevel: number;
  managerHired: boolean;
  currentIncomeHour: string;
  nextPurchaseCost: string | null;
  nextUpgradeCost: string | null;
  propertyType: PropertyType;
}

export interface BusinessType {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  tier: number;
  baseCost: string;
  baseRevenue: string;
  cycleSeconds: number;
  maxLevel: number;
  isUnlocked: boolean;
}

export interface PlayerBusiness {
  id: string;
  userId: string;
  businessTypeId: number;
  level: number;
  employeeCount: number;
  currentRevenue: string;
  cycleSeconds: number;
  currentCycleStart: string;
  cyclesCompleted: number;
  nextLevelCost: string | null;
  cycleProgress: number;
  cycleComplete: boolean;
  businessType: BusinessType;
}

export interface PlayerStats {
  userId: string;
  cash: string;
  premiumCurrency: number;
  lifetimeCashEarned: string;
  playerLevel: number;
  experiencePoints: string;
  baseIncomePerHour: string;
  effectiveIncomeHour: string;
  currentMultiplier: string;
  totalPropertiesOwned: number;
  totalBusinessesOwned: number;
  offlineCapHours: number;
  lastCollectionAt: string;
}

export interface OfflineStatus {
  pendingEarnings: string;
  elapsedHours: number;
  capped: boolean;
  capHours: number;
  managedIncomePerHour: string;
  lastCollectionAt: string;
}

export interface CollectResult {
  collected: string;
  hours: number;
  capped: boolean;
  incomePerHour?: string;
}

export interface EarningsSnapshot {
  id: string;
  userId: string;
  snapshotType: string;
  timestamp: string;
  totalCash: string;
  incomePerHour: string;
  propertiesOwned: number;
  businessesOwned: number;
  netWorth: string;
  cashEarned: string;
  cashSpent: string;
}

export interface EarningsSummary {
  currentCash: string;
  currentNetWorth: string;
  currentIncomePerHour: string;
  lifetimeEarnings: string;
  totalSpent: string;
  peakNetWorth: string;
  peakIncome: string;
  snapshotCount: number;
  propertiesOwned: number;
  businessesOwned: number;
}

export const gameApi = {
  // Player stats
  async getStats(): Promise<ApiResponse<PlayerStats>> {
    return apiClient.get<PlayerStats>('/user/stats');
  },

  // Properties
  async getPropertyTypes(): Promise<ApiResponse<PropertyType[]>> {
    return apiClient.get<PropertyType[]>('/game/properties/types');
  },

  async getPlayerProperties(): Promise<ApiResponse<PlayerProperty[]>> {
    return apiClient.get<PlayerProperty[]>('/game/properties');
  },

  async buyProperty(typeId: number): Promise<ApiResponse<PlayerProperty>> {
    return apiClient.post<PlayerProperty>(`/game/properties/${typeId}/buy`);
  },

  async upgradeProperty(propertyId: string): Promise<ApiResponse<PlayerProperty>> {
    return apiClient.post<PlayerProperty>(`/game/properties/${propertyId}/upgrade`);
  },

  async hireManager(propertyId: string): Promise<ApiResponse<PlayerProperty>> {
    return apiClient.post<PlayerProperty>(`/game/properties/${propertyId}/hire-manager`);
  },

  async sellProperty(
    propertyId: string,
    quantity: number = 1
  ): Promise<
    ApiResponse<{
      soldQuantity: number;
      remainingQuantity: number;
      cashReceived: string;
      propertyDeleted: boolean;
    }>
  > {
    return apiClient.post<{
      soldQuantity: number;
      remainingQuantity: number;
      cashReceived: string;
      propertyDeleted: boolean;
    }>(`/game/properties/${propertyId}/sell`, { quantity });
  },

  // Businesses
  async getBusinessTypes(): Promise<ApiResponse<BusinessType[]>> {
    return apiClient.get<BusinessType[]>('/game/businesses/types');
  },

  async getPlayerBusinesses(): Promise<ApiResponse<PlayerBusiness[]>> {
    return apiClient.get<PlayerBusiness[]>('/game/businesses');
  },

  async buyBusiness(typeId: number): Promise<ApiResponse<PlayerBusiness>> {
    return apiClient.post<PlayerBusiness>(`/game/businesses/${typeId}/buy`);
  },

  async levelUpBusiness(businessId: string): Promise<ApiResponse<PlayerBusiness>> {
    return apiClient.post<PlayerBusiness>(`/game/businesses/${businessId}/level-up`);
  },

  async collectBusinessRevenue(
    businessId: string
  ): Promise<ApiResponse<{ business: PlayerBusiness; collected: string }>> {
    return apiClient.post<{ business: PlayerBusiness; collected: string }>(
      `/game/businesses/${businessId}/collect`
    );
  },

  // Real-time earnings (collect from all properties while playing)
  async collectEarnings(): Promise<
    ApiResponse<{
      collected: string;
      newCash: string;
      elapsedSeconds: number;
      incomePerHour: string;
    }>
  > {
    return apiClient.post<{
      collected: string;
      newCash: string;
      elapsedSeconds: number;
      incomePerHour: string;
    }>('/game/collect');
  },

  // Offline earnings
  async getOfflineStatus(): Promise<ApiResponse<OfflineStatus>> {
    return apiClient.get<OfflineStatus>('/game/offline/status');
  },

  async collectOfflineEarnings(): Promise<ApiResponse<CollectResult>> {
    return apiClient.post<CollectResult>('/game/offline/collect');
  },

  // Earnings history
  async getEarningsHistory(options?: {
    type?: 'hourly' | 'daily';
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<EarningsSnapshot[]>> {
    const params = new URLSearchParams();
    if (options?.type) params.append('type', options.type);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<EarningsSnapshot[]>(`/game/stats/history${query}`);
  },

  async getEarningsSummary(): Promise<ApiResponse<EarningsSummary>> {
    return apiClient.get<EarningsSummary>('/game/stats/summary');
  },

  async createSnapshot(type: 'hourly' | 'daily' = 'hourly'): Promise<ApiResponse<EarningsSnapshot>> {
    return apiClient.post<EarningsSnapshot>('/game/stats/snapshot', { type });
  },
};
