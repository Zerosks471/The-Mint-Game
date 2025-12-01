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

  // Sell property (recover from softlock)
  async sellProperty(userId: string, propertyId: string, quantity: number = 1) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const playerProperty = await tx.playerProperty.findUnique({
        where: { id: propertyId },
        include: { propertyType: true },
      });

      if (!playerProperty || playerProperty.userId !== userId) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Property not found', 404);
      }

      if (quantity < 1 || quantity > playerProperty.quantity) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          `Cannot sell ${quantity} properties. You own ${playerProperty.quantity}.`,
          400
        );
      }

      // Return 50% of total investment (base cost + upgrades + manager)
      const sellValue = new Prisma.Decimal(playerProperty.totalSpent)
        .mul(quantity)
        .div(playerProperty.quantity)
        .mul(0.5);

      const remainingQuantity = playerProperty.quantity - quantity;

      if (remainingQuantity === 0) {
        // Delete the property record entirely
        await tx.playerProperty.delete({
          where: { id: propertyId },
        });
      } else {
        // Update quantity and income
        const incomePerUnit = this.calculatePropertyIncome(
          playerProperty.propertyType,
          playerProperty.upgradeLevel
        );

        await tx.playerProperty.update({
          where: { id: propertyId },
          data: {
            quantity: remainingQuantity,
            currentIncomeHour: incomePerUnit.mul(remainingQuantity),
            nextPurchaseCost: this.calculatePropertyCost(
              playerProperty.propertyType,
              remainingQuantity
            ),
          },
        });
      }

      // Update player stats
      const playerStats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!playerStats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
      }

      const newTotalIncome = await this.calculateTotalIncome(tx, userId);

      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { increment: sellValue },
          totalPropertiesOwned: { decrement: quantity },
          baseIncomePerHour: newTotalIncome,
          effectiveIncomeHour: newTotalIncome.mul(playerStats.currentMultiplier),
        },
      });

      return {
        soldQuantity: quantity,
        remainingQuantity,
        cashReceived: sellValue,
        propertyDeleted: remainingQuantity === 0,
      };
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

    // Add cycle progress and format BigInt
    return businesses.map((biz) => this.formatBusiness(biz));
  }

  // Format business to convert BigInt to Number for JSON serialization
  private formatBusiness(business: any) {
    return {
      ...business,
      cyclesCompleted: Number(business.cyclesCompleted),
      cycleProgress: this.calculateCycleProgress(business),
      cycleComplete: this.isCycleComplete(business),
    };
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

      return this.formatBusiness(business);
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

      return this.formatBusiness(updated);
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

      await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { increment: revenue },
          lifetimeCashEarned: { increment: revenue },
        },
      });

      // Add XP and check level up
      await this.addExperience(tx, userId, Number(revenue) / 100);

      return { business: this.formatBusiness(updated), collected: revenue };
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

  // Premium multiplier constant
  private static readonly PREMIUM_INCOME_MULTIPLIER = 1.1;
  private static readonly PREMIUM_OFFLINE_CAP_HOURS = 24;
  private static readonly FREE_OFFLINE_CAP_HOURS = 8;

  // Collect earnings from ALL properties (called while playing)
  async collectEarnings(userId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Fetch user to check premium status
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { isPremium: true },
      });

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

      // Minimum 1 second elapsed
      if (elapsedHours < 0.00028) {
        return {
          collected: new Prisma.Decimal(0),
          newCash: playerStats.cash,
          elapsedSeconds: 0,
        };
      }

      // ALL properties earn while online
      const allProperties = await tx.playerProperty.findMany({
        where: { userId },
      });

      let totalIncomePerHour = new Prisma.Decimal(0);
      for (const prop of allProperties) {
        totalIncomePerHour = totalIncomePerHour.add(prop.currentIncomeHour);
      }

      // Apply premium income multiplier if user is premium
      const premiumMultiplier = user?.isPremium ? GameService.PREMIUM_INCOME_MULTIPLIER : 1.0;
      const earnings = totalIncomePerHour
        .mul(elapsedHours)
        .mul(playerStats.currentMultiplier)
        .mul(premiumMultiplier);

      const updated = await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { increment: earnings },
          lifetimeCashEarned: { increment: earnings },
          lastCollectionAt: now,
        },
      });

      return {
        collected: earnings,
        newCash: updated.cash,
        elapsedSeconds: Math.floor(elapsedMs / 1000),
        incomePerHour: totalIncomePerHour.mul(playerStats.currentMultiplier).mul(premiumMultiplier),
      };
    });
  }

  // Collect OFFLINE earnings (only managed properties - shown on login)
  async collectOfflineEarnings(userId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Fetch user to check premium status
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { isPremium: true },
      });

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

      // Dynamic offline cap based on premium status
      const offlineCapHours = user?.isPremium
        ? GameService.PREMIUM_OFFLINE_CAP_HOURS
        : GameService.FREE_OFFLINE_CAP_HOURS;

      // Cap at offline limit
      const cappedHours = Math.min(elapsedHours, offlineCapHours);

      if (cappedHours < 0.01) {
        // Less than ~36 seconds
        return {
          collected: new Prisma.Decimal(0),
          hours: 0,
          capped: false,
          capHours: offlineCapHours,
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

      // Apply premium income multiplier if user is premium
      const premiumMultiplier = user?.isPremium ? GameService.PREMIUM_INCOME_MULTIPLIER : 1.0;
      const earnings = totalIncome.mul(cappedHours).mul(playerStats.currentMultiplier).mul(premiumMultiplier);

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
        capped: elapsedHours > offlineCapHours,
        capHours: offlineCapHours,
        incomePerHour: totalIncome.mul(playerStats.currentMultiplier).mul(premiumMultiplier),
      };
    });
  }

  async getOfflineStatus(userId: string) {
    // Fetch user to check premium status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true },
    });

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

    // Dynamic offline cap based on premium status
    const offlineCapHours = user?.isPremium
      ? GameService.PREMIUM_OFFLINE_CAP_HOURS
      : GameService.FREE_OFFLINE_CAP_HOURS;

    const now = new Date();
    const lastCollection = new Date(playerStats.lastCollectionAt);
    const elapsedMs = now.getTime() - lastCollection.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const cappedHours = Math.min(elapsedHours, offlineCapHours);

    // Apply premium income multiplier if user is premium
    const premiumMultiplier = user?.isPremium ? GameService.PREMIUM_INCOME_MULTIPLIER : 1.0;
    const pendingEarnings = managedIncome.mul(cappedHours).mul(playerStats.currentMultiplier).mul(premiumMultiplier);

    return {
      pendingEarnings,
      elapsedHours: cappedHours,
      capped: elapsedHours > offlineCapHours,
      capHours: offlineCapHours,
      managedIncomePerHour: managedIncome.mul(playerStats.currentMultiplier).mul(premiumMultiplier),
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

  // ==================== EARNINGS HISTORY ====================

  // Create a snapshot of player's current financial state
  async createEarningsSnapshot(userId: string, snapshotType: 'hourly' | 'daily' = 'hourly') {
    const playerStats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    if (!playerStats) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
    }

    // Calculate net worth (cash + value of assets)
    const properties = await prisma.playerProperty.findMany({
      where: { userId },
      include: { propertyType: true },
    });

    let assetsValue = new Prisma.Decimal(0);
    for (const prop of properties) {
      // Value properties at 50% of base cost (sell value)
      assetsValue = assetsValue.add(
        new Prisma.Decimal(prop.propertyType.baseCost).mul(prop.quantity).mul(0.5)
      );
    }

    const netWorth = playerStats.cash.add(assetsValue);

    // Get last snapshot to calculate earnings/spending since then
    const lastSnapshot = await prisma.earningsSnapshot.findFirst({
      where: { userId, snapshotType },
      orderBy: { timestamp: 'desc' },
    });

    const cashEarned = lastSnapshot
      ? Prisma.Decimal.max(playerStats.cash.sub(lastSnapshot.totalCash), new Prisma.Decimal(0))
      : new Prisma.Decimal(0);

    const cashSpent = lastSnapshot
      ? Prisma.Decimal.max(lastSnapshot.totalCash.sub(playerStats.cash), new Prisma.Decimal(0))
      : new Prisma.Decimal(0);

    return prisma.earningsSnapshot.create({
      data: {
        userId,
        snapshotType,
        totalCash: playerStats.cash,
        incomePerHour: playerStats.effectiveIncomeHour,
        propertiesOwned: playerStats.totalPropertiesOwned,
        businessesOwned: playerStats.totalBusinessesOwned,
        netWorth,
        cashEarned,
        cashSpent,
      },
    });
  }

  // Get earnings history for charts
  async getEarningsHistory(
    userId: string,
    options: {
      type?: 'hourly' | 'daily';
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { type = 'hourly', limit = 168, startDate, endDate } = options; // Default 168 hours (1 week)

    const where: any = { userId, snapshotType: type };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const snapshots = await prisma.earningsSnapshot.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: limit,
    });

    // Also include current state as latest point
    const playerStats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    if (playerStats) {
      const properties = await prisma.playerProperty.findMany({
        where: { userId },
        include: { propertyType: true },
      });

      let assetsValue = new Prisma.Decimal(0);
      for (const prop of properties) {
        assetsValue = assetsValue.add(
          new Prisma.Decimal(prop.propertyType.baseCost).mul(prop.quantity).mul(0.5)
        );
      }

      snapshots.push({
        id: 'current',
        userId,
        snapshotType: type,
        timestamp: new Date(),
        totalCash: playerStats.cash,
        incomePerHour: playerStats.effectiveIncomeHour,
        propertiesOwned: playerStats.totalPropertiesOwned,
        businessesOwned: playerStats.totalBusinessesOwned,
        netWorth: playerStats.cash.add(assetsValue),
        cashEarned: new Prisma.Decimal(0),
        cashSpent: new Prisma.Decimal(0),
      });
    }

    return snapshots;
  }

  // Get summary statistics
  async getEarningsSummary(userId: string) {
    const playerStats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    if (!playerStats) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
    }

    // Get all-time stats
    const snapshots = await prisma.earningsSnapshot.findMany({
      where: { userId },
      orderBy: { timestamp: 'asc' },
    });

    // Calculate totals
    let totalEarned = new Prisma.Decimal(0);
    let totalSpent = new Prisma.Decimal(0);
    let peakNetWorth = new Prisma.Decimal(0);
    let peakIncome = new Prisma.Decimal(0);

    for (const snapshot of snapshots) {
      totalEarned = totalEarned.add(snapshot.cashEarned);
      totalSpent = totalSpent.add(snapshot.cashSpent);
      if (snapshot.netWorth.greaterThan(peakNetWorth)) {
        peakNetWorth = snapshot.netWorth;
      }
      if (snapshot.incomePerHour.greaterThan(peakIncome)) {
        peakIncome = snapshot.incomePerHour;
      }
    }

    // Calculate current net worth
    const properties = await prisma.playerProperty.findMany({
      where: { userId },
      include: { propertyType: true },
    });

    let assetsValue = new Prisma.Decimal(0);
    for (const prop of properties) {
      assetsValue = assetsValue.add(
        new Prisma.Decimal(prop.propertyType.baseCost).mul(prop.quantity).mul(0.5)
      );
    }

    const currentNetWorth = playerStats.cash.add(assetsValue);
    if (currentNetWorth.greaterThan(peakNetWorth)) {
      peakNetWorth = currentNetWorth;
    }

    return {
      currentCash: playerStats.cash,
      currentNetWorth,
      currentIncomePerHour: playerStats.effectiveIncomeHour,
      lifetimeEarnings: playerStats.lifetimeCashEarned,
      totalSpent,
      peakNetWorth,
      peakIncome,
      snapshotCount: snapshots.length,
      propertiesOwned: playerStats.totalPropertiesOwned,
      businessesOwned: playerStats.totalBusinessesOwned,
    };
  }

  // Record an earnings snapshot (called periodically)
  async recordSnapshot(userId: string, type: 'hourly' | 'daily' = 'hourly'): Promise<void> {
    const playerStats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    if (!playerStats) return;

    // Check if we already have a recent snapshot (within 30 mins for hourly, 12 hours for daily)
    const minInterval = type === 'hourly' ? 30 * 60 * 1000 : 12 * 60 * 60 * 1000;
    const lastSnapshot = await prisma.earningsSnapshot.findFirst({
      where: { userId, snapshotType: type },
      orderBy: { timestamp: 'desc' },
    });

    if (lastSnapshot && Date.now() - lastSnapshot.timestamp.getTime() < minInterval) {
      return; // Too soon for another snapshot
    }

    await this.createSnapshot(userId, type);
  }

  // Force create a snapshot (bypasses time check) - useful for testing
  async recordSnapshotForce(userId: string): Promise<void> {
    await this.createSnapshot(userId, 'hourly');
  }

  // Internal method to create a snapshot
  private async createSnapshot(userId: string, type: 'hourly' | 'daily'): Promise<void> {
    const playerStats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    if (!playerStats) return;

    // Calculate net worth
    const properties = await prisma.playerProperty.findMany({
      where: { userId },
      include: { propertyType: true },
    });

    const businesses = await prisma.playerBusiness.findMany({
      where: { userId },
      include: { businessType: true },
    });

    let assetsValue = new Prisma.Decimal(0);
    for (const prop of properties) {
      assetsValue = assetsValue.add(prop.totalSpent);
    }
    for (const biz of businesses) {
      assetsValue = assetsValue.add(biz.totalInvested);
    }

    const netWorth = playerStats.cash.add(assetsValue);

    // Get last snapshot to calculate earnings
    const lastSnapshot = await prisma.earningsSnapshot.findFirst({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });

    // Calculate earnings since last snapshot
    let cashEarned = new Prisma.Decimal(0);
    if (lastSnapshot) {
      const cashDiff = playerStats.cash.sub(lastSnapshot.totalCash);
      if (cashDiff.greaterThan(0)) {
        cashEarned = cashDiff;
      }
    }

    await prisma.earningsSnapshot.create({
      data: {
        userId,
        snapshotType: type,
        totalCash: playerStats.cash,
        incomePerHour: playerStats.effectiveIncomeHour,
        propertiesOwned: playerStats.totalPropertiesOwned,
        businessesOwned: playerStats.totalBusinessesOwned,
        netWorth,
        cashEarned,
        cashSpent: 0,
      },
    });
  }
}

export const gameService = new GameService();
