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

  // Ticker state
  displayedCash: number;
  incomePerSecond: number;
  tickerInterval: ReturnType<typeof setInterval> | null;
  syncInterval: ReturnType<typeof setInterval> | null;

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
  sellProperty: (propertyId: string, quantity?: number) => Promise<boolean>;
  buyBusiness: (typeId: number) => Promise<boolean>;
  levelUpBusiness: (businessId: string) => Promise<boolean>;
  collectBusinessRevenue: (businessId: string) => Promise<string | null>;
  collectOfflineEarnings: () => Promise<string | null>;

  // Ticker
  collectEarnings: () => Promise<void>;
  startTicker: () => void;
  stopTicker: () => void;

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
  displayedCash: 0,
  incomePerSecond: 0,
  tickerInterval: null as ReturnType<typeof setInterval> | null,
  syncInterval: null as ReturnType<typeof setInterval> | null,
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

  sellProperty: async (propertyId: string, quantity: number = 1) => {
    set({ error: null });
    const response = await gameApi.sellProperty(propertyId, quantity);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerProperties()]);
      return true;
    }
    set({ error: response.error?.message || 'Failed to sell property' });
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

  // Collect earnings from server and sync cash
  collectEarnings: async () => {
    const response = await gameApi.collectEarnings();
    if (response.success && response.data) {
      const newCash = parseFloat(response.data.newCash);
      const incomePerHour = parseFloat(response.data.incomePerHour);
      set({
        displayedCash: newCash,
        incomePerSecond: incomePerHour / 3600,
      });
      // Also update stats
      await get().fetchStats();
    }
  },

  // Start real-time cash ticker (updates displayed cash every 100ms)
  startTicker: () => {
    // Clear any existing intervals
    const existingTicker = get().tickerInterval;
    const existingSync = get().syncInterval;
    if (existingTicker) clearInterval(existingTicker);
    if (existingSync) clearInterval(existingSync);

    // Initialize displayedCash from current stats
    const stats = get().stats;
    if (stats) {
      const incomePerHour = parseFloat(stats.effectiveIncomeHour);
      set({
        displayedCash: parseFloat(stats.cash),
        incomePerSecond: incomePerHour / 3600,
      });
    }

    // Collect from server immediately to sync
    get().collectEarnings();

    // Update displayed cash locally every 100ms
    const tickerInterval = setInterval(() => {
      const { displayedCash, incomePerSecond } = get();
      if (incomePerSecond > 0) {
        set({ displayedCash: displayedCash + incomePerSecond * 0.1 });
      }
    }, 100);

    // Sync with server every 5 seconds
    const syncInterval = setInterval(() => {
      get().collectEarnings();
    }, 5000);

    set({ tickerInterval, syncInterval });
  },

  stopTicker: () => {
    const { tickerInterval, syncInterval } = get();
    if (tickerInterval) clearInterval(tickerInterval);
    if (syncInterval) clearInterval(syncInterval);
    set({ tickerInterval: null, syncInterval: null });
  },

  clearError: () => set({ error: null }),

  reset: () => {
    // Stop ticker before reset
    get().stopTicker();
    set(initialState);
  },
}));
