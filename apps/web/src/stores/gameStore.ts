import { create } from 'zustand';
import {
  gameApi,
  PlayerStats,
  PropertyType,
  PlayerProperty,
  BusinessType,
  PlayerBusiness,
  OfflineStatus,
} from '../api/game';

interface GameState {
  // Data
  stats: PlayerStats | null;
  propertyTypes: PropertyType[];
  playerProperties: PlayerProperty[];
  businessTypes: BusinessType[];
  playerBusinesses: PlayerBusiness[];
  offlineStatus: OfflineStatus | null;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchPropertyTypes: () => Promise<void>;
  fetchPlayerProperties: () => Promise<void>;
  fetchBusinessTypes: () => Promise<void>;
  fetchPlayerBusinesses: () => Promise<void>;
  fetchOfflineStatus: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // Game Actions
  buyProperty: (typeId: number) => Promise<boolean>;
  upgradeProperty: (propertyId: string) => Promise<boolean>;
  hireManager: (propertyId: string) => Promise<boolean>;
  buyBusiness: (typeId: number) => Promise<boolean>;
  levelUpBusiness: (businessId: string) => Promise<boolean>;
  collectBusinessRevenue: (businessId: string) => Promise<string | null>;
  collectOfflineEarnings: () => Promise<string | null>;

  // Helpers
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  stats: null,
  propertyTypes: [],
  playerProperties: [],
  businessTypes: [],
  playerBusinesses: [],
  offlineStatus: null,
  isLoading: false,
  error: null,
};

export const useGameStore = create<GameState>()((set, get) => ({
  ...initialState,

  fetchStats: async () => {
    const response = await gameApi.getStats();
    if (response.success && response.data) {
      set({ stats: response.data });
    }
  },

  fetchPropertyTypes: async () => {
    const response = await gameApi.getPropertyTypes();
    if (response.success && response.data) {
      set({ propertyTypes: response.data });
    }
  },

  fetchPlayerProperties: async () => {
    const response = await gameApi.getPlayerProperties();
    if (response.success && response.data) {
      set({ playerProperties: response.data });
    }
  },

  fetchBusinessTypes: async () => {
    const response = await gameApi.getBusinessTypes();
    if (response.success && response.data) {
      set({ businessTypes: response.data });
    }
  },

  fetchPlayerBusinesses: async () => {
    const response = await gameApi.getPlayerBusinesses();
    if (response.success && response.data) {
      set({ playerBusinesses: response.data });
    }
  },

  fetchOfflineStatus: async () => {
    const response = await gameApi.getOfflineStatus();
    if (response.success && response.data) {
      set({ offlineStatus: response.data });
    }
  },

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().fetchStats(),
        get().fetchPropertyTypes(),
        get().fetchPlayerProperties(),
        get().fetchBusinessTypes(),
        get().fetchPlayerBusinesses(),
        get().fetchOfflineStatus(),
      ]);
    } catch (err) {
      set({ error: 'Failed to load game data' });
    } finally {
      set({ isLoading: false });
    }
  },

  buyProperty: async (typeId: number) => {
    set({ error: null });
    const response = await gameApi.buyProperty(typeId);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerProperties()]);
      return true;
    }
    set({ error: response.error?.message || 'Failed to buy property' });
    return false;
  },

  upgradeProperty: async (propertyId: string) => {
    set({ error: null });
    const response = await gameApi.upgradeProperty(propertyId);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerProperties()]);
      return true;
    }
    set({ error: response.error?.message || 'Failed to upgrade property' });
    return false;
  },

  hireManager: async (propertyId: string) => {
    set({ error: null });
    const response = await gameApi.hireManager(propertyId);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerProperties()]);
      return true;
    }
    set({ error: response.error?.message || 'Failed to hire manager' });
    return false;
  },

  buyBusiness: async (typeId: number) => {
    set({ error: null });
    const response = await gameApi.buyBusiness(typeId);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerBusinesses()]);
      return true;
    }
    set({ error: response.error?.message || 'Failed to buy business' });
    return false;
  },

  levelUpBusiness: async (businessId: string) => {
    set({ error: null });
    const response = await gameApi.levelUpBusiness(businessId);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerBusinesses()]);
      return true;
    }
    set({ error: response.error?.message || 'Failed to level up business' });
    return false;
  },

  collectBusinessRevenue: async (businessId: string) => {
    set({ error: null });
    const response = await gameApi.collectBusinessRevenue(businessId);
    if (response.success && response.data) {
      await Promise.all([get().fetchStats(), get().fetchPlayerBusinesses()]);
      return response.data.collected;
    }
    set({ error: response.error?.message || 'Failed to collect revenue' });
    return null;
  },

  collectOfflineEarnings: async () => {
    set({ error: null });
    const response = await gameApi.collectOfflineEarnings();
    if (response.success && response.data) {
      await Promise.all([get().fetchStats(), get().fetchOfflineStatus()]);
      return response.data.collected;
    }
    set({ error: response.error?.message || 'Failed to collect offline earnings' });
    return null;
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
