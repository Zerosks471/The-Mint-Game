import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

export interface LeaderboardEntry {
  rank: number;
  previousRank: number | null;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarId: string | null;
  avatarFrameId: string | null;
  badgeId: string | null;
  isPremium: boolean;
  score: string;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  leaderboardId: string;
  name: string;
  description: string;
  entries: LeaderboardEntry[];
  totalEntries: number;
  lastUpdated: string | null;
}

export interface PlayerRankResponse {
  leaderboardId: string;
  rank: number | null;
  previousRank: number | null;
  score: string | null;
  totalPlayers: number;
  percentile: number | null;
}

// Leaderboard configurations
const LEADERBOARD_CONFIG = {
  global_net_worth: {
    name: 'Net Worth',
    description: 'Richest players by total net worth',
  },
  global_income: {
    name: 'Income/Hour',
    description: 'Highest earning players',
  },
  global_prestige: {
    name: 'Prestige Masters',
    description: 'Most prestigious players',
  },
  weekly_earnings: {
    name: 'Weekly Earnings',
    description: 'Top earners this week',
  },
};

type LeaderboardType = keyof typeof LEADERBOARD_CONFIG;

export class LeaderboardService {
  /**
   * Get a leaderboard with top entries
   */
  async getLeaderboard(
    type: LeaderboardType,
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<LeaderboardResponse> {
    const config = LEADERBOARD_CONFIG[type];
    if (!config) {
      throw new Error(`Invalid leaderboard type: ${type}`);
    }

    const [entries, totalCount] = await Promise.all([
      prisma.leaderboardEntry.findMany({
        where: { leaderboardId: type },
        orderBy: { rank: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.leaderboardEntry.count({
        where: { leaderboardId: type },
      }),
    ]);

    // Get the last update time
    const lastEntry = entries[0];

    return {
      leaderboardId: type,
      name: config.name,
      description: config.description,
      entries: entries.map((e) => ({
        rank: e.rank,
        previousRank: e.previousRank,
        userId: e.userId,
        username: e.username,
        displayName: e.displayName,
        avatarId: e.avatarId,
        avatarFrameId: e.avatarFrameId,
        badgeId: e.badgeId,
        isPremium: e.isPremium,
        score: e.score.toString(),
        isCurrentUser: e.userId === userId,
      })),
      totalEntries: totalCount,
      lastUpdated: lastEntry?.updatedAt.toISOString() || null,
    };
  }

  /**
   * Get player's rank on a specific leaderboard
   */
  async getPlayerRank(type: LeaderboardType, userId: string): Promise<PlayerRankResponse> {
    const entry = await prisma.leaderboardEntry.findUnique({
      where: {
        leaderboardId_userId: {
          leaderboardId: type,
          userId,
        },
      },
    });

    const totalPlayers = await prisma.leaderboardEntry.count({
      where: { leaderboardId: type },
    });

    let percentile: number | null = null;
    if (entry && totalPlayers > 0) {
      percentile = Math.round(((totalPlayers - entry.rank + 1) / totalPlayers) * 100);
    }

    return {
      leaderboardId: type,
      rank: entry?.rank || null,
      previousRank: entry?.previousRank || null,
      score: entry?.score.toString() || null,
      totalPlayers,
      percentile,
    };
  }

  /**
   * Refresh all leaderboards (called by cron or manually)
   */
  async refreshAllLeaderboards(): Promise<{ updated: string[] }> {
    const types: LeaderboardType[] = [
      'global_net_worth',
      'global_income',
      'global_prestige',
    ];

    for (const type of types) {
      await this.refreshLeaderboard(type);
    }

    return { updated: types };
  }

  /**
   * Refresh a specific leaderboard
   */
  async refreshLeaderboard(type: LeaderboardType): Promise<void> {
    // Get all players with their scores based on leaderboard type
    let players: Array<{
      userId: string;
      username: string | null;
      displayName: string | null;
      avatarId: string | null;
      avatarFrameId: string | null;
      badgeId: string | null;
      isPremium: boolean;
      score: Decimal;
    }>;

    switch (type) {
      case 'global_net_worth':
        players = await this.getNetWorthRankings();
        break;
      case 'global_income':
        players = await this.getIncomeRankings();
        break;
      case 'global_prestige':
        players = await this.getPrestigeRankings();
        break;
      default:
        return;
    }

    // Get existing ranks for comparison
    const existingEntries = await prisma.leaderboardEntry.findMany({
      where: { leaderboardId: type },
      select: { userId: true, rank: true },
    });
    const existingRankMap = new Map(existingEntries.map((e) => [e.userId, e.rank]));

    // Sort by score descending and assign ranks
    players.sort((a, b) => b.score.minus(a.score).toNumber());

    // Batch upsert entries
    const now = new Date();
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!player) continue;
      const newRank = i + 1;
      const previousRank = existingRankMap.get(player.userId) || null;

      await prisma.leaderboardEntry.upsert({
        where: {
          leaderboardId_userId: {
            leaderboardId: type,
            userId: player.userId,
          },
        },
        create: {
          leaderboardId: type,
          userId: player.userId,
          rank: newRank,
          previousRank,
          score: player.score,
          username: player.username,
          displayName: player.displayName,
          avatarId: player.avatarId,
          avatarFrameId: player.avatarFrameId,
          badgeId: player.badgeId,
          isPremium: player.isPremium,
          updatedAt: now,
        },
        update: {
          rank: newRank,
          previousRank,
          score: player.score,
          username: player.username,
          displayName: player.displayName,
          avatarId: player.avatarId,
          avatarFrameId: player.avatarFrameId,
          badgeId: player.badgeId,
          isPremium: player.isPremium,
          updatedAt: now,
        },
      });
    }
  }

  /**
   * Get net worth rankings (cash + property value + business value)
   */
  private async getNetWorthRankings() {
    const users = await prisma.user.findMany({
      where: { accountStatus: 'active' },
      include: {
        playerStats: true,
        properties: {
          include: { propertyType: true },
        },
        businesses: true,
      },
    });

    return users
      .filter((u) => u.playerStats)
      .map((user) => {
        let netWorth = new Decimal(user.playerStats!.cash);

        // Add property values
        for (const prop of user.properties) {
          netWorth = netWorth.add(prop.totalSpent);
        }

        // Add business values
        for (const biz of user.businesses) {
          netWorth = netWorth.add(biz.totalInvested);
        }

        return {
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarId: user.avatarId,
          avatarFrameId: user.avatarFrameId,
          badgeId: user.badgeId,
          isPremium: user.isPremium,
          score: netWorth,
        };
      });
  }

  /**
   * Get income rankings (effective income per hour)
   */
  private async getIncomeRankings() {
    const users = await prisma.user.findMany({
      where: { accountStatus: 'active' },
      include: { playerStats: true },
    });

    return users
      .filter((u) => u.playerStats)
      .map((user) => ({
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarId: user.avatarId,
        avatarFrameId: user.avatarFrameId,
        badgeId: user.badgeId,
        isPremium: user.isPremium,
        score: new Decimal(user.playerStats!.effectiveIncomeHour),
      }));
  }

  /**
   * Get prestige rankings (prestige level + points)
   */
  private async getPrestigeRankings() {
    const users = await prisma.user.findMany({
      where: { accountStatus: 'active' },
      include: { playerStats: true },
    });

    return users
      .filter((u) => u.playerStats)
      .map((user) => {
        // Score = prestigeLevel * 1000 + prestigePoints (so level is primary sort)
        const score = new Decimal(user.playerStats!.prestigeLevel)
          .mul(1000)
          .add(user.playerStats!.prestigePoints);

        return {
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarId: user.avatarId,
          avatarFrameId: user.avatarFrameId,
          badgeId: user.badgeId,
          isPremium: user.isPremium,
          score,
        };
      });
  }

  /**
   * Get available leaderboard types
   */
  getLeaderboardTypes() {
    return Object.entries(LEADERBOARD_CONFIG).map(([id, config]) => ({
      id,
      ...config,
    }));
  }
}

export const leaderboardService = new LeaderboardService();
