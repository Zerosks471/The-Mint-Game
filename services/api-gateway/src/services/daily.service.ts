import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import { AppError } from '../middleware/errorHandler';

export interface DailyRewardData {
  amount: number;
  bonusCoins?: number;
  prestigePoints?: number;
}

export interface DailyStatus {
  currentStreak: number;
  longestStreak: number;
  currentDay: number; // 1-30
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

export interface ClaimResult {
  day: number;
  rewardType: string;
  rewardData: DailyRewardData;
  newStreak: number;
  newCash: string;
  streakBroken: boolean;
}

export class DailyService {
  /**
   * Check if two dates are on different calendar days
   */
  private isDifferentDay(date1: Date, date2: Date): boolean {
    return (
      date1.getUTCFullYear() !== date2.getUTCFullYear() ||
      date1.getUTCMonth() !== date2.getUTCMonth() ||
      date1.getUTCDate() !== date2.getUTCDate()
    );
  }

  /**
   * Check if the streak was broken (missed a day)
   */
  private isStreakBroken(lastClaimAt: Date | null): boolean {
    if (!lastClaimAt) return false;

    const now = new Date();
    const lastClaim = new Date(lastClaimAt);

    // Get the difference in days
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysDiff = Math.floor(
      (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
        Date.UTC(lastClaim.getUTCFullYear(), lastClaim.getUTCMonth(), lastClaim.getUTCDate())) /
        msPerDay
    );

    // Streak is broken if more than 1 day has passed
    return daysDiff > 1;
  }

  /**
   * Check if the player can claim today's reward
   */
  private canClaimToday(lastClaimAt: Date | null): boolean {
    if (!lastClaimAt) return true;

    const now = new Date();
    return this.isDifferentDay(lastClaimAt, now);
  }

  /**
   * Get daily reward status for a player
   */
  async getStatus(userId: string): Promise<DailyStatus> {
    // Get or create player streak record
    let streak = await prisma.playerDailyStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      streak = await prisma.playerDailyStreak.create({
        data: {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          currentDay: 1,
        },
      });
    }

    const canClaim = this.canClaimToday(streak.lastClaimAt);
    const streakBroken = this.isStreakBroken(streak.lastClaimAt);

    // If streak is broken, they'll restart from day 1
    const effectiveDay = streakBroken ? 1 : streak.currentDay;

    // Get the next reward
    const nextRewardRecord = await prisma.dailyReward.findUnique({
      where: { day: effectiveDay },
    });

    // Get upcoming rewards (next 7 days)
    const upcomingDays: number[] = [];
    for (let i = 0; i < 7; i++) {
      const day = ((effectiveDay - 1 + i) % 30) + 1;
      upcomingDays.push(day);
    }

    const upcomingRewards = await prisma.dailyReward.findMany({
      where: { day: { in: upcomingDays } },
      orderBy: { day: 'asc' },
    });

    // Sort by the cycle order
    const sortedUpcoming = upcomingDays.map((day) => {
      const reward = upcomingRewards.find((r) => r.day === day);
      return {
        day,
        rewardType: reward?.rewardType || 'cash',
        rewardData: (reward?.rewardData as DailyRewardData) || { amount: 500 },
        isMilestone: [7, 14, 21, 30].includes(day),
      };
    });

    return {
      currentStreak: streakBroken ? 0 : streak.currentStreak,
      longestStreak: streak.longestStreak,
      currentDay: effectiveDay,
      canClaim,
      lastClaimAt: streak.lastClaimAt?.toISOString() || null,
      nextReward: nextRewardRecord
        ? {
            day: effectiveDay,
            rewardType: nextRewardRecord.rewardType,
            rewardData: nextRewardRecord.rewardData as DailyRewardData,
          }
        : null,
      upcomingRewards: sortedUpcoming,
    };
  }

  /**
   * Claim today's daily reward
   */
  async claimReward(userId: string): Promise<ClaimResult> {
    return prisma.$transaction(async (tx) => {
      // Get or create streak record
      let streak = await tx.playerDailyStreak.findUnique({
        where: { userId },
      });

      if (!streak) {
        streak = await tx.playerDailyStreak.create({
          data: {
            userId,
            currentStreak: 0,
            longestStreak: 0,
            currentDay: 1,
          },
        });
      }

      // Check if can claim
      if (!this.canClaimToday(streak.lastClaimAt)) {
        throw new AppError('Already claimed today\'s reward', 400);
      }

      const streakBroken = this.isStreakBroken(streak.lastClaimAt);
      const effectiveDay = streakBroken ? 1 : streak.currentDay;

      // Get the reward for this day
      const reward = await tx.dailyReward.findUnique({
        where: { day: effectiveDay },
      });

      if (!reward) {
        throw new AppError('Reward not found', 404);
      }

      const rewardData = reward.rewardData as DailyRewardData;

      // Calculate new streak
      const newStreak = streakBroken ? 1 : streak.currentStreak + 1;
      const newLongestStreak = Math.max(newStreak, streak.longestStreak);

      // Calculate next day (cycles back to 1 after 30)
      const nextDay = effectiveDay >= 30 ? 1 : effectiveDay + 1;

      // Update streak record
      await tx.playerDailyStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          currentDay: nextDay,
          lastClaimAt: new Date(),
        },
      });

      // Get player stats
      const stats = await tx.playerStats.findUnique({
        where: { userId },
      });

      if (!stats) {
        throw new AppError('Player stats not found', 404);
      }

      // Apply rewards
      let newCash = new Decimal(stats.cash);

      // Cash reward
      if (rewardData.amount) {
        newCash = newCash.add(rewardData.amount);
      }

      // Update player stats with cash
      const updateData: Record<string, unknown> = {
        cash: newCash,
        lifetimeCashEarned: new Decimal(stats.lifetimeCashEarned).add(rewardData.amount || 0),
      };

      // Add prestige points if any
      if (rewardData.prestigePoints) {
        updateData.prestigePoints = { increment: rewardData.prestigePoints };
      }

      await tx.playerStats.update({
        where: { userId },
        data: updateData,
      });

      // TODO: Handle bonusCoins when premium currency system is implemented

      return {
        day: effectiveDay,
        rewardType: reward.rewardType,
        rewardData,
        newStreak,
        newCash: newCash.toString(),
        streakBroken,
      };
    });
  }

  /**
   * Get all daily rewards for display
   */
  async getAllRewards(): Promise<
    Array<{
      day: number;
      rewardType: string;
      rewardData: DailyRewardData;
      isMilestone: boolean;
    }>
  > {
    const rewards = await prisma.dailyReward.findMany({
      orderBy: { day: 'asc' },
    });

    return rewards.map((r) => ({
      day: r.day,
      rewardType: r.rewardType,
      rewardData: r.rewardData as DailyRewardData,
      isMilestone: [7, 14, 21, 30].includes(r.day),
    }));
  }
}

export const dailyService = new DailyService();
