import { prisma } from '@mint/database';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';

type CosmeticType = 'avatar' | 'avatar_frame' | 'badge';

interface CosmeticWithOwnership {
  id: string;
  name: string;
  description: string | null;
  type: string;
  rarity: string;
  premiumCost: number | null;
  previewUrl: string | null;
  owned: boolean;
  equipped: boolean;
}

interface EquippedCosmetics {
  avatar: string | null;
  avatarFrame: string | null;
  badge: string | null;
}

interface CatalogResponse {
  cosmetics: CosmeticWithOwnership[];
  equipped: EquippedCosmetics;
  balance: number;
}

export class CosmeticsService {
  async getCatalog(userId: string): Promise<CatalogResponse> {
    const [user, allCosmetics, ownedCosmetics, stats] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { avatarId: true, avatarFrameId: true, badgeId: true },
      }),
      prisma.cosmetic.findMany({
        where: { isAvailable: true },
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.playerCosmetic.findMany({
        where: { userId },
        select: { cosmeticId: true },
      }),
      prisma.playerStats.findUnique({
        where: { userId },
        select: { premiumCurrency: true },
      }),
    ]);

    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    const ownedIds = new Set(ownedCosmetics.map((c) => c.cosmeticId));

    const cosmetics: CosmeticWithOwnership[] = allCosmetics.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      type: c.type,
      rarity: c.rarity,
      premiumCost: c.premiumCost,
      previewUrl: c.previewUrl,
      owned: ownedIds.has(c.id) || c.premiumCost === 0 || c.premiumCost === null,
      equipped:
        c.id === user.avatarId || c.id === user.avatarFrameId || c.id === user.badgeId,
    }));

    return {
      cosmetics,
      equipped: {
        avatar: user.avatarId,
        avatarFrame: user.avatarFrameId,
        badge: user.badgeId,
      },
      balance: stats?.premiumCurrency ?? 0,
    };
  }

  async getOwned(userId: string): Promise<CosmeticWithOwnership[]> {
    const [user, ownedCosmetics] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { avatarId: true, avatarFrameId: true, badgeId: true },
      }),
      prisma.playerCosmetic.findMany({
        where: { userId },
        include: { cosmetic: true },
      }),
    ]);

    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    return ownedCosmetics.map((pc) => ({
      id: pc.cosmetic.id,
      name: pc.cosmetic.name,
      description: pc.cosmetic.description,
      type: pc.cosmetic.type,
      rarity: pc.cosmetic.rarity,
      premiumCost: pc.cosmetic.premiumCost,
      previewUrl: pc.cosmetic.previewUrl,
      owned: true,
      equipped:
        pc.cosmetic.id === user.avatarId ||
        pc.cosmetic.id === user.avatarFrameId ||
        pc.cosmetic.id === user.badgeId,
    }));
  }

  async purchase(
    userId: string,
    cosmeticId: string
  ): Promise<{ newBalance: number }> {
    const [cosmetic, existingOwnership, stats] = await Promise.all([
      prisma.cosmetic.findUnique({ where: { id: cosmeticId } }),
      prisma.playerCosmetic.findUnique({
        where: { userId_cosmeticId: { userId, cosmeticId } },
      }),
      prisma.playerStats.findUnique({
        where: { userId },
        select: { premiumCurrency: true },
      }),
    ]);

    if (!cosmetic) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Cosmetic not found', 404);
    }

    if (!cosmetic.isAvailable) {
      throw new AppError(ErrorCodes.BAD_REQUEST, 'Cosmetic is not available', 400);
    }

    if (existingOwnership) {
      throw new AppError(ErrorCodes.CONFLICT, 'You already own this cosmetic', 409);
    }

    const cost = cosmetic.premiumCost ?? 0;
    const balance = stats?.premiumCurrency ?? 0;

    if (cost > 0 && balance < cost) {
      throw new AppError(
        ErrorCodes.INSUFFICIENT_FUNDS,
        `Not enough Mint Coins. Need ${cost}, have ${balance}`,
        400
      );
    }

    await prisma.$transaction(async (tx) => {
      // Deduct coins
      if (cost > 0) {
        await tx.playerStats.update({
          where: { userId },
          data: { premiumCurrency: { decrement: cost } },
        });
      }

      // Create ownership record
      await tx.playerCosmetic.create({
        data: {
          userId,
          cosmeticId,
          acquiredVia: 'purchase',
        },
      });
    });

    const newStats = await prisma.playerStats.findUnique({
      where: { userId },
      select: { premiumCurrency: true },
    });

    return { newBalance: newStats?.premiumCurrency ?? 0 };
  }

  async equip(
    userId: string,
    cosmeticId: string | null,
    slot?: CosmeticType
  ): Promise<EquippedCosmetics> {
    // If cosmeticId is null, we're unequipping - slot is required
    if (cosmeticId === null && !slot) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Slot required when unequipping', 400);
    }

    let targetSlot: CosmeticType | undefined = slot;

    if (cosmeticId !== null) {
      // Check cosmetic exists and user owns it (or it's free)
      const cosmetic = await prisma.cosmetic.findUnique({
        where: { id: cosmeticId },
      });

      if (!cosmetic) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Cosmetic not found', 404);
      }

      // Check ownership (unless it's free)
      const isFree = cosmetic.premiumCost === 0 || cosmetic.premiumCost === null;
      if (!isFree) {
        const ownership = await prisma.playerCosmetic.findUnique({
          where: { userId_cosmeticId: { userId, cosmeticId } },
        });

        if (!ownership) {
          throw new AppError(ErrorCodes.FORBIDDEN, 'You do not own this cosmetic', 403);
        }
      }

      targetSlot = cosmetic.type as CosmeticType;
    }

    // Update the appropriate field on User
    const updateData: Record<string, string | null> = {};

    switch (targetSlot) {
      case 'avatar':
        updateData.avatarId = cosmeticId ?? 'avatar_default';
        break;
      case 'avatar_frame':
        updateData.avatarFrameId = cosmeticId;
        break;
      case 'badge':
        updateData.badgeId = cosmeticId;
        break;
      default:
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid cosmetic type', 400);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { avatarId: true, avatarFrameId: true, badgeId: true },
    });

    return {
      avatar: user.avatarId,
      avatarFrame: user.avatarFrameId,
      badge: user.badgeId,
    };
  }
}

export const cosmeticsService = new CosmeticsService();
