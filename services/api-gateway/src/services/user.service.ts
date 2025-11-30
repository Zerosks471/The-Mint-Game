import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@mint/database';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '@mint/types';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  sub: string;
  email: string;
  username: string;
  isPremium: boolean;
  sessionId: string;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class UserService {
  async register(
    email: string,
    username: string,
    password: string,
    ip?: string
  ): Promise<{ user: any; tokens: AuthTokens }> {
    // Check if email exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new AppError(ErrorCodes.CONFLICT, 'Email already registered', 409);
    }

    // Check if username exists
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new AppError(ErrorCodes.CONFLICT, 'Username already taken', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate referral code
    const referralCode = uuidv4().slice(0, 8).toUpperCase();

    // Create user with transaction
    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          email,
          username,
          passwordHash,
          referralCode,
          signupPlatform: 'web',
          signupIp: ip,
        },
      });

      // Create player stats
      await tx.playerStats.create({
        data: {
          userId: newUser.id,
          cash: new Prisma.Decimal(1000),
        },
      });

      return newUser;
    });

    // Create session and generate tokens
    const tokens = await this.createSession(user.id, ip);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(
    email: string,
    password: string,
    ip?: string
  ): Promise<{ user: any; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        ErrorCodes.ACCOUNT_LOCKED,
        `Account locked. Try again in ${minutesLeft} minutes`,
        423
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      // Increment failed attempts
      const attempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: attempts };

      if (attempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    // Reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const tokens = await this.createSession(user.id, ip);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as TokenPayload;

      if (payload.type !== 'refresh') {
        throw new AppError(ErrorCodes.INVALID_TOKEN, 'Invalid token type', 401);
      }

      // Verify session exists and is active
      const session = await prisma.userSession.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session || !session.isActive || session.revokedAt) {
        throw new AppError(ErrorCodes.SESSION_EXPIRED, 'Session expired or revoked', 401);
      }

      // Generate new tokens (rotation)
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 401);
      }

      // Update session activity
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() },
      });

      return this.generateTokens(user, session.id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCodes.INVALID_TOKEN, 'Invalid refresh token', 401);
    }
  }

  async logout(sessionId: string): Promise<void> {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: 'logout',
      },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: 'logout_all',
      },
    });
  }

  private async createSession(userId: string, ip?: string): Promise<AuthTokens> {
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        ipAddress: ip,
        expiresAt,
      },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);

    return this.generateTokens(user, session.id);
  }

  private generateTokens(user: any, sessionId: string): AuthTokens {
    const basePayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      isPremium: user.isPremium,
      isAdmin: user.isAdmin || false,
      sessionId,
    };

    const accessToken = jwt.sign({ ...basePayload, type: 'access' }, config.JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign({ ...basePayload, type: 'refresh' }, config.JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    return { accessToken, refreshToken, expiresAt };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sanitizeUser(user: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, twoFactorSecret, emailVerifyToken, passwordResetToken, ...sanitized } = user;
    return sanitized;
  }
}

export const userService = new UserService();
