import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';

export interface UpgradeInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  currentLevel: number;
  maxLevel: number;
  currentCost: string;
  nextCost: string | null;
  effect: Record<string, unknown>;
  effectPerLevel: number;
  totalEffect: number;
  phaseRequired: number;
  canAfford: boolean;
  canPurchase: boolean;
  isMaxed: boolean;
}

export class UpgradeService {
  /**
   * Get all upgrades with player's current levels
   */
  async getUpgrades(userId: string): Promise<UpgradeInfo[]> {
    const [stats, playerUpgrades, allUpgrades] = await Promise.all([
      prisma.playerStats.findUnique({ where: { userId } }),
      prisma.playerUpgrade.findMany({ where: { userId } }),
      prisma.upgrade.findMany({
        where: { isActive: true },
        orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }],
      }),
    ]);

    if (!stats) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
    }

    const playerUpgradeMap = new Map(playerUpgrades.map((pu) => [pu.upgradeId, pu]));
    const cash = stats.cash;
    const currentPhase = stats.currentPhase;

    return allUpgrades.map((upgrade) => {
      const playerUpgrade = playerUpgradeMap.get(upgrade.id);
      const currentLevel = playerUpgrade?.level ?? 0;
      const isMaxed = currentLevel >= upgrade.maxLevel;

      // Calculate current cost: baseCost * (costMultiplier ^ currentLevel)
      const currentCost = new Decimal(upgrade.baseCost).mul(
        new Decimal(upgrade.costMultiplier).pow(currentLevel)
      );
      const nextCost = isMaxed
        ? null
        : new Decimal(upgrade.baseCost).mul(new Decimal(upgrade.costMultiplier).pow(currentLevel + 1));

      const effect = upgrade.effect as Record<string, unknown>;
      const effectValue = effect.value as number;

      const canAfford = new Decimal(cash).gte(currentCost);
      const phaseUnlocked = currentPhase >= upgrade.phaseRequired;

      return {
        id: upgrade.id,
        slug: upgrade.slug,
        name: upgrade.name,
        description: upgrade.description,
        category: upgrade.category,
        currentLevel,
        maxLevel: upgrade.maxLevel,
        currentCost: currentCost.toFixed(2),
        nextCost: nextCost?.toFixed(2) ?? null,
        effect,
        effectPerLevel: effectValue,
        totalEffect: effectValue * currentLevel,
        phaseRequired: upgrade.phaseRequired,
        canAfford,
        canPurchase: canAfford && phaseUnlocked && !isMaxed,
        isMaxed,
      };
    });
  }

  /**
   * Purchase an upgrade level
   */
  async purchaseUpgrade(userId: string, upgradeSlug: string): Promise<{
    success: boolean;
    upgrade: UpgradeInfo;
    newCash: string;
  }> {
    const upgrade = await prisma.upgrade.findUnique({
      where: { slug: upgradeSlug },
    });

    if (!upgrade) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Upgrade not found', 404);
    }

    const [stats, playerUpgrade] = await Promise.all([
      prisma.playerStats.findUnique({ where: { userId } }),
      prisma.playerUpgrade.findUnique({
        where: { userId_upgradeId: { userId, upgradeId: upgrade.id } },
      }),
    ]);

    if (!stats) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
    }

    const currentLevel = playerUpgrade?.level ?? 0;
    if (currentLevel >= upgrade.maxLevel) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Upgrade is already at max level', 400);
    }

    // Check phase requirement
    if (stats.currentPhase < upgrade.phaseRequired) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Requires Phase ${upgrade.phaseRequired}`,
        400
      );
    }

    // Calculate cost
    const cost = new Decimal(upgrade.baseCost).mul(
      new Decimal(upgrade.costMultiplier).pow(currentLevel)
    );

    if (new Decimal(stats.cash).lt(cost)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Insufficient funds', 400);
    }

    // Purchase the upgrade
    const result = await prisma.$transaction(async (tx) => {
      // Deduct cost
      const updatedStats = await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { decrement: cost },
        },
      });

      // Create or update player upgrade
      const newLevel = currentLevel + 1;
      await tx.playerUpgrade.upsert({
        where: { userId_upgradeId: { userId, upgradeId: upgrade.id } },
        create: {
          userId,
          upgradeId: upgrade.id,
          level: 1,
          totalSpent: cost,
        },
        update: {
          level: newLevel,
          totalSpent: { increment: cost },
        },
      });

      // Apply upgrade effect
      await this.applyUpgradeEffect(tx, userId, upgrade.effect as Record<string, unknown>);

      return { updatedStats, newLevel };
    });

    const effect = upgrade.effect as Record<string, unknown>;
    const effectValue = effect.value as number;
    const newLevel = result.newLevel;
    const isMaxed = newLevel >= upgrade.maxLevel;
    const nextCost = isMaxed
      ? null
      : new Decimal(upgrade.baseCost).mul(new Decimal(upgrade.costMultiplier).pow(newLevel));

    return {
      success: true,
      upgrade: {
        id: upgrade.id,
        slug: upgrade.slug,
        name: upgrade.name,
        description: upgrade.description,
        category: upgrade.category,
        currentLevel: newLevel,
        maxLevel: upgrade.maxLevel,
        currentCost: nextCost?.toFixed(2) ?? '0',
        nextCost: nextCost?.toFixed(2) ?? null,
        effect,
        effectPerLevel: effectValue,
        totalEffect: effectValue * newLevel,
        phaseRequired: upgrade.phaseRequired,
        canAfford: new Decimal(result.updatedStats.cash).gte(nextCost ?? 0),
        canPurchase: !isMaxed && new Decimal(result.updatedStats.cash).gte(nextCost ?? 0),
        isMaxed,
      },
      newCash: result.updatedStats.cash.toString(),
    };
  }

  /**
   * Apply an upgrade's effect to the player
   */
  private async applyUpgradeEffect(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    userId: string,
    effect: Record<string, unknown>
  ): Promise<void> {
    const effectType = effect.type as string;
    const effectValue = effect.value as number;

    switch (effectType) {
      case 'income_mult':
        await tx.playerStats.update({
          where: { userId },
          data: {
            currentMultiplier: { increment: effectValue },
          },
        });
        break;

      case 'offline_cap':
        await tx.playerStats.update({
          where: { userId },
          data: {
            offlineCapHours: { increment: effectValue },
          },
        });
        break;

      default:
        console.warn(`Unknown upgrade effect type: ${effectType}`);
    }
  }

  /**
   * Calculate total bonuses from upgrades
   */
  async getUpgradeBonuses(userId: string): Promise<{
    incomeMultiplier: number;
    offlineCapBonus: number;
  }> {
    const playerUpgrades = await prisma.playerUpgrade.findMany({
      where: { userId },
      include: { upgrade: true },
    });

    let incomeMultiplier = 0;
    let offlineCapBonus = 0;

    for (const pu of playerUpgrades) {
      const effect = pu.upgrade.effect as Record<string, unknown>;
      const effectType = effect.type as string;
      const effectValue = (effect.value as number) * pu.level;

      if (effectType === 'income_mult') {
        incomeMultiplier += effectValue;
      } else if (effectType === 'offline_cap') {
        offlineCapBonus += effectValue;
      }
    }

    return { incomeMultiplier, offlineCapBonus };
  }
}

export const upgradeService = new UpgradeService();
