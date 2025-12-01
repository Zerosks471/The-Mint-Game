import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

// Phase thresholds (net worth required)
const PHASE_THRESHOLDS = [
  { id: 1, slug: 'hustler', name: 'Hustler', netWorth: 0, description: 'Starting out with side gigs and first properties' },
  { id: 2, slug: 'landlord', name: 'Landlord', netWorth: 1_000_000, description: 'Building a real estate empire' },
  { id: 3, slug: 'mogul', name: 'Mogul', netWorth: 10_000_000, description: 'Running a business empire with franchises' },
  { id: 4, slug: 'investor', name: 'Investor', netWorth: 100_000_000, description: 'Playing the stock market and diversifying' },
  { id: 5, slug: 'titan', name: 'Titan', netWorth: 1_000_000_000, description: 'Dominating markets and acquiring competitors' },
];

export interface PhaseInfo {
  id: number;
  slug: string;
  name: string;
  description: string;
  netWorthRequired: number;
  isUnlocked: boolean;
  isCurrent: boolean;
  progress: number; // 0-100 percentage to next phase
}

export class PhaseService {
  /**
   * Calculate which phase a player is in based on net worth
   */
  calculatePhase(netWorth: Decimal | number): number {
    const worth = typeof netWorth === 'number' ? netWorth : Number(netWorth);

    for (let i = PHASE_THRESHOLDS.length - 1; i >= 0; i--) {
      const threshold = PHASE_THRESHOLDS[i];
      if (threshold && worth >= threshold.netWorth) {
        return threshold.id;
      }
    }
    return 1;
  }

  /**
   * Get all phases with unlock status for a player
   */
  async getPhaseStatus(userId: string): Promise<{
    currentPhase: PhaseInfo;
    allPhases: PhaseInfo[];
    netWorth: string;
  }> {
    const stats = await prisma.playerStats.findUnique({ where: { userId } });
    if (!stats) {
      throw new Error('Player stats not found');
    }

    // Calculate net worth
    const netWorth = await this.calculateNetWorth(userId);
    const currentPhaseId = this.calculatePhase(netWorth);

    const allPhases: PhaseInfo[] = PHASE_THRESHOLDS.map((phase, index) => {
      const nextPhase = PHASE_THRESHOLDS[index + 1];
      let progress = 0;

      if (phase.id < currentPhaseId) {
        progress = 100;
      } else if (phase.id === currentPhaseId && nextPhase) {
        const range = nextPhase.netWorth - phase.netWorth;
        const achieved = Number(netWorth) - phase.netWorth;
        progress = Math.min(100, Math.max(0, (achieved / range) * 100));
      } else if (phase.id === currentPhaseId && !nextPhase) {
        progress = 100; // Max phase
      }

      return {
        id: phase.id,
        slug: phase.slug,
        name: phase.name,
        description: phase.description,
        netWorthRequired: phase.netWorth,
        isUnlocked: phase.id <= currentPhaseId,
        isCurrent: phase.id === currentPhaseId,
        progress: Math.round(progress * 100) / 100,
      };
    });

    const currentPhase = allPhases.find((p) => p.isCurrent)!;

    // Update player's current phase if changed
    if (stats.currentPhase !== currentPhaseId) {
      await prisma.playerStats.update({
        where: { userId },
        data: { currentPhase: currentPhaseId },
      });
    }

    return {
      currentPhase,
      allPhases,
      netWorth: netWorth.toString(),
    };
  }

  /**
   * Calculate player's total net worth
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

    if (!stats) {
      return new Decimal(0);
    }

    let netWorth = new Decimal(stats.cash);

    // Add property values
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
   * Check if player just unlocked a new phase
   */
  async checkPhaseUnlock(userId: string): Promise<{ newPhase: PhaseInfo | null; previousPhase: number }> {
    const stats = await prisma.playerStats.findUnique({ where: { userId } });
    if (!stats) {
      return { newPhase: null, previousPhase: 1 };
    }

    const netWorth = await this.calculateNetWorth(userId);
    const newPhaseId = this.calculatePhase(netWorth);
    const previousPhase = stats.currentPhase;

    if (newPhaseId > previousPhase) {
      // Update phase
      await prisma.playerStats.update({
        where: { userId },
        data: { currentPhase: newPhaseId },
      });

      const phaseData = PHASE_THRESHOLDS.find((p) => p.id === newPhaseId);
      if (phaseData) {
        return {
          newPhase: {
            id: phaseData.id,
            slug: phaseData.slug,
            name: phaseData.name,
            description: phaseData.description,
            netWorthRequired: phaseData.netWorth,
            isUnlocked: true,
            isCurrent: true,
            progress: 0,
          },
          previousPhase,
        };
      }
    }

    return { newPhase: null, previousPhase };
  }
}

export const phaseService = new PhaseService();
