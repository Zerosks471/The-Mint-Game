# Stock Market IPO Simulation Design

> **Status:** Design Complete
> **Date:** November 29, 2025

---

## Overview

Transform the "Go Public" prestige system from a simple reset-for-points mechanic into a rich IPO stock market simulation that adds depth and engagement.

**Core concept:** When prestiging, players can choose to "Launch IPO" instead of instant reset. Their company goes public with a stock price that fluctuates over 2-8 hours. Players choose when to "sell shares" (complete prestige) to maximize their prestige point multiplier.

---

## Design Decisions

### 1. Stock Ticker Symbol Generation
- **Approach:** Username-based auto-generation
- **Algorithm:** Extract consonants + first vowel, uppercase, 3-4 chars
- **Examples:** "JohnDoe" → "JDOE", "GamerX123" → "GMRX", "Alice" → "ALCE"
- **Fallback:** If collision, append number: "JDOE2"

### 2. IPO Price Calculation
```typescript
// Base IPO price from net worth
const ipoPrice = netWorth / 10_000;
// $100K net worth = $10/share
// $1M net worth = $100/share
// $10M net worth = $1,000/share
```

### 3. Price Fluctuation Model: Momentum-Based
- **Tick frequency:** Every 5-15 minutes (randomized)
- **Trend continuation:** 70% chance to continue current trend
- **Trend reversal:** 30% chance to flip direction
- **Normal tick magnitude:** ±1-3%
- **Event tick magnitude:** ±3-8%
- **Price bounds:** -30% to +50% from IPO price

```typescript
interface PriceTick {
  trend: 'bullish' | 'bearish' | 'neutral';
  trendStrength: 1 | 2 | 3 | 4 | 5;

  // On each tick:
  // 1. Roll for trend continuation (70%) vs reversal (30%)
  // 2. Calculate magnitude based on strength + event modifier
  // 3. Apply to current price, clamping to bounds
}
```

### 4. Market Events (Medium Scope - 12-15 Events)

| Event | Effect | Duration |
|-------|--------|----------|
| Bull Run | +5% trend bias, double tick frequency | 30-60 min |
| Bear Market | -5% trend bias, more reversals | 30-60 min |
| Sector Boom (Real Estate) | +10% if player owns RE properties | 20-40 min |
| Sector Boom (Business) | +10% if player owns businesses | 20-40 min |
| Sector Crash (Real Estate) | -10% if player owns RE properties | 20-40 min |
| Sector Crash (Business) | -10% if player owns businesses | 20-40 min |
| Earnings Beat | One-time +8-15% spike | Instant |
| Earnings Miss | One-time -8-15% drop | Instant |
| Analyst Upgrade | +3% per tick for 3 ticks | 15-30 min |
| Analyst Downgrade | -3% per tick for 3 ticks | 15-30 min |
| Fed Rate Cut | Market-wide +5% boost | 30-45 min |
| Fed Rate Hike | Market-wide -5% drag | 30-45 min |
| Viral News | Random ±10-20% volatility spike | 15 min |
| Meme Stock Surge | Wild swings ±5-15% per tick | 20 min |
| Market Holiday | No ticks, price frozen | 30 min |

**Event frequency:** 1-3 events per IPO session

### 5. Prestige Points Conversion
```typescript
// Direct multiplier based on sell price vs IPO price
const multiplier = finalPrice / ipoPrice;
const pointsEarned = Math.floor(basePoints * multiplier);

// Examples:
// Sold at IPO price (1.0x): 10 base → 10 points
// Sold at +30% (1.3x): 10 base → 13 points
// Sold at -20% (0.8x): 10 base → 8 points
// Sold at +50% (1.5x): 10 base → 15 points (max)
// Sold at -30% (0.7x): 10 base → 7 points (min)
```

**No floor protection** - instant prestige exists as the safe option. IPO is the gamble.

### 6. Timeline
- **IPO duration:** 2-8 hours (player can sell anytime)
- **Auto-sell:** At 8 hour mark, shares auto-sell at current price
- **Tick interval:** 5-15 minutes (randomized to feel organic)

### 7. UI/UX Flow
1. **Entry:** Player clicks "Go Public" on Prestige page
2. **Choice Modal:** "Instant Prestige (X points)" vs "Launch IPO (gamble for more)"
3. **IPO Launch:** Shows ticker, IPO price, base points, confirms launch
4. **Active IPO:** Player can roam freely, IPO runs in background
   - IPO status visible in nav/header
   - Dedicated IPO view on Prestige page with:
     - Live TradingView-style chart
     - Current price + % change
     - Session high/low
     - Active event banner
     - Time remaining
     - "Sell Shares" button
5. **Sell:** Confirmation modal shows multiplier and final points
6. **Result:** Celebration with stock performance summary

**Free roaming** - fits idle game DNA. IPO is another thing happening in your empire.

---

## Database Schema

```prisma
model PlayerIPO {
  id              String    @id @default(cuid())
  userId          String    @unique @map("user_id")
  tickerSymbol    String    @map("ticker_symbol")
  ipoPrice        Decimal   @db.Decimal(18, 2) @map("ipo_price")
  currentPrice    Decimal   @db.Decimal(18, 2) @map("current_price")
  highPrice       Decimal   @db.Decimal(18, 2) @map("high_price")
  lowPrice        Decimal   @db.Decimal(18, 2) @map("low_price")
  basePoints      Int       @map("base_points")
  trend           String    @default("neutral") // bullish, bearish, neutral
  trendStrength   Int       @default(1) @map("trend_strength") // 1-5
  activeEvent     String?   @map("active_event") // event slug or null
  eventExpiresAt  DateTime? @map("event_expires_at")
  priceHistory    Json      @default("[]") @map("price_history") // [{time, price}]
  startsAt        DateTime  @default(now()) @map("starts_at")
  expiresAt       DateTime  @map("expires_at") // 8hr max
  createdAt       DateTime  @default(now()) @map("created_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("player_ipos")
}

model MarketEvent {
  id              String    @id @default(cuid())
  slug            String    @unique
  name            String
  description     String
  effectType      String    @map("effect_type") // trend_bias, instant_spike, tick_modifier
  effectValue     Decimal   @db.Decimal(5, 2) @map("effect_value")
  durationMinutes Int       @map("duration_minutes") // 0 for instant
  isPositive      Boolean   @map("is_positive")
  rarity          Int       @default(1) // 1=common, 2=uncommon, 3=rare
  isActive        Boolean   @default(true) @map("is_active")

  @@map("market_events")
}
```

---

## Technical Notes

### Current Prestige System (to be enhanced)
- Service: `services/api-gateway/src/services/prestige.service.ts`
- Frontend: `apps/web/src/pages/PrestigePage.tsx`
- Current formula: `sqrt(netWorth / 1,000,000) * (1 + prestigeLevel * 0.1)`
- Minimum net worth: $100,000

### Price Tick Processing
Options for running ticks:
1. **Cron job** - Server runs ticks every minute, processes all active IPOs
2. **On-demand** - Calculate ticks when player views IPO (lazy evaluation)
3. **Hybrid** - Cron for events, on-demand for price ticks

Recommend **Option 2 (On-demand)** for simplicity - calculate what ticks "would have happened" when player checks. Store last tick time, generate ticks retroactively.

### Chart Visualization
- Reuse TradingView lightweight-charts from Stats page
- Store last 50-100 price points in `priceHistory` JSON
- Real-time feel via polling every 30 seconds on IPO page

---

## Implementation Order

1. Add `PlayerIPO` and `MarketEvent` models to schema
2. Seed market events
3. Add IPO service with launch/tick/sell logic
4. Add IPO API routes
5. Update Prestige page with IPO choice modal
6. Build IPO dashboard UI with chart
7. Add IPO indicator to nav/header
8. Test full flow

---

*Design completed: November 29, 2025*
