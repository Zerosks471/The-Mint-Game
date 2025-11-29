// User domain types

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarId: string;
  bio: string | null;
  countryCode: string | null;
  timezone: string;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  theme: Theme;
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  language: string;
  isPremium: boolean;
  premiumUntil: Date | null;
  tutorialCompleted: boolean;
  referralCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
}

export type AccountStatus = 'active' | 'suspended' | 'banned' | 'deleted';
export type Theme = 'light' | 'dark' | 'system';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarId: string;
  bio: string | null;
  countryCode: string | null;
  isPremium: boolean;
  createdAt: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceType: string;
  deviceName: string;
  ipAddress: string;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface JWTPayload {
  sub: string;
  email: string;
  username: string;
  isPremium: boolean;
  sessionId: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}
