import { prisma } from '@mint/database';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';

const MAX_GIFTS_PER_DAY = 5;
const GIFT_EXPIRY_DAYS = 7;

export interface GiftInfo {
  id: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  receiverUsername: string;
  giftType: string;
  giftData: { amount?: number; boostId?: string };
  message: string | null;
  status: string;
  expiresAt: Date;
  claimedAt: Date | null;
  createdAt: Date;
}

export class GiftsService {
  /**
   * Get pending gifts for a user
   */
  async getPendingGifts(userId: string): Promise<GiftInfo[]> {
    const gifts = await prisma.gift.findMany({
      where: {
        receiverId: userId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return gifts.map((g) => this.formatGift(g));
  }

  /**
   * Get sent gifts for a user
   */
  async getSentGifts(userId: string): Promise<GiftInfo[]> {
    const gifts = await prisma.gift.findMany({
      where: { senderId: userId },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return gifts.map((g) => this.formatGift(g));
  }

  /**
   * Send a gift to a friend
   */
  async sendGift(
    senderId: string,
    receiverId: string,
    giftType: string,
    amount?: number,
    message?: string
  ): Promise<GiftInfo> {
    // Check if they are friends
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: senderId, addresseeId: receiverId, status: 'accepted' },
          { requesterId: receiverId, addresseeId: senderId, status: 'accepted' },
        ],
      },
    });

    if (!friendship) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Can only send gifts to friends', 400);
    }

    // Check daily gift limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const giftsSentToday = await prisma.gift.count({
      where: {
        senderId,
        createdAt: { gte: today },
      },
    });

    if (giftsSentToday >= MAX_GIFTS_PER_DAY) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Daily gift limit reached (${MAX_GIFTS_PER_DAY}/day)`,
        400
      );
    }

    // Validate gift type and amount
    let giftData: { amount?: number; boostId?: string } = {};

    if (giftType === 'cash') {
      // Calculate gift amount based on sender's level
      const senderStats = await prisma.playerStats.findUnique({ where: { userId: senderId } });
      if (!senderStats) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'Sender stats not found', 404);
      }

      const maxGiftAmount = Math.min(1000, Math.max(100, senderStats.playerLevel * 50));
      const giftAmount = amount ? Math.min(amount, maxGiftAmount) : maxGiftAmount;

      // Check if sender has enough cash
      if (senderStats.cash.lessThan(giftAmount)) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Not enough cash to send gift', 400);
      }

      giftData = { amount: giftAmount };

      // Deduct from sender
      await prisma.playerStats.update({
        where: { userId: senderId },
        data: { cash: { decrement: giftAmount } },
      });
    } else {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid gift type', 400);
    }

    // Create gift
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + GIFT_EXPIRY_DAYS);

    const gift = await prisma.gift.create({
      data: {
        senderId,
        receiverId,
        giftType,
        giftData,
        message: message || null,
        status: 'pending',
        expiresAt,
      },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
    });

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'gift',
        title: 'New Gift!',
        message: `You received a gift from ${gift.sender.username}`,
        data: { giftId: gift.id, giftType, giftData },
      },
    });

    return this.formatGift(gift);
  }

  /**
   * Claim a gift
   */
  async claimGift(userId: string, giftId: string): Promise<{ claimed: GiftInfo; cashReceived?: number }> {
    const gift = await prisma.gift.findUnique({
      where: { id: giftId },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
    });

    if (!gift) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Gift not found', 404);
    }

    if (gift.receiverId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'This gift is not for you', 403);
    }

    if (gift.status !== 'pending') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Gift already claimed or expired', 400);
    }

    if (new Date() > gift.expiresAt) {
      await prisma.gift.update({
        where: { id: giftId },
        data: { status: 'expired' },
      });
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Gift has expired', 400);
    }

    // Process gift based on type
    let cashReceived: number | undefined;
    const giftData = gift.giftData as { amount?: number; boostId?: string };

    if (gift.giftType === 'cash' && giftData.amount) {
      cashReceived = giftData.amount;
      await prisma.playerStats.update({
        where: { userId },
        data: { cash: { increment: cashReceived } },
      });
    }

    // Update gift status
    const updatedGift = await prisma.gift.update({
      where: { id: giftId },
      data: {
        status: 'claimed',
        claimedAt: new Date(),
      },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
    });

    return {
      claimed: this.formatGift(updatedGift),
      cashReceived,
    };
  }

  /**
   * Get gift counts
   */
  async getGiftCounts(userId: string): Promise<{ pending: number; sentToday: number; maxPerDay: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, sentToday] = await Promise.all([
      prisma.gift.count({
        where: {
          receiverId: userId,
          status: 'pending',
          expiresAt: { gt: new Date() },
        },
      }),
      prisma.gift.count({
        where: {
          senderId: userId,
          createdAt: { gte: today },
        },
      }),
    ]);

    return { pending, sentToday, maxPerDay: MAX_GIFTS_PER_DAY };
  }

  private formatGift(gift: any): GiftInfo {
    return {
      id: gift.id,
      senderId: gift.senderId,
      senderUsername: gift.sender.username,
      receiverId: gift.receiverId,
      receiverUsername: gift.receiver.username,
      giftType: gift.giftType,
      giftData: gift.giftData as { amount?: number; boostId?: string },
      message: gift.message,
      status: gift.status,
      expiresAt: gift.expiresAt,
      claimedAt: gift.claimedAt,
      createdAt: gift.createdAt,
    };
  }
}

export const giftsService = new GiftsService();
