import { prisma, Prisma } from '@mint/database';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';

const CLUB_CREATION_COST = 10000;
const CLUB_LEVELS = [
  { level: 1, donationsRequired: 0, incomeBonus: 5 },
  { level: 2, donationsRequired: 100000, incomeBonus: 7 },
  { level: 3, donationsRequired: 500000, incomeBonus: 10 },
  { level: 4, donationsRequired: 2000000, incomeBonus: 12 },
  { level: 5, donationsRequired: 10000000, incomeBonus: 15 },
];

export interface ClubInfo {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  ownerUsername: string;
  isPublic: boolean;
  memberCount: number;
  maxMembers: number;
  clubLevel: number;
  incomeBonusPct: string;
  totalDonations: string;
  nextLevelDonations: number | null;
  createdAt: Date;
  isMember: boolean;
  isOwner: boolean;
  role: string | null;
}

export interface ClubMember {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
  joinedAt: Date;
}

export class ClubsService {
  /**
   * Get all public clubs
   */
  async getPublicClubs(userId: string): Promise<ClubInfo[]> {
    const clubs = await prisma.club.findMany({
      where: { isPublic: true },
      include: {
        owner: { select: { username: true } },
        memberships: { where: { userId }, select: { role: true } },
      },
      orderBy: { memberCount: 'desc' },
      take: 50,
    });

    return clubs.map((c) => this.formatClubInfo(c, userId));
  }

  /**
   * Get user's club
   */
  async getMyClub(userId: string): Promise<ClubInfo | null> {
    const membership = await prisma.clubMembership.findFirst({
      where: { userId, status: 'active' },
      include: {
        club: {
          include: {
            owner: { select: { username: true } },
          },
        },
      },
    });

    if (!membership) return null;

    return this.formatClubInfo(
      { ...membership.club, memberships: [{ role: membership.role }] },
      userId
    );
  }

  /**
   * Get club by ID with members
   */
  async getClub(clubId: string, userId: string): Promise<ClubInfo & { members: ClubMember[] }> {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        owner: { select: { username: true } },
        memberships: {
          where: { status: 'active' },
          include: {
            user: { select: { id: true, username: true, displayName: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!club) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Club not found', 404);
    }

    const userMembership = club.memberships.find((m) => m.userId === userId);
    const members: ClubMember[] = club.memberships.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.user.displayName,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return {
      ...this.formatClubInfo({ ...club, memberships: userMembership ? [{ role: userMembership.role }] : [] }, userId),
      members,
    };
  }

  /**
   * Create a new club
   */
  async createClub(
    userId: string,
    name: string,
    description?: string,
    isPublic: boolean = true
  ): Promise<ClubInfo> {
    // Check if user already owns or is in a club
    const existingMembership = await prisma.clubMembership.findFirst({
      where: { userId, status: 'active' },
    });

    if (existingMembership) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'You are already in a club', 400);
    }

    // Check if user has enough cash
    const stats = await prisma.playerStats.findUnique({ where: { userId } });
    if (!stats || stats.cash.lessThan(CLUB_CREATION_COST)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Need $${CLUB_CREATION_COST.toLocaleString()} to create a club`,
        400
      );
    }

    // Check if club name is taken
    const existingClub = await prisma.club.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingClub) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Club name already taken', 400);
    }

    // Create club and deduct cash
    const club = await prisma.$transaction(async (tx) => {
      await tx.playerStats.update({
        where: { userId },
        data: { cash: { decrement: CLUB_CREATION_COST } },
      });

      const newClub = await tx.club.create({
        data: {
          name,
          description,
          ownerId: userId,
          isPublic,
          memberCount: 1,
          clubLevel: 1,
          incomeBonusPct: 5,
        },
        include: {
          owner: { select: { username: true } },
        },
      });

      await tx.clubMembership.create({
        data: {
          clubId: newClub.id,
          userId,
          role: 'owner',
          status: 'active',
        },
      });

      await tx.clubActivity.create({
        data: {
          clubId: newClub.id,
          userId,
          activityType: 'created',
          data: { clubName: name },
        },
      });

      return newClub;
    });

    return this.formatClubInfo({ ...club, memberships: [{ role: 'owner' }] }, userId);
  }

  /**
   * Join a club
   */
  async joinClub(userId: string, clubId: string): Promise<void> {
    // Check if user is already in a club
    const existingMembership = await prisma.clubMembership.findFirst({
      where: { userId, status: 'active' },
    });

    if (existingMembership) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'You are already in a club', 400);
    }

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Club not found', 404);
    }

    if (!club.isPublic) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'This club is private', 403);
    }

    if (club.memberCount >= club.maxMembers) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Club is full', 400);
    }

    await prisma.$transaction([
      prisma.clubMembership.create({
        data: {
          clubId,
          userId,
          role: 'member',
          status: 'active',
        },
      }),
      prisma.club.update({
        where: { id: clubId },
        data: { memberCount: { increment: 1 } },
      }),
      prisma.clubActivity.create({
        data: {
          clubId,
          userId,
          activityType: 'joined',
        },
      }),
    ]);
  }

  /**
   * Leave a club
   */
  async leaveClub(userId: string): Promise<void> {
    const membership = await prisma.clubMembership.findFirst({
      where: { userId, status: 'active' },
      include: { club: true },
    });

    if (!membership) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'You are not in a club', 404);
    }

    if (membership.role === 'owner') {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Club owner cannot leave. Transfer ownership or delete the club.',
        400
      );
    }

    await prisma.$transaction([
      prisma.clubMembership.delete({
        where: { clubId_userId: { clubId: membership.clubId, userId } },
      }),
      prisma.club.update({
        where: { id: membership.clubId },
        data: { memberCount: { decrement: 1 } },
      }),
      prisma.clubActivity.create({
        data: {
          clubId: membership.clubId,
          userId,
          activityType: 'left',
        },
      }),
    ]);
  }

  /**
   * Donate cash to club
   */
  async donate(userId: string, amount: number): Promise<{ newLevel: number; newBonus: string }> {
    if (amount <= 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid donation amount', 400);
    }

    const membership = await prisma.clubMembership.findFirst({
      where: { userId, status: 'active' },
      include: { club: true },
    });

    if (!membership) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'You are not in a club', 404);
    }

    const stats = await prisma.playerStats.findUnique({ where: { userId } });
    if (!stats || stats.cash.lessThan(amount)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Not enough cash', 400);
    }

    // Calculate total donations and new level
    // Parse previous donation total from activities
    let totalDonations = 0;
    const donationActivities = await prisma.clubActivity.findMany({
      where: { clubId: membership.clubId, activityType: 'donated' },
    });
    for (const activity of donationActivities) {
      const data = activity.data as { amount?: number } | null;
      if (data?.amount) {
        totalDonations += data.amount;
      }
    }

    const newTotal = totalDonations + amount;

    // Determine new level
    let newLevel = 1;
    let newBonus = 5;
    for (const levelConfig of CLUB_LEVELS) {
      if (newTotal >= levelConfig.donationsRequired) {
        newLevel = levelConfig.level;
        newBonus = levelConfig.incomeBonus;
      }
    }

    await prisma.$transaction([
      prisma.playerStats.update({
        where: { userId },
        data: { cash: { decrement: amount } },
      }),
      prisma.club.update({
        where: { id: membership.clubId },
        data: {
          clubLevel: newLevel,
          incomeBonusPct: newBonus,
        },
      }),
      prisma.clubActivity.create({
        data: {
          clubId: membership.clubId,
          userId,
          activityType: 'donated',
          data: { amount },
        },
      }),
    ]);

    return { newLevel, newBonus: `${newBonus}%` };
  }

  /**
   * Kick a member (owner/admin only)
   */
  async kickMember(userId: string, targetUserId: string): Promise<void> {
    const membership = await prisma.clubMembership.findFirst({
      where: { userId, status: 'active' },
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Only club owner/admin can kick members', 403);
    }

    const targetMembership = await prisma.clubMembership.findFirst({
      where: { userId: targetUserId, clubId: membership.clubId, status: 'active' },
    });

    if (!targetMembership) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Member not found in club', 404);
    }

    if (targetMembership.role === 'owner') {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Cannot kick the club owner', 403);
    }

    await prisma.$transaction([
      prisma.clubMembership.delete({
        where: { clubId_userId: { clubId: membership.clubId, userId: targetUserId } },
      }),
      prisma.club.update({
        where: { id: membership.clubId },
        data: { memberCount: { decrement: 1 } },
      }),
      prisma.clubActivity.create({
        data: {
          clubId: membership.clubId,
          userId,
          activityType: 'kicked',
          data: { kickedUserId: targetUserId },
        },
      }),
    ]);
  }

  /**
   * Get club activity feed
   */
  async getActivities(clubId: string, limit: number = 20): Promise<any[]> {
    const activities = await prisma.clubActivity.findMany({
      where: { clubId },
      include: {
        user: { select: { username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return activities.map((a) => ({
      id: a.id,
      type: a.activityType,
      data: a.data,
      user: a.user,
      createdAt: a.createdAt,
    }));
  }

  private formatClubInfo(
    club: any,
    userId: string
  ): ClubInfo {
    const userMembership = club.memberships?.[0];
    const currentLevel = CLUB_LEVELS.find((l) => l.level === club.clubLevel);
    const nextLevel = CLUB_LEVELS.find((l) => l.level === club.clubLevel + 1);

    return {
      id: club.id,
      name: club.name,
      description: club.description,
      ownerId: club.ownerId,
      ownerUsername: club.owner?.username || 'Unknown',
      isPublic: club.isPublic,
      memberCount: club.memberCount,
      maxMembers: club.maxMembers,
      clubLevel: club.clubLevel,
      incomeBonusPct: club.incomeBonusPct.toString(),
      totalDonations: '0', // Would need to calculate from activities
      nextLevelDonations: nextLevel?.donationsRequired || null,
      createdAt: club.createdAt,
      isMember: !!userMembership,
      isOwner: club.ownerId === userId,
      role: userMembership?.role || null,
    };
  }
}

export const clubsService = new ClubsService();
