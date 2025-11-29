# Phase 0: Foundation & Setup - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up complete development infrastructure for The Mint, including monorepo, CI/CD, database, API gateway, and frontend scaffold.

**Architecture:** pnpm monorepo with Turborepo, shared TypeScript packages, Express.js API gateway, React frontend with Vite, PostgreSQL with Prisma ORM, Redis for caching.

**Tech Stack:** Node.js 20+, pnpm, Turborepo, TypeScript 5+, Express.js, React 18, Vite, Prisma, PostgreSQL, Redis, Tailwind CSS, Zod, Docker.

---

## Task Overview

| Task | Description | Estimated Steps |
|------|-------------|-----------------|
| 1 | Initialize monorepo with pnpm and Turborepo | 8 |
| 2 | Create shared packages (types, utils) | 10 |
| 3 | Set up database package with Prisma | 12 |
| 4 | Create API Gateway service | 15 |
| 5 | Set up React frontend with Vite | 12 |
| 6 | Configure Docker development environment | 8 |
| 7 | Set up CI/CD with GitHub Actions | 10 |
| 8 | Create environment configuration | 6 |

**Total Steps:** ~81 bite-sized steps

---

## Task 1: Initialize Monorepo with pnpm and Turborepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `.prettierrc`
- Create: `.eslintrc.js`

**Step 1: Initialize git repository**

```bash
cd "/Users/n809m/Desktop/Capital P"
git init
```

**Step 2: Create .nvmrc for Node version**

```
20
```

**Step 3: Create root package.json**

```json
{
  "name": "the-mint",
  "version": "0.0.1",
  "private": true,
  "packageManager": "pnpm@8.15.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules",
    "db:generate": "pnpm --filter @mint/database generate",
    "db:push": "pnpm --filter @mint/database push",
    "db:migrate": "pnpm --filter @mint/database migrate",
    "db:studio": "pnpm --filter @mint/database studio"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "turbo": "^1.11.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

**Step 4: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
  - "apps/*"
  - "services/*"
```

**Step 5: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "outputs": []
    },
    "test": {
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    },
    "generate": {
      "cache": false
    }
  }
}
```

**Step 6: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "exclude": ["node_modules"]
}
```

**Step 7: Create .gitignore**

```
# Dependencies
node_modules
.pnpm-store

# Build outputs
dist
build
.next
.turbo

# Environment
.env
.env.local
.env.*.local
!.env.example

# IDE
.idea
.vscode
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log
npm-debug.log*
pnpm-debug.log*

# Testing
coverage
.nyc_output

# Database
*.db
*.sqlite

# Misc
.cache
tmp
```

**Step 8: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

**Step 9: Create .eslintrc.js**

```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: ['node_modules', 'dist', 'build', '.turbo'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

**Step 10: Create directory structure**

```bash
mkdir -p packages/types packages/utils packages/database
mkdir -p apps/web
mkdir -p services/api-gateway services/user services/game
```

**Step 11: Install dependencies and verify**

```bash
pnpm install
```

**Step 12: Commit**

```bash
git add .
git commit -m "chore: initialize monorepo with pnpm and Turborepo

- Set up pnpm workspace with packages, apps, and services
- Configure Turborepo for build orchestration
- Add TypeScript, ESLint, and Prettier configs
- Create directory structure for monorepo"
```

---

## Task 2: Create Shared Packages (types, utils)

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`
- Create: `packages/types/src/user.ts`
- Create: `packages/types/src/game.ts`
- Create: `packages/types/src/api.ts`
- Create: `packages/utils/package.json`
- Create: `packages/utils/tsconfig.json`
- Create: `packages/utils/src/index.ts`

**Step 1: Create packages/types/package.json**

```json
{
  "name": "@mint/types",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

**Step 2: Create packages/types/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create packages/types/src/user.ts**

```typescript
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
  referralCode: string;
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
```

**Step 4: Create packages/types/src/game.ts**

```typescript
// Game domain types

export interface PlayerStats {
  userId: string;
  cash: number;
  premiumCurrency: number;
  lifetimeCashEarned: number;
  playerLevel: number;
  experiencePoints: number;
  prestigeLevel: number;
  prestigePoints: number;
  prestigeMultiplier: number;
  timesPrestiged: number;
  baseIncomePerHour: number;
  currentMultiplier: number;
  effectiveIncomeHour: number;
  lastCollectionAt: Date;
  offlineCapHours: number;
  totalPropertiesOwned: number;
  totalBusinessesOwned: number;
  highestNetWorth: number;
  totalPlayTimeMins: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyType {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  imageUrl: string | null;
  category: PropertyCategory;
  tier: number;
  unlockRequirement: Record<string, unknown> | null;
  baseCost: number;
  costMultiplier: number;
  baseIncomeHour: number;
  incomeMultiplier: number;
  managerCost: number | null;
  managerName: string | null;
  maxQuantity: number;
  maxUpgradeLevel: number;
  sortOrder: number;
  isActive: boolean;
}

export type PropertyCategory = 'residential' | 'commercial' | 'industrial' | 'luxury';

export interface PlayerProperty {
  id: string;
  userId: string;
  propertyTypeId: number;
  quantity: number;
  totalSpent: number;
  upgradeLevel: number;
  managerHired: boolean;
  managerHiredAt: Date | null;
  currentIncomeHour: number;
  nextPurchaseCost: number;
  nextUpgradeCost: number;
  skinId: string | null;
  firstPurchasedAt: Date;
  updatedAt: Date;
}

export interface BusinessType {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  imageUrl: string | null;
  category: BusinessCategory;
  tier: number;
  unlockRequirement: Record<string, unknown> | null;
  baseCost: number;
  baseRevenue: number;
  cycleSeconds: number;
  levelCostMult: number;
  levelRevenueMult: number;
  maxEmployees: number;
  employeeBaseCost: number | null;
  employeeBonusPct: number;
  maxLevel: number;
  sortOrder: number;
  isActive: boolean;
}

export type BusinessCategory = 'food' | 'tech' | 'retail' | 'entertainment' | 'finance';

export interface PlayerBusiness {
  id: string;
  userId: string;
  businessTypeId: number;
  level: number;
  totalInvested: number;
  employeeCount: number;
  currentCycleStart: Date;
  cycleSeconds: number;
  cyclesCompleted: number;
  totalRevenue: number;
  isAutomated: boolean;
  currentRevenue: number;
  nextLevelCost: number;
  purchasedAt: Date;
  updatedAt: Date;
}

export interface OfflineEarnings {
  amount: number;
  durationSeconds: number;
  cappedAt: number;
  wasCapped: boolean;
}
```

**Step 5: Create packages/types/src/api.ts**

```typescript
// API types

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  serverTime: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
  meta?: ApiMeta;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Auth request/response types
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  referralCode?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: import('./user').PublicUser;
  accessToken: string;
  expiresAt: Date;
}

export interface RefreshResponse {
  accessToken: string;
  expiresAt: Date;
}

// Error codes
export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // Game errors
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  MAX_LEVEL_REACHED: 'MAX_LEVEL_REACHED',
  NOT_UNLOCKED: 'NOT_UNLOCKED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

**Step 6: Create packages/types/src/index.ts**

```typescript
// Re-export all types
export * from './user';
export * from './game';
export * from './api';
```

**Step 7: Create packages/utils/package.json**

```json
{
  "name": "@mint/utils",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

**Step 8: Create packages/utils/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 9: Create packages/utils/src/index.ts**

```typescript
// Utility functions

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, compact = true): string {
  if (compact && Math.abs(amount) >= 1000) {
    const suffixes = ['', 'K', 'M', 'B', 'T', 'Q'];
    const tier = Math.floor(Math.log10(Math.abs(amount)) / 3);
    const suffix = suffixes[Math.min(tier, suffixes.length - 1)];
    const scale = Math.pow(10, tier * 3);
    const scaled = amount / scale;
    return `$${scaled.toFixed(scaled < 10 ? 2 : 1)}${suffix}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a value is a valid UUID
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Generate a random string of given length
 */
export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Omit keys from an object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Pick keys from an object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
```

**Step 10: Install dependencies and build packages**

```bash
pnpm install
pnpm --filter @mint/types build
pnpm --filter @mint/utils build
```

**Step 11: Commit**

```bash
git add packages/
git commit -m "feat: add shared types and utils packages

- Create @mint/types with User, Game, and API types
- Create @mint/utils with formatting and helper functions
- Set up TypeScript compilation for both packages"
```

---

## Task 3: Set Up Database Package with Prisma

**Files:**
- Create: `packages/database/package.json`
- Create: `packages/database/tsconfig.json`
- Create: `packages/database/prisma/schema.prisma`
- Create: `packages/database/src/index.ts`
- Create: `packages/database/src/client.ts`

**Step 1: Create packages/database/package.json**

```json
{
  "name": "@mint/database",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist",
    "generate": "prisma generate",
    "push": "prisma db push",
    "migrate": "prisma migrate dev",
    "studio": "prisma studio",
    "seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.7.0"
  },
  "devDependencies": {
    "prisma": "^5.7.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.3.0"
  }
}
```

**Step 2: Create packages/database/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "prisma"]
}
```

**Step 3: Create packages/database/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USER DOMAIN
// ============================================================================

model User {
  id                    String    @id @default(uuid())
  email                 String    @unique
  username              String    @unique
  passwordHash          String    @map("password_hash")

  // Profile
  displayName           String?   @map("display_name")
  avatarId              String    @default("default_avatar") @map("avatar_id")
  bio                   String?
  countryCode           String?   @map("country_code")
  timezone              String    @default("UTC")

  // Account status
  emailVerified         Boolean   @default(false) @map("email_verified")
  emailVerifyToken      String?   @map("email_verify_token")
  accountStatus         String    @default("active") @map("account_status")

  // Security
  passwordResetToken    String?   @map("password_reset_token")
  passwordResetExpires  DateTime? @map("password_reset_expires")
  failedLoginAttempts   Int       @default(0) @map("failed_login_attempts")
  lockedUntil           DateTime? @map("locked_until")
  twoFactorEnabled      Boolean   @default(false) @map("two_factor_enabled")
  twoFactorSecret       String?   @map("two_factor_secret")

  // Preferences
  theme                 String    @default("light")
  soundEnabled          Boolean   @default(true) @map("sound_enabled")
  musicEnabled          Boolean   @default(true) @map("music_enabled")
  notificationsEnabled  Boolean   @default(true) @map("notifications_enabled")
  language              String    @default("en")

  // Premium
  isPremium             Boolean   @default(false) @map("is_premium")
  premiumUntil          DateTime? @map("premium_until")
  stripeCustomerId      String?   @map("stripe_customer_id")

  // Onboarding
  tutorialCompleted     Boolean   @default(false) @map("tutorial_completed")
  referralCode          String?   @unique @map("referral_code")
  referredByUserId      String?   @map("referred_by_user_id")

  // Analytics
  signupPlatform        String?   @map("signup_platform")
  signupIp              String?   @map("signup_ip")

  // Timestamps
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  lastLoginAt           DateTime? @map("last_login_at")
  lastActiveAt          DateTime? @map("last_active_at")
  deletedAt             DateTime? @map("deleted_at")

  // Relations
  referredBy            User?     @relation("Referrals", fields: [referredByUserId], references: [id])
  referrals             User[]    @relation("Referrals")
  playerStats           PlayerStats?
  sessions              UserSession[]
  properties            PlayerProperty[]
  businesses            PlayerBusiness[]
  achievements          PlayerAchievement[]
  cosmetics             PlayerCosmetic[]
  subscriptions         Subscription[]
  purchases             Purchase[]
  friendsRequested      Friendship[] @relation("FriendRequester")
  friendsReceived       Friendship[] @relation("FriendAddressee")
  ownedClubs            Club[]       @relation("ClubOwner")
  clubMemberships       ClubMembership[]

  @@map("users")
}

model UserSession {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  sessionToken    String    @unique @map("session_token")
  deviceType      String?   @map("device_type")
  deviceName      String?   @map("device_name")
  ipAddress       String?   @map("ip_address")
  userAgent       String?   @map("user_agent")
  isActive        Boolean   @default(true) @map("is_active")
  lastActivityAt  DateTime  @default(now()) @map("last_activity_at")
  expiresAt       DateTime  @map("expires_at")
  revokedAt       DateTime? @map("revoked_at")
  revokeReason    String?   @map("revoke_reason")
  createdAt       DateTime  @default(now()) @map("created_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_sessions")
}

model PlayerStats {
  userId              String    @id @map("user_id")
  cash                Decimal   @default(1000.00) @db.Decimal(24, 2)
  premiumCurrency     Int       @default(0) @map("premium_currency")
  lifetimeCashEarned  Decimal   @default(0) @map("lifetime_cash_earned") @db.Decimal(28, 2)
  playerLevel         Int       @default(1) @map("player_level")
  experiencePoints    BigInt    @default(0) @map("experience_points")
  prestigeLevel       Int       @default(0) @map("prestige_level")
  prestigePoints      Int       @default(0) @map("prestige_points")
  prestigeMultiplier  Decimal   @default(1.0000) @map("prestige_multiplier") @db.Decimal(6, 4)
  timesPrestiged      Int       @default(0) @map("times_prestiged")
  baseIncomePerHour   Decimal   @default(0) @map("base_income_per_hour") @db.Decimal(20, 2)
  currentMultiplier   Decimal   @default(1.0000) @map("current_multiplier") @db.Decimal(8, 4)
  effectiveIncomeHour Decimal   @default(0) @map("effective_income_hour") @db.Decimal(20, 2)
  lastCollectionAt    DateTime  @default(now()) @map("last_collection_at")
  offlineCapHours     Int       @default(8) @map("offline_cap_hours")
  totalPropertiesOwned Int      @default(0) @map("total_properties_owned")
  totalBusinessesOwned Int      @default(0) @map("total_businesses_owned")
  highestNetWorth     Decimal   @default(0) @map("highest_net_worth") @db.Decimal(24, 2)
  totalPlayTimeMins   Int       @default(0) @map("total_play_time_mins")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("player_stats")
}

// ============================================================================
// PROPERTY DOMAIN
// ============================================================================

model PropertyType {
  id                Int       @id @default(autoincrement())
  slug              String    @unique
  name              String
  description       String?
  iconUrl           String?   @map("icon_url")
  imageUrl          String?   @map("image_url")
  category          String
  tier              Int       @default(1)
  unlockRequirement Json?     @map("unlock_requirement")
  baseCost          Decimal   @map("base_cost") @db.Decimal(20, 2)
  costMultiplier    Decimal   @default(1.15) @map("cost_multiplier") @db.Decimal(8, 4)
  baseIncomeHour    Decimal   @map("base_income_hour") @db.Decimal(16, 2)
  incomeMultiplier  Decimal   @default(1.10) @map("income_multiplier") @db.Decimal(8, 4)
  managerCost       Decimal?  @map("manager_cost") @db.Decimal(18, 2)
  managerName       String?   @map("manager_name")
  maxQuantity       Int       @default(1000) @map("max_quantity")
  maxUpgradeLevel   Int       @default(100) @map("max_upgrade_level")
  sortOrder         Int       @default(0) @map("sort_order")
  isActive          Boolean   @default(true) @map("is_active")
  createdAt         DateTime  @default(now()) @map("created_at")

  playerProperties  PlayerProperty[]

  @@map("property_types")
}

model PlayerProperty {
  id                String    @id @default(uuid())
  userId            String    @map("user_id")
  propertyTypeId    Int       @map("property_type_id")
  quantity          Int       @default(1)
  totalSpent        Decimal   @default(0) @map("total_spent") @db.Decimal(22, 2)
  upgradeLevel      Int       @default(0) @map("upgrade_level")
  managerHired      Boolean   @default(false) @map("manager_hired")
  managerHiredAt    DateTime? @map("manager_hired_at")
  currentIncomeHour Decimal   @default(0) @map("current_income_hour") @db.Decimal(18, 2)
  nextPurchaseCost  Decimal?  @map("next_purchase_cost") @db.Decimal(20, 2)
  nextUpgradeCost   Decimal?  @map("next_upgrade_cost") @db.Decimal(20, 2)
  skinId            String?   @map("skin_id")
  firstPurchasedAt  DateTime  @default(now()) @map("first_purchased_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  propertyType      PropertyType @relation(fields: [propertyTypeId], references: [id])

  @@unique([userId, propertyTypeId])
  @@map("player_properties")
}

// ============================================================================
// BUSINESS DOMAIN
// ============================================================================

model BusinessType {
  id                Int       @id @default(autoincrement())
  slug              String    @unique
  name              String
  description       String?
  iconUrl           String?   @map("icon_url")
  imageUrl          String?   @map("image_url")
  category          String
  tier              Int       @default(1)
  unlockRequirement Json?     @map("unlock_requirement")
  baseCost          Decimal   @map("base_cost") @db.Decimal(20, 2)
  baseRevenue       Decimal   @map("base_revenue") @db.Decimal(16, 2)
  cycleSeconds      Int       @default(3600) @map("cycle_seconds")
  levelCostMult     Decimal   @default(1.12) @map("level_cost_mult") @db.Decimal(8, 4)
  levelRevenueMult  Decimal   @default(1.08) @map("level_revenue_mult") @db.Decimal(8, 4)
  maxEmployees      Int       @default(10) @map("max_employees")
  employeeBaseCost  Decimal?  @map("employee_base_cost") @db.Decimal(16, 2)
  employeeBonusPct  Decimal   @default(5.00) @map("employee_bonus_pct") @db.Decimal(5, 2)
  maxLevel          Int       @default(200) @map("max_level")
  sortOrder         Int       @default(0) @map("sort_order")
  isActive          Boolean   @default(true) @map("is_active")
  createdAt         DateTime  @default(now()) @map("created_at")

  playerBusinesses  PlayerBusiness[]

  @@map("business_types")
}

model PlayerBusiness {
  id                String    @id @default(uuid())
  userId            String    @map("user_id")
  businessTypeId    Int       @map("business_type_id")
  level             Int       @default(1)
  totalInvested     Decimal   @default(0) @map("total_invested") @db.Decimal(22, 2)
  employeeCount     Int       @default(0) @map("employee_count")
  currentCycleStart DateTime  @default(now()) @map("current_cycle_start")
  cycleSeconds      Int?      @map("cycle_seconds")
  cyclesCompleted   BigInt    @default(0) @map("cycles_completed")
  totalRevenue      Decimal   @default(0) @map("total_revenue") @db.Decimal(24, 2)
  isAutomated       Boolean   @default(false) @map("is_automated")
  currentRevenue    Decimal   @default(0) @map("current_revenue") @db.Decimal(18, 2)
  nextLevelCost     Decimal?  @map("next_level_cost") @db.Decimal(20, 2)
  purchasedAt       DateTime  @default(now()) @map("purchased_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  businessType      BusinessType @relation(fields: [businessTypeId], references: [id])

  @@unique([userId, businessTypeId])
  @@map("player_businesses")
}

// ============================================================================
// SOCIAL DOMAIN
// ============================================================================

model Friendship {
  id            String    @id @default(uuid())
  requesterId   String    @map("requester_id")
  addresseeId   String    @map("addressee_id")
  status        String    @default("pending")
  requestedAt   DateTime  @default(now()) @map("requested_at")
  respondedAt   DateTime? @map("responded_at")

  requester     User      @relation("FriendRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  addressee     User      @relation("FriendAddressee", fields: [addresseeId], references: [id], onDelete: Cascade)

  @@unique([requesterId, addresseeId])
  @@map("friendships")
}

model Club {
  id              String    @id @default(uuid())
  name            String
  description     String?
  ownerId         String    @map("owner_id")
  isPublic        Boolean   @default(true) @map("is_public")
  memberCount     Int       @default(1) @map("member_count")
  maxMembers      Int       @default(20) @map("max_members")
  clubLevel       Int       @default(1) @map("club_level")
  incomeBonusPct  Decimal   @default(5.00) @map("income_bonus_pct") @db.Decimal(5, 2)
  createdAt       DateTime  @default(now()) @map("created_at")

  owner           User      @relation("ClubOwner", fields: [ownerId], references: [id])
  memberships     ClubMembership[]

  @@map("clubs")
}

model ClubMembership {
  clubId          String    @map("club_id")
  userId          String    @map("user_id")
  role            String    @default("member")
  status          String    @default("active")
  joinedAt        DateTime  @default(now()) @map("joined_at")

  club            Club      @relation(fields: [clubId], references: [id], onDelete: Cascade)
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([clubId, userId])
  @@map("club_memberships")
}

// ============================================================================
// ACHIEVEMENTS & COSMETICS
// ============================================================================

model Achievement {
  id                String    @id
  name              String
  description       String
  iconUrl           String?   @map("icon_url")
  category          String
  tier              String    @default("bronze")
  points            Int       @default(10)
  requirementType   String    @map("requirement_type")
  requirementValue  Decimal   @map("requirement_value") @db.Decimal(24, 2)
  rewardCash        Decimal   @default(0) @map("reward_cash") @db.Decimal(18, 2)
  rewardPremium     Int       @default(0) @map("reward_premium")
  rewardCosmeticId  String?   @map("reward_cosmetic_id")
  isSecret          Boolean   @default(false) @map("is_secret")
  sortOrder         Int       @default(0) @map("sort_order")
  createdAt         DateTime  @default(now()) @map("created_at")

  playerAchievements PlayerAchievement[]

  @@map("achievements")
}

model PlayerAchievement {
  userId          String    @map("user_id")
  achievementId   String    @map("achievement_id")
  progress        Decimal   @default(0) @db.Decimal(24, 2)
  isCompleted     Boolean   @default(false) @map("is_completed")
  rewardClaimed   Boolean   @default(false) @map("reward_claimed")
  completedAt     DateTime? @map("completed_at")
  claimedAt       DateTime? @map("claimed_at")

  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement     Achievement @relation(fields: [achievementId], references: [id])

  @@id([userId, achievementId])
  @@map("player_achievements")
}

model Cosmetic {
  id              String    @id
  name            String
  description     String?
  type            String
  category        String?
  rarity          String    @default("common")
  previewUrl      String?   @map("preview_url")
  assetUrl        String?   @map("asset_url")
  acquisitionType String    @map("acquisition_type")
  premiumCost     Int?      @map("premium_cost")
  isAvailable     Boolean   @default(true) @map("is_available")
  sortOrder       Int       @default(0) @map("sort_order")
  createdAt       DateTime  @default(now()) @map("created_at")

  playerCosmetics PlayerCosmetic[]

  @@map("cosmetics")
}

model PlayerCosmetic {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  cosmeticId      String    @map("cosmetic_id")
  isEquipped      Boolean   @default(false) @map("is_equipped")
  acquiredVia     String    @map("acquired_via")
  acquiredAt      DateTime  @default(now()) @map("acquired_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  cosmetic        Cosmetic  @relation(fields: [cosmeticId], references: [id])

  @@unique([userId, cosmeticId])
  @@map("player_cosmetics")
}

// ============================================================================
// PAYMENT DOMAIN
// ============================================================================

model Subscription {
  id                    String    @id @default(uuid())
  userId                String    @map("user_id")
  planId                String    @map("plan_id")
  stripeCustomerId      String    @map("stripe_customer_id")
  stripeSubscriptionId  String    @unique @map("stripe_subscription_id")
  status                String
  cancelAtPeriodEnd     Boolean   @default(false) @map("cancel_at_period_end")
  currentPeriodStart    DateTime  @map("current_period_start")
  currentPeriodEnd      DateTime  @map("current_period_end")
  trialStart            DateTime? @map("trial_start")
  trialEnd              DateTime? @map("trial_end")
  canceledAt            DateTime? @map("canceled_at")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

model Purchase {
  id                String    @id @default(uuid())
  userId            String    @map("user_id")
  productType       String    @map("product_type")
  productId         String    @map("product_id")
  productName       String    @map("product_name")
  quantity          Int       @default(1)
  price             Decimal   @db.Decimal(10, 2)
  currency          String    @default("USD")
  paymentMethod     String    @map("payment_method")
  stripePaymentId   String?   @map("stripe_payment_id")
  status            String
  fulfilled         Boolean   @default(false)
  fulfilledAt       DateTime? @map("fulfilled_at")
  createdAt         DateTime  @default(now()) @map("created_at")

  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("purchases")
}
```

**Step 4: Create packages/database/src/client.ts**

```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientOptions = {
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn'] as const
    : ['error'] as const,
};

export const prisma = globalThis.prisma ?? new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
```

**Step 5: Create packages/database/src/index.ts**

```typescript
// Export Prisma client
export { prisma, default as db } from './client';

// Re-export Prisma types
export * from '@prisma/client';
```

**Step 6: Create packages/database/.env.example**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/themint?schema=public"
```

**Step 7: Install dependencies**

```bash
pnpm --filter @mint/database install
```

**Step 8: Generate Prisma client (will fail without DB, but creates types)**

Note: This step requires a running PostgreSQL database. Skip for now if no DB is available.

```bash
# Will generate client types
pnpm --filter @mint/database generate
```

**Step 9: Build the package**

```bash
pnpm --filter @mint/database build
```

**Step 10: Commit**

```bash
git add packages/database/
git commit -m "feat: add database package with Prisma schema

- Create complete Prisma schema for all domains
- User, PlayerStats, Properties, Businesses
- Social features: Friendships, Clubs
- Achievements, Cosmetics, Payments
- Configure database client with logging"
```

---

## Task 4: Create API Gateway Service

**Files:**
- Create: `services/api-gateway/package.json`
- Create: `services/api-gateway/tsconfig.json`
- Create: `services/api-gateway/src/index.ts`
- Create: `services/api-gateway/src/app.ts`
- Create: `services/api-gateway/src/middleware/`
- Create: `services/api-gateway/src/routes/`
- Create: `services/api-gateway/src/config/`

**Step 1: Create services/api-gateway/package.json**

```json
{
  "name": "@mint/api-gateway",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@mint/database": "workspace:*",
    "@mint/types": "workspace:*",
    "@mint/utils": "workspace:*",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/compression": "^1.7.5",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "tsx": "^4.6.0",
    "typescript": "^5.3.0"
  }
}
```

**Step 2: Create services/api-gateway/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "module": "CommonJS",
    "moduleResolution": "Node",
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create services/api-gateway/src/config/index.ts**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // App
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:3000'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}

export const config = loadConfig();

export type Config = typeof config;
```

**Step 4: Create services/api-gateway/src/middleware/requestId.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientRequestId = req.get('X-Request-ID');

  req.requestId = clientRequestId && isValidUUID(clientRequestId)
    ? clientRequestId
    : crypto.randomUUID();

  req.startTime = Date.now();

  res.setHeader('X-Request-ID', req.requestId);
  res.setHeader('X-Server-Time', new Date().toISOString());

  next();
}

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
```

**Step 5: Create services/api-gateway/src/middleware/errorHandler.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiResponse, ErrorCodes } from '@mint/types';

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ApiResponse<never> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCodes.VALIDATION_ERROR, message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = ErrorCodes.UNAUTHORIZED) {
    super(code, message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(ErrorCodes.NOT_FOUND, `${resource}${id ? ` with id ${id}` : ''} not found`, 404);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Request error:', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid request data',
        details: err.errors,
      },
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: isProduction ? 'An unexpected error occurred' : err.message,
      requestId: req.requestId,
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: `Cannot ${req.method} ${req.path}`,
    },
  });
}
```

**Step 6: Create services/api-gateway/src/middleware/index.ts**

```typescript
export * from './requestId';
export * from './errorHandler';
```

**Step 7: Create services/api-gateway/src/routes/health.ts**

```typescript
import { Router, Request, Response } from 'express';
import { prisma } from '@mint/database';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, boolean> = {
    database: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  const healthy = Object.values(checks).every(Boolean);

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

**Step 8: Create services/api-gateway/src/routes/index.ts**

```typescript
import { Router } from 'express';
import healthRoutes from './health';

const router = Router();

// Health check routes (no auth required)
router.use(healthRoutes);

// API v1 routes
const v1Router = Router();

// Placeholder routes - will be implemented in Phase 1
v1Router.get('/ping', (_req, res) => {
  res.json({ message: 'pong', version: '1.0.0' });
});

router.use('/v1', v1Router);

export default router;
```

**Step 9: Create services/api-gateway/src/app.ts**

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { requestIdMiddleware, errorHandler, notFoundHandler } from './middleware';
import routes from './routes';

export function createApp() {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // CORS
  app.use(cors({
    origin: config.APP_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Client-Version',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
  }));

  // Compression
  app.use(compression());

  // Request ID
  app.use(requestIdMiddleware);

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Routes
  app.use('/api', routes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

**Step 10: Create services/api-gateway/src/index.ts**

```typescript
import { createApp } from './app';
import { config } from './config';
import { prisma } from '@mint/database';

async function main() {
  const app = createApp();

  // Verify database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Start server
  const server = app.listen(config.PORT, () => {
    console.log(`🚀 API Gateway running on port ${config.PORT}`);
    console.log(`📍 Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);

    server.close(async () => {
      console.log('HTTP server closed');
      await prisma.$disconnect();
      console.log('Database disconnected');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
```

**Step 11: Create services/api-gateway/.env.example**

```env
NODE_ENV=development
PORT=3000

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/themint?schema=public"
REDIS_URL="redis://localhost:6379"

JWT_ACCESS_SECRET="your-super-secret-access-key-at-least-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-at-least-32-chars"

APP_URL="http://localhost:5173"
API_URL="http://localhost:3000"
```

**Step 12: Install dependencies**

```bash
pnpm --filter @mint/api-gateway install
```

**Step 13: Build and verify**

```bash
pnpm --filter @mint/api-gateway build
```

**Step 14: Commit**

```bash
git add services/api-gateway/
git commit -m "feat: add API Gateway service

- Create Express.js API gateway with TypeScript
- Add middleware: requestId, errorHandler, CORS, helmet
- Add health check endpoints (/health, /ready)
- Configure Zod-based environment validation
- Set up graceful shutdown handling"
```

---

## Task 5: Set Up React Frontend with Vite

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/`
- Create: `apps/web/tailwind.config.js`
- Create: `apps/web/postcss.config.js`

**Step 1: Create apps/web/package.json**

```json
{
  "name": "@mint/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@mint/types": "workspace:*",
    "@mint/utils": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.0",
    "vite": "^5.0.8"
  }
}
```

**Step 2: Create apps/web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 3: Create apps/web/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 4: Create apps/web/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

**Step 5: Create apps/web/tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mint: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

**Step 6: Create apps/web/postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 7: Create apps/web/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="The Mint - Build Your Financial Empire" />
    <title>The Mint</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 8: Create apps/web/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Step 9: Create apps/web/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #10b981;
  --color-secondary: #3b82f6;
  --color-accent: #f59e0b;
  --color-premium: #a855f7;
}

body {
  @apply bg-gray-50 text-gray-900 antialiased;
}

.dark body {
  @apply bg-gray-900 text-gray-100;
}
```

**Step 10: Create apps/web/src/App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom';

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-5xl font-display font-bold text-mint-600 mb-4">
          🌿 The Mint
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Build Your Financial Empire. One Click at a Time.
        </p>
        <div className="space-x-4">
          <button className="px-6 py-3 bg-mint-500 text-white font-semibold rounded-lg hover:bg-mint-600 transition-colors">
            Start Playing
          </button>
          <button className="px-6 py-3 border-2 border-mint-500 text-mint-600 font-semibold rounded-lg hover:bg-mint-50 transition-colors">
            Learn More
          </button>
        </div>
        <p className="mt-12 text-sm text-gray-400">
          Phase 0 Complete - Development Environment Ready
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}

export default App;
```

**Step 11: Create apps/web/public/favicon.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="#10b981"/>
  <text x="50" y="65" font-size="50" text-anchor="middle" fill="white">🌿</text>
</svg>
```

**Step 12: Install dependencies**

```bash
pnpm --filter @mint/web install
```

**Step 13: Verify build**

```bash
pnpm --filter @mint/web build
```

**Step 14: Commit**

```bash
git add apps/web/
git commit -m "feat: add React frontend with Vite

- Create React 18 app with TypeScript and Vite
- Configure Tailwind CSS with custom theme colors
- Add Plus Jakarta Sans and Inter fonts
- Set up path aliases and API proxy
- Create placeholder home page"
```

---

## Task 6: Configure Docker Development Environment

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.override.yml`
- Create: `.dockerignore`

**Step 1: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: mint-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: themint
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: mint-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  mailhog:
    image: mailhog/mailhog:latest
    container_name: mint-mailhog
    restart: unless-stopped
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    logging:
      driver: none

volumes:
  postgres_data:
  redis_data:
```

**Step 2: Create docker-compose.override.yml**

```yaml
version: '3.8'

# Development overrides
services:
  postgres:
    ports:
      - "5432:5432"

  redis:
    ports:
      - "6379:6379"
```

**Step 3: Create .dockerignore**

```
node_modules
dist
build
.next
.turbo
*.log
.env
.env.local
.git
.gitignore
.DS_Store
coverage
```

**Step 4: Create scripts/dev-setup.sh**

```bash
#!/bin/bash

set -e

echo "🚀 Setting up The Mint development environment..."

# Check for required tools
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }

# Start Docker services
echo "📦 Starting Docker services..."
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Install dependencies
echo "📥 Installing dependencies..."
pnpm install

# Copy environment files if they don't exist
if [ ! -f "services/api-gateway/.env" ]; then
  echo "📄 Creating API Gateway .env file..."
  cp services/api-gateway/.env.example services/api-gateway/.env
fi

if [ ! -f "packages/database/.env" ]; then
  echo "📄 Creating Database .env file..."
  cp packages/database/.env.example packages/database/.env
fi

# Generate Prisma client
echo "🗃️ Generating Prisma client..."
pnpm db:generate

# Push database schema
echo "🗃️ Pushing database schema..."
pnpm db:push

# Build packages
echo "🔨 Building shared packages..."
pnpm --filter @mint/types build
pnpm --filter @mint/utils build

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "To start developing, run:"
echo "  pnpm dev"
echo ""
echo "Services:"
echo "  PostgreSQL: localhost:5432"
echo "  Redis:      localhost:6379"
echo "  MailHog:    http://localhost:8025"
```

**Step 5: Make script executable**

```bash
chmod +x scripts/dev-setup.sh
```

**Step 6: Update root package.json with setup script**

Add to root package.json scripts:

```json
{
  "scripts": {
    "setup": "./scripts/dev-setup.sh",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f"
  }
}
```

**Step 7: Commit**

```bash
git add docker-compose.yml docker-compose.override.yml .dockerignore scripts/
git commit -m "feat: add Docker development environment

- Create docker-compose with PostgreSQL, Redis, MailHog
- Add development setup script
- Configure health checks for all services"
```

---

## Task 7: Set Up CI/CD with GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

**Step 1: Create .github/workflows/ci.yml**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: |
          pnpm --filter @mint/types build
          pnpm --filter @mint/utils build

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all
        run: pnpm build

  test:
    name: Test
    runs-on: ubuntu-latest
    needs: build
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: themint_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: |
          pnpm --filter @mint/types build
          pnpm --filter @mint/utils build

      - name: Generate Prisma Client
        run: pnpm db:generate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/themint_test

      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/themint_test
          REDIS_URL: redis://localhost:6379
          JWT_ACCESS_SECRET: test-access-secret-at-least-32-chars
          JWT_REFRESH_SECRET: test-refresh-secret-at-least-32-chars
```

**Step 2: Create .github/workflows/deploy.yml**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      # Frontend deployment (Vercel)
      - name: Deploy Frontend to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/web
          scope: ${{ secrets.VERCEL_ORG_ID }}

      # Backend deployment placeholder
      # Configure based on your hosting provider (Railway, Render, etc.)
      - name: Deploy Backend
        run: echo "Backend deployment would go here"
```

**Step 3: Create .github/PULL_REQUEST_TEMPLATE.md**

```markdown
## Description

<!-- Describe your changes in detail -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues

<!-- Link any related issues here -->
Closes #

## Testing

<!-- Describe the tests you ran to verify your changes -->

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
```

**Step 4: Commit**

```bash
mkdir -p .github/workflows
git add .github/
git commit -m "feat: add CI/CD workflows with GitHub Actions

- Create CI workflow with lint, typecheck, build, test
- Create deploy workflow for staging (Vercel)
- Add PR template with checklist
- Configure PostgreSQL and Redis services for testing"
```

---

## Task 8: Create Environment Configuration

**Files:**
- Create: `.env.example`
- Update: Various `.env.example` files

**Step 1: Create root .env.example**

```env
# =============================================================================
# The Mint - Environment Configuration
# =============================================================================

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/themint?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET="your-super-secret-access-key-at-least-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-at-least-32-chars"

# Application URLs
APP_URL="http://localhost:5173"
API_URL="http://localhost:3000"

# Environment
NODE_ENV="development"

# Stripe (Phase 3)
# STRIPE_SECRET_KEY="sk_test_..."
# STRIPE_WEBHOOK_SECRET="whsec_..."
# STRIPE_PRICE_PREMIUM_MONTHLY="price_..."
# STRIPE_PRICE_PREMIUM_ANNUAL="price_..."

# Email (Phase 2)
# SMTP_HOST="localhost"
# SMTP_PORT="1025"
# SMTP_USER=""
# SMTP_PASS=""
# EMAIL_FROM="noreply@themint.game"
```

**Step 2: Create a README.md**

```markdown
# The Mint 🌿

Build Your Financial Empire. One Click at a Time.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker (for local development)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd the-mint
   ```

2. **Run setup script**
   ```bash
   pnpm setup
   ```

3. **Start development servers**
   ```bash
   pnpm dev
   ```

4. **Open in browser**
   - Frontend: http://localhost:5173
   - API: http://localhost:3000
   - MailHog: http://localhost:8025

## Project Structure

```
the-mint/
├── apps/
│   └── web/              # React frontend
├── packages/
│   ├── database/         # Prisma schema and client
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Shared utility functions
├── services/
│   ├── api-gateway/      # Express API gateway
│   ├── user/             # User service (Phase 1)
│   └── game/             # Game state service (Phase 1)
└── docs/
    └── plans/            # Design documents
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all packages and services |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type check all packages |
| `pnpm test` | Run all tests |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Prisma Studio |

## Development

### Docker Services

```bash
# Start services
pnpm docker:up

# View logs
pnpm docker:logs

# Stop services
pnpm docker:down
```

### Database

```bash
# Generate Prisma client after schema changes
pnpm db:generate

# Apply schema to database
pnpm db:push

# Create migration
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL, Prisma ORM
- **Cache:** Redis
- **Build:** pnpm, Turborepo

## License

Private - All Rights Reserved
```

**Step 3: Final commit for Phase 0**

```bash
git add .
git commit -m "docs: add README and environment configuration

- Create root .env.example with all variables
- Add comprehensive README with setup instructions
- Document project structure and commands

Phase 0 Complete! ✅"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `pnpm install` runs without errors
- [ ] `pnpm build` builds all packages
- [ ] `docker compose up -d` starts all services
- [ ] `pnpm db:generate` generates Prisma client
- [ ] `pnpm db:push` creates database tables
- [ ] API Gateway responds at `http://localhost:3000/api/health`
- [ ] Frontend loads at `http://localhost:5173`

---

## Next Steps

After Phase 0 is complete:

1. **Phase 1: Core Game MVP** - Authentication, properties, businesses
2. Review the technical design document for Phase 1 requirements
3. Use this same task format for Phase 1 implementation

---

*Plan created November 28, 2025*
