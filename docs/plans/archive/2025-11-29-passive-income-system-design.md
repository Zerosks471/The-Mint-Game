# Passive Income System Design

> **Purpose:** Replace click-to-earn with passive income visualization for mobile-friendly gameplay.

---

## Overview

The Mint shifts from active clicking to a passive income model where money flows automatically. Players focus on strategic decisions (what to buy, when to upgrade) rather than repetitive tapping.

### Core Principles

1. **Income flows passively** - No clicking required to earn money
2. **Tap to collect** - Manual collection until managers are hired
3. **Visual feedback** - Animated ticker + progress bars show money flowing
4. **Mobile-first** - Touch-friendly, battery-conscious (100ms updates)

---

## Income System

### Properties (Rent-based)

Each property generates rent on a fixed cycle:

```
Income = baseRent × quantity × (1 + managerBonus)
```

- Progress bar fills over the cycle duration
- When full: tap to collect OR manager auto-collects
- Without manager: income caps at 1 cycle (won't accumulate forever)

### Businesses (Cycle-based)

Same mechanics as properties, using the existing cycle system:

- Each business type has a cycle duration
- Revenue generated when cycle completes
- Manager enables auto-collection + bonus

### Manager System

One manager per property/business type:

| Effect | Description |
|--------|-------------|
| Auto-collect | Automatically collects when income ready |
| Income bonus | +15% to that asset's income |

**Manager Pricing (by tier):**

| Tier | Examples | Manager Cost |
|------|----------|--------------|
| 1 | Apartment, Food Cart | $10,000 |
| 2 | Office, Restaurant | $100,000 |
| 3 | Mall, Tech Startup | $1,000,000 |
| 4 | Skyscraper, Bank | $10,000,000 |

---

## UI Design

### Layout Structure

```
┌─────────────────────────────────────┐
│ 🌿 The Mint    💵 $12,847 (+$42/s) │  ← Fixed Header
├─────────────────────────────────────┤
│  [Properties]  [Businesses]  [Stats] │  ← Tab Bar
├─────────────────────────────────────┤
│                                     │
│  (Scrollable content area)          │  ← Tab Content
│                                     │
└─────────────────────────────────────┘
```

### Header Component

- Always visible (sticky)
- Shows total cash with animated ticker
- Income rate display: `(+$X/sec)`
- Pulse animation on 100ms updates (subtle scale + green glow)

### Tab Bar

| Tab | Content |
|-----|---------|
| Properties | Rent-generating assets (apartments, offices, etc.) |
| Businesses | Cycle-based revenue (restaurants, tech companies, etc.) |
| Stats | Total earnings, income breakdown, achievements preview |

### Asset Card

```
┌─────────────────────────────────────┐
│ 🏠 Apartment Complex    Owned: 5    │
│ ████████░░░░ 80%       $50 ready   │
│ $250/cycle (10s)     [Collect 💰]   │
│ ─────────────────────────────────── │
│ [Buy +1 ($500)]  [Manager ($10k) ✓] │
└─────────────────────────────────────┘
```

**States:**
- **Collecting**: Progress bar filling, no glow
- **Ready**: Progress full, Collect button glows
- **Has Manager**: Checkmark badge, auto-collects (no Collect button)
- **Can't Afford**: Buy/Manager buttons greyed out

---

## Frontend Architecture

### State Management (Zustand)

```typescript
interface GameState {
  // Core
  cash: number;
  incomePerSecond: number;
  lastUpdate: number;

  // Assets
  properties: PlayerProperty[];
  businesses: PlayerBusiness[];
  managers: string[]; // IDs of hired managers

  // Actions
  collectIncome: (type: 'property' | 'business', id: string) => void;
  hireManager: (type: 'property' | 'business', id: string) => void;
  buyAsset: (type: 'property' | 'business', typeId: string) => void;
  tick: () => void; // Called every 100ms
}

interface PlayerProperty {
  id: string;
  typeId: string;
  quantity: number;
  cycleProgress: number;    // 0-100
  pendingIncome: number;    // Accumulated uncollected income
  hasManager: boolean;
  lastCollected: Date;
}

interface PlayerBusiness {
  id: string;
  typeId: string;
  level: number;
  cycleProgress: number;
  pendingIncome: number;
  hasManager: boolean;
  lastCollected: Date;
}
```

### Game Loop (100ms interval)

```typescript
function tick(state: GameState): Partial<GameState> {
  const now = Date.now();
  const delta = now - state.lastUpdate;

  // Update each property
  const properties = state.properties.map(prop => {
    const type = getPropertyType(prop.typeId);
    const progressIncrement = (delta / type.cycleDuration) * 100;
    const newProgress = prop.cycleProgress + progressIncrement;

    if (newProgress >= 100) {
      const income = calculateIncome(prop, type);

      if (prop.hasManager) {
        // Auto-collect
        state.cash += income;
        return { ...prop, cycleProgress: newProgress % 100, pendingIncome: 0 };
      } else {
        // Accumulate (cap at 1 cycle)
        return { ...prop, cycleProgress: 100, pendingIncome: income };
      }
    }

    return { ...prop, cycleProgress: newProgress };
  });

  // Same for businesses...

  return { properties, businesses, lastUpdate: now };
}
```

### Key Components

| Component | Responsibility |
|-----------|----------------|
| `<GameHeader />` | Sticky header with animated ticker |
| `<TabBar />` | Navigation between Properties/Businesses/Stats |
| `<AssetList />` | Scrollable list of asset cards |
| `<AssetCard />` | Individual property/business with progress |
| `<ProgressBar />` | Animated fill bar (100ms updates) |
| `<CollectButton />` | Glows when ready, handles tap |
| `<ManagerBadge />` | Shows status, hire button |
| `<AnimatedTicker />` | Cash display with pulse animation |

---

## Backend Changes

### Database Schema Updates

Add to `PlayerProperty` model:
```prisma
model PlayerProperty {
  // ... existing fields
  hasManager    Boolean   @default(false)
  managerBonus  Float     @default(0.15)
  cycleProgress Float     @default(0)
  lastCollected DateTime  @default(now())
}
```

Add to `PlayerBusiness` model:
```prisma
model PlayerBusiness {
  // ... existing fields
  hasManager    Boolean   @default(false)
  managerBonus  Float     @default(0.15)
}
```

### New API Endpoints

```
GET  /api/game/state
     Returns full game state for initial load

POST /api/game/collect
     Body: { type: 'property' | 'business', id: string }
     Collects pending income from specified asset

POST /api/game/hire-manager
     Body: { type: 'property' | 'business', id: string }
     Hires manager for specified asset

POST /api/game/sync
     Body: { lastUpdate: timestamp, properties: [...], businesses: [...] }
     Syncs local state with server, calculates offline earnings
```

### Offline Earnings

When user returns after being away:

1. Calculate `timeAway = now - lastUpdate`
2. For each asset:
   - **With manager**: Earn full income for time away
   - **Without manager**: Cap at 1 cycle of accumulated income
3. Show "Welcome back! You earned $X while away" modal

---

## Animation Specifications

### Ticker Pulse

```css
@keyframes tickerPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); filter: brightness(1.1); }
  100% { transform: scale(1); }
}

.ticker-pulse {
  animation: tickerPulse 150ms ease-out;
}
```

### Progress Bar

- Smooth CSS transition: `transition: width 100ms linear`
- Green fill color: `bg-mint-500`
- Gray background: `bg-gray-200`
- Rounded corners: `rounded-full`

### Collect Button Glow

```css
@keyframes collectGlow {
  0%, 100% { box-shadow: 0 0 5px rgba(34, 197, 94, 0.5); }
  50% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.8); }
}

.collect-ready {
  animation: collectGlow 1.5s ease-in-out infinite;
}
```

---

## Changes from Original Phase 1 Plan

| Original | New Design |
|----------|------------|
| Click button to earn money | Passive income with 100ms updates |
| No collection mechanic | Tap-to-collect with progress bars |
| No managers | Managers unlock auto-collect + 15% bonus |
| Single scrolling game page | Tab-based UI (Properties/Businesses/Stats) |
| Basic cash display | Animated ticker with pulse effect |
| Desktop-first | Mobile-first responsive design |

---

## Implementation Priority

1. **Core game loop** - 100ms interval, progress tracking
2. **Asset cards** - Progress bars, collect buttons
3. **Animated ticker** - Pulse effect, income rate
4. **Tab navigation** - Properties/Businesses/Stats
5. **Manager system** - Hire, auto-collect logic
6. **Offline earnings** - Calculate on return

---

## Summary

The Mint becomes a true idle game where players watch their financial empire grow. The satisfying loop:

1. Open app → see money flowing in
2. Collect from properties (tap tap tap)
3. Buy more properties → income rate increases
4. Hire managers → no more tapping needed
5. Close app → money keeps earning
6. Return → "You earned $X while away!"

No grinding. No carpal tunnel. Just strategic empire building.
