# Stock Market System Rework - Design Document

**Date:** 2025-12-01
**Status:** Approved

## Overview

Complete rework of the Mint Exchange (MNX) stock market to simulate a realistic underground stock exchange with 35 parody stocks, tradeable indices, AI trading bots, player IPOs with dividends, and a cyberpunk UI aesthetic.

---

## 1. Market Structure & Indices

### The Mint Exchange (MNX)

A full-scale underground stock exchange with 35 stocks across 6 sectors.

### Sectors

| Sector | ETF Ticker | Theme |
|--------|------------|-------|
| MintTech | MTEK | Surveillance, hacking, dark web, crypto |
| MintFinance | MFIN | Money laundering, offshore banks, loan sharks |
| MintEnergy | MNRG | Illegal fuel, power grid exploits, stolen goods |
| MintConsumer | MCON | Contraband, luxury fakes, underground retail |
| MintHealth | MHLT | Black market pharma, unlicensed clinics |
| MintIndustrial | MIND | Weapons, vehicle mods, heist equipment |

### Indices

- **MINT35** - Master index tracking all stocks (70% market cap, 30% volume weighted)
- **6 Sector ETFs** - Tradeable funds for each sector (MTEK, MFIN, MNRG, MCON, MHLT, MIND)

### ETF Mechanics

- Price derived from underlying stock components
- Buying/selling ETF doesn't directly affect individual stock prices
- Updates every market tick (1 minute)
- Lower dividend yield than individual stocks (trade-off for diversification)

---

## 2. The 35 Parody Stocks

### MintTech (6 stocks)

| Ticker | Company | Parody Of | Description |
|--------|---------|-----------|-------------|
| GOGGL | Goggle Inc | Google | Surveillance tech, tracks everything |
| FAKEBOOK | FakeBook | Facebook/Meta | Identity theft network, fake profiles |
| DRKWEB | DarkWeave | AWS/Cloudflare | Dark web hosting, untraceable servers |
| CRYPT0 | CryptØ | Coinbase | Untraceable crypto exchange |
| HACKR | HackrBox | Dropbox | Stolen data storage, leaked files |
| BURNER | BurnerTech | Apple | Disposable phones, encrypted comms |

### MintFinance (6 stocks)

| Ticker | Company | Parody Of | Description |
|--------|---------|-----------|-------------|
| WASHD | WashCo Holdings | HSBC | Money laundering specialists |
| OFFSH | OffShore Capital | Credit Suisse | Hidden accounts, tax evasion |
| PAYDAY | PayDay Loans | Payday lenders | Loan sharks, high interest |
| SHADDW | Shadow Bank | JP Morgan | Underground banking network |
| GOLDVLT | GoldVault Inc | Brinks | Secure storage for "assets" |
| CASINO | Lucky Mint Casino | MGM | Gambling, money cleaning |

### MintEnergy (5 stocks)

| Ticker | Company | Parody Of | Description |
|--------|---------|-----------|-------------|
| SIPHON | Siphon Energy | Shell | Stolen fuel, pipeline taps |
| GRIDX | GridJack Corp | Tesla Energy | Power grid exploits |
| BLACKOUT | BlackOut Systems | Exxon | Controls power for heists |
| JUNKYARD | JunkYard Motors | AutoZone | Chop shops, stolen parts |
| BTTRY | Hot Battery Inc | Panasonic | Stolen EV batteries |

### MintConsumer (6 stocks)

| Ticker | Company | Parody Of | Description |
|--------|---------|-----------|-------------|
| AMAZONE | Amazone Prime | Amazon | Contraband delivery network |
| LUXFAKE | LuxFake Inc | LVMH | Counterfeit luxury goods |
| SILKRD | SilkRoad Retail | Alibaba | Dark web marketplace |
| PAWNIT | PawnIt Chain | GameStop | Fencing stolen goods |
| BOOZE | BootLeg Spirits | Diageo | Untaxed alcohol, fake labels |
| SMOKEZ | SmokeScreen Co | Altria | Contraband tobacco |

### MintHealth (6 stocks)

| Ticker | Company | Parody Of | Description |
|--------|---------|-----------|-------------|
| PHARMA | PharmaBro Inc | Pfizer | Black market medications |
| ENHANCE | EnhanceCorp | GNC | Performance drugs, steroids |
| DOCOFF | Doc-Off-Books | CVS | Unlicensed clinics |
| PAINAWAY | PainAway Labs | Purdue | "Pain management" specialists |
| ORGANX | OrganX Trade | Quest Diagnostics | Black market organs |
| LABRAT | LabRat Testing | Theranos | Fake medical tests |

### MintIndustrial (6 stocks)

| Ticker | Company | Parody Of | Description |
|--------|---------|-----------|-------------|
| HEISTCO | HeistCo Supply | Home Depot | Heist equipment supplier |
| GETAWAY | GetAway Motors | Ford | Custom getaway vehicles |
| ARMORX | ArmorX Defense | Lockheed | Illegal weapons, armor |
| SAFECRK | SafeCrack Inc | Schlage | Lock picks, safe cracking |
| VANISH | Vanish Logistics | FedEx | Evidence disposal |
| PRINTS | NoPrints Tech | 3M | Anti-forensics, clean crews |

---

## 3. Dividend System

### Two Dividend Streams (Split Model)

#### Owner Dividends (from business performance)

The stock owner earns based on their actual gameplay:

| Factor | Weight | Source |
|--------|--------|--------|
| Daily income | 40% | Business revenue, heist earnings, etc. |
| Net worth growth | 30% | Change in total assets |
| Reputation gains | 30% | XP, level progression, achievements |

**Formula:** `ownerDividend = (dailyIncome × 0.4 + networthGrowth × 0.3 + repGains × 0.3) × 0.05`

Owner receives 5% of their weighted performance as dividends on founder shares.

#### Shareholder Dividends (from stock performance)

Investors earn based on the stock's market metrics:

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Price performance | 40% | % change from previous day |
| Trading volume | 30% | Volume relative to float |
| Market cap rank | 30% | Position among all stocks |

**Formula:** `shareholderDividend = sharesOwned × pricePerShare × dailyYield`

Where `dailyYield` ranges from 0.01% to 0.5% based on the weighted factors.

#### Payout Schedule

- **Time:** Daily at midnight UTC
- **Minimum payout:** $1 (smaller amounts accumulate)
- **Notification:** Players see dividend income in daily summary
- **Taxable:** No in-game taxes on dividends

#### ETF Dividends

- ETFs pay dividends based on aggregate of underlying stocks
- Slightly lower yield than individual stocks (trade-off for diversification)
- Same daily payout schedule

---

## 4. AI Trading Bot Ecosystem

### 1. Market Maker Bots (5 bots)

**Purpose:** Provide liquidity, stabilize prices

| Behavior | Details |
|----------|---------|
| Always active | Trade every 30-60 seconds |
| Tight spreads | Buy slightly below, sell slightly above market |
| Stabilizing | Counter extreme moves, dampen volatility |
| Capital | $10M each, spread across all stocks |

### 2. Whale Bots (3 bots)

**Purpose:** Create market-moving events, opportunities

| Behavior | Details |
|----------|---------|
| Rare trades | 2-5 large trades per day each |
| Large positions | $500K-$2M per trade |
| Sector focus | Each whale specializes in 2 sectors |
| Telegraphed | Small "accumulation" trades before big moves |

### 3. News-Reactive Bots (8 bots)

**Purpose:** React to in-game events, create correlation

| Trigger | Reaction |
|---------|----------|
| Player heist succeeds | Buy that player's stock + HEISTCO |
| Business opened | Buy related sector stocks |
| Player arrested/jailed | Sell that player's stock |
| Large player trade | Follow or counter based on personality |
| Player levels up | Small buy on their stock |

**Personalities:** 4 follow trends, 4 contrarian

### 4. Sentiment Bots (6 bots)

**Purpose:** Create crowd dynamics, momentum

| Behavior | Details |
|----------|---------|
| Volume tracking | Buy stocks with rising volume |
| Trend following | Pile into winners, flee losers |
| Herd mentality | 2-3 bots often trade same direction |
| Panic selling | Aggressive exits during circuit breakers |
| FOMO buying | Chase stocks up 5%+ in a day |

### Bot Coordination

- Bots don't coordinate directly but create emergent behavior
- Market makers dampen what whales create
- Sentiment bots amplify what news bots start
- Creates realistic push-pull dynamics

**Total bot capital:** ~$80M in the market at all times

---

## 5. Player Stock IPO System

### Listing Requirements (All must be met)

| Requirement | Threshold | Rationale |
|-------------|-----------|-----------|
| Net worth | $500K minimum | Proves financial stability |
| Player level | Level 10+ | Shows game experience |
| Account age | 7+ days | Prevents throwaway accounts |
| Cash fee | $50K (non-refundable) | Skin in the game |

### IPO Configuration

**Player chooses:**
- **Ticker symbol** - 3-5 letters, unique, no profanity filter bypass
- **Company name** - Up to 30 characters
- **Initial share price** - $1 to $100 range
- **Float percentage** - 20% to 60% of shares available to public

**System sets:**
- **Total shares** - 1,000,000 fixed
- **Founder shares** - Remainder after float (locked, earn dividends)
- **Initial market cap** - Share price × total shares

### Performance Requirements (Stay Listed)

Stocks are reviewed weekly. Delisting occurs if ANY condition met for 2 consecutive weeks:

| Metric | Minimum | Consequence |
|--------|---------|-------------|
| Weekly volume | 1,000 shares traded | Warning → Delist |
| Unique traders | 3+ different buyers/sellers | Warning → Delist |
| Owner activity | Must log in 3+ days/week | Warning → Delist |
| Price floor | Can't fall below $0.10 | Automatic delist |

### Delisting Process

1. **Warning week** - Player notified, stock marked "At Risk"
2. **Grace period** - 7 days to meet requirements
3. **Delisting** - Stock removed from exchange
4. **Shareholder payout** - Remaining shareholders receive last price × shares as cash
5. **Cooldown** - Player can't re-IPO for 30 days

### Self-Trading Prevention

- Players CANNOT buy their own stock
- Players CANNOT sell founder shares (locked)
- Players CAN see their stock's performance and holder list

---

## 6. Market Mechanics & Circuit Breakers

### Price Update Cycle

| Component | Frequency | Description |
|-----------|-----------|-------------|
| Bot stock ticks | Every 2-5 minutes | Random interval per stock |
| Player stock ticks | Every 5 minutes | Tied to owner metrics |
| ETF recalculation | Every 1 minute | Weighted average of components |
| Index update | Every 1 minute | MINT35 composite value |

### Circuit Breakers

#### Individual Stock Halts

| Trigger | Duration | Visual |
|---------|----------|--------|
| ±10% in 30 minutes | 5 minute halt | Yellow "HALTED" badge |
| ±15% in 1 hour | 15 minute halt | Orange "HALTED" badge |
| ±25% in 1 day | 25% in 1 day | Red "HALTED" badge |

During halt:
- No buy/sell orders accepted
- Price frozen at last trade
- Bots pause trading that stock
- Countdown timer visible to players

#### Market-Wide Halt

| Trigger | Duration |
|---------|----------|
| MINT35 drops 10% | 15 minute market pause |
| MINT35 drops 20% | 1 hour market pause |
| MINT35 drops 30% | Market closed for day (resets midnight) |

### Supply & Demand Impact

| Trade Size | Price Impact |
|------------|--------------|
| < 1% of float | ±0.1% price move |
| 1-5% of float | ±0.5% price move |
| 5-10% of float | ±1.5% price move |
| > 10% of float | ±3% price move + slippage warning |

Large orders show estimated price impact before confirmation.

### Trading Limits (Anti-Manipulation)

| Rule | Limit |
|------|-------|
| Rate limit | 20 trades/minute, 100/hour |
| Position limit | Max 30% of any stock's float |
| Single trade | Max 50,000 shares per order |
| Wash trading | 5-minute cooldown same stock buy→sell |

---

## 7. Frontend UI Design (Cyberpunk Underground)

### Visual Theme

| Element | Style |
|---------|-------|
| Background | Dark charcoal (#0a0a0f) with subtle grid pattern |
| Accent colors | Neon cyan (#00f5ff), hot pink (#ff006a), toxic green (#39ff14) |
| Text | White primary, gray secondary, monospace for numbers |
| Cards | Glass-morphism with dark tint, subtle glow borders |
| Charts | Neon line charts, glowing candles |
| Animations | Subtle glitch effects on updates, smooth transitions |

### Main Pages

#### 1. Market Overview (Home)
- Live MINT35 index with large chart
- Scrolling ticker tape at top (neon green/red)
- Sector cards showing ETF performance
- "Hot Stocks" section (top gainers/losers/volume)
- Recent trades feed (live updating)

#### 2. Stock Detail Page
- Large candlestick chart with timeframe toggles (1H, 1D, 1W, 1M)
- Current price with glow effect on change
- Key stats: Market cap, volume, 24h range, float
- Simple Buy/Sell buttons (clean, accessible)
- Holdings section if player owns shares
- Recent trades for this stock

#### 3. Portfolio Page
- Total portfolio value with daily P&L
- Holdings list with sparkline charts
- Dividend earnings tracker (today, this week, all-time)
- Performance chart of portfolio over time

#### 4. My Company (IPO) Page
- Company stats and stock performance
- Shareholder list (anonymous counts by tier)
- Founder dividend earnings
- "At Risk" warning banner if underperforming

#### 5. Trade Modal
- Clean, focused modal overlay
- Stock name and current price
- Quantity input with quick buttons (10, 100, 1000, MAX)
- Live total calculation
- Estimated price impact warning for large orders
- Confirm button with brief processing animation

### Mobile Responsive
- Stack layouts vertically on mobile
- Collapsible sections
- Bottom navigation bar
- Swipe between tabs

---

## 8. Technical Implementation

### Database Changes

#### New Tables

| Table | Purpose |
|-------|---------|
| `MarketIndex` | MINT35 + sector ETFs with current values |
| `IndexComponent` | Maps stocks to indices with weights |
| `DividendPayout` | Daily dividend transaction records |
| `MarketEvent` | News events, halts, triggers for bots |
| `TradingBot` | Bot configurations, personalities, capital |
| `BotPosition` | Current holdings per bot |

#### Modified Tables

| Table | Changes |
|-------|---------|
| `BotStock` | Replace 15 generic with 35 parody stocks |
| `PlayerStock` | Add `listingStatus`, `warningWeek`, `lastOwnerLogin` |
| `StockOrder` | Add `priceImpact`, `triggeredHalt` flags |
| `PlayerStats` | Add `dividendEarnings`, `lastDividendAt` |

### New Services

| Service | Responsibility |
|---------|----------------|
| `IndexService` | Calculate index values, ETF pricing, rebalancing |
| `DividendService` | Daily dividend calculation and payout |
| `CircuitBreakerService` | Monitor price moves, trigger halts |
| `MarketEventService` | Generate news events, notify bots |
| `DelistingService` | Weekly performance checks, warnings, delisting |

#### Modified Services

- `StockService` - Price impact, halt checks, new stocks
- `BotTraderService` - New bot types, event reactions
- `TradingRulesService` - Updated limits

### API Endpoints (New)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/stocks/indices` | All indices with current values |
| GET | `/stocks/indices/:ticker` | Index detail + components |
| POST | `/stocks/etf/buy` | Buy ETF shares |
| POST | `/stocks/etf/sell` | Sell ETF shares |
| GET | `/stocks/dividends` | Player's dividend history |
| GET | `/stocks/events` | Recent market events/news |
| GET | `/stocks/halts` | Currently halted stocks |

### Migration Strategy

1. **Phase 1:** Add new tables, keep old stocks running
2. **Phase 2:** Seed 35 new parody stocks alongside old
3. **Phase 3:** Migrate bot capital to new stocks
4. **Phase 4:** Deprecate old stocks (convert holdings to cash)
5. **Phase 5:** Full cutover, remove old stock tables

---

## Summary

This rework transforms the Mint Exchange into a realistic underground stock market with:

- **35 parody stocks** across 6 themed sectors
- **MINT35 master index** + 6 tradeable sector ETFs
- **Daily dividends** split between owners (business performance) and shareholders (stock performance)
- **22 AI trading bots** (market makers, whales, news-reactive, sentiment)
- **Player IPOs** with listing requirements and performance-based delisting
- **Circuit breakers** for individual stocks and market-wide halts
- **Cyberpunk UI** with dark theme, neon accents, and clean trading interface
