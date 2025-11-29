import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

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
  // Player progress
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

export class AchievementService {
  /**
   * Get all achievements with player progress
   */
  async getAchievements(userId: string): Promise<AchievementWithProgress[]> {
    const [achievements, playerAchievements, playerProgress] = await Promise.all([
      prisma.achievement.findMany({
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.playerAchievement.findMany({
        where: { userId },
      }),
      this.getPlayerProgress(userId),
    ]);

    // Map player achievements by achievementId - use isCompleted and completedAt
    const playerAchievementMap = new Map(
      playerAchievements.map((pa) => [pa.achievementId, pa])
    );

    return achievements.map((a) => {
      const playerAch = playerAchievementMap.get(a.id);
      const isUnlocked = playerAch?.isCompleted || false;
      const unlockedAt = playerAch?.completedAt || null;
      const currentProgress = playerProgress[a.requirementType] || 0;
      const requirementValue = a.requirementValue.toNumber();
      const progressPercent = Math.min(100, Math.round((currentProgress / requirementValue) * 100));

      return {
        id: a.id,
        name: a.name,
        description: a.description,
        iconUrl: a.iconUrl,
        category: a.category,
        tier: a.tier,
        points: a.points,
        requirementType: a.requirementType,
        requirementValue: a.requirementValue.toString(),
        rewardCash: a.rewardCash.toString(),
        rewardPremium: a.rewardPremium,
        isSecret: a.isSecret,
        sortOrder: a.sortOrder,
        isUnlocked,
        unlockedAt: unlockedAt?.toISOString() || null,
        currentProgress,
        progressPercent,
      };
    });
  }

  /**
   * Get achievement summary for a player
   */
  async getSummary(userId: string): Promise<AchievementSummary> {
    const [achievements, playerAchievements] = await Promise.all([
      prisma.achievement.findMany(),
      prisma.playerAchievement.findMany({
        where: { userId, isCompleted: true },
        include: { achievement: true },
      }),
    ]);

    const completedIds = new Set(playerAchievements.map((pa) => pa.achievementId));
    const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);
    const earnedPoints = playerAchievements.reduce(
      (sum, pa) => sum + pa.achievement.points,
      0
    );

    // Group by category
    const categoryMap = new Map<string, { total: number; unlocked: number }>();
    for (const a of achievements) {
      const cat = categoryMap.get(a.category) || { total: 0, unlocked: 0 };
      cat.total++;
      if (completedIds.has(a.id)) {
        cat.unlocked++;
      }
      categoryMap.set(a.category, cat);
    }

    return {
      totalAchievements: achievements.length,
      unlockedCount: playerAchievements.length,
      totalPoints,
      earnedPoints,
      categories: Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        total: data.total,
        unlocked: data.unlocked,
      })),
    };
  }

  /**
   * Check and unlock any newly completed achievements
   * Returns list of newly unlocked achievements
   */
  async checkAndUnlockAchievements(userId: string): Promise<NewlyUnlockedAchievement[]> {
    const [achievements, playerProgress] = await Promise.all([
      prisma.achievement.findMany(),
      this.getPlayerProgress(userId),
    ]);

    const newlyUnlocked: NewlyUnlockedAchievement[] = [];

    for (const achievement of achievements) {
      // Check if requirement is met
      const currentValue = playerProgress[achievement.requirementType] || 0;
      const requiredValue = achievement.requirementValue.toNumber();

      if (currentValue >= requiredValue) {
        // Upsert player achievement - create if doesn't exist, or update if exists but not completed
        const result = await prisma.$transaction(async (tx) => {
          // Check current state
          const existing = await tx.playerAchievement.findUnique({
            where: {
              userId_achievementId: { userId, achievementId: achievement.id },
            },
          });

          // Skip if already completed and reward claimed
          if (existing?.isCompleted && existing?.rewardClaimed) {
            return null;
          }

          const now = new Date();

          if (!existing) {
            // Create new achievement record as completed
            await tx.playerAchievement.create({
              data: {
                userId,
                achievementId: achievement.id,
                progress: requiredValue,
                isCompleted: true,
                rewardClaimed: true,
                completedAt: now,
                claimedAt: now,
              },
            });
          } else if (!existing.isCompleted) {
            // Update to completed
            await tx.playerAchievement.update({
              where: {
                userId_achievementId: { userId, achievementId: achievement.id },
              },
              data: {
                progress: requiredValue,
                isCompleted: true,
                rewardClaimed: true,
                completedAt: now,
                claimedAt: now,
              },
            });
          } else if (!existing.rewardClaimed) {
            // Already completed but reward not claimed - claim it now
            await tx.playerAchievement.update({
              where: {
                userId_achievementId: { userId, achievementId: achievement.id },
              },
              data: {
                rewardClaimed: true,
                claimedAt: now,
              },
            });
          } else {
            // Already completed and claimed
            return null;
          }

          // Award cash reward if any
          if (achievement.rewardCash.greaterThan(0)) {
            await tx.playerStats.update({
              where: { userId },
              data: {
                cash: { increment: achievement.rewardCash },
                lifetimeCashEarned: { increment: achievement.rewardCash },
              },
            });
          }

          // Award premium currency if any
          if (achievement.rewardPremium > 0) {
            await tx.playerStats.update({
              where: { userId },
              data: {
                premiumCurrency: { increment: achievement.rewardPremium },
              },
            });
          }

          return achievement;
        });

        if (result) {
          newlyUnlocked.push({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            tier: achievement.tier,
            points: achievement.points,
            rewardCash: achievement.rewardCash.toString(),
          });
        }
      }
    }

    return newlyUnlocked;
  }

  /**
   * Get player's current progress for all requirement types
   */
  private async getPlayerProgress(userId: string): Promise<Record<string, number>> {
    const [stats, propertyCount, managerCount, businessCount, dailyStreak] = await Promise.all([
      prisma.playerStats.findUnique({ where: { userId } }),
      prisma.playerProperty.aggregate({
        where: { userId },
        _sum: { quantity: true },
      }),
      prisma.playerProperty.count({
        where: { userId, managerHired: true },
      }),
      prisma.playerBusiness.count({ where: { userId } }),
      prisma.playerDailyStreak.findUnique({ where: { userId } }),
    ]);

    if (!stats) {
      return {};
    }

    return {
      cash: new Decimal(stats.cash).toNumber(),
      properties_owned: propertyCount._sum.quantity || 0,
      managers_hired: managerCount,
      businesses_owned: businessCount,
      income_per_hour: new Decimal(stats.effectiveIncomeHour).toNumber(),
      times_prestiged: stats.timesPrestiged,
      player_level: stats.playerLevel,
      login_streak: dailyStreak?.currentStreak || 0,
    };
  }

  /**
   * Get recently unlocked achievements
   */
  async getRecentUnlocked(userId: string, limit: number = 5): Promise<AchievementWithProgress[]> {
    const recent = await prisma.playerAchievement.findMany({
      where: { userId, isCompleted: true },
      include: { achievement: true },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });

    return recent.map((pa) => ({
      id: pa.achievement.id,
      name: pa.achievement.name,
      description: pa.achievement.description,
      iconUrl: pa.achievement.iconUrl,
      category: pa.achievement.category,
      tier: pa.achievement.tier,
      points: pa.achievement.points,
      requirementType: pa.achievement.requirementType,
      requirementValue: pa.achievement.requirementValue.toString(),
      rewardCash: pa.achievement.rewardCash.toString(),
      rewardPremium: pa.achievement.rewardPremium,
      isSecret: pa.achievement.isSecret,
      sortOrder: pa.achievement.sortOrder,
      isUnlocked: true,
      unlockedAt: pa.completedAt?.toISOString() || null,
      currentProgress: pa.achievement.requirementValue.toNumber(),
      progressPercent: 100,
    }));
  }
}

export const achievementService = new AchievementService();
