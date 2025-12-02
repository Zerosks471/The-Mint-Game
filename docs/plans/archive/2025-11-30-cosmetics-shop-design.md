# Cosmetics Shop Design

**Date:** November 30, 2025
**Status:** Ready for implementation
**Phase:** 3 (Monetization) - Part 3

---

## Overview

Implement a cosmetics shop where players can browse, purchase with Mint Coins, and equip cosmetics. MVP focuses on avatars, avatar frames, and badges - visible in navbar and leaderboards.

### Flow

```
ShopPage displays catalog of cosmetics
         ↓
User clicks "Buy" on a cosmetic
         ↓
POST /api/v1/cosmetics/:id/purchase
         ↓
Backend checks: owns? has coins? → deducts coins, creates PlayerCosmetic
         ↓
User clicks "Equip" on owned cosmetic
         ↓
POST /api/v1/cosmetics/equip { cosmeticId }
         ↓
Backend updates equipped slot → avatar/frame/badge visible in navbar
```

---

## New Files

| File | Purpose |
|------|---------|
| `services/api-gateway/src/routes/cosmetics.ts` | Shop endpoints |
| `services/api-gateway/src/services/cosmetics.service.ts` | Business logic |
| `apps/web/src/pages/ShopPage.tsx` | Cosmetics shop UI |
| `packages/database/prisma/seed-cosmetics.ts` | Seed initial cosmetics |

---

## Cosmetic Types (MVP)

| Type | Slot | Visible In |
|------|------|------------|
| `avatar` | avatar | Navbar, leaderboards, profiles |
| `avatar_frame` | avatarFrame | Around avatar everywhere |
| `badge` | badge | Next to username on leaderboards |

---

## API Endpoints

### GET /api/v1/cosmetics/catalog

Returns all cosmetics with player ownership status.

```typescript
// Response
{
  cosmetics: [
    {
      id: "avatar_astronaut",
      name: "Astronaut",
      type: "avatar",
      rarity: "rare",
      premiumCost: 300,
      previewUrl: "/cosmetics/avatars/astronaut.png",
      owned: false,
      equipped: false
    }
  ],
  equipped: {
    avatar: "avatar_default",
    avatarFrame: null,
    badge: null
  },
  balance: 500
}
```

### POST /api/v1/cosmetics/:id/purchase

Purchase a cosmetic with Mint Coins.

```typescript
// Response (success)
{ success: true, newBalance: 200 }

// Errors: INSUFFICIENT_FUNDS, ALREADY_OWNED, NOT_FOUND
```

### POST /api/v1/cosmetics/equip

Equip a cosmetic to a slot.

```typescript
// Request
{ cosmeticId: "avatar_astronaut" }
// OR to unequip:
{ cosmeticId: null, slot: "avatar" }

// Response
{ success: true, equipped: { avatar: "avatar_astronaut", avatarFrame: null, badge: null } }
```

### GET /api/v1/cosmetics/owned

Returns only player's owned cosmetics.

---

## Frontend Design

### ShopPage.tsx

Route: `/shop`

```
┌─────────────────────────────────────────────────┐
│  Cosmetics Shop              💰 500 Mint Coins  │
├─────────────────────────────────────────────────┤
│  [Avatars] [Frames] [Badges]    ← Tab filters   │
├─────────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ 👨‍🚀 │ │ 🧙‍♂️ │ │ 🤖  │ │ 👑  │  ← Grid     │
│  │ 300 │ │ 200 │ │ 500 │ │OWNED│               │
│  └─────┘ └─────┘ └─────┘ └─────┘               │
└─────────────────────────────────────────────────┘
```

### CosmeticCard Component

Shows:
- Preview image/emoji
- Name + rarity color (common=gray, rare=blue, epic=purple, legendary=gold)
- Price OR "Owned" badge
- "Buy" button OR "Equip/Unequip" toggle

### Rarity Colors

| Rarity | Color |
|--------|-------|
| common | gray-400 |
| uncommon | green-500 |
| rare | blue-500 |
| epic | purple-500 |
| legendary | amber-500 |

---

## Seed Data (15 items)

### Avatars (5)

| ID | Name | Rarity | Cost |
|----|------|--------|------|
| avatar_default | Default | common | 0 (free) |
| avatar_investor | Investor | common | 100 |
| avatar_tycoon | Tycoon | uncommon | 200 |
| avatar_mogul | Mogul | rare | 300 |
| avatar_legend | Legend | epic | 400 |

### Avatar Frames (5)

| ID | Name | Rarity | Cost |
|----|------|--------|------|
| frame_none | None | common | 0 (free) |
| frame_bronze | Bronze | common | 100 |
| frame_silver | Silver | uncommon | 150 |
| frame_gold | Gold | rare | 200 |
| frame_diamond | Diamond | epic | 300 |

### Badges (5)

| ID | Name | Rarity | Cost |
|----|------|--------|------|
| badge_newbie | Newbie | common | 0 (free) |
| badge_trader | Trader | uncommon | 150 |
| badge_whale | Whale | rare | 250 |
| badge_vip | VIP | epic | 400 |
| badge_founder | Founder | legendary | 500 |

---

## Implementation Tasks

### Backend
- [ ] Create cosmetics.service.ts
- [ ] Create cosmetics.ts routes
- [ ] Register routes in index.ts
- [ ] Create seed-cosmetics.ts script
- [ ] Run seed to populate database

### Frontend
- [ ] Create ShopPage.tsx with tabs and grid
- [ ] Create CosmeticCard component
- [ ] Add cosmetics API functions
- [ ] Add /shop route to App.tsx
- [ ] Add Shop link to navbar

### Integration
- [ ] Update navbar to show equipped avatar/frame
- [ ] Update leaderboard to show equipped badge

---

## Database Schema (Already Exists)

```prisma
model Cosmetic {
  id              String    @id
  name            String
  description     String?
  type            String
  category        String?
  rarity          String    @default("common")
  previewUrl      String?
  assetUrl        String?
  acquisitionType String    // "purchase", "achievement", "event"
  premiumCost     Int?
  isAvailable     Boolean   @default(true)
  sortOrder       Int       @default(0)
  createdAt       DateTime  @default(now())

  playerCosmetics PlayerCosmetic[]
}

model PlayerCosmetic {
  id          String    @id @default(uuid())
  userId      String
  cosmeticId  String
  isEquipped  Boolean   @default(false)
  acquiredVia String    // "purchase", "gift", "achievement"
  acquiredAt  DateTime  @default(now())

  user        User      @relation(...)
  cosmetic    Cosmetic  @relation(...)
}
```

---

*Design finalized November 30, 2025*
