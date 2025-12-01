import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';
import { phaseService } from './phase.service';

export interface ProjectInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  cost: string;
  phaseRequired: number;
  effect: Record<string, unknown>;
  isCompleted: boolean;
  canAfford: boolean;
  canPurchase: boolean;
  prerequisiteMet: boolean;
  prerequisiteSlug: string | null;
}

export class ProjectService {
  /**
   * Get all available projects for a player
   */
  async getProjects(userId: string): Promise<{
    available: ProjectInfo[];
    completed: ProjectInfo[];
    locked: ProjectInfo[];
  }> {
    const [stats, playerProjects, allProjects] = await Promise.all([
      prisma.playerStats.findUnique({ where: { userId } }),
      prisma.playerProject.findMany({
        where: { userId },
        select: { projectId: true },
      }),
      prisma.project.findMany({
        where: { isActive: true },
        include: { prerequisite: true },
        orderBy: [{ phaseRequired: 'asc' }, { sortOrder: 'asc' }],
      }),
    ]);

    if (!stats) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
    }

    const completedIds = new Set(playerProjects.map((p) => p.projectId));
    const currentPhase = stats.currentPhase;
    const cash = stats.cash;

    const available: ProjectInfo[] = [];
    const completed: ProjectInfo[] = [];
    const locked: ProjectInfo[] = [];

    for (const project of allProjects) {
      const isCompleted = completedIds.has(project.id);
      const canAfford = new Decimal(cash).gte(project.cost);
      const phaseUnlocked = currentPhase >= project.phaseRequired;
      const prerequisiteMet = !project.prerequisiteId || completedIds.has(project.prerequisiteId);
      const canPurchase = !isCompleted && canAfford && phaseUnlocked && prerequisiteMet;

      const projectInfo: ProjectInfo = {
        id: project.id,
        slug: project.slug,
        name: project.name,
        description: project.description,
        category: project.category,
        cost: project.cost.toString(),
        phaseRequired: project.phaseRequired,
        effect: project.effect as Record<string, unknown>,
        isCompleted,
        canAfford,
        canPurchase,
        prerequisiteMet,
        prerequisiteSlug: project.prerequisite?.slug ?? null,
      };

      if (isCompleted) {
        completed.push(projectInfo);
      } else if (phaseUnlocked && prerequisiteMet) {
        available.push(projectInfo);
      } else {
        locked.push(projectInfo);
      }
    }

    return { available, completed, locked };
  }

  /**
   * Purchase a project
   */
  async purchaseProject(userId: string, projectSlug: string): Promise<{
    success: boolean;
    project: ProjectInfo;
    newCash: string;
  }> {
    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      include: { prerequisite: true },
    });

    if (!project) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Project not found', 404);
    }

    const stats = await prisma.playerStats.findUnique({ where: { userId } });
    if (!stats) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Player stats not found', 404);
    }

    // Check if already completed
    const existing = await prisma.playerProject.findUnique({
      where: { userId_projectId: { userId, projectId: project.id } },
    });
    if (existing) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Project already completed', 400);
    }

    // Check phase requirement
    if (stats.currentPhase < project.phaseRequired) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Requires Phase ${project.phaseRequired} (you are Phase ${stats.currentPhase})`,
        400
      );
    }

    // Check prerequisite
    if (project.prerequisiteId) {
      const prereqCompleted = await prisma.playerProject.findUnique({
        where: { userId_projectId: { userId, projectId: project.prerequisiteId } },
      });
      if (!prereqCompleted) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          `Must complete "${project.prerequisite?.name}" first`,
          400
        );
      }
    }

    // Check cash
    if (new Decimal(stats.cash).lt(project.cost)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Insufficient funds', 400);
    }

    // Purchase the project
    const result = await prisma.$transaction(async (tx) => {
      // Deduct cost
      const updatedStats = await tx.playerStats.update({
        where: { userId },
        data: {
          cash: { decrement: project.cost },
        },
      });

      // Create player project record
      await tx.playerProject.create({
        data: {
          userId,
          projectId: project.id,
        },
      });

      // Apply project effects
      await this.applyProjectEffect(tx, userId, project.effect as Record<string, unknown>);

      return updatedStats;
    });

    // Check for phase unlock after purchase
    await phaseService.checkPhaseUnlock(userId);

    return {
      success: true,
      project: {
        id: project.id,
        slug: project.slug,
        name: project.name,
        description: project.description,
        category: project.category,
        cost: project.cost.toString(),
        phaseRequired: project.phaseRequired,
        effect: project.effect as Record<string, unknown>,
        isCompleted: true,
        canAfford: false,
        canPurchase: false,
        prerequisiteMet: true,
        prerequisiteSlug: project.prerequisite?.slug ?? null,
      },
      newCash: result.cash.toString(),
    };
  }

  /**
   * Apply a project's effect to the player
   */
  private async applyProjectEffect(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    userId: string,
    effect: Record<string, unknown>
  ): Promise<void> {
    const effectType = effect.type as string;
    const effectValue = effect.value as number;

    switch (effectType) {
      case 'income_mult':
        // Increase income multiplier
        await tx.playerStats.update({
          where: { userId },
          data: {
            currentMultiplier: { increment: effectValue },
          },
        });
        break;

      case 'offline_cap':
        // Increase offline cap hours
        await tx.playerStats.update({
          where: { userId },
          data: {
            offlineCapHours: { increment: effectValue },
          },
        });
        break;

      // Add more effect types as needed
      default:
        // Unknown effect type - log but don't fail
        console.warn(`Unknown project effect type: ${effectType}`);
    }
  }

  /**
   * Calculate total bonuses from completed projects
   */
  async getProjectBonuses(userId: string): Promise<{
    incomeMultiplier: number;
    offlineCapBonus: number;
  }> {
    const playerProjects = await prisma.playerProject.findMany({
      where: { userId },
      include: { project: true },
    });

    let incomeMultiplier = 0;
    let offlineCapBonus = 0;

    for (const pp of playerProjects) {
      const effect = pp.project.effect as Record<string, unknown>;
      const effectType = effect.type as string;
      const effectValue = effect.value as number;

      if (effectType === 'income_mult') {
        incomeMultiplier += effectValue;
      } else if (effectType === 'offline_cap') {
        offlineCapBonus += effectValue;
      }
    }

    return { incomeMultiplier, offlineCapBonus };
  }
}

export const projectService = new ProjectService();
