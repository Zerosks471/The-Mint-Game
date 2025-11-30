// Social domain types - Friends, Clubs, Gifts

// ============================================================================
// FRIENDSHIP
// ============================================================================

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Friend {
  id: string;
  username: string;
  displayName: string | null;
  avatarId: string;
  isPremium: boolean;
  isOnline: boolean;
  lastActiveAt: Date | null;
  friendshipId: string;
  friendsSince: Date;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  requesterUsername: string;
  requesterDisplayName: string | null;
  requesterAvatarId: string;
  status: FriendshipStatus;
  createdAt: Date;
}

// ============================================================================
// CLUBS
// ============================================================================

export type ClubMemberRole = 'owner' | 'admin' | 'member';

export interface Club {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  ownerId: string;
  ownerUsername: string;
  level: number;
  totalDonations: number;
  memberCount: number;
  maxMembers: number;
  incomeBonus: number;
  isPublic: boolean;
  minLevelToJoin: number;
  createdAt: Date;
}

export interface ClubMembership {
  id: string;
  userId: string;
  clubId: string;
  role: ClubMemberRole;
  totalDonated: number;
  joinedAt: Date;
}

export interface ClubMember {
  id: string;
  username: string;
  displayName: string | null;
  avatarId: string;
  isPremium: boolean;
  role: ClubMemberRole;
  totalDonated: number;
  joinedAt: Date;
  isOnline: boolean;
}

export type ClubActivityType = 'joined' | 'donated' | 'leveled_up' | 'left' | 'kicked';

export interface ClubActivity {
  id: string;
  clubId: string;
  userId: string;
  username: string;
  activityType: ClubActivityType;
  data: Record<string, unknown> | null;
  createdAt: Date;
}

// ============================================================================
// GIFTS
// ============================================================================

export type GiftType = 'cash' | 'boost' | 'cosmetic';
export type GiftStatus = 'pending' | 'claimed' | 'expired';

export interface Gift {
  id: string;
  senderId: string;
  receiverId: string;
  giftType: GiftType;
  giftData: GiftData;
  message: string | null;
  status: GiftStatus;
  expiresAt: Date;
  claimedAt: Date | null;
  createdAt: Date;
}

export interface GiftData {
  amount?: number;
  boostId?: string;
  boostDurationMinutes?: number;
  cosmeticId?: string;
}

export interface GiftWithSender extends Gift {
  senderUsername: string;
  senderDisplayName: string | null;
  senderAvatarId: string;
}

export interface GiftWithReceiver extends Gift {
  receiverUsername: string;
  receiverDisplayName: string | null;
  receiverAvatarId: string;
}

export interface GiftCounts {
  pending: number;
  sentToday: number;
  maxPerDay: number;
}
