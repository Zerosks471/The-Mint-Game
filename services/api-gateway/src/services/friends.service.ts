import { prisma } from '@mint/database';
import { ErrorCodes } from '@mint/types';
import { AppError } from '../middleware/errorHandler';

export interface FriendWithUser {
  id: string;
  status: string;
  requestedAt: Date;
  respondedAt: Date | null;
  friend: {
    id: string;
    username: string;
    displayName: string | null;
  };
  isRequester: boolean;
}

export interface FriendRequest {
  id: string;
  status: string;
  requestedAt: Date;
  requester: {
    id: string;
    username: string;
    displayName: string | null;
  };
}

export class FriendsService {
  /**
   * Get all friends for a user (accepted friendships)
   */
  async getFriends(userId: string): Promise<FriendWithUser[]> {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'accepted' },
          { addresseeId: userId, status: 'accepted' },
        ],
      },
      include: {
        requester: {
          select: { id: true, username: true, displayName: true },
        },
        addressee: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { respondedAt: 'desc' },
    });

    return friendships.map((f) => ({
      id: f.id,
      status: f.status,
      requestedAt: f.requestedAt,
      respondedAt: f.respondedAt,
      friend: f.requesterId === userId ? f.addressee : f.requester,
      isRequester: f.requesterId === userId,
    }));
  }

  /**
   * Get pending friend requests (received)
   */
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    const requests = await prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: 'pending',
      },
      include: {
        requester: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      status: r.status,
      requestedAt: r.requestedAt,
      requester: r.requester,
    }));
  }

  /**
   * Get sent friend requests (outgoing)
   */
  async getSentRequests(userId: string): Promise<FriendRequest[]> {
    const requests = await prisma.friendship.findMany({
      where: {
        requesterId: userId,
        status: 'pending',
      },
      include: {
        addressee: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      status: r.status,
      requestedAt: r.requestedAt,
      requester: r.addressee, // We're showing who we sent to
    }));
  }

  /**
   * Send a friend request by username
   */
  async sendRequest(requesterId: string, targetUsername: string): Promise<{ id: string }> {
    // Find target user
    const targetUser = await prisma.user.findUnique({
      where: { username: targetUsername.toLowerCase() },
    });

    if (!targetUser) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    if (targetUser.id === requesterId) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Cannot add yourself as a friend', 400);
    }

    // Check if friendship already exists
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: targetUser.id },
          { requesterId: targetUser.id, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Already friends with this user', 400);
      }
      if (existing.status === 'pending') {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Friend request already pending', 400);
      }
      if (existing.status === 'rejected') {
        // Allow re-requesting after rejection
        const updated = await prisma.friendship.update({
          where: { id: existing.id },
          data: {
            requesterId,
            addresseeId: targetUser.id,
            status: 'pending',
            requestedAt: new Date(),
            respondedAt: null,
          },
        });
        return { id: updated.id };
      }
    }

    // Create new friendship request
    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId: targetUser.id,
        status: 'pending',
      },
    });

    // Create notification for target user
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `You have a new friend request`,
        data: { friendshipId: friendship.id, requesterId },
      },
    });

    return { id: friendship.id };
  }

  /**
   * Accept a friend request
   */
  async acceptRequest(userId: string, friendshipId: string): Promise<void> {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Friend request not found', 404);
    }

    if (friendship.addresseeId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Cannot accept this request', 403);
    }

    if (friendship.status !== 'pending') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Request is no longer pending', 400);
    }

    await prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: 'accepted',
        respondedAt: new Date(),
      },
    });

    // Notify the requester
    await prisma.notification.create({
      data: {
        userId: friendship.requesterId,
        type: 'friend_request',
        title: 'Friend Request Accepted',
        message: 'Your friend request was accepted!',
        data: { friendshipId },
      },
    });
  }

  /**
   * Reject a friend request
   */
  async rejectRequest(userId: string, friendshipId: string): Promise<void> {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Friend request not found', 404);
    }

    if (friendship.addresseeId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Cannot reject this request', 403);
    }

    if (friendship.status !== 'pending') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Request is no longer pending', 400);
    }

    await prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: 'rejected',
        respondedAt: new Date(),
      },
    });
  }

  /**
   * Remove a friend
   */
  async removeFriend(userId: string, friendshipId: string): Promise<void> {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Friendship not found', 404);
    }

    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Cannot remove this friendship', 403);
    }

    await prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  /**
   * Search for users by username
   */
  async searchUsers(
    query: string,
    userId: string
  ): Promise<Array<{ id: string; username: string; displayName: string | null; isFriend: boolean }>> {
    const users = await prisma.user.findMany({
      where: {
        username: { contains: query.toLowerCase() },
        id: { not: userId },
      },
      select: { id: true, username: true, displayName: true },
      take: 10,
    });

    // Check friendship status for each user
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: users.flatMap((u) => [
          { requesterId: userId, addresseeId: u.id },
          { requesterId: u.id, addresseeId: userId },
        ]),
      },
    });

    return users.map((u) => ({
      ...u,
      isFriend: friendships.some(
        (f) =>
          f.status === 'accepted' &&
          ((f.requesterId === userId && f.addresseeId === u.id) ||
            (f.requesterId === u.id && f.addresseeId === userId))
      ),
    }));
  }

  /**
   * Get friend count for a user
   */
  async getFriendCount(userId: string): Promise<number> {
    return prisma.friendship.count({
      where: {
        OR: [
          { requesterId: userId, status: 'accepted' },
          { addresseeId: userId, status: 'accepted' },
        ],
      },
    });
  }
}

export const friendsService = new FriendsService();
