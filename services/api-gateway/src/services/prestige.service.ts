import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';

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

export interface PerkWithStatus {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tier: number;
  cost: number;
  effect: unknown;
  maxLevel: number;
  iconUrl: string | null;
  sortOrder: number;
  currentLevel: number;
  canPurchase: boolean;
  totalCost: number; // Cost for next level
}

export class PrestigeService {
  private static MINIMUM_NET_WORTH = 100000; // $100k minimum to prestige

  /**
   * Calculate net worth = cash + property value + business value
   */
  async calculateNetWorth(userId: string): Promise<Decimal> {
    const [stats, properties, businesses] = await Promise.all([
      prisma.playerStats.findUnique({ where: { userId } }),
      prisma.playerProperty.findMany({
        where: { userId },
        include: { propertyType: true },
      }),
      prisma.playerBusiness.findMany({
        where: { userId },
        include: { businessType: true },
      }),
    ]);

    if (!stats) return new Decimal(0);

    let netWorth = new Decimal(stats.cash);

    // Add property values (totalSpent is a reasonable proxy for value)
    for (const prop of properties) {
      netWorth = netWorth.add(prop.totalSpent);
    }

    // Add business values
    for (const biz of businesses) {
      netWorth = netWorth.add(biz.totalInvested);
    }

    return netWorth;
  }

  /**
   * Calculate prestige points based on net worth
   * Formula: sqrt(netWorth / 1,000,000) * (1 + prestigeLevel * 0.1)
   */
  calculatePrestigePoints(netWorth: Decimal, prestigeLevel: number): number {
    const base = Math.sqrt(netWorth.toNumber() / 1_000_000);
    const multiplier = 1 + prestigeLevel * 0.1;
    return Math.floor(base * multiplier);
  }

  /**
   * Get current prestige status for a player
   */
  async getPrestigeStatus(userId: string): Promise<PrestigeStatus> {
    const stats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
    }

    const netWorth = await this.calculateNetWorth(userId);
    const potentialPoints = this.calculatePrestigePoints(netWorth, stats.prestigeLevel);

    return {
      prestigeLevel: stats.prestigeLevel,
      prestigePoints: stats.prestigePoints,
      timesPrestiged: stats.timesPrestiged,
      prestigeMultiplier: stats.prestigeMultiplier.toString(),
      currentNetWorth: netWorth.toString(),
      potentialPoints,
      canPrestige: netWorth.greaterThanOrEqualTo(PrestigeService.MINIMUM_NET_WORTH),
      minimumNetWorth: PrestigeService.MINIMUM_NET_WORTH,
    };
  }

  /**
   * Get all perks with player's current levels
   */
  async getPerks(userId: string): Promise<PerkWithStatus[]> {
    const [perks, playerPerks, stats] = await Promise.all([
      prisma.prestigePerk.findMany({
        where: { isActive: true },
        orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.playerPrestigePerk.findMany({
        where: { userId },
      }),
      prisma.playerStats.findUnique({ where: { userId } }),
    ]);

    const playerPerkMap = new Map(playerPerks.map((pp) => [pp.perkId, pp.level]));
    const availablePoints = stats?.prestigePoints ?? 0;

    return perks.map((perk) => {
      const currentLevel = playerPerkMap.get(perk.id) ?? 0;
      const nextLevelCost = this.calculatePerkCost(perk.cost, currentLevel);
      const canPurchase = currentLevel < perk.maxLevel && availablePoints >= nextLevelCost;

      return {
        id: perk.id,
        slug: perk.slug,
        name: perk.name,
        description: perk.description,
        category: perk.category,
        tier: perk.tier,
        cost: perk.cost,
        effect: perk.effect,
        maxLevel: perk.maxLevel,
        iconUrl: perk.iconUrl,
        sortOrder: perk.sortOrder,
        currentLevel,
        canPurchase,
        totalCost: nextLevelCost,
      };
    });
  }

  /**
   * Calculate cost for a perk at a given level
   * Each level costs more: baseCost * (level + 1)
   */
  private calculatePerkCost(baseCost: number, currentLevel: number): number {
    return baseCost * (currentLevel + 1);
  }

  /**
   * Execute prestige (Go Public)
   * - Reset cash, properties, businesses
   * - Keep prestige perks
   * - Award prestige points
   * - Increment prestige level
   */
  async goPublic(userId: string): Promise<{ pointsEarned: number; newPrestigeLevel: number }> {
    return prisma.$transaction(async (tx) => {
      const stats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!stats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      const netWorth = await this.calculateNetWorth(userId);

      if (netWorth.lessThan(PrestigeService.MINIMUM_NET_WORTH)) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          `Need at least $${PrestigeService.MINIMUM_NET_WORTH.toLocaleString()} net worth to Go Public`,
          400
        );
      }

      const pointsEarned = this.calculatePrestigePoints(netWorth, stats.prestigeLevel);
      const newPrestigeLevel = stats.prestigeLevel + 1;

      // Calculate new multiplier based on owned perks
      const playerPerks = await tx.playerPrestigePerk.findMany({
        where: { userId },
        include: { perk: true },
      });

      let prestigeMultiplier = new Decimal(1);
      for (const pp of playerPerks) {
        const effect = pp.perk.effect as { type: string; value: number };
        if (effect.type === 'income_mult') {
          prestigeMultiplier = prestigeMultiplier.add(effect.value * pp.level);
        }
      }

      // Add base prestige bonus: +5% per prestige level
      prestigeMultiplier = prestigeMultiplier.add(new Decimal(newPrestigeLevel).mul(0.05));

      // Delete all properties
      await tx.playerProperty.deleteMany({
        where: { userId },
      });

      // Delete all businesses
      await tx.playerBusiness.deleteMany({
        where: { userId },
      });

      // Reset player stats but keep prestige data
      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: 1000, // Starting cash
          lifetimeCashEarned: 0,
          playerLevel: 1,
          experiencePoints: 0,
          baseIncomePerHour: 0,
          effectiveIncomeHour: 0,
          currentMultiplier: prestigeMultiplier,
          prestigeLevel: newPrestigeLevel,
          prestigePoints: { increment: pointsEarned },
          prestigeMultiplier,
          timesPrestiged: { increment: 1 },
          totalPropertiesOwned: 0,
          totalBusinessesOwned: 0,
          lastCollectionAt: new Date(),
        },
      });

      return { pointsEarned, newPrestigeLevel };
    });
  }

  /**
   * Purchase a prestige perk
   */
  async buyPerk(
    userId: string,
    perkId: string
  ): Promise<{ perk: PerkWithStatus; remainingPoints: number }> {
    return prisma.$transaction(async (tx) => {
      const perk = await tx.prestigePerk.findUnique({
        where: { id: perkId },
      });

      if (!perk || !perk.isActive) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Perk not found', 404);
      }

      const stats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!stats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      // Get current level
      const existingPerk = await tx.playerPrestigePerk.findUnique({
        where: { userId_perkId: { userId, perkId } },
      });

      const currentLevel = existingPerk?.level ?? 0;

      if (currentLevel >= perk.maxLevel) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Perk already at max level', 400);
      }

      const cost = this.calculatePerkCost(perk.cost, currentLevel);

      if (stats.prestigePoints < cost) {
        throw new AppError(ErrorCodes.INSUFFICIENT_FUNDS, 'Not enough prestige points', 400);
      }

      // Update or create player perk
      if (existingPerk) {
        await tx.playerPrestigePerk.update({
          where: { userId_perkId: { userId, perkId } },
          data: { level: { increment: 1 } },
        });
      } else {
        await tx.playerPrestigePerk.create({
          data: { userId, perkId, level: 1 },
        });
      }

      // Deduct points
      const updatedStats = await tx.playerStats.update({
        where: { userId },
        data: { prestigePoints: { decrement: cost } },
      });

      // Recalculate multiplier
      await this.recalculateMultiplier(tx, userId);

      const newLevel = currentLevel + 1;
      const nextCost = this.calculatePerkCost(perk.cost, newLevel);

      return {
        perk: {
          id: perk.id,
          slug: perk.slug,
          name: perk.name,
          description: perk.description,
          category: perk.category,
          tier: perk.tier,
          cost: perk.cost,
          effect: perk.effect,
          maxLevel: perk.maxLevel,
          iconUrl: perk.iconUrl,
          sortOrder: perk.sortOrder,
          currentLevel: newLevel,
          canPurchase: newLevel < perk.maxLevel && updatedStats.prestigePoints >= nextCost,
          totalCost: nextCost,
        },
        remainingPoints: updatedStats.prestigePoints,
      };
    });
  }

  /**
   * Recalculate and update the player's multiplier based on perks
   */
  private async recalculateMultiplier(tx: any, userId: string): Promise<void> {
    const [stats, playerPerks] = await Promise.all([
      tx.playerStats.findUnique({ where: { userId } }),
      tx.playerPrestigePerk.findMany({
        where: { userId },
        include: { perk: true },
      }),
    ]);

    if (!stats) return;

    let multiplier = new Decimal(1);

    // Add perk bonuses
    for (const pp of playerPerks) {
      const effect = pp.perk.effect as { type: string; value: number };
      if (effect.type === 'income_mult') {
        multiplier = multiplier.add(effect.value * pp.level);
      }
    }

    // Add prestige level bonus: +5% per level
    multiplier = multiplier.add(new Decimal(stats.prestigeLevel).mul(0.05));

    // Update stats
    await tx.playerStats.update({
      where: { userId },
      data: {
        currentMultiplier: multiplier,
        prestigeMultiplier: multiplier,
        effectiveIncomeHour: new Decimal(stats.baseIncomePerHour).mul(multiplier),
      },
    });
  }
}

export const prestigeService = new PrestigeService();
