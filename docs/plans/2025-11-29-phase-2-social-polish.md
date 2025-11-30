# Phase 2: Social & Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add social features, prestige system, achievements, and UI polish to transform the MVP into an engaging multiplayer experience.

**Status:** ~60% Complete (Prestige, Leaderboards, Achievements, Daily Rewards done)

---

## Overview

Phase 2 delivers:
- Prestige system ("Go Public") with perks shop
- Leaderboards (global, friends, weekly)
- Friends system with gifts
- Clubs with income bonuses
- 20+ achievements
- Daily login rewards
- UI polish and animations

---

## Task 1: Prestige System ("Go Public")

**Concept:** Players can "Go Public" (IPO) to reset progress but gain permanent multipliers. This soft prestige keeps the game fresh.

### Database Schema

Add to `packages/database/prisma/schema.prisma`:

```prisma
model PrestigePerk {
  id            String   @id @default(cuid())
  slug          String   @unique
  name          String
  description   String
  category      String   // income, offline, speed, cosmetic
  tier          Int      @default(1)
  cost          Int      // prestige points
  effect        Json     // { type: "income_mult", value: 0.05 }
  maxLevel      Int      @default(1)
  iconUrl       String?
  sortOrder     Int      @default(0)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
}

model PlayerPrestigePerk {
  id            String   @id @default(cuid())
  userId        String
  perkId        String
  level         Int      @default(1)
  purchasedAt   DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  perk          PrestigePerk @relation(fields: [perkId], references: [id])

  @@unique([userId, perkId])
  @@map("player_prestige_perks")
}
```

### API Endpoints

```
GET  /api/v1/game/prestige/status     - Current prestige info, available points
GET  /api/v1/game/prestige/perks      - Available perks to purchase
POST /api/v1/game/prestige/go-public  - Execute prestige (reset + earn points)
POST /api/v1/game/prestige/buy-perk   - Purchase a perk
```

### Prestige Points Formula

```typescript
// Points earned = sqrt(netWorth / 1,000,000) * prestigeMultiplier
function calculatePrestigePoints(netWorth: number, prestigeLevel: number): number {
  const base = Math.sqrt(netWorth / 1_000_000);
  const multiplier = 1 + (prestigeLevel * 0.1); // +10% per prestige level
  return Math.floor(base * multiplier);
}
```

### Perk Ideas (Seed Data)

| Perk | Category | Cost | Effect |
|------|----------|------|--------|
| Investor Network | income | 5 | +5% income |
| Early Bird | offline | 10 | +2 hours offline cap |
| Fast Learner | speed | 15 | -10% upgrade costs |
| Golden Touch | income | 25 | +10% income |
| Night Owl | offline | 30 | +4 hours offline cap |
| Bulk Buyer | speed | 20 | -15% property costs |
| Tycoon | income | 50 | +15% income |
| Insomniac | offline | 75 | +8 hours offline cap |

### Frontend

- **Go Public Modal:** Shows potential points, confirms reset
- **Perks Shop Page:** Grid of purchasable perks with costs
- **Prestige Badge:** Shows prestige level in header/profile

---

## Task 2: Leaderboards

### Database Schema

Already exists in `leaderboard_entries` table. Add index:

```prisma
model LeaderboardEntry {
  leaderboardId  String
  userId         String
  rank           Int
  previousRank   Int?
  score          Decimal  @db.Decimal(28, 2)
  username       String?
  displayName    String?
  avatarId       String?
  updatedAt      DateTime @default(now()) @updatedAt

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([leaderboardId, userId])
  @@index([leaderboardId, rank])
  @@map("leaderboard_entries")
}
```

### Leaderboard Types

| ID | Name | Score Source | Reset |
|----|------|--------------|-------|
| `global_net_worth` | Net Worth | cash + assets | Never |
| `global_income` | Income/Hour | effectiveIncomeHour | Never |
| `weekly_earnings` | Weekly Earnings | cash earned this week | Weekly |
| `prestige_level` | Prestige Masters | prestigeLevel | Never |

### API Endpoints

```
GET /api/v1/leaderboards/:type           - Get leaderboard (top 100)
GET /api/v1/leaderboards/:type/me        - Get player's position
GET /api/v1/leaderboards/:type/friends   - Get friends leaderboard
POST /api/v1/leaderboards/refresh        - Admin: refresh all boards
```

### Cron Job

```typescript
// Run every 15 minutes via node-cron or external scheduler
async function refreshLeaderboards() {
  const types = ['global_net_worth', 'global_income', 'weekly_earnings', 'prestige_level'];

  for (const type of types) {
    await updateLeaderboard(type);
  }
}

async function updateLeaderboard(type: string) {
  // Fetch top players, calculate ranks, upsert entries
}
```

### Frontend

- **Leaderboard Page:** Tabs for each type
- **Rank Badge:** Shows player's rank in header
- **Friend Rankings:** Filter to show only friends

---

## Task 3: Friends System

### Database Schema

Already exists in `friendships` table. Expand with:

```prisma
model Gift {
  id            String   @id @default(cuid())
  senderId      String
  receiverId    String
  giftType      String   // cash, boost, cosmetic
  giftData      Json     // { amount: 100 } or { boostId: "..." }
  message       String?
  status        String   @default("pending") // pending, claimed, expired
  expiresAt     DateTime
  claimedAt     DateTime?
  createdAt     DateTime @default(now())

  sender        User     @relation("SentGifts", fields: [senderId], references: [id])
  receiver      User     @relation("ReceivedGifts", fields: [receiverId], references: [id])

  @@map("gifts")
}
```

### API Endpoints

```
GET  /api/v1/friends                  - Get friends list
GET  /api/v1/friends/requests         - Get pending requests
POST /api/v1/friends/request          - Send friend request
POST /api/v1/friends/:id/accept       - Accept request
POST /api/v1/friends/:id/reject       - Reject request
DELETE /api/v1/friends/:id            - Remove friend

GET  /api/v1/gifts                    - Get pending gifts
POST /api/v1/gifts/send               - Send gift to friend
POST /api/v1/gifts/:id/claim          - Claim a gift
```

### Gift Limits

- Max 5 gifts per day (free)
- Premium: 10 gifts per day
- Gift value: 100-1000 cash (scales with sender's level)

### Frontend

- **Friends Page:** List with online status, remove button
- **Add Friend Modal:** Search by username
- **Gift Button:** On friend card, opens gift selector
- **Gift Inbox:** Notification badge, claim UI

---

## Task 4: Clubs

### Database Schema

Already exists. Add club activities:

```prisma
model ClubActivity {
  id            String   @id @default(cuid())
  clubId        String
  userId        String
  activityType  String   // joined, donated, leveled_up, earned
  data          Json?
  createdAt     DateTime @default(now())

  club          Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)
  user          User     @relation(fields: [userId], references: [id])

  @@index([clubId, createdAt])
  @@map("club_activities")
}
```

### API Endpoints

```
GET  /api/v1/clubs                    - Browse public clubs
GET  /api/v1/clubs/my                 - Get player's club
POST /api/v1/clubs                    - Create club (costs 10,000 cash)
GET  /api/v1/clubs/:id                - Get club details
POST /api/v1/clubs/:id/join           - Join club
POST /api/v1/clubs/:id/leave          - Leave club
POST /api/v1/clubs/:id/donate         - Donate cash to level up club
POST /api/v1/clubs/:id/kick/:userId   - Kick member (owner/admin only)
```

### Club Bonuses

| Level | Required Donations | Income Bonus |
|-------|-------------------|--------------|
| 1 | 0 | +5% |
| 2 | 100,000 | +7% |
| 3 | 500,000 | +10% |
| 4 | 2,000,000 | +12% |
| 5 | 10,000,000 | +15% |

### Frontend

- **Clubs Page:** Browse, search, create
- **Club Detail:** Members, activity feed, donate button
- **Club Badge:** Shows in profile, header

---

## Task 5: Achievements System

### Database Schema

Already exists. Add notification tracking:

```prisma
model Notification {
  id            String   @id @default(cuid())
  userId        String
  type          String   // achievement, friend_request, gift, club
  title         String
  message       String
  data          Json?
  isRead        Boolean  @default(false)
  createdAt     DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
  @@map("notifications")
}
```

### Achievement Categories

| Category | Examples |
|----------|----------|
| Wealth | Earn $10K, $100K, $1M, $10M |
| Properties | Own 10, 50, 100 properties |
| Businesses | Complete 100, 1000 cycles |
| Social | Add 5 friends, join a club |
| Prestige | Go Public 1, 5, 10 times |
| Collection | Own all Tier 1, Tier 2 properties |

### Seed Data (20+ Achievements)

```typescript
const achievements = [
  // Wealth
  { id: 'first_thousand', name: 'First Thousand', requirement: { type: 'cash', value: 1000 } },
  { id: 'ten_grand', name: 'Ten Grand', requirement: { type: 'cash', value: 10000 } },
  { id: 'hundred_grand', name: 'Hundred Grand', requirement: { type: 'cash', value: 100000 } },
  { id: 'millionaire', name: 'Millionaire', requirement: { type: 'cash', value: 1000000 } },
  { id: 'multi_millionaire', name: 'Multi-Millionaire', requirement: { type: 'cash', value: 10000000 } },

  // Properties
  { id: 'first_property', name: 'Landlord', requirement: { type: 'properties', value: 1 } },
  { id: 'property_mogul', name: 'Property Mogul', requirement: { type: 'properties', value: 10 } },
  { id: 'real_estate_empire', name: 'Real Estate Empire', requirement: { type: 'properties', value: 50 } },

  // Businesses
  { id: 'entrepreneur', name: 'Entrepreneur', requirement: { type: 'businesses', value: 1 } },
  { id: 'serial_entrepreneur', name: 'Serial Entrepreneur', requirement: { type: 'businesses', value: 5 } },
  { id: 'cycle_master', name: 'Cycle Master', requirement: { type: 'cycles', value: 100 } },
  { id: 'cycle_legend', name: 'Cycle Legend', requirement: { type: 'cycles', value: 1000 } },

  // Managers
  { id: 'first_manager', name: 'Delegation', requirement: { type: 'managers', value: 1 } },
  { id: 'full_management', name: 'Full Management', requirement: { type: 'managers', value: 5 } },

  // Prestige
  { id: 'first_ipo', name: 'Going Public', requirement: { type: 'prestige', value: 1 } },
  { id: 'serial_ipo', name: 'Serial IPO', requirement: { type: 'prestige', value: 5 } },

  // Social
  { id: 'social_butterfly', name: 'Social Butterfly', requirement: { type: 'friends', value: 5 } },
  { id: 'club_member', name: 'Club Member', requirement: { type: 'club', value: 1 } },
  { id: 'generous', name: 'Generous', requirement: { type: 'gifts_sent', value: 10 } },

  // Special
  { id: 'early_bird', name: 'Early Bird', requirement: { type: 'login_streak', value: 7 } },
  { id: 'dedicated', name: 'Dedicated', requirement: { type: 'login_streak', value: 30 } },
];
```

### API Endpoints

```
GET  /api/v1/achievements             - Get all achievements with progress
GET  /api/v1/achievements/recent      - Recently unlocked
POST /api/v1/achievements/:id/claim   - Claim reward
```

### Frontend

- **Achievements Page:** Grid with progress bars
- **Achievement Toast:** Pop-up on unlock
- **Profile Showcase:** Display top achievements

---

## Task 6: Daily Login Rewards

### Database Schema

```prisma
model DailyReward {
  day           Int      @id // 1-30
  rewardType    String   // cash, premium_currency, boost
  rewardData    Json     // { amount: 500 }
  iconUrl       String?
}

model PlayerDailyStreak {
  userId        String   @id
  currentStreak Int      @default(0)
  longestStreak Int      @default(0)
  lastClaimAt   DateTime?
  currentDay    Int      @default(1) // 1-30, cycles back

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("player_daily_streaks")
}
```

### Reward Schedule

| Day | Reward |
|-----|--------|
| 1 | $500 |
| 2 | $750 |
| 3 | $1,000 |
| 4 | $1,500 |
| 5 | $2,000 + 10 coins |
| 6 | $2,500 |
| 7 | $5,000 + 25 coins |
| 14 | $10,000 + 50 coins |
| 21 | $25,000 + 100 coins |
| 30 | $50,000 + 250 coins |

### API Endpoints

```
GET  /api/v1/daily/status    - Get streak, available reward
POST /api/v1/daily/claim     - Claim today's reward
```

### Frontend

- **Daily Reward Modal:** Shows on login if unclaimed
- **Reward Calendar:** Visual display of 30-day cycle
- **Streak Counter:** In header/dashboard

---

## Task 7: UI Polish & Animations

### Priority Animations

1. **Collect Button Glow** - Pulsing green glow when ready
2. **Cash Increment** - Smooth counter animation
3. **Purchase Feedback** - Subtle bounce/scale on buy
4. **Achievement Toast** - Slide in from top
5. **Level Up Celebration** - Confetti burst
6. **Prestige Animation** - Full-screen golden effect

### CSS Animations

```css
/* Collect Glow */
@keyframes collectGlow {
  0%, 100% { box-shadow: 0 0 5px rgba(34, 197, 94, 0.5); }
  50% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.8); }
}

.collect-ready {
  animation: collectGlow 1.5s ease-in-out infinite;
}

/* Purchase Bounce */
@keyframes purchaseBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.95); }
}

.purchase-success {
  animation: purchaseBounce 200ms ease-out;
}

/* Achievement Toast Slide */
@keyframes slideIn {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.achievement-toast {
  animation: slideIn 300ms ease-out;
}
```

### Component Polish

- Add loading skeletons to all data-dependent components
- Add error boundaries with retry buttons
- Improve mobile responsiveness
- Add haptic feedback hooks (for future native)
- Add sound effect placeholders

---

## Implementation Order

1. **Week 1:** Prestige System + Achievements
2. **Week 2:** Leaderboards + Daily Rewards
3. **Week 3:** Friends + Gifts
4. **Week 4:** Clubs + UI Polish

---

## Verification Checklist

- [x] Prestige resets progress correctly
- [x] Prestige points calculated properly
- [x] Perks apply multipliers correctly
- [x] Leaderboards update every 15 min
- [ ] Friend requests work both ways
- [ ] Gifts can be sent and claimed
- [ ] Clubs provide income bonus
- [x] All 20+ achievements trackable
- [x] Daily rewards respect streak
- [ ] Animations perform well (60fps)

---

*Plan created: November 29, 2025*
