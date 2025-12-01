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

export interface PrestigeStatus {
  prestigeLevel: number;
  prestigePoints: number;
  timesPrestiged: number;
  prestigeMultiplier: string;
  currentNetWorth: string;
  potentialPoints: number;
  canPrestige: boolean;
  minimumNetWorth: number;
}

export interface PrestigePerk {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tier: number;
  cost: number;
  effect: { type: string; value: number };
  maxLevel: number;
  iconUrl: string | null;
  sortOrder: number;
  currentLevel: number;
  canPurchase: boolean;
  totalCost: number;
}

export interface DailyRewardData {
  amount: number;
  bonusCoins?: number;
  prestigePoints?: number;
}

export interface DailyStatus {
  currentStreak: number;
  longestStreak: number;
  currentDay: number;
  canClaim: boolean;
  lastClaimAt: string | null;
  nextReward: {
    day: number;
    rewardType: string;
    rewardData: DailyRewardData;
  } | null;
  upcomingRewards: Array<{
    day: number;
    rewardType: string;
    rewardData: DailyRewardData;
    isMilestone: boolean;
  }>;
}

export interface DailyClaimResult {
  day: number;
  rewardType: string;
  rewardData: DailyRewardData;
  newStreak: number;
  newCash: string;
  streakBroken: boolean;
}

export interface DailyReward {
  day: number;
  rewardType: string;
  rewardData: DailyRewardData;
  isMilestone: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  previousRank: number | null;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarId: string | null;
  avatarFrameId: string | null;
  badgeId: string | null;
  isPremium: boolean;
  score: string;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  leaderboardId: string;
  name: string;
  description: string;
  entries: LeaderboardEntry[];
  totalEntries: number;
  lastUpdated: string | null;
}

export interface PlayerRankResponse {
  leaderboardId: string;
  rank: number | null;
  previousRank: number | null;
  score: string | null;
  totalPlayers: number;
  percentile: number | null;
}

export interface LeaderboardType {
  id: string;
  name: string;
  description: string;
}

export interface AchievementWithProgress {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  category: string;
  tier: string;
  points: number;
  requirementType: string;
  requirementValue: string;
  rewardCash: string;
  rewardPremium: number;
  isSecret: boolean;
  sortOrder: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  currentProgress: number;
  progressPercent: number;
}

export interface AchievementSummary {
  totalAchievements: number;
  unlockedCount: number;
  totalPoints: number;
  earnedPoints: number;
  categories: Array<{
    name: string;
    total: number;
    unlocked: number;
  }>;
}

export interface NewlyUnlockedAchievement {
  id: string;
  name: string;
  description: string;
  tier: string;
  points: number;
  rewardCash: string;
}

export interface IPOStatus {
  id: string;
  tickerSymbol: string;
  ipoPrice: string;
  currentPrice: string;
  highPrice: string;
  lowPrice: string;
  basePoints: number;
  currentMultiplier: number;
  potentialPoints: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  trendStrength: number;
  activeEvent: {
    slug: string;
    name: string;
    description: string;
    isPositive: boolean;
    expiresAt: string;
  } | null;
  priceHistory: Array<{ time: number; price: number }>;
  startsAt: string;
  expiresAt: string;
  timeRemainingMs: number;
  percentChange: number;
}

export interface IPOLaunchResult {
  id: string;
  tickerSymbol: string;
  ipoPrice: string;
  basePoints: number;
}

export interface IPOSellResult {
  cashEarned: string;
  multiplier: number;
}

export interface IPOCancelResult {
  cashEarned: string;
}

// Stock Market types
export interface StockMarketData {
  tickerSymbol: string;
  companyName: string;
  stockType: 'player' | 'bot';
  currentPrice: string;
  previousClose: string;
  highPrice24h: string;
  lowPrice24h: string;
  change: string;
  changePercent: number;
  volume24h: number;
  trend: string;
  marketCap?: string;
  sector?: string;
  description?: string;
}

export interface StockDetail extends StockMarketData {
  totalShares?: number;
  floatShares?: number;
  ownerShares?: number;
  basePrice?: string;
  volatility?: string;
}

export interface StockHoldingData {
  id: string;
  tickerSymbol: string;
  companyName: string;
  stockType: 'player' | 'bot';
  shares: number;
  avgBuyPrice: string;
  totalInvested: string;
  currentPrice: string;
  currentValue: string;
  profitLoss: string;
  profitLossPercent: number;
}

export interface StockOrderData {
  id: string;
  tickerSymbol: string;
  companyName: string;
  stockType: 'player' | 'bot';
  orderType: 'buy' | 'sell';
  shares: number;
  pricePerShare: string;
  totalAmount: string;
  createdAt: string;
}

export interface StockBuyResult {
  holding: StockHoldingData;
  order: StockOrderData;
}

export interface StockSellResult {
  holding: StockHoldingData | null;
  order: StockOrderData;
}

export interface MarketMover {
  tickerSymbol: string;
  companyName: string;
  currentPrice: string;
  changePercent: number;
  stockType: 'bot' | 'player';
}

export interface VolumeLeader {
  tickerSymbol: string;
  companyName: string;
  volume24h: number;
  currentPrice: string;
  changePercent: number;
  stockType: 'bot' | 'player';
}

export interface MarketEvent {
  tickerSymbol: string;
  type: 'pump' | 'dump' | 'news_positive' | 'news_negative';
  magnitude: number;
  startedAt: string;
  remainingMs: number;
}

export interface MarketSummaryData {
  overview: {
    totalStocks: number;
    gainersCount: number;
    losersCount: number;
    unchangedCount: number;
    totalVolume: number;
    avgChange: number;
  };
  topGainers: MarketMover[];
  topLosers: MarketMover[];
  volumeLeaders: VolumeLeader[];
  activeEvents: MarketEvent[];
}

// Progression types
export interface Phase {
  id: number;
  slug: string;
  name: string;
  description: string;
  netWorthRequired: string;
  iconUrl: string | null;
  unlockMessage: string | null;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  cost: string;
  phaseRequired: number;
  prerequisiteId: string | null;
  effect: { type: string; value: number; target?: string };
  isOneTime: boolean;
  isPurchased: boolean;
  canPurchase: boolean;
}

export interface Upgrade {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tier: number;
  baseCost: string;
  costMultiplier: string;
  effect: { type: string; value: number };
  maxLevel: number;
  phaseRequired: number;
  currentLevel: number;
  currentCost: string;
  canPurchase: boolean;
}

export interface PhaseStatus {
  currentPhase: {
    id: number;
    slug: string;
    name: string;
    description: string;
    netWorthRequired: number;
    isUnlocked: boolean;
    isCurrent: boolean;
    progress: number;
  };
  allPhases: Array<{
    id: number;
    slug: string;
    name: string;
    description: string;
    netWorthRequired: number;
    isUnlocked: boolean;
    isCurrent: boolean;
    progress: number;
  }>;
  netWorth: string;
}

export interface ProgressionStatus {
  phase: PhaseStatus;
  projects: Project[];
  upgrades: Upgrade[];
}

// Friends types
export interface Friend {
  id: string;
  status: string;
  requestedAt: string;
  respondedAt: string | null;
  friend: {
    id: string;
    username: string;
    displayName: string | null;
  };
  isRequester: boolean;
}

export interface FriendRequest {
  id: string;
  status: string;
  requestedAt: string;
  requester: {
    id: string;
    username: string;
    displayName: string | null;
  };
}

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  isFriend: boolean;
}

// Club types
export interface ClubInfo {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  ownerUsername: string;
  isPublic: boolean;
  memberCount: number;
  maxMembers: number;
  clubLevel: number;
  incomeBonusPct: string;
  totalDonations: string;
  nextLevelDonations: number | null;
  createdAt: string;
  isMember: boolean;
  isOwner: boolean;
  role: string | null;
}

export interface ClubMember {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
  joinedAt: string;
}

export interface ClubActivity {
  id: string;
  type: string;
  data: Record<string, unknown> | null;
  user: { username: string; displayName: string | null };
  createdAt: string;
}

// Gift types
export interface GiftInfo {
  id: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  receiverUsername: string;
  giftType: string;
  giftData: { amount?: number; boostId?: string };
  message: string | null;
  status: string;
  expiresAt: string;
  claimedAt: string | null;
  createdAt: string;
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

  async createSnapshot(
    type: 'hourly' | 'daily' = 'hourly'
  ): Promise<ApiResponse<EarningsSnapshot>> {
    return apiClient.post<EarningsSnapshot>('/game/stats/snapshot', { type });
  },

  // Prestige
  async getPrestigeStatus(): Promise<ApiResponse<PrestigeStatus>> {
    return apiClient.get<PrestigeStatus>('/prestige/status');
  },

  async getPrestigePerks(): Promise<ApiResponse<PrestigePerk[]>> {
    return apiClient.get<PrestigePerk[]>('/prestige/perks');
  },

  async goPublic(): Promise<ApiResponse<{ pointsEarned: number; newPrestigeLevel: number }>> {
    return apiClient.post<{ pointsEarned: number; newPrestigeLevel: number }>(
      '/prestige/go-public'
    );
  },

  async buyPerk(
    perkId: string
  ): Promise<ApiResponse<{ perk: PrestigePerk; remainingPoints: number }>> {
    return apiClient.post<{ perk: PrestigePerk; remainingPoints: number }>('/prestige/buy-perk', {
      perkId,
    });
  },

  // Daily Rewards
  async getDailyStatus(): Promise<ApiResponse<DailyStatus>> {
    return apiClient.get<DailyStatus>('/daily/status');
  },

  async claimDailyReward(): Promise<ApiResponse<DailyClaimResult>> {
    return apiClient.post<DailyClaimResult>('/daily/claim');
  },

  async getAllDailyRewards(): Promise<ApiResponse<DailyReward[]>> {
    return apiClient.get<DailyReward[]>('/daily/rewards');
  },

  // Leaderboards
  async getLeaderboardTypes(): Promise<ApiResponse<LeaderboardType[]>> {
    return apiClient.get<LeaderboardType[]>('/leaderboards/types');
  },

  async getLeaderboard(
    type: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ApiResponse<LeaderboardResponse>> {
    return apiClient.get<LeaderboardResponse>(
      `/leaderboards/${type}?limit=${limit}&offset=${offset}`
    );
  },

  async getMyRank(type: string): Promise<ApiResponse<PlayerRankResponse>> {
    return apiClient.get<PlayerRankResponse>(`/leaderboards/${type}/me`);
  },

  async refreshLeaderboards(): Promise<ApiResponse<{ updated: string[] }>> {
    return apiClient.post<{ updated: string[] }>('/leaderboards/refresh');
  },

  // Achievements
  async getAchievements(): Promise<ApiResponse<AchievementWithProgress[]>> {
    return apiClient.get<AchievementWithProgress[]>('/achievements');
  },

  async getAchievementSummary(): Promise<ApiResponse<AchievementSummary>> {
    return apiClient.get<AchievementSummary>('/achievements/summary');
  },

  async getRecentAchievements(limit: number = 5): Promise<ApiResponse<AchievementWithProgress[]>> {
    return apiClient.get<AchievementWithProgress[]>(`/achievements/recent?limit=${limit}`);
  },

  async checkAchievements(): Promise<
    ApiResponse<{ newlyUnlocked: NewlyUnlockedAchievement[]; count: number }>
  > {
    return apiClient.post<{ newlyUnlocked: NewlyUnlockedAchievement[]; count: number }>(
      '/achievements/check'
    );
  },

  // IPO
  async getIPOStatus(): Promise<ApiResponse<IPOStatus | null> & { hasActiveIPO?: boolean }> {
    return apiClient.get<IPOStatus | null>('/ipo/status');
  },

  async launchIPO(): Promise<ApiResponse<IPOStatus>> {
    return apiClient.post<IPOStatus>('/ipo/launch');
  },

  async sellIPOShares(): Promise<ApiResponse<IPOSellResult>> {
    return apiClient.post<IPOSellResult>('/ipo/sell');
  },

  async cancelIPO(): Promise<ApiResponse<IPOCancelResult>> {
    return apiClient.post<IPOCancelResult>('/ipo/cancel');
  },

  // Friends
  async getFriends(): Promise<ApiResponse<Friend[]>> {
    return apiClient.get<Friend[]>('/friends');
  },

  async getFriendRequests(): Promise<ApiResponse<FriendRequest[]>> {
    return apiClient.get<FriendRequest[]>('/friends/requests');
  },

  async getSentRequests(): Promise<ApiResponse<FriendRequest[]>> {
    return apiClient.get<FriendRequest[]>('/friends/sent');
  },

  async searchUsers(query: string): Promise<ApiResponse<UserSearchResult[]>> {
    return apiClient.get<UserSearchResult[]>(`/friends/search?q=${encodeURIComponent(query)}`);
  },

  async sendFriendRequest(username: string): Promise<ApiResponse<{ id: string }>> {
    return apiClient.post<{ id: string }>('/friends/request', { username });
  },

  async acceptFriendRequest(friendshipId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/friends/${friendshipId}/accept`);
  },

  async rejectFriendRequest(friendshipId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/friends/${friendshipId}/reject`);
  },

  async removeFriend(friendshipId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/friends/${friendshipId}`);
  },

  // Clubs
  async getPublicClubs(): Promise<ApiResponse<ClubInfo[]>> {
    return apiClient.get<ClubInfo[]>('/clubs');
  },

  async getMyClub(): Promise<ApiResponse<ClubInfo | null>> {
    return apiClient.get<ClubInfo | null>('/clubs/my');
  },

  async getClub(clubId: string): Promise<ApiResponse<ClubInfo & { members: ClubMember[] }>> {
    return apiClient.get<ClubInfo & { members: ClubMember[] }>(`/clubs/${clubId}`);
  },

  async getClubActivities(clubId: string): Promise<ApiResponse<ClubActivity[]>> {
    return apiClient.get<ClubActivity[]>(`/clubs/${clubId}/activities`);
  },

  async createClub(
    name: string,
    description?: string,
    isPublic?: boolean
  ): Promise<ApiResponse<ClubInfo>> {
    return apiClient.post<ClubInfo>('/clubs', { name, description, isPublic });
  },

  async joinClub(clubId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/clubs/${clubId}/join`);
  },

  async leaveClub(): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/clubs/leave');
  },

  async donateToClub(amount: number): Promise<ApiResponse<{ newLevel: number; newBonus: string }>> {
    return apiClient.post<{ newLevel: number; newBonus: string }>('/clubs/donate', { amount });
  },

  async kickClubMember(userId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/clubs/kick/${userId}`);
  },

  // Gifts
  async getPendingGifts(): Promise<ApiResponse<GiftInfo[]>> {
    return apiClient.get<GiftInfo[]>('/gifts');
  },

  async getSentGifts(): Promise<ApiResponse<GiftInfo[]>> {
    return apiClient.get<GiftInfo[]>('/gifts/sent');
  },

  async getGiftCounts(): Promise<
    ApiResponse<{ pending: number; sentToday: number; maxPerDay: number }>
  > {
    return apiClient.get<{ pending: number; sentToday: number; maxPerDay: number }>(
      '/gifts/counts'
    );
  },

  async sendGift(
    receiverId: string,
    giftType: string,
    amount?: number,
    message?: string
  ): Promise<ApiResponse<GiftInfo>> {
    return apiClient.post<GiftInfo>('/gifts/send', { receiverId, giftType, amount, message });
  },

  async claimGift(
    giftId: string
  ): Promise<ApiResponse<{ claimed: GiftInfo; cashReceived?: number }>> {
    return apiClient.post<{ claimed: GiftInfo; cashReceived?: number }>(`/gifts/${giftId}/claim`);
  },

  // Progression
  async getProgressionStatus(): Promise<ApiResponse<ProgressionStatus>> {
    return apiClient.get<ProgressionStatus>('/progression/status');
  },

  async getPhases(): Promise<ApiResponse<Phase[]>> {
    return apiClient.get<Phase[]>('/progression/phases');
  },

  async getProjects(): Promise<ApiResponse<Project[]>> {
    return apiClient.get<Project[]>('/progression/projects');
  },

  async buyProject(slug: string): Promise<ApiResponse<{ project: Project; newCash: string }>> {
    return apiClient.post<{ project: Project; newCash: string }>(
      `/progression/projects/${slug}/purchase`
    );
  },

  async getUpgrades(): Promise<ApiResponse<Upgrade[]>> {
    return apiClient.get<Upgrade[]>('/progression/upgrades');
  },

  async buyUpgrade(
    slug: string
  ): Promise<ApiResponse<{ upgrade: Upgrade; remainingCash: string }>> {
    return apiClient.post<{ upgrade: Upgrade; remainingCash: string }>(
      `/progression/upgrades/${slug}/purchase`
    );
  },

  // Stock Market
  async getMarketStocks(): Promise<ApiResponse<StockMarketData[]>> {
    return apiClient.get<StockMarketData[]>('/stocks/market');
  },

  async getStockByTicker(ticker: string): Promise<ApiResponse<StockDetail>> {
    return apiClient.get<StockDetail>(`/stocks/market/${ticker}`);
  },

  async getPlayerStock(userId?: string): Promise<ApiResponse<StockDetail | null>> {
    const endpoint = userId ? `/stocks/player/${userId}` : '/stocks/player';
    return apiClient.get<StockDetail | null>(endpoint);
  },

  async listPlayerStock(
    tickerSymbol: string,
    companyName: string,
    options?: {
      marketCap?: number;
      sharePrice?: number;
      floatPercentage?: number;
    }
  ): Promise<ApiResponse<StockDetail>> {
    return apiClient.post<StockDetail>('/stocks/list', {
      tickerSymbol,
      companyName,
      ...options,
    });
  },

  async updatePlayerStockName(companyName: string): Promise<ApiResponse<StockDetail>> {
    return apiClient.put<StockDetail>('/stocks/list', { companyName });
  },

  async delistPlayerStock(): Promise<ApiResponse<void>> {
    return apiClient.delete<void>('/stocks/list');
  },

  async getPortfolio(): Promise<ApiResponse<StockHoldingData[]>> {
    return apiClient.get<StockHoldingData[]>('/stocks/portfolio');
  },

  async buyStockShares(ticker: string, shares: number): Promise<ApiResponse<StockBuyResult>> {
    return apiClient.post<StockBuyResult>('/stocks/buy', { ticker, shares });
  },

  async sellStockShares(ticker: string, shares: number): Promise<ApiResponse<StockSellResult>> {
    return apiClient.post<StockSellResult>('/stocks/sell', { ticker, shares });
  },

  async getStockOrderHistory(limit?: number): Promise<ApiResponse<StockOrderData[]>> {
    const query = limit ? `?limit=${limit}` : '';
    return apiClient.get<StockOrderData[]>(`/stocks/orders${query}`);
  },

  async getRecentTrades(limit?: number): Promise<
    ApiResponse<
      Array<{
        id: string;
        tickerSymbol: string;
        orderType: 'buy' | 'sell';
        shares: number;
        pricePerShare: string;
        createdAt: string;
        traderName: string;
        traderType: 'player' | 'bot';
      }>
    >
  > {
    const query = limit ? `?limit=${limit}` : '';
    return apiClient.get<
      Array<{
        id: string;
        tickerSymbol: string;
        orderType: 'buy' | 'sell';
        shares: number;
        pricePerShare: string;
        createdAt: string;
        traderName: string;
        traderType: 'player' | 'bot';
      }>
    >(`/stocks/trades${query}`);
  },

  async getMarketSummary(): Promise<ApiResponse<MarketSummaryData>> {
    return apiClient.get<MarketSummaryData>('/stocks/market-summary');
  },
};
