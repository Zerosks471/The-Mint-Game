import { prisma } from '@mint/database';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';

// Task difficulty configurations by business type
// Short and quick minigames: max 4-5 orders, plenty of time per task
const BUSINESS_TASK_CONFIG: Record<string, {
  baseItems: number;
  itemsPerLevel: number;
  maxItems: number;
  baseTimeSeconds: number;
  timeReductionPerLevel: number;
  minTimeSeconds: number;
}> = {
  restaurant: { baseItems: 3, itemsPerLevel: 0.1, maxItems: 5, baseTimeSeconds: 30, timeReductionPerLevel: 0.3, minTimeSeconds: 20 },
  tech_startup: { baseItems: 2, itemsPerLevel: 0.1, maxItems: 4, baseTimeSeconds: 25, timeReductionPerLevel: 0.2, minTimeSeconds: 18 },
  retail_store: { baseItems: 3, itemsPerLevel: 0.1, maxItems: 5, baseTimeSeconds: 30, timeReductionPerLevel: 0.3, minTimeSeconds: 20 },
  factory: { baseItems: 3, itemsPerLevel: 0.1, maxItems: 5, baseTimeSeconds: 28, timeReductionPerLevel: 0.25, minTimeSeconds: 18 },
  bank: { baseItems: 2, itemsPerLevel: 0.1, maxItems: 4, baseTimeSeconds: 25, timeReductionPerLevel: 0.2, minTimeSeconds: 18 },
  hotel: { baseItems: 3, itemsPerLevel: 0.1, maxItems: 4, baseTimeSeconds: 28, timeReductionPerLevel: 0.25, minTimeSeconds: 20 },
  marketing_agency: { baseItems: 2, itemsPerLevel: 0.1, maxItems: 4, baseTimeSeconds: 25, timeReductionPerLevel: 0.2, minTimeSeconds: 18 },
  consulting_firm: { baseItems: 2, itemsPerLevel: 0.1, maxItems: 4, baseTimeSeconds: 25, timeReductionPerLevel: 0.2, minTimeSeconds: 18 },
};

// Revenue multipliers based on attempt number
const ATTEMPT_MULTIPLIERS = {
  1: 1.0,
  2: 0.75,
  3: 0.5,
};

export interface TaskDifficulty {
  itemCount: number;
  timeLimit: number;
  level: number;
}

export interface TaskResult {
  success: boolean;
  revenueMultiplier: number;
  canRetry: boolean;
  attemptsRemaining: number;
  isPremium: boolean;
}

export class MinigameService {
  /**
   * Get task difficulty for a business based on its level
   */
  getBusinessTaskDifficulty(businessType: string, level: number): TaskDifficulty {
    const config = BUSINESS_TASK_CONFIG[businessType] || BUSINESS_TASK_CONFIG['restaurant']!;

    // Calculate item count with max cap for quick minigames
    const rawItemCount = Math.floor(config.baseItems + (level - 1) * config.itemsPerLevel);
    const itemCount = Math.min(rawItemCount, config.maxItems);

    const timeLimit = Math.max(
      config.minTimeSeconds,
      config.baseTimeSeconds - (level - 1) * config.timeReductionPerLevel
    );

    return { itemCount, timeLimit, level };
  }

  /**
   * Start a business task session (called when cycle completes)
   */
  async startBusinessTask(userId: string, businessId: string): Promise<{
    sessionId: string;
    taskType: string;
    difficulty: TaskDifficulty;
    attemptsUsed: number;
  }> {
    const business = await prisma.playerBusiness.findUnique({
      where: { id: businessId },
      include: { businessType: true },
    });

    if (!business || business.userId !== userId) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Business not found', 404);
    }

    // Check if cycle is actually complete
    const cycleStart = new Date(business.currentCycleStart);
    const cycleSeconds = business.cycleSeconds || business.businessType.cycleSeconds;
    const cycleEndTime = new Date(cycleStart.getTime() + cycleSeconds * 1000);

    if (new Date() < cycleEndTime) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Business cycle not complete', 400);
    }

    // Get or create session for this cycle
    let session = await prisma.businessTaskSession.findUnique({
      where: {
        userId_businessId_cycleStart: {
          userId,
          businessId,
          cycleStart,
        },
      },
    });

    if (!session) {
      session = await prisma.businessTaskSession.create({
        data: {
          userId,
          businessId,
          businessType: business.businessType.slug,
          cycleStart,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
        },
      });
    }

    const difficulty = this.getBusinessTaskDifficulty(
      business.businessType.slug,
      business.level
    );

    return {
      sessionId: session.id,
      taskType: `business:${business.businessType.slug}`,
      difficulty,
      attemptsUsed: session.attemptsUsed,
    };
  }

  /**
   * Submit business task result
   */
  async submitBusinessTaskResult(
    userId: string,
    sessionId: string,
    success: boolean,
    score?: number
  ): Promise<TaskResult> {
    const session = await prisma.businessTaskSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Task session not found', 404);
    }

    if (new Date() > session.expiresAt) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Task session expired', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true },
    });
    const isPremium = user?.isPremium || false;

    const attemptNumber = session.attemptsUsed + 1;
    const revenueMultiplier = ATTEMPT_MULTIPLIERS[attemptNumber as 1 | 2 | 3] || 0.5;

    // Record the attempt
    await prisma.taskAttempt.create({
      data: {
        userId,
        taskType: `business:${session.businessType}`,
        targetId: session.businessId,
        attemptNumber,
        success,
        score,
        revenueMultiplier: success ? revenueMultiplier : 0,
        difficulty: 1, // Could be calculated
      },
    });

    // Update session attempts
    await prisma.businessTaskSession.update({
      where: { id: sessionId },
      data: { attemptsUsed: attemptNumber },
    });

    // Determine if can retry
    const canRetry = !success && attemptNumber < 3;
    const attemptsRemaining = Math.max(0, 3 - attemptNumber);

    // If failed all attempts, premium users auto-collect at 50%
    if (!success && attemptNumber >= 3 && isPremium) {
      return {
        success: false,
        revenueMultiplier: 0.5, // Premium auto-collect
        canRetry: false,
        attemptsRemaining: 0,
        isPremium,
      };
    }

    // If failed all attempts, free users get nothing this cycle
    if (!success && attemptNumber >= 3 && !isPremium) {
      return {
        success: false,
        revenueMultiplier: 0,
        canRetry: false,
        attemptsRemaining: 0,
        isPremium,
      };
    }

    return {
      success,
      revenueMultiplier: success ? revenueMultiplier : 0,
      canRetry,
      attemptsRemaining,
      isPremium,
    };
  }

  /**
   * Submit property task result (optional task for +25% bonus)
   */
  async submitPropertyTaskResult(
    userId: string,
    propertyId: string,
    success: boolean,
    score?: number
  ): Promise<{ bonusMultiplier: number; newStreak: number }> {
    const property = await prisma.playerProperty.findUnique({
      where: { id: propertyId },
      include: { propertyType: true },
    });

    if (!property || property.userId !== userId) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Property not found', 404);
    }

    // Record the attempt
    await prisma.taskAttempt.create({
      data: {
        userId,
        taskType: `property:${property.propertyType.slug}`,
        targetId: propertyId,
        attemptNumber: 1, // Properties only get one attempt
        success,
        score,
        revenueMultiplier: success ? 1.25 : 1.0,
        difficulty: 1,
      },
    });

    // Update streak
    let streak = await prisma.taskStreak.findUnique({
      where: { playerId: userId },
    });

    if (!streak) {
      streak = await prisma.taskStreak.create({
        data: { playerId: userId },
      });
    }

    const newStreak = success ? streak.propertyStreak + 1 : 0;

    await prisma.taskStreak.update({
      where: { playerId: userId },
      data: {
        propertyStreak: newStreak,
        lastPropertyTask: new Date(),
      },
    });

    return {
      bonusMultiplier: success ? 1.25 : 1.0,
      newStreak,
    };
  }

  /**
   * Get player's task statistics
   */
  async getTaskStats(userId: string): Promise<{
    totalAttempts: number;
    successRate: number;
    streaks: { property: number; business: number };
  }> {
    const [attempts, streak] = await Promise.all([
      prisma.taskAttempt.findMany({
        where: { userId },
        select: { success: true },
      }),
      prisma.taskStreak.findUnique({
        where: { playerId: userId },
      }),
    ]);

    const totalAttempts = attempts.length;
    const successCount = attempts.filter((a) => a.success).length;
    const successRate = totalAttempts > 0 ? successCount / totalAttempts : 0;

    return {
      totalAttempts,
      successRate: Math.round(successRate * 100),
      streaks: {
        property: streak?.propertyStreak || 0,
        business: streak?.businessStreak || 0,
      },
    };
  }
}

export const minigameService = new MinigameService();
