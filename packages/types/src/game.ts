// Game domain types

export interface PlayerStats {
  userId: string;
  cash: number;
  premiumCurrency: number;
  lifetimeCashEarned: number;
  playerLevel: number;
  experiencePoints: number;
  prestigeLevel: number;
  prestigePoints: number;
  prestigeMultiplier: number;
  timesPrestiged: number;
  baseIncomePerHour: number;
  currentMultiplier: number;
  effectiveIncomeHour: number;
  lastCollectionAt: Date;
  offlineCapHours: number;
  totalPropertiesOwned: number;
  totalBusinessesOwned: number;
  highestNetWorth: number;
  totalPlayTimeMins: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyType {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  imageUrl: string | null;
  category: PropertyCategory;
  tier: number;
  unlockRequirement: Record<string, unknown> | null;
  baseCost: number;
  costMultiplier: number;
  baseIncomeHour: number;
  incomeMultiplier: number;
  managerCost: number | null;
  managerName: string | null;
  maxQuantity: number;
  maxUpgradeLevel: number;
  sortOrder: number;
  isActive: boolean;
}

export type PropertyCategory = 'residential' | 'commercial' | 'industrial' | 'luxury';

export interface PlayerProperty {
  id: string;
  userId: string;
  propertyTypeId: number;
  quantity: number;
  totalSpent: number;
  upgradeLevel: number;
  managerHired: boolean;
  managerHiredAt: Date | null;
  currentIncomeHour: number;
  nextPurchaseCost: number;
  nextUpgradeCost: number;
  skinId: string | null;
  firstPurchasedAt: Date;
  updatedAt: Date;
}

export interface BusinessType {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  imageUrl: string | null;
  category: BusinessCategory;
  tier: number;
  unlockRequirement: Record<string, unknown> | null;
  baseCost: number;
  baseRevenue: number;
  cycleSeconds: number;
  levelCostMult: number;
  levelRevenueMult: number;
  maxEmployees: number;
  employeeBaseCost: number | null;
  employeeBonusPct: number;
  maxLevel: number;
  sortOrder: number;
  isActive: boolean;
}

export type BusinessCategory = 'food' | 'tech' | 'retail' | 'entertainment' | 'finance';

export interface PlayerBusiness {
  id: string;
  userId: string;
  businessTypeId: number;
  level: number;
  totalInvested: number;
  employeeCount: number;
  currentCycleStart: Date;
  cycleSeconds: number;
  cyclesCompleted: number;
  totalRevenue: number;
  isAutomated: boolean;
  currentRevenue: number;
  nextLevelCost: number;
  purchasedAt: Date;
  updatedAt: Date;
}

export interface OfflineEarnings {
  amount: number;
  durationSeconds: number;
  cappedAt: number;
  wasCapped: boolean;
}
