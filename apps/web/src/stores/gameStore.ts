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

  // Sync tracking
  lastSyncedCash: number;
  isSyncing: boolean;
  syncFailed: boolean;

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
  sellBusiness: (businessId: string) => Promise<{
    businessName: string;
    cashReceived: string;
  } | null>;
  collectBusinessRevenue: (businessId: string, collectionType?: 'minigame' | 'instant') => Promise<{
    collected: string;
    message?: string;
  } | null>;
  collectOfflineEarnings: () => Promise<string | null>;

  // Ticker
  collectEarnings: () => Promise<void>;
  startTicker: () => Promise<void>;
  stopTicker: () => void;

  // Helpers
  clearError: () => void;
  reset: () => void;
  refreshStats: () => Promise<void>;
  syncDisplayedCashFromStats: () => void;
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
  lastSyncedCash: 0,
  isSyncing: false,
  syncFailed: false,
  isLoading: false,
  error: null,
};

export const useGameStore = create<GameState>()((set, get) => ({
  ...initialState,

  // Helper to sync displayedCash from stats after game actions
  syncDisplayedCashFromStats: () => {
    const stats = get().stats;
    if (stats) {
      const cash = parseFloat(stats.cash);
      const incomePerHour = parseFloat(stats.effectiveIncomeHour);
      set({
        displayedCash: cash,
        lastSyncedCash: cash,
        incomePerSecond: incomePerHour / 3600,
      });
    }
  },

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
    } catch {
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
      get().syncDisplayedCashFromStats();
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
      get().syncDisplayedCashFromStats();
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
      get().syncDisplayedCashFromStats();
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
      get().syncDisplayedCashFromStats();
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
      get().syncDisplayedCashFromStats();
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
      get().syncDisplayedCashFromStats();
      return true;
    }
    set({ error: response.error?.message || 'Failed to level up business' });
    return false;
  },

  sellBusiness: async (businessId: string) => {
    set({ error: null });
    const response = await gameApi.sellBusiness(businessId);
    if (response.success && response.data) {
      await Promise.all([get().fetchStats(), get().fetchPlayerBusinesses()]);
      get().syncDisplayedCashFromStats();
      return {
        businessName: response.data.businessName,
        cashReceived: response.data.cashReceived,
      };
    }
    set({ error: response.error?.message || 'Failed to sell business' });
    return null;
  },

  collectBusinessRevenue: async (businessId: string, collectionType: 'minigame' | 'instant' = 'minigame') => {
    set({ error: null });
    const response = await gameApi.collectBusinessRevenue(businessId, collectionType);
    if (response.success && response.data) {
      await Promise.all([get().fetchStats(), get().fetchPlayerBusinesses()]);
      get().syncDisplayedCashFromStats();
      return {
        collected: response.data.collected,
        message: response.data.message,
      };
    }
    set({ error: response.error?.message || 'Failed to collect revenue' });
    return null;
  },

  collectOfflineEarnings: async () => {
    set({ error: null });
    const response = await gameApi.collectOfflineEarnings();
    if (response.success && response.data) {
      // Only fetch stats - don't fetch offlineStatus to avoid showing 0 in the modal
      // The offlineStatus will be refreshed on next page load
      await get().fetchStats();
      set({ offlineStatus: null });
      get().syncDisplayedCashFromStats();
      return response.data.collected;
    }
    set({ error: response.error?.message || 'Failed to collect offline earnings' });
    return null;
  },

  // Collect earnings from server and sync cash
  collectEarnings: async () => {
    set({ isSyncing: true });
    try {
      const response = await gameApi.collectEarnings();
      if (response.success && response.data) {
        const newCash = parseFloat(response.data.newCash);
        const incomePerHour = parseFloat(response.data.incomePerHour);
        set({
          displayedCash: newCash,
          lastSyncedCash: newCash,
          incomePerSecond: incomePerHour / 3600,
          isSyncing: false,
          syncFailed: false,
        });
        // Also update stats
        await get().fetchStats();
      } else {
        // Sync failed - rollback to last known good value
        const { lastSyncedCash } = get();
        set({
          displayedCash: lastSyncedCash,
          isSyncing: false,
          syncFailed: true,
        });
      }
    } catch {
      // Network error - rollback to last known good value
      const { lastSyncedCash } = get();
      set({
        displayedCash: lastSyncedCash,
        isSyncing: false,
        syncFailed: true,
      });
    }
  },

  // Start real-time cash ticker (updates displayed cash every 100ms)
  startTicker: async () => {
    // Clear any existing intervals
    const existingTicker = get().tickerInterval;
    const existingSync = get().syncInterval;
    if (existingTicker) clearInterval(existingTicker);
    if (existingSync) clearInterval(existingSync);

    // Initialize displayedCash from current stats
    const stats = get().stats;
    if (stats) {
      const incomePerHour = parseFloat(stats.effectiveIncomeHour);
      const cash = parseFloat(stats.cash);
      set({
        displayedCash: cash,
        lastSyncedCash: cash,
        incomePerSecond: incomePerHour / 3600,
        syncFailed: false,
      });
    }

    // Collect from server immediately to sync - AWAIT this
    await get().collectEarnings();

    // Update displayed cash locally every 100ms
    const tickerInterval = setInterval(() => {
      const { displayedCash, incomePerSecond, syncFailed } = get();
      // Don't increment if sync failed (wait for recovery)
      if (incomePerSecond > 0 && !syncFailed) {
        set({ displayedCash: displayedCash + incomePerSecond * 0.1 });
      }
    }, 100);

    // Sync with server every 2 seconds (reduced from 5s for better accuracy)
    const syncInterval = setInterval(() => {
      get().collectEarnings();
    }, 2000);

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

  refreshStats: async () => {
    await get().fetchStats();
    // Also update the displayed cash from the new stats
    const stats = get().stats;
    if (stats) {
      set({ displayedCash: parseFloat(stats.cash) });
    }
  },
}));
