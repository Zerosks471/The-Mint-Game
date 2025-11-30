// Progression domain types - Achievements, Daily Rewards, Prestige, Leaderboards

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

export type AchievementCategory =
  | 'wealth'
  | 'properties'
  | 'businesses'
  | 'managers'
  | 'prestige'
  | 'social'
  | 'special';

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
  category: AchievementCategory;
  tier: number;
  requirement: AchievementRequirement;
  rewardType: string;
  rewardData: Record<string, unknown>;
  sortOrder: number;
  isHidden: boolean;
  isActive: boolean;
}

export interface AchievementRequirement {
  type: string;
  value: number;
  comparison?: 'gte' | 'lte' | 'eq';
}

export interface PlayerAchievement {
  id: string;
  achievementId: string;
  userId: string;
  progress: number;
  unlockedAt: Date | null;
  claimedAt: Date | null;
}

export interface AchievementWithProgress extends Achievement {
  progress: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  unlockedAt: Date | null;
}

export interface AchievementSummary {
  total: number;
  unlocked: number;
  claimed: number;
  percentComplete: number;
}

// ============================================================================
// DAILY REWARDS
// ============================================================================

export type DailyRewardType = 'cash' | 'premium_currency' | 'boost' | 'cosmetic';

export interface DailyReward {
  day: number;
  rewardType: DailyRewardType;
  rewardData: DailyRewardData;
  iconUrl: string | null;
}

export interface DailyRewardData {
  amount?: number;
  coins?: number;
  boostId?: string;
  cosmeticId?: string;
}

export interface PlayerDailyStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastClaimAt: Date | null;
  currentDay: number;
}

export interface DailyRewardStatus {
  canClaim: boolean;
  currentDay: number;
  currentStreak: number;
  longestStreak: number;
  nextReward: DailyReward | null;
  lastClaimAt: Date | null;
  timeUntilReset: number;
}

// ============================================================================
// PRESTIGE
// ============================================================================

export type PrestigePerkCategory = 'income' | 'offline' | 'speed' | 'cosmetic';

export interface PrestigePerk {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: PrestigePerkCategory;
  tier: number;
  cost: number;
  effect: PrestigePerkEffect;
  maxLevel: number;
  iconUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface PrestigePerkEffect {
  type: 'income_mult' | 'offline_cap' | 'cost_reduction' | 'xp_mult';
  value: number;
}

export interface PlayerPrestigePerk {
  id: string;
  userId: string;
  perkId: string;
  level: number;
  purchasedAt: Date;
}

export interface PrestigePerkWithLevel extends PrestigePerk {
  currentLevel: number;
  canPurchase: boolean;
  totalCost: number;
}

export interface PrestigeStatus {
  prestigeLevel: number;
  prestigePoints: number;
  prestigeMultiplier: string;
  timesPrestiged: number;
  currentNetWorth: string;
  minimumNetWorth: number;
  potentialPoints: number;
  canPrestige: boolean;
}

// ============================================================================
// IPO
// ============================================================================

export type IPOTrend = 'bullish' | 'bearish' | 'neutral';

export interface PlayerIPO {
  id: string;
  userId: string;
  tickerSymbol: string;
  ipoPrice: string;
  currentPrice: string;
  highPrice: string;
  lowPrice: string;
  basePoints: number;
  trend: IPOTrend;
  trendStrength: number;
  activeEvent: string | null;
  eventExpiresAt: Date | null;
  priceHistory: PricePoint[];
  lastTickAt: Date;
  startsAt: Date;
  expiresAt: Date;
}

export interface PricePoint {
  time: number;
  price: number;
}

export interface MarketEvent {
  id: string;
  slug: string;
  name: string;
  description: string;
  effectType: 'trend_bias' | 'instant_spike' | 'tick_modifier';
  effectValue: number;
  durationMinutes: number;
  isPositive: boolean;
  rarity: number;
  isActive: boolean;
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
  trend: IPOTrend;
  trendStrength: number;
  activeEvent: {
    slug: string;
    name: string;
    description: string;
    isPositive: boolean;
    expiresAt: string;
  } | null;
  priceHistory: PricePoint[];
  startsAt: string;
  expiresAt: string;
  timeRemainingMs: number;
  percentChange: number;
}

// ============================================================================
// LEADERBOARDS
// ============================================================================

export type LeaderboardType =
  | 'global_net_worth'
  | 'global_income'
  | 'weekly_earnings'
  | 'prestige_level';

export interface LeaderboardEntry {
  rank: number;
  previousRank: number | null;
  userId: string;
  username: string;
  displayName: string | null;
  avatarId: string;
  score: string;
  updatedAt: Date;
}

export interface LeaderboardInfo {
  type: LeaderboardType;
  name: string;
  description: string;
  resetSchedule: string | null;
}

export interface PlayerRank {
  rank: number;
  previousRank: number | null;
  score: string;
  percentile: number;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export type NotificationType =
  | 'achievement'
  | 'friend_request'
  | 'friend_accepted'
  | 'gift'
  | 'club_invite'
  | 'club_level_up'
  | 'daily_reward'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationCounts {
  unread: number;
  total: number;
}
