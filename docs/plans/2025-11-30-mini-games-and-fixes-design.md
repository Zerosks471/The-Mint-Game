# The Mint - Mini-Games & Critical Fixes Design

**Date:** November 30, 2025
**Status:** Ready for Implementation
**Scope:** Bug fixes, UX improvements, interactive mini-game system

---

## Overview

Transform The Mint from a "click and wait" idle game to an interactive experience where every revenue-generating action involves a station-specific task (inspired by Among Us). Fix critical bugs before shipping any new features.

**Core Principle:** Stability first, then engagement.

---

## Part 1: Critical Bug Fixes

All 5 critical bugs must be fixed before mini-games ship.

### 1.1 Payment Webhook Silent Failure
**File:** `services/api-gateway/src/services/coins.service.ts:171`

**Current Problem:**
```typescript
console.error('Invalid coin purchase metadata:', session.metadata);
return;  // Silent failure - player paid but received nothing
```

**Fix:**
- Create `failed_purchases` table for recovery tracking
- Send admin alert on failure
- Add retry queue for failed deliveries
- Return error status to trigger Stripe retry

### 1.2 Property Sell Value Ignores Upgrades
**File:** `services/api-gateway/src/services/game.service.ts:266-269`

**Current Problem:**
```typescript
const sellValue = new Prisma.Decimal(playerProperty.propertyType.baseCost)
  .mul(quantity)
  .mul(0.5);  // Only base cost, ignores upgrades
```

**Fix:**
```typescript
const totalInvestment = new Prisma.Decimal(playerProperty.totalSpent);
const sellValue = totalInvestment.mul(0.5);  // 50% of total investment
```

### 1.3 Prestige Resets Lifetime Earnings
**File:** `services/api-gateway/src/services/prestige.service.ts:220-239`

**Current Problem:**
```typescript
lifetimeCashEarned: 0  // Resets on prestige - should accumulate
```

**Fix:** Remove `lifetimeCashEarned: 0` from the reset operation entirely. Lifetime earnings should never reset.

### 1.4 IPO Seeded RNG Inconsistency
**File:** `services/api-gateway/src/services/ipo.service.ts:276-282`

**Current Problem:** Seed updates on each status check, causing different price histories on page refresh.

**Fix Options:**
- Cache computed tick results in database
- Use timestamp-based determinism (tick time → hash → price)
- Store full price history instead of regenerating

**Recommended:** Cache computed ticks to database on each calculation.

### 1.5 Cash Ticker Divergence
**File:** `apps/web/src/stores/gameStore.ts:154-277`

**Current Problem:** Local display increments every 100ms, server sync every 5 seconds. Sync failure = ghost money.

**Fix:**
- Track `lastSyncedCash` separately from `displayedCash`
- On sync failure, rollback `displayedCash` to `lastSyncedCash`
- Show "syncing..." indicator when values diverge significantly
- Reduce sync interval to 2 seconds

---

## Part 2: Mini-Game System Architecture

### 2.1 Core Concept

Three categories of interactive tasks:

| Category | Trigger | Required? | Failure Handling |
|----------|---------|-----------|------------------|
| Business Tasks | Every cycle collection | Yes | Retry with penalty |
| Property Tasks | Player choice | No (optional +25%) | Skip = normal income |
| IPO Tasks | Launch / Events | Partial | Affects stock price |

### 2.2 Technical Components

**Frontend:**
```
apps/web/src/
├── components/
│   └── minigames/
│       ├── MiniGameModal.tsx        # Reusable container
│       ├── TaskRegistry.ts          # Maps type → game component
│       ├── business/
│       │   ├── OrderRush.tsx        # Restaurant
│       │   ├── DebugCode.tsx        # Tech Startup
│       │   ├── StockShelves.tsx     # Retail Store
│       │   ├── AssemblyLine.tsx     # Factory
│       │   ├── VerifyDeposits.tsx   # Bank
│       │   ├── GuestRequests.tsx    # Hotel
│       │   ├── AdReview.tsx         # Marketing Agency
│       │   └── ScheduleMeeting.tsx  # Consulting Firm
│       ├── property/
│       │   ├── CollectRent.tsx      # Apartment
│       │   ├── FixPipes.tsx         # Duplex
│       │   ├── PaintWalls.tsx       # Townhouse
│       │   ├── MowLawn.tsx          # Small House
│       │   ├── SecurityCheck.tsx    # Large House
│       │   ├── HostParty.tsx        # Mansion
│       │   ├── CleanBeach.tsx       # Beach House
│       │   ├── ValetCars.tsx        # Penthouse
│       │   ├── GardenCare.tsx       # Villa
│       │   └── DockBoats.tsx        # Private Island
│       └── ipo/
│           ├── InvestorPitch.tsx    # Launch quiz
│           ├── MarketMaker.tsx      # During IPO
│           └── CrisisManagement.tsx # On events
```

**Backend:**
```
services/api-gateway/src/
├── routes/
│   └── minigames.ts                 # Task validation endpoints
├── services/
│   └── minigame.service.ts          # Task logic, scoring, rewards
```

**Database:**
```prisma
model TaskAttempt {
  id            String   @id @default(cuid())
  playerId      String
  taskType      String   // "business:restaurant", "property:apartment", etc.
  targetId      String   // businessId or propertyId
  attemptNumber Int      // 1, 2, or 3
  success       Boolean
  score         Int?     // Optional scoring
  revenueMultiplier Float // 1.0, 0.75, or 0.5
  completedAt   DateTime @default(now())

  player        Player   @relation(fields: [playerId], references: [id])
}

model TaskStreak {
  id            String   @id @default(cuid())
  playerId      String   @unique
  propertyStreak Int     @default(0)
  lastPropertyTask DateTime?

  player        Player   @relation(fields: [playerId], references: [id])
}
```

### 2.3 Difficulty Scaling Config

```typescript
// Example for Restaurant "Order Rush" task
const ORDER_RUSH_CONFIG = {
  baseOrders: 2,
  ordersPerLevel: 0.6,  // +0.6 orders per level
  baseTimeSeconds: 30,
  timeReductionPerLevel: 1,  // -1 second per level
  minTimeSeconds: 10,

  getDifficulty(level: number) {
    return {
      orderCount: Math.floor(this.baseOrders + (level - 1) * this.ordersPerLevel),
      timeLimit: Math.max(
        this.minTimeSeconds,
        this.baseTimeSeconds - (level - 1) * this.timeReductionPerLevel
      )
    };
  }
};
```

---

## Part 3: Business Task Definitions

### 3.1 Task Specifications

| Business | Task | Gameplay | Level 1 | Level 10 |
|----------|------|----------|---------|----------|
| Restaurant | Order Rush | Drag ingredients to match order tickets | 2 orders, 30s | 8 orders, 20s |
| Tech Startup | Debug Code | Tap the line with the bug | 1 bug, simple code | 4 bugs, complex code |
| Retail Store | Stock Shelves | Tetris-style inventory stacking | 4 items, large grid | 12 items, small grid |
| Factory | Assembly Line | Simon Says button sequence | 4 steps, slow | 12 steps, fast |
| Bank | Verify Deposits | Confirm math sums are correct | 2 sums, small numbers | 6 sums, large numbers |
| Hotel | Guest Requests | Memory match pairs | 3 pairs | 8 pairs |
| Marketing Agency | Ad Review | Swipe approve/reject (spot errors) | 3 ads, obvious errors | 8 ads, subtle errors |
| Consulting Firm | Schedule Meeting | Fit meetings into calendar slots | 3 meetings, no conflicts | 8 meetings, conflicts |

### 3.2 Retry Mechanic

**Free Players:**
| Attempt | Revenue Multiplier | On Failure |
|---------|-------------------|------------|
| 1st | 100% | Can retry |
| 2nd | 75% | Can retry |
| 3rd | 50% | Must wait for next cycle |

**Premium Players:**
| Attempt | Revenue Multiplier | On Failure |
|---------|-------------------|------------|
| 1st | 100% | Can retry |
| 2nd | 75% | Can retry |
| 3rd | 50% | Auto-collect at 50% (safety net) |

### 3.3 API Flow

```
1. Player clicks "Collect" on ready business
2. Frontend shows MiniGameModal with appropriate task
3. Player completes/fails task
4. Frontend sends: POST /api/minigames/business/complete
   {
     businessId: "...",
     taskType: "order_rush",
     success: true,
     score: 850,
     attemptNumber: 1
   }
5. Backend validates, calculates revenue, returns result
6. Frontend shows reward animation, updates cash
```

---

## Part 4: Property Task Definitions

### 4.1 Task Specifications

| Property | Task | Gameplay |
|----------|------|----------|
| Apartment | Collect Rent | Tap doors in sequence before timer |
| Duplex | Fix Pipes | Rotate pipe segments to connect flow |
| Townhouse | Paint Walls | Tap tiles to match target color pattern |
| Small House | Mow Lawn | Swipe to trace path covering all grass |
| Large House | Security Check | Spot 3 differences between room images |
| Mansion | Host Party | Match drinks to guest requests |
| Beach House | Clean Beach | Tap debris before waves arrive |
| Penthouse | Valet Cars | Slide puzzle - move cars to exit |
| Villa | Garden Care | Whack-a-mole weed removal |
| Private Island | Dock Boats | Timing tap - boats align with dock |

### 4.2 Optional Bonus System

- Tasks are **optional** - managers still auto-collect normally
- Completing task = **+25% bonus income** for that collection
- No retry needed - success or skip, no penalty
- Streak counter tracks consecutive successful tasks (visual motivation only for now)

### 4.3 UI Integration

On Properties page, each property with a manager shows:
```
[Property Card]
├── Income: $1,234/hr
├── Manager: Hired ✓
├── [Auto-Collect] ← Default, normal income
└── [Do Task +25%] ← Opens mini-game, bonus if completed
```

---

## Part 5: IPO Interactive System

### 5.1 Investor Pitch (At Launch)

**Trigger:** Player clicks "Launch IPO"

**Gameplay:**
- 5 multiple-choice questions from randomized pool
- 10 seconds per question
- Questions themed around business strategy

**Example Questions:**
```
Q: "What's your primary growth strategy?"
A) Aggressive expansion (Correct for growth-focused)
B) Steady profitability
C) Minimize all costs

Q: "A competitor copies your product. You..."
A) Sue them immediately
B) Out-innovate them (Correct)
C) Lower your prices
```

**Scoring:**
| Correct Answers | Starting Price Bonus |
|-----------------|---------------------|
| 5/5 | +25% |
| 4/5 | +20% |
| 3/5 | +15% |
| 2/5 | +10% |
| 1/5 | +5% |
| 0/5 | +0% (no penalty) |

### 5.2 Market Maker (During IPO)

**Trigger:** Player visits Stocks page during active IPO

**Gameplay:**
- "Build Hype" button visible during IPO
- Cooldown: 30 minutes between uses
- Max 5 uses per IPO

**Effect:**
- Each use adds +2% to final stock price
- Maximum +10% total from Market Maker

**UI:**
```
[IPO Status Panel]
├── Current Price: $12.50
├── Time Remaining: 4h 32m
├── [Build Hype] (+2% price) - Available in 12:34
└── Hype Actions: 2/5 used
```

### 5.3 Crisis Management (On Events)

**Trigger:** Negative market event occurs during IPO

**Gameplay:**
- Popup with 10-second timer
- Three response options
- One optimal, one neutral, one bad

**Example:**
```
EVENT: "Negative press coverage reported!"

[Issue Public Apology] ← Optimal: -50% event damage
[No Comment] ← Neutral: normal damage
[Deny Everything] ← Bad: +25% event damage

Timer: 8 seconds remaining...
```

**On Timeout:** Neutral response applied automatically

---

## Part 6: UX Improvements

### 6.1 Feedback & Notifications

| Feature | Implementation |
|---------|----------------|
| Toast notifications | Global toast system for all actions (success/failure) |
| Achievement popups | Modal + sound effect when achievement unlocks |
| Prestige preview | Show exact loss: "You will lose: 5 properties, 3 businesses, $1.2M cash" |
| Offline cap display | Show "Earnings capped at 8hr (Premium: 24hr)" |

### 6.2 Terminology Updates

| Current | New | Reason |
|---------|-----|--------|
| "Go Public" (prestige) | "Prestige" | Reserve "Go Public" for IPO |
| Business "Ready!" | "Complete Task" | Reflects new mini-game flow |
| Upgrade button | "Upgrade Level" + icon | Distinguish from "Hire Manager" |

### 6.3 Visual Indicators

| Indicator | Location | Purpose |
|-----------|----------|---------|
| ROI badge | Property cards | Show payback period |
| Difficulty stars | Business cards | Show task difficulty (1-5 stars) |
| Streak counter | Property page header | "5 tasks in a row!" |
| Sync status | Cash display | "Syncing..." when diverged |

---

## Part 7: Implementation Phases

### Phase 1: Critical Bug Fixes (Week 1)
- [ ] Fix payment webhook failure + recovery system
- [ ] Fix property sell value calculation
- [ ] Fix prestige lifetime earnings reset
- [ ] Fix IPO seeded RNG inconsistency
- [ ] Fix cash ticker divergence + sync indicator
- [ ] Add global toast notification system

### Phase 2: Mini-Game Foundation (Week 2)
- [ ] Create `MiniGameModal` component
- [ ] Build task registry system
- [ ] Create difficulty scaling config
- [ ] Add `TaskAttempt` and `TaskStreak` database tables
- [ ] Create `/api/minigames/*` validation endpoints
- [ ] Implement retry mechanic logic

### Phase 3: Business Tasks (Weeks 3-4)
- [ ] Implement Order Rush (Restaurant)
- [ ] Implement Debug Code (Tech Startup)
- [ ] Implement Stock Shelves (Retail Store)
- [ ] Implement Assembly Line (Factory)
- [ ] Implement Verify Deposits (Bank)
- [ ] Implement Guest Requests (Hotel)
- [ ] Implement Ad Review (Marketing Agency)
- [ ] Implement Schedule Meeting (Consulting Firm)
- [ ] Integrate with cycle collection flow
- [ ] Add premium auto-collect fallback
- [ ] Update business page UI

### Phase 4: Property Tasks (Week 5)
- [ ] Implement all 10 property mini-games
- [ ] Add optional task button to property cards
- [ ] Implement +25% bonus reward
- [ ] Add streak tracking and display

### Phase 5: IPO Interactive System (Week 6)
- [ ] Implement Investor Pitch quiz
- [ ] Create question pool (20+ questions)
- [ ] Implement Market Maker hype button
- [ ] Implement Crisis Management events
- [ ] Update IPO UI with interactive elements

### Phase 6: UX Polish (Week 7)
- [ ] Achievement unlock popups with sound
- [ ] Prestige loss preview modal
- [ ] ROI indicators on properties
- [ ] Difficulty stars on businesses
- [ ] Terminology updates throughout
- [ ] Accessibility review (color contrast, keyboard nav)

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Average session length | TBD | +50% |
| Daily active users | TBD | +30% |
| Business collection rate | 100% auto | 80%+ task completion |
| Premium conversion | TBD | +20% (auto-collect value) |
| Player retention (D7) | TBD | +25% |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tasks feel tedious | Players stop collecting | Tune difficulty, add variety, keep tasks <15 seconds |
| Tasks too hard | Frustration, churn | Adaptive difficulty, generous retry policy |
| Server validation lag | Poor UX | Optimistic UI, validate async |
| Premium auto-collect feels required | P2W perception | Ensure tasks are completable with skill |

---

*Design complete. Ready for implementation planning.*
