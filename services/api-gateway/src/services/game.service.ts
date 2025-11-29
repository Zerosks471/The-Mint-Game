import { prisma } from '@mint/database';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';

export class GameService {
  // ==================== PROPERTIES ====================

  async getPropertyTypes(userId: string) {
    const playerStats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    const playerLevel = playerStats?.playerLevel ?? 1;

    const types = await prisma.propertyType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return types.map((type) => ({
      ...type,
      isUnlocked: this.checkUnlock(type.unlockRequirement, playerLevel),
    }));
  }

  async getPlayerProperties(userId: string) {
    return prisma.playerProperty.findMany({
      where: { userId },
      include: { propertyType: true },
      orderBy: { propertyType: { sortOrder: 'asc' } },
    });
  }

  async buyProperty(userId: string, propertyTypeId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const propertyType = await tx.propertyType.findUnique({
        where: { id: propertyTypeId },
      });

      if (!propertyType) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Property type not found', 404);
      }

      const playerStats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!playerStats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      // Check unlock requirement
      if (!this.checkUnlock(propertyType.unlockRequirement, playerStats.playerLevel)) {
        throw new AppError(ErrorCodes.NOT_UNLOCKED, 'Property not unlocked yet', 403);
      }

      // Get existing property or create new
      let playerProperty = await tx.playerProperty.findUnique({
        where: { userId_propertyTypeId: { userId, propertyTypeId } },
      });

      // Calculate cost
      const quantity = playerProperty?.quantity ?? 0;
      const cost = this.calculatePropertyCost(propertyType, quantity);

      // Check if player has enough cash
      if (playerStats.cash.lessThan(cost)) {
        throw new AppError(ErrorCodes.INSUFFICIENT_FUNDS, 'Not enough cash', 400);
      }

      // Calculate new income
      const newIncomePerProperty = this.calculatePropertyIncome(
        propertyType,
        playerProperty?.upgradeLevel ?? 0
      );

      if (playerProperty) {
        // Update existing
        playerProperty = await tx.playerProperty.update({
          where: { id: playerProperty.id },
          data: {
            quantity: { increment: 1 },
            totalSpent: { increment: cost },
            currentIncomeHour: newIncomePerProperty.mul(quantity + 1),
            nextPurchaseCost: this.calculatePropertyCost(propertyType, quantity + 1),
          },
          include: { propertyType: true },
        });
      } else {
        // Create new
        playerProperty = await tx.playerProperty.create({
          data: {
            userId,
            propertyTypeId,
            quantity: 1,
            totalSpent: cost,
            currentIncomeHour: newIncomePerProperty,
            nextPurchaseCost: this.calculatePropertyCost(propertyType, 1),
          },
          include: { propertyType: true },
        });
      }

      // Deduct cash and update income
      const newTotalIncome = await this.calculateTotalIncome(tx, userId);

      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { decrement: cost },
          totalPropertiesOwned: { increment: 1 },
          baseIncomePerHour: newTotalIncome,
          effectiveIncomeHour: newTotalIncome.mul(playerStats.currentMultiplier),
        },
      });

      return playerProperty;
    });
  }

  async upgradeProperty(userId: string, propertyId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const playerProperty = await tx.playerProperty.findUnique({
        where: { id: propertyId },
        include: { propertyType: true },
      });

      if (!playerProperty || playerProperty.userId !== userId) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Property not found', 404);
      }

      if (playerProperty.upgradeLevel >= playerProperty.propertyType.maxUpgradeLevel) {
        throw new AppError(ErrorCodes.MAX_LEVEL_REACHED, 'Property at max upgrade level', 400);
      }

      const playerStats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!playerStats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      // Calculate upgrade cost (base cost * 0.5 * level multiplier)
      const upgradeCost = this.calculateUpgradeCost(
        playerProperty.propertyType,
        playerProperty.upgradeLevel
      );

      if (playerStats.cash.lessThan(upgradeCost)) {
        throw new AppError(ErrorCodes.INSUFFICIENT_FUNDS, 'Not enough cash', 400);
      }

      // Calculate new income
      const newLevel = playerProperty.upgradeLevel + 1;
      const newIncomePerProperty = this.calculatePropertyIncome(
        playerProperty.propertyType,
        newLevel
      );

      const updated = await tx.playerProperty.update({
        where: { id: propertyId },
        data: {
          upgradeLevel: newLevel,
          totalSpent: { increment: upgradeCost },
          currentIncomeHour: newIncomePerProperty.mul(playerProperty.quantity),
          nextUpgradeCost:
            newLevel < playerProperty.propertyType.maxUpgradeLevel
              ? this.calculateUpgradeCost(playerProperty.propertyType, newLevel)
              : null,
        },
        include: { propertyType: true },
      });

      // Update player stats
      const newTotalIncome = await this.calculateTotalIncome(tx, userId);

      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { decrement: upgradeCost },
          baseIncomePerHour: newTotalIncome,
          effectiveIncomeHour: newTotalIncome.mul(playerStats.currentMultiplier),
        },
      });

      return updated;
    });
  }

  async hireManager(userId: string, propertyId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const playerProperty = await tx.playerProperty.findUnique({
        where: { id: propertyId },
        include: { propertyType: true },
      });

      if (!playerProperty || playerProperty.userId !== userId) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Property not found', 404);
      }

      if (playerProperty.managerHired) {
        throw new AppError(ErrorCodes.CONFLICT, 'Manager already hired', 400);
      }

      if (!playerProperty.propertyType.managerCost) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No manager available for this property', 400);
      }

      const playerStats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!playerStats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      const cost = playerProperty.propertyType.managerCost;

      if (playerStats.cash.lessThan(cost)) {
        throw new AppError(ErrorCodes.INSUFFICIENT_FUNDS, 'Not enough cash', 400);
      }

      const updated = await tx.playerProperty.update({
        where: { id: propertyId },
        data: {
          managerHired: true,
          managerHiredAt: new Date(),
          totalSpent: { increment: cost },
        },
        include: { propertyType: true },
      });

      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { decrement: cost },
        },
      });

      return updated;
    });
  }

  // ==================== BUSINESSES ====================

  async getBusinessTypes(userId: string) {
    const playerStats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    const playerLevel = playerStats?.playerLevel ?? 1;

    const types = await prisma.businessType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return types.map((type) => ({
      ...type,
      isUnlocked: this.checkUnlock(type.unlockRequirement, playerLevel),
    }));
  }

  async getPlayerBusinesses(userId: string) {
    const businesses = await prisma.playerBusiness.findMany({
      where: { userId },
      include: { businessType: true },
      orderBy: { businessType: { sortOrder: 'asc' } },
    });

    // Add cycle progress
    return businesses.map((biz) => ({
      ...biz,
      cycleProgress: this.calculateCycleProgress(biz),
      cycleComplete: this.isCycleComplete(biz),
    }));
  }

  async buyBusiness(userId: string, businessTypeId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const businessType = await tx.businessType.findUnique({
        where: { id: businessTypeId },
      });

      if (!businessType) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Business type not found', 404);
      }

      // Check if already owned
      const existing = await tx.playerBusiness.findUnique({
        where: { userId_businessTypeId: { userId, businessTypeId } },
      });

      if (existing) {
        throw new AppError(ErrorCodes.CONFLICT, 'Business already owned', 400);
      }

      const playerStats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!playerStats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      // Check unlock
      if (!this.checkUnlock(businessType.unlockRequirement, playerStats.playerLevel)) {
        throw new AppError(ErrorCodes.NOT_UNLOCKED, 'Business not unlocked yet', 403);
      }

      if (playerStats.cash.lessThan(businessType.baseCost)) {
        throw new AppError(ErrorCodes.INSUFFICIENT_FUNDS, 'Not enough cash', 400);
      }

      const business = await tx.playerBusiness.create({
        data: {
          userId,
          businessTypeId,
          level: 1,
          totalInvested: businessType.baseCost,
          currentRevenue: businessType.baseRevenue,
          cycleSeconds: businessType.cycleSeconds,
          nextLevelCost: this.calculateBusinessLevelCost(businessType, 1),
        },
        include: { businessType: true },
      });

      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { decrement: businessType.baseCost },
          totalBusinessesOwned: { increment: 1 },
        },
      });

      return business;
    });
  }

  async levelUpBusiness(userId: string, businessId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const business = await tx.playerBusiness.findUnique({
        where: { id: businessId },
        include: { businessType: true },
      });

      if (!business || business.userId !== userId) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Business not found', 404);
      }

      if (business.level >= business.businessType.maxLevel) {
        throw new AppError(ErrorCodes.MAX_LEVEL_REACHED, 'Business at max level', 400);
      }

      const playerStats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!playerStats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      const cost = this.calculateBusinessLevelCost(business.businessType, business.level);

      if (playerStats.cash.lessThan(cost)) {
        throw new AppError(ErrorCodes.INSUFFICIENT_FUNDS, 'Not enough cash', 400);
      }

      const newLevel = business.level + 1;
      const newRevenue = this.calculateBusinessRevenue(
        business.businessType,
        newLevel,
        business.employeeCount
      );

      const updated = await tx.playerBusiness.update({
        where: { id: businessId },
        data: {
          level: newLevel,
          totalInvested: { increment: cost },
          currentRevenue: newRevenue,
          nextLevelCost:
            newLevel < business.businessType.maxLevel
              ? this.calculateBusinessLevelCost(business.businessType, newLevel)
              : null,
        },
        include: { businessType: true },
      });

      await tx.playerStats.update({
        where: { userId },
        data: { cash: { decrement: cost } },
      });

      return updated;
    });
  }

  async collectBusinessRevenue(userId: string, businessId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const business = await tx.playerBusiness.findUnique({
        where: { id: businessId },
        include: { businessType: true },
      });

      if (!business || business.userId !== userId) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Business not found', 404);
      }

      if (!this.isCycleComplete(business)) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cycle not complete', 400);
      }

      const revenue = business.currentRevenue;

      const updated = await tx.playerBusiness.update({
        where: { id: businessId },
        data: {
          currentCycleStart: new Date(),
          cyclesCompleted: { increment: 1 },
          totalRevenue: { increment: revenue },
        },
        include: { businessType: true },
      });

      const playerStats = await tx.playerStats.findUnique({
        where: { userId },
      });

      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { increment: revenue },
          lifetimeCashEarned: { increment: revenue },
        },
      });

      // Add XP and check level up
      await this.addExperience(tx, userId, Number(revenue) / 100);

      return { business: updated, collected: revenue };
    });
  }

  // ==================== HELPER METHODS ====================

  private checkUnlock(requirement: any, playerLevel: number): boolean {
    if (!requirement) return true;
    if (requirement.level && playerLevel < requirement.level) return false;
    return true;
  }

  // Business helpers
  private calculateCycleProgress(business: any): number {
    const elapsed = (Date.now() - new Date(business.currentCycleStart).getTime()) / 1000;
    const cycleTime = business.cycleSeconds || business.businessType.cycleSeconds;
    return Math.min(1, elapsed / cycleTime);
  }

  private isCycleComplete(business: any): boolean {
    return this.calculateCycleProgress(business) >= 1;
  }

  private calculateBusinessLevelCost(businessType: any, currentLevel: number): Prisma.Decimal {
    const multiplier = Math.pow(Number(businessType.levelCostMult), currentLevel);
    return new Prisma.Decimal(businessType.baseCost).mul(0.1).mul(multiplier);
  }

  private calculateBusinessRevenue(
    businessType: any,
    level: number,
    employees: number
  ): Prisma.Decimal {
    const levelMultiplier = Math.pow(Number(businessType.levelRevenueMult), level - 1);
    const employeeBonus = 1 + (employees * Number(businessType.employeeBonusPct)) / 100;
    return new Prisma.Decimal(businessType.baseRevenue).mul(levelMultiplier).mul(employeeBonus);
  }

  private async addExperience(
    tx: Prisma.TransactionClient,
    userId: string,
    xp: number
  ): Promise<void> {
    const stats = await tx.playerStats.findUnique({ where: { userId } });
    if (!stats) return;

    const newXp = Number(stats.experiencePoints) + Math.floor(xp);

    let newLevel = stats.playerLevel;
    let remainingXp = newXp;

    while (remainingXp >= this.xpForLevel(newLevel)) {
      remainingXp -= this.xpForLevel(newLevel);
      newLevel++;
    }

    await tx.playerStats.update({
      where: { userId },
      data: {
        experiencePoints: remainingXp,
        playerLevel: newLevel,
      },
    });
  }

  private xpForLevel(level: number): number {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  // ==================== OFFLINE EARNINGS ====================

  async collectOfflineEarnings(userId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const playerStats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!playerStats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      const now = new Date();
      const lastCollection = new Date(playerStats.lastCollectionAt);
      const elapsedMs = now.getTime() - lastCollection.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      // Cap at offline limit
      const cappedHours = Math.min(elapsedHours, playerStats.offlineCapHours);

      if (cappedHours < 0.01) {
        // Less than ~36 seconds
        return {
          collected: new Prisma.Decimal(0),
          hours: 0,
          capped: false,
        };
      }

      // Only properties with managers earn offline
      const managedProperties = await tx.playerProperty.findMany({
        where: { userId, managerHired: true },
      });

      let totalIncome = new Prisma.Decimal(0);
      for (const prop of managedProperties) {
        totalIncome = totalIncome.add(prop.currentIncomeHour);
      }

      const earnings = totalIncome.mul(cappedHours).mul(playerStats.currentMultiplier);

      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { increment: earnings },
          lifetimeCashEarned: { increment: earnings },
          lastCollectionAt: now,
        },
      });

      return {
        collected: earnings,
        hours: cappedHours,
        capped: elapsedHours > playerStats.offlineCapHours,
        incomePerHour: totalIncome.mul(playerStats.currentMultiplier),
      };
    });
  }

  async getOfflineStatus(userId: string) {
    const playerStats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    if (!playerStats) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
    }

    const managedProperties = await prisma.playerProperty.findMany({
      where: { userId, managerHired: true },
    });

    let managedIncome = new Prisma.Decimal(0);
    for (const prop of managedProperties) {
      managedIncome = managedIncome.add(prop.currentIncomeHour);
    }

    const now = new Date();
    const lastCollection = new Date(playerStats.lastCollectionAt);
    const elapsedMs = now.getTime() - lastCollection.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const cappedHours = Math.min(elapsedHours, playerStats.offlineCapHours);

    const pendingEarnings = managedIncome.mul(cappedHours).mul(playerStats.currentMultiplier);

    return {
      pendingEarnings,
      elapsedHours: cappedHours,
      capped: elapsedHours > playerStats.offlineCapHours,
      capHours: playerStats.offlineCapHours,
      managedIncomePerHour: managedIncome.mul(playerStats.currentMultiplier),
      lastCollectionAt: playerStats.lastCollectionAt,
    };
  }

  // ==================== PROPERTY HELPERS ====================

  private calculatePropertyCost(propertyType: any, currentQuantity: number): Prisma.Decimal {
    // cost = baseCost * (costMultiplier ^ quantity)
    const multiplier = Math.pow(Number(propertyType.costMultiplier), currentQuantity);
    return new Prisma.Decimal(propertyType.baseCost).mul(multiplier);
  }

  private calculatePropertyIncome(propertyType: any, upgradeLevel: number): Prisma.Decimal {
    // income = baseIncome * (incomeMultiplier ^ upgradeLevel)
    const multiplier = Math.pow(Number(propertyType.incomeMultiplier), upgradeLevel);
    return new Prisma.Decimal(propertyType.baseIncomeHour).mul(multiplier);
  }

  private calculateUpgradeCost(propertyType: any, currentLevel: number): Prisma.Decimal {
    // upgradeCost = baseCost * 0.5 * (costMultiplier ^ level)
    const multiplier = Math.pow(Number(propertyType.costMultiplier), currentLevel);
    return new Prisma.Decimal(propertyType.baseCost).mul(0.5).mul(multiplier);
  }

  private async calculateTotalIncome(
    tx: Prisma.TransactionClient,
    userId: string
  ): Promise<Prisma.Decimal> {
    const properties = await tx.playerProperty.findMany({
      where: { userId },
    });

    let total = new Prisma.Decimal(0);
    for (const prop of properties) {
      total = total.add(prop.currentIncomeHour);
    }
    return total;
  }
}

export const gameService = new GameService();
