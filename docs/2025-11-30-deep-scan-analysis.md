# The Mint Game - Deep Scan Analysis Report

**Date:** November 30, 2025
**Scope:** Complete codebase audit - Game mechanics, system integration, code quality, UX, and enhancement opportunities

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Issues (Immediate Attention)](#critical-issues)
3. [Game Mechanics Analysis](#game-mechanics-analysis)
4. [System Integration Issues](#system-integration-issues)
5. [Code Quality Issues](#code-quality-issues)
6. [UX/Player Experience Issues](#ux-player-experience-issues)
7. [Enhancement Opportunities](#enhancement-opportunities)
8. [Recommended Mini-Games & Features](#recommended-mini-games--features)
9. [Priority Action Plan](#priority-action-plan)

---

## Executive Summary

This deep scan analyzed all game systems in The Mint - an idle financial tycoon simulation. The review covers:
- **6 core game systems** (Income, Properties, Business, Prestige, IPO, Achievements)
- **3 supporting systems** (Cosmetics, Daily Rewards, Leaderboards)
- **45+ specific issues** identified across code quality, UX, and game balance

### Key Findings

| Category | Critical | Major | Moderate | Low |
|----------|----------|-------|----------|-----|
| Game Mechanics | 4 | 3 | 2 | 1 |
| System Integration | 2 | 2 | 1 | 1 |
| Code Quality | 3 | 4 | 3 | 2 |
| UX Issues | 0 | 3 | 5 | 4 |

---

## Critical Issues

### 1. Cash Ticker Divergence from Server State
**Location:** `apps/web/src/stores/gameStore.ts:154-277`
**Severity:** CRITICAL

**Problem:** The local cash display increments every 100ms independently from server state, which syncs every 5 seconds. If sync fails or user makes purchases during this window, displayed cash diverges from actual balance.

**Impact:**
- Players see "ghost money" they don't actually have
- Purchases may fail unexpectedly
- Creates trust issues with the game economy

**Reproduction:**
1. Play for 5 seconds while earning income
2. Force network disconnection
3. Observe displayed cash vs. actual purchasable amount

**Fix:** Implement optimistic UI with rollback on sync failure, or reduce sync interval.

---

### 2. Prestige Reset Destroys Lifetime Earnings
**Location:** `services/api-gateway/src/services/prestige.service.ts:220-239`

**Problem:**
```typescript
lifetimeCashEarned: 0  // BUG: This should ACCUMULATE, not reset
```

**Impact:**
- Lifetime earnings metric is meaningless
- Leaderboards based on lifetime stats are broken
- Players lose meaningful progression tracking

**Fix:** Remove `lifetimeCashEarned: 0` from reset operation.

---

### 3. Property Sell Value Ignores Upgrades
**Location:** `services/api-gateway/src/services/game.service.ts:266-269`

**Problem:**
```typescript
const sellValue = new Prisma.Decimal(playerProperty.propertyType.baseCost)
  .mul(quantity)
  .mul(0.5);  // Only 50% of BASE cost, ignores ALL upgrade investment
```

**Example Scenario:**
- Player buys property for $100
- Spends $10,000 on upgrades
- Sells property → receives $50 (lost $10,050!)

**Impact:** Extremely punitive, breaks game progression balance, discourages experimentation.

**Fix:** Calculate `totalSpent * 0.5` instead of `baseCost * 0.5`.

---

### 4. IPO Seeded Random Number Generator Broken
**Location:** `services/api-gateway/src/services/ipo.service.ts:276-282`

**Problem:** Uses Linear Congruential Generator for "deterministic" price ticks, but seed updates on each call. Multiple status checks produce different price histories.

**Impact:**
- Price charts are inconsistent
- Players see different values on page refresh
- Undermines trust in the IPO system

**Fix:** Use timestamp-based determinism or cache computed tick results.

---

### 5. Payment Webhook Fails Silently
**Location:** `services/api-gateway/src/services/coins.service.ts:171`

**Problem:**
```typescript
console.error('Invalid coin purchase metadata:', session.metadata);
return;  // Silently fails - player paid but received nothing!
```

**Impact:** Real-money purchases may not deliver coins with no notification.

**Fix:** Create failed_purchase record, send admin alert, implement retry mechanism.

---

## Game Mechanics Analysis

### A. Income/Money System

**Files:** `game.service.ts`, `gameStore.ts`

**How It Works:**
- Real-time cash ticker updates every 100ms locally
- Server sync every 5 seconds
- Income calculated from properties × multipliers
- Offline earnings capped (8h free / 24h premium)

**Issues Found:**

| Issue | Location | Severity |
|-------|----------|----------|
| Ticker divergence from server | gameStore.ts:227-277 | CRITICAL |
| Float precision loss on large incomes | game.service.ts:253 | MAJOR |
| Offline cap message shows incorrectly for $0 earnings | game.service.ts:697 | LOW |

**Balance Concern:** Income scales infinitely with no soft caps, leading to exponential number inflation late-game.

---

### B. Property System

**Files:** `game.service.ts:8-326`, `PropertiesPage.tsx`

**How It Works:**
- Players buy properties by type
- Can own multiple of same type (quantity)
- Upgrades increase income per unit
- Managers enable offline income
- Sell recovers 50% of base cost

**Issues Found:**

| Issue | Location | Severity |
|-------|----------|----------|
| Sell value ignores upgrades | game.service.ts:266-269 | CRITICAL |
| Manager cost not recovered on sale | game.service.ts:192-243 | MAJOR |
| No maxQuantity validation | game.service.ts:185-186 | MODERATE |
| Income calculation not cached | game.service.ts:167 | LOW |

**Player Confusion Points:**
- Difference between "Upgrade Level" and "Hire Manager" unclear
- No ROI indicator to compare property investments

---

### C. Business System

**Files:** `game.service.ts:328-529`

**How It Works:**
- Businesses run on cycles (default 1 hour)
- Must manually collect revenue when cycle completes
- Employees boost revenue by 5% each
- Level-up increases revenue and costs exponentially

**Issues Found:**

| Issue | Location | Severity |
|-------|----------|----------|
| Race condition on cycle collection | game.service.ts:500-502 | MAJOR |
| BigInt overflow at 2^53 cycles | game.service.ts:355-367 | MAJOR |
| Revenue calculation can overflow | game.service.ts:555-563 | MODERATE |
| XP addition not awaited in transaction | game.service.ts:525 | MODERATE |

**Player Confusion Points:**
- Not clear that collection is manual (not automatic)
- Progress bar shows percentage but doesn't indicate time remaining
- "Ready!" state needs more prominent call-to-action

---

### D. Prestige System

**Files:** `prestige.service.ts`

**How It Works:**
- Reset cash, properties, businesses
- Earn prestige points based on net worth: `sqrt(netWorth / 100k) × (1 + level × 0.1)`
- Perks provide permanent bonuses
- 5% income boost per prestige level

**Issues Found:**

| Issue | Location | Severity |
|-------|----------|----------|
| Lifetime earnings reset to 0 | prestige.service.ts:220-239 | CRITICAL |
| Net worth overstates liquidation value | prestige.service.ts:55-68 | MAJOR |
| Prestige points formula favors high-level players exponentially | prestige.service.ts:75-84 | MODERATE |
| Multiplier not recalculated after purchases | prestige.service.ts:304-368 | MODERATE |

**Player Confusion Points:**
- "Go Public" terminology conflicts with IPO system
- No preview of what exactly will be lost
- No simulation of "what if I prestige now?"

---

### E. IPO System

**Files:** `ipo.service.ts`

**How It Works:**
- Alternative to instant prestige (8-hour duration)
- Stock price simulated with trends and events
- Final share sale multiplies prestige points
- Market events create volatility

**Issues Found:**

| Issue | Location | Severity |
|-------|----------|----------|
| Seeded RNG produces inconsistent results | ipo.service.ts:276-282 | CRITICAL |
| Event expiration logic assumes linear time | ipo.service.ts:284-288 | MODERATE |
| Instant spike clears active event prematurely | ipo.service.ts:298-303 | MODERATE |
| Price history limited to 100 points | ipo.service.ts:350-353 | LOW |

**Player Confusion Points:**
- Relationship between IPO and "Go Public" prestige unclear
- Chart gaps when history is trimmed
- No explanation of what causes price movements

---

### F. Achievement System

**Files:** `achievement.service.ts`

**How It Works:**
- Progress tracked against requirement values
- Auto-unlock when requirements met
- Rewards include cash and premium currency

**Issues Found:**

| Issue | Location | Severity |
|-------|----------|----------|
| Duplicate unlock race condition | achievement.service.ts:143-254 | MAJOR |
| Property count aggregation incorrect | achievement.service.ts:259-287 | MODERATE |
| No unlock notification to player | - | MODERATE |

**Player Confusion Points:**
- No visual/audio feedback on unlock
- Progress bars don't explain requirement types clearly

---

### G. Cosmetics Shop System

**Files:** `cosmetics.service.ts`

**How It Works:**
- Three types: Avatar, Frame, Badge
- Purchased with Mint Coins (premium currency)
- Some cosmetics are free
- Equip one of each type

**Issues Found:**

| Issue | Location | Severity |
|-------|----------|----------|
| Free cosmetics show as "owned" without claiming | cosmetics.service.ts:66 | MODERATE |
| Unequip resets to default without validation | cosmetics.service.ts:184-186 | MAJOR |
| No type validation on equipment slot | cosmetics.service.ts:213 | MODERATE |

---

### H. Daily Rewards System

**Files:** `daily.service.ts`

**How It Works:**
- Daily login rewards with streak bonuses
- Premium users get enhanced rewards
- Milestone days (7, 14, 30) give special rewards

**Issues Found:**

| Issue | Location | Severity |
|-------|----------|----------|
| Bonus coins not implemented | daily.service.ts:245 | MODERATE |
| Prestige points increment can fail silently | daily.service.ts:236-237 | MAJOR |

---

## System Integration Issues

### 1. State Synchronization Problems

**Ticker-to-Server Divergence**
- Local cash increments independently
- Server sync every 5 seconds
- Failed sync = ghost money
- **Fix:** Implement optimistic UI with rollback

**Offline Earnings Race Condition**
- `collectOfflineEarnings()` and `collectEarnings()` can overlap
- Rapid transitions could collect offline twice
- **Fix:** Add mutex/lock around collection

---

### 2. Prestige & IPO Conflict

**Problem:** Two reset mechanics exist simultaneously:
- IPO: Soft reset with stock market gameplay (8 hours)
- Go Public: Instant reset with fixed points

**Gap:** No coordination between systems. Player could theoretically trigger both.

**Fix:**
- Rename "Go Public" to "Prestige" for clarity
- Block instant prestige when IPO is active
- Add clear UI distinction

---

### 3. Achievement Progress After Prestige

**Problem:** Achievement progress compares against current stats. After prestige, stats reset to 0.

**Example:** "Earn $10M" achievement at 90% progress → prestige → back to 0%

**Fix:** Track achievement progress separately from current game state, or use lifetime values.

---

## Code Quality Issues

### Missing Validation

| Location | Issue |
|----------|-------|
| routes/game.ts | Type IDs parsed without validation |
| cosmetics.service.ts | Cosmetic type not validated |
| All routes | Not all routes use validators from `validators/` |

### Performance Issues

| Location | Issue |
|----------|-------|
| achievement.service.ts:51-59 | N+1 query pattern for progress |
| prestige.service.ts:335-368 | Perk recalculation in transaction |
| game.service.ts:167 | Income calculation not cached |

### Type Safety Issues

| Location | Issue |
|----------|-------|
| ipo.service.ts:186 | `priceHistory: [...] as any` |
| Multiple files | Inconsistent use of optional chaining |

---

## UX/Player Experience Issues

### Player Confusion Points

1. **Manager vs Upgrade** - Two different paid improvements, unclear distinction
2. **Offline Cap** - Free users don't see WHY earnings stopped at 8 hours
3. **Business Collection** - Not obvious that collection is manual
4. **Prestige vs IPO** - "Go Public" conflicts with IPO terminology
5. **Achievement Progress** - Resets after prestige without warning

### Missing Feedback

1. **Purchase Failures** - No toast/alert when buy fails
2. **Achievement Unlocks** - No notification, popup, or sound
3. **Prestige Warning** - Doesn't show specific inventory loss
4. **Milestone Notifications** - No celebration for major cash milestones

### Accessibility Issues

1. **Color-Only Indicators** - Green for bonuses, no colorblind alternatives
2. **Contrast** - Some dark mode text has low contrast
3. **Responsive** - Grid layout may break on medium devices with long names

---

## Enhancement Opportunities

### Missing Core Features

1. **Tutorial System**
   - Schema has `tutorialCompleted` but never used
   - New players are lost with prestige/business cycles
   - Implement interactive onboarding guide

2. **Prestige Simulation**
   - "What if I prestige now?" calculator
   - Show estimated points, level, multiplier before committing

3. **Property ROI Calculator**
   - Show payback period for investments
   - Compare income/cost ratio across properties

4. **Data Export**
   - Player financial history export
   - CSV download of earnings over time

---

## Recommended Mini-Games & Features

### Business Mini-Games

1. **Negotiation Puzzle**
   - When hiring employees or signing contracts
   - Simple matching/sliding puzzle
   - Success = bonus discount or revenue boost
   - Failure = standard pricing

2. **Supply Chain Management**
   - Mini-game for business cycles
   - Match resources to production slots
   - Faster completion = shorter cycle time
   - Adds active gameplay to idle mechanics

3. **Quality Control**
   - Quick-time event style mini-game
   - Appears randomly during business cycles
   - Success = temporary revenue multiplier
   - Failure = no penalty (optional engagement)

### Property Mini-Games

1. **Renovation Rush**
   - When upgrading properties
   - Tile-matching or tetris-style puzzle
   - Complete patterns for upgrade bonuses
   - Makes upgrades feel more impactful

2. **Tenant Management**
   - Occasional random events
   - Choose response to tenant situations
   - Good choices = bonus income
   - Adds narrative flavor

3. **Property Inspection**
   - Hidden object / spot-the-difference
   - Find issues in property images
   - Rewards with maintenance cost reduction

### IPO Mini-Games

1. **Investor Pitch**
   - During IPO launch phase
   - Answer investor questions correctly
   - Good answers = higher initial stock price
   - Adds skill element to IPO

2. **Market Maker**
   - Active trading mini-game during IPO
   - Buy/sell decisions affect final price
   - Risk/reward for engaged players
   - Optional - can still auto-complete

3. **PR Crisis Management**
   - When negative events hit stock
   - Quick decision game
   - Right choice minimizes damage
   - Wrong choice = bigger price drop

### Social/Club Mini-Games

1. **Club Challenges**
   - Weekly competitions between clubs
   - Collective goals (earn $X together)
   - Rewards for all club members
   - Builds community

2. **Gift Exchange**
   - Send/receive gifts with club members
   - Opening gifts = small bonuses
   - Encourages daily check-ins

3. **Auction House**
   - Bid on rare cosmetics/bonuses
   - Uses in-game currency
   - Creates economy and engagement

### Daily Engagement Features

1. **Wheel of Fortune**
   - Daily spin for random rewards
   - Premium users get extra spins
   - Gamification of daily login

2. **Daily Quests**
   - "Earn $100K today"
   - "Hire 3 managers"
   - "Collect 5 business cycles"
   - Rewards beyond streak bonuses

3. **Flash Sales**
   - Random discounted cosmetics/boosts
   - Limited time (creates urgency)
   - Drives monetization

### Progression Features

1. **Property Mastery**
   - After owning 100 of a property type
   - Unlock special perks or cosmetics
   - Additional achievement tier

2. **Seasonal Events**
   - Holiday themes (Halloween, Christmas)
   - Limited-time properties/cosmetics
   - Temporary boost multipliers
   - FOMO engagement

3. **Milestone Celebrations**
   - $1M, $100M, $1B achievements
   - Special animations/sounds
   - Shareable achievement cards

---

## Priority Action Plan

### Phase 1: Critical Fixes (Immediate - 1 Week)

1. **Fix IPO RNG** - Disable IPO launch until seeded randomness is fixed
2. **Fix Sell Value** - Include upgrade costs in property sell value
3. **Fix Prestige Reset** - Don't reset `lifetimeCashEarned`
4. **Fix Payment Webhook** - Add error recovery and notifications
5. **Fix Ticker Sync** - Add rollback on sync failure

### Phase 2: Major Fixes (Week 2-3)

1. Add transaction locks to business collection
2. Validate cosmetic equipment slots
3. Implement BigInt safeguards for cycle counts
4. Fix achievement duplicate transaction race
5. Implement bonus coins in daily rewards

### Phase 3: UX Improvements (Week 4-5)

1. Add toast notifications for all actions
2. Implement achievement unlock popups
3. Add prestige loss preview
4. Improve terminology consistency (Prestige vs IPO)
5. Add property/business ROI indicators

### Phase 4: Engagement Features (Month 2)

1. Implement tutorial/onboarding system
2. Add daily quests beyond streak
3. Add prestige simulation calculator
4. Implement first mini-game (Business Negotiation or Wheel of Fortune)

### Phase 5: Mini-Games & Social (Month 3+)

1. Expand mini-game offerings
2. Add club challenges
3. Implement seasonal events
4. Add auction house for rare items

---

## Appendix: File Reference

| System | Primary Files |
|--------|---------------|
| Income | `game.service.ts`, `gameStore.ts` |
| Properties | `game.service.ts:8-326`, `PropertiesPage.tsx` |
| Business | `game.service.ts:328-529`, `BusinessPage.tsx` |
| Prestige | `prestige.service.ts`, `PrestigePage.tsx` |
| IPO | `ipo.service.ts`, `StocksPage.tsx` |
| Achievements | `achievement.service.ts`, `AchievementsPage.tsx` |
| Cosmetics | `cosmetics.service.ts`, `ShopPage.tsx` |
| Daily | `daily.service.ts`, `DailyRewardsModal.tsx` |
| Leaderboard | `leaderboard.service.ts`, `LeaderboardPage.tsx` |

---

*Report generated by Claude Code - Deep Scan Analysis*
