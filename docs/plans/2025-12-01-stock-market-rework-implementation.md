# Stock Market Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Mint Exchange into a realistic underground stock market with 35 parody stocks, tradeable indices, AI trading bots, player IPOs with dividends, and cyberpunk UI.

**Architecture:** Phased migration approach - add new tables/services alongside existing, migrate data, then deprecate old. Backend-first (database → services → routes), then frontend.

**Tech Stack:** Prisma ORM + PostgreSQL | Express.js services | React + Tailwind + Zustand frontend

---

## Phase 1: Database Schema Updates

### Task 1.1: Add MarketIndex Table

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add MarketIndex model after StockOrder model**

```prisma
// Market indices (MINT35 master + sector ETFs)
model MarketIndex {
  id              String    @id @default(cuid())
  tickerSymbol    String    @unique @map("ticker_symbol") // MINT35, MTEK, MFIN, etc.
  name            String    // "Mint 35 Index", "MintTech ETF", etc.
  indexType       String    @map("index_type") // 'master' or 'sector'
  sector          String?   // null for master, sector name for ETFs
  currentValue    Decimal   @db.Decimal(18, 2) @map("current_value")
  previousClose   Decimal   @db.Decimal(18, 2) @map("previous_close")
  highValue24h    Decimal   @db.Decimal(18, 2) @map("high_value_24h")
  lowValue24h     Decimal   @db.Decimal(18, 2) @map("low_value_24h")
  change          Decimal   @db.Decimal(18, 2) @default(0)
  changePercent   Decimal   @db.Decimal(8, 4) @default(0) @map("change_percent")
  totalShares     Int       @default(10000000) @map("total_shares") // ETF shares available
  floatShares     Int       @default(10000000) @map("float_shares")
  volume24h       Int       @default(0) @map("volume_24h")
  lastTickAt      DateTime  @default(now()) @map("last_tick_at")
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  components      IndexComponent[]
  holdings        ETFHolding[]

  @@index([indexType])
  @@index([isActive])
  @@map("market_indices")
}
```

**Step 2: Run schema generation**

Run: `cd /Users/n809m/Desktop/The-Mint-Game && pnpm db:generate`
Expected: Prisma client regenerated successfully

**Step 3: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add MarketIndex model for indices and ETFs"
```

---

### Task 1.2: Add IndexComponent Table

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add IndexComponent model**

```prisma
// Maps stocks to indices with weights
model IndexComponent {
  id              String    @id @default(cuid())
  indexId         String    @map("index_id")
  botStockId      String    @map("bot_stock_id")
  weight          Decimal   @db.Decimal(8, 6) // 0.000000 to 1.000000
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  index           MarketIndex @relation(fields: [indexId], references: [id], onDelete: Cascade)
  botStock        BotStock    @relation(fields: [botStockId], references: [id], onDelete: Cascade)

  @@unique([indexId, botStockId])
  @@index([indexId])
  @@index([botStockId])
  @@map("index_components")
}
```

**Step 2: Add relation to BotStock model**

In the BotStock model, add:
```prisma
  indexComponents IndexComponent[]
```

**Step 3: Run schema generation**

Run: `pnpm db:generate`

**Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add IndexComponent model for index composition"
```

---

### Task 1.3: Add ETFHolding Table

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add ETFHolding model**

```prisma
// Player holdings of ETFs
model ETFHolding {
  id              String    @id @default(cuid())
  userId          String    @map("user_id")
  indexId         String    @map("index_id")
  shares          Int       @default(0)
  avgBuyPrice     Decimal   @db.Decimal(18, 2) @map("avg_buy_price")
  totalInvested   Decimal   @db.Decimal(20, 2) @map("total_invested")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  index           MarketIndex @relation(fields: [indexId], references: [id], onDelete: Cascade)

  @@unique([userId, indexId])
  @@index([userId])
  @@index([indexId])
  @@map("etf_holdings")
}
```

**Step 2: Add relation to User model**

In the User model, add:
```prisma
  etfHoldings     ETFHolding[]
```

**Step 3: Run schema generation and push**

Run: `pnpm db:generate && pnpm db:push`

**Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add ETFHolding model for player ETF positions"
```

---

### Task 1.4: Add DividendPayout Table

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add DividendPayout model**

```prisma
// Daily dividend payout records
model DividendPayout {
  id              String    @id @default(cuid())
  userId          String    @map("user_id")
  payoutType      String    @map("payout_type") // 'owner' or 'shareholder'
  stockType       String    @map("stock_type") // 'player', 'bot', or 'etf'
  playerStockId   String?   @map("player_stock_id")
  botStockId      String?   @map("bot_stock_id")
  indexId         String?   @map("index_id")
  shares          Int
  priceAtPayout   Decimal   @db.Decimal(18, 2) @map("price_at_payout")
  dividendRate    Decimal   @db.Decimal(8, 6) @map("dividend_rate") // daily yield
  amount          Decimal   @db.Decimal(20, 2) // payout amount
  payoutDate      DateTime  @map("payout_date")
  createdAt       DateTime  @default(now()) @map("created_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, payoutDate])
  @@index([payoutDate])
  @@index([payoutType])
  @@map("dividend_payouts")
}
```

**Step 2: Add relation to User model**

In the User model, add:
```prisma
  dividendPayouts DividendPayout[]
```

**Step 3: Run schema generation**

Run: `pnpm db:generate`

**Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add DividendPayout model for dividend tracking"
```

---

### Task 1.5: Add MarketEvent Table

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add MarketEvent model**

```prisma
// Market events (news, halts, triggers)
model MarketEvent {
  id              String    @id @default(cuid())
  eventType       String    @map("event_type") // 'news', 'halt', 'circuit_breaker', 'player_action'
  severity        String    @default("info") // 'info', 'warning', 'critical'
  title           String
  description     String?
  affectedTickers String[]  @map("affected_tickers") // Array of ticker symbols
  priceImpact     Decimal?  @db.Decimal(8, 4) @map("price_impact") // percentage impact
  duration        Int?      // duration in seconds (for halts)
  expiresAt       DateTime? @map("expires_at")
  triggeredBy     String?   @map("triggered_by") // userId or 'system'
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@index([eventType, isActive])
  @@index([isActive, expiresAt])
  @@index([createdAt])
  @@map("market_events")
}
```

**Step 2: Run schema generation**

Run: `pnpm db:generate`

**Step 3: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add MarketEvent model for news and halts"
```

---

### Task 1.6: Add TradingBot Table

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add TradingBot model**

```prisma
// Bot trader configurations
model TradingBot {
  id                  String    @id @default(cuid())
  name                String
  botType             String    @map("bot_type") // 'market_maker', 'whale', 'news_reactive', 'sentiment'
  strategy            String    // trading strategy
  personality         String    @default("moderate") // 'aggressive', 'moderate', 'conservative'
  cash                Decimal   @db.Decimal(20, 2)
  initialCash         Decimal   @db.Decimal(20, 2) @map("initial_cash")
  riskTolerance       Decimal   @db.Decimal(4, 2) @map("risk_tolerance") // 0.00 to 1.00
  tradeIntervalMs     Int       @map("trade_interval_ms")
  positionSizeMultiplier Decimal @db.Decimal(4, 2) @map("position_size_multiplier")
  sectorFocus         String[]  @map("sector_focus") // empty = all sectors
  isActive            Boolean   @default(true) @map("is_active")
  lastTradeAt         DateTime? @map("last_trade_at")
  tradesExecuted      Int       @default(0) @map("trades_executed")
  profitLoss          Decimal   @db.Decimal(20, 2) @default(0) @map("profit_loss")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  positions           BotPosition[]

  @@index([botType])
  @@index([isActive])
  @@map("trading_bots")
}
```

**Step 2: Run schema generation**

Run: `pnpm db:generate`

**Step 3: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add TradingBot model for bot configurations"
```

---

### Task 1.7: Add BotPosition Table

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add BotPosition model**

```prisma
// Bot holdings of stocks
model BotPosition {
  id              String    @id @default(cuid())
  botId           String    @map("bot_id")
  botStockId      String    @map("bot_stock_id")
  shares          Int       @default(0)
  avgBuyPrice     Decimal   @db.Decimal(18, 2) @map("avg_buy_price")
  totalInvested   Decimal   @db.Decimal(20, 2) @map("total_invested")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  bot             TradingBot @relation(fields: [botId], references: [id], onDelete: Cascade)
  botStock        BotStock   @relation(fields: [botStockId], references: [id], onDelete: Cascade)

  @@unique([botId, botStockId])
  @@index([botId])
  @@index([botStockId])
  @@map("bot_positions")
}
```

**Step 2: Add relation to BotStock model**

In the BotStock model, add:
```prisma
  botPositions    BotPosition[]
```

**Step 3: Run schema generation**

Run: `pnpm db:generate`

**Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add BotPosition model for bot holdings"
```

---

### Task 1.8: Modify PlayerStock for IPO Requirements

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add new fields to PlayerStock model**

Add these fields to the existing PlayerStock model:

```prisma
  listingStatus   String    @default("active") @map("listing_status") // 'active', 'warning', 'delisted'
  warningWeek     Int       @default(0) @map("warning_week") // consecutive warning weeks
  lastOwnerLogin  DateTime? @map("last_owner_login")
  weeklyVolume    Int       @default(0) @map("weekly_volume")
  weeklyTraders   Int       @default(0) @map("weekly_traders")
  ipoFee          Decimal   @db.Decimal(20, 2) @default(50000) @map("ipo_fee")
  floatPercentage Decimal   @db.Decimal(5, 2) @default(50) @map("float_percentage") // 20-60%
```

**Step 2: Run schema generation**

Run: `pnpm db:generate`

**Step 3: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add IPO requirement fields to PlayerStock"
```

---

### Task 1.9: Modify StockOrder for Tracking

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add new fields to StockOrder model**

Add these fields to the existing StockOrder model:

```prisma
  priceImpact     Decimal?  @db.Decimal(8, 4) @map("price_impact") // % impact on price
  triggeredHalt   Boolean   @default(false) @map("triggered_halt")
  indexId         String?   @map("index_id") // for ETF trades
```

**Step 2: Run schema generation**

Run: `pnpm db:generate`

**Step 3: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add tracking fields to StockOrder"
```

---

### Task 1.10: Modify PlayerStats for Dividends

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

**Step 1: Add dividend fields to PlayerStats model**

Add these fields to the existing PlayerStats model:

```prisma
  dividendEarningsTotal  Decimal   @db.Decimal(24, 2) @default(0) @map("dividend_earnings_total")
  dividendEarningsToday  Decimal   @db.Decimal(20, 2) @default(0) @map("dividend_earnings_today")
  lastDividendAt         DateTime? @map("last_dividend_at")
```

**Step 2: Run schema generation and push all changes**

Run: `pnpm db:generate && pnpm db:push`
Expected: All schema changes applied to database

**Step 3: Commit**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat(db): add dividend tracking to PlayerStats"
```

---

## Phase 2: Seed 35 Parody Stocks

### Task 2.1: Create Stock Seed Script

**Files:**
- Create: `packages/database/prisma/seeds/stocks.ts`

**Step 1: Create the seed file**

```typescript
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface StockSeed {
  tickerSymbol: string;
  companyName: string;
  sector: string;
  basePrice: number;
  volatility: number;
  description: string;
}

const PARODY_STOCKS: StockSeed[] = [
  // MintTech (6 stocks)
  { tickerSymbol: 'GOGGL', companyName: 'Goggle Inc', sector: 'tech', basePrice: 2850, volatility: 0.025, description: 'Surveillance tech empire. Tracks everything, sells to everyone.' },
  { tickerSymbol: 'FAKEBOOK', companyName: 'FakeBook', sector: 'tech', basePrice: 485, volatility: 0.03, description: 'Identity theft network disguised as social media.' },
  { tickerSymbol: 'DRKWEB', companyName: 'DarkWeave', sector: 'tech', basePrice: 195, volatility: 0.035, description: 'Dark web hosting. Untraceable servers for the discerning criminal.' },
  { tickerSymbol: 'CRYPT0', companyName: 'CryptØ', sector: 'tech', basePrice: 312, volatility: 0.045, description: 'Untraceable crypto exchange. Not your keys, not your problem.' },
  { tickerSymbol: 'HACKR', companyName: 'HackrBox', sector: 'tech', basePrice: 78, volatility: 0.04, description: 'Stolen data storage. Premium leaked files service.' },
  { tickerSymbol: 'BURNER', companyName: 'BurnerTech', sector: 'tech', basePrice: 156, volatility: 0.028, description: 'Disposable phones and encrypted comms for the paranoid.' },

  // MintFinance (6 stocks)
  { tickerSymbol: 'WASHD', companyName: 'WashCo Holdings', sector: 'finance', basePrice: 425, volatility: 0.02, description: 'Money laundering specialists. We clean your dirty money.' },
  { tickerSymbol: 'OFFSH', companyName: 'OffShore Capital', sector: 'finance', basePrice: 890, volatility: 0.018, description: 'Hidden accounts and tax evasion. Swiss quality, Cayman prices.' },
  { tickerSymbol: 'PAYDAY', companyName: 'PayDay Loans', sector: 'finance', basePrice: 45, volatility: 0.05, description: 'Loan sharks with a corporate facade. 400% APR is just the start.' },
  { tickerSymbol: 'SHADDW', companyName: 'Shadow Bank', sector: 'finance', basePrice: 567, volatility: 0.022, description: 'Underground banking network. No questions asked.' },
  { tickerSymbol: 'GOLDVLT', companyName: 'GoldVault Inc', sector: 'finance', basePrice: 234, volatility: 0.015, description: 'Secure storage for "assets" of questionable origin.' },
  { tickerSymbol: 'CASINO', companyName: 'Lucky Mint Casino', sector: 'finance', basePrice: 178, volatility: 0.038, description: 'Gambling and money cleaning. The house always launders.' },

  // MintEnergy (5 stocks)
  { tickerSymbol: 'SIPHON', companyName: 'Siphon Energy', sector: 'energy', basePrice: 89, volatility: 0.032, description: 'Stolen fuel and pipeline taps. Gas prices are a suggestion.' },
  { tickerSymbol: 'GRIDX', companyName: 'GridJack Corp', sector: 'energy', basePrice: 145, volatility: 0.04, description: 'Power grid exploits. We turn off your competitors.' },
  { tickerSymbol: 'BLACKOUT', companyName: 'BlackOut Systems', sector: 'energy', basePrice: 267, volatility: 0.028, description: 'Controls power for heists. Darkness on demand.' },
  { tickerSymbol: 'JUNKYARD', companyName: 'JunkYard Motors', sector: 'energy', basePrice: 34, volatility: 0.055, description: 'Chop shops and stolen parts. VIN? What VIN?' },
  { tickerSymbol: 'BTTRY', companyName: 'Hot Battery Inc', sector: 'energy', basePrice: 112, volatility: 0.042, description: 'Stolen EV batteries. Green crime for a green future.' },

  // MintConsumer (6 stocks)
  { tickerSymbol: 'AMAZONE', companyName: 'Amazone Prime', sector: 'consumer', basePrice: 3420, volatility: 0.022, description: 'Contraband delivery network. Same day shipping, no questions.' },
  { tickerSymbol: 'LUXFAKE', companyName: 'LuxFake Inc', sector: 'consumer', basePrice: 567, volatility: 0.025, description: 'Counterfeit luxury goods. Real fake quality.' },
  { tickerSymbol: 'SILKRD', companyName: 'SilkRoad Retail', sector: 'consumer', basePrice: 234, volatility: 0.048, description: 'Dark web marketplace. Everything ships from an undisclosed location.' },
  { tickerSymbol: 'PAWNIT', companyName: 'PawnIt Chain', sector: 'consumer', basePrice: 28, volatility: 0.035, description: 'Fencing stolen goods since 1987. No receipt needed.' },
  { tickerSymbol: 'BOOZE', companyName: 'BootLeg Spirits', sector: 'consumer', basePrice: 78, volatility: 0.03, description: 'Untaxed alcohol with creative labels.' },
  { tickerSymbol: 'SMOKEZ', companyName: 'SmokeScreen Co', sector: 'consumer', basePrice: 56, volatility: 0.028, description: 'Contraband tobacco. Warning labels are optional.' },

  // MintHealth (6 stocks)
  { tickerSymbol: 'PHARMA', companyName: 'PharmaBro Inc', sector: 'health', basePrice: 445, volatility: 0.035, description: 'Black market medications. Same pills, different price.' },
  { tickerSymbol: 'ENHANCE', companyName: 'EnhanceCorp', sector: 'health', basePrice: 123, volatility: 0.045, description: 'Performance drugs and steroids. Gains guaranteed.' },
  { tickerSymbol: 'DOCOFF', companyName: 'Doc-Off-Books', sector: 'health', basePrice: 89, volatility: 0.032, description: 'Unlicensed clinics. Cash only, no records.' },
  { tickerSymbol: 'PAINAWAY', companyName: 'PainAway Labs', sector: 'health', basePrice: 234, volatility: 0.038, description: '"Pain management" specialists with flexible prescriptions.' },
  { tickerSymbol: 'ORGANX', companyName: 'OrganX Trade', sector: 'health', basePrice: 890, volatility: 0.05, description: 'Black market organs. Fresh, imported, and discreet.' },
  { tickerSymbol: 'LABRAT', companyName: 'LabRat Testing', sector: 'health', basePrice: 45, volatility: 0.06, description: 'Fake medical tests. Need clean results? We got you.' },

  // MintIndustrial (6 stocks)
  { tickerSymbol: 'HEISTCO', companyName: 'HeistCo Supply', sector: 'industrial', basePrice: 178, volatility: 0.028, description: 'Heist equipment supplier. Professional grade tools for professionals.' },
  { tickerSymbol: 'GETAWAY', companyName: 'GetAway Motors', sector: 'industrial', basePrice: 345, volatility: 0.032, description: 'Custom getaway vehicles. Fast, armored, untraceable.' },
  { tickerSymbol: 'ARMORX', companyName: 'ArmorX Defense', sector: 'industrial', basePrice: 567, volatility: 0.025, description: 'Illegal weapons and armor. Second amendment plus.' },
  { tickerSymbol: 'SAFECRK', companyName: 'SafeCrack Inc', sector: 'industrial', basePrice: 89, volatility: 0.04, description: 'Lock picks and safe cracking tools. Every lock has a key.' },
  { tickerSymbol: 'VANISH', companyName: 'Vanish Logistics', sector: 'industrial', basePrice: 234, volatility: 0.03, description: 'Evidence disposal. We make problems disappear.' },
  { tickerSymbol: 'PRINTS', companyName: 'NoPrints Tech', sector: 'industrial', basePrice: 156, volatility: 0.035, description: 'Anti-forensics and clean crews. Leave no trace.' },
];

export async function seedStocks(): Promise<void> {
  console.log('🏦 Seeding 35 parody stocks...');

  for (const stock of PARODY_STOCKS) {
    const existing = await prisma.botStock.findUnique({
      where: { tickerSymbol: stock.tickerSymbol },
    });

    if (existing) {
      console.log(`  ⏭️  ${stock.tickerSymbol} already exists, skipping`);
      continue;
    }

    await prisma.botStock.create({
      data: {
        tickerSymbol: stock.tickerSymbol,
        companyName: stock.companyName,
        sector: stock.sector,
        currentPrice: new Prisma.Decimal(stock.basePrice),
        previousClose: new Prisma.Decimal(stock.basePrice),
        highPrice24h: new Prisma.Decimal(stock.basePrice * 1.02),
        lowPrice24h: new Prisma.Decimal(stock.basePrice * 0.98),
        basePrice: new Prisma.Decimal(stock.basePrice),
        volatility: new Prisma.Decimal(stock.volatility),
        description: stock.description,
        trend: 'neutral',
        trendStrength: 1,
        isActive: true,
        sortOrder: PARODY_STOCKS.indexOf(stock),
      },
    });

    console.log(`  ✅ Created ${stock.tickerSymbol} - ${stock.companyName}`);
  }

  console.log('🏦 Stock seeding complete!');
}

// Run if called directly
if (require.main === module) {
  seedStocks()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
```

**Step 2: Run the seed**

Run: `cd /Users/n809m/Desktop/The-Mint-Game/packages/database && npx ts-node prisma/seeds/stocks.ts`

**Step 3: Commit**

```bash
git add packages/database/prisma/seeds/stocks.ts
git commit -m "feat(db): add 35 parody stock seed data"
```

---

### Task 2.2: Create Index Seed Script

**Files:**
- Create: `packages/database/prisma/seeds/indices.ts`

**Step 1: Create the indices seed file**

```typescript
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const SECTOR_MAP: Record<string, string> = {
  tech: 'MTEK',
  finance: 'MFIN',
  energy: 'MNRG',
  consumer: 'MCON',
  health: 'MHLT',
  industrial: 'MIND',
};

const SECTOR_NAMES: Record<string, string> = {
  MTEK: 'MintTech ETF',
  MFIN: 'MintFinance ETF',
  MNRG: 'MintEnergy ETF',
  MCON: 'MintConsumer ETF',
  MHLT: 'MintHealth ETF',
  MIND: 'MintIndustrial ETF',
};

export async function seedIndices(): Promise<void> {
  console.log('📊 Seeding market indices...');

  // Get all stocks for calculations
  const stocks = await prisma.botStock.findMany({
    where: { isActive: true },
  });

  if (stocks.length === 0) {
    console.log('  ⚠️  No stocks found. Run stock seed first.');
    return;
  }

  // Calculate total market cap
  const totalMarketCap = stocks.reduce(
    (sum, s) => sum + Number(s.currentPrice) * 1000000,
    0
  );

  // Create MINT35 master index
  const masterExists = await prisma.marketIndex.findUnique({
    where: { tickerSymbol: 'MINT35' },
  });

  if (!masterExists) {
    const avgPrice = totalMarketCap / stocks.length / 1000000;
    const masterIndex = await prisma.marketIndex.create({
      data: {
        tickerSymbol: 'MINT35',
        name: 'Mint 35 Index',
        indexType: 'master',
        currentValue: new Prisma.Decimal(avgPrice * 100), // Index starts at ~100x avg
        previousClose: new Prisma.Decimal(avgPrice * 100),
        highValue24h: new Prisma.Decimal(avgPrice * 102),
        lowValue24h: new Prisma.Decimal(avgPrice * 98),
        isActive: true,
      },
    });

    // Add all stocks as components with hybrid weighting
    for (const stock of stocks) {
      const marketCap = Number(stock.currentPrice) * 1000000;
      const capWeight = marketCap / totalMarketCap * 0.7;
      const volumeWeight = 1 / stocks.length * 0.3;
      const weight = capWeight + volumeWeight;

      await prisma.indexComponent.create({
        data: {
          indexId: masterIndex.id,
          botStockId: stock.id,
          weight: new Prisma.Decimal(weight),
        },
      });
    }

    console.log('  ✅ Created MINT35 master index');
  }

  // Create sector ETFs
  for (const [sector, ticker] of Object.entries(SECTOR_MAP)) {
    const etfExists = await prisma.marketIndex.findUnique({
      where: { tickerSymbol: ticker },
    });

    if (etfExists) {
      console.log(`  ⏭️  ${ticker} already exists, skipping`);
      continue;
    }

    const sectorStocks = stocks.filter((s) => s.sector === sector);
    if (sectorStocks.length === 0) continue;

    const sectorMarketCap = sectorStocks.reduce(
      (sum, s) => sum + Number(s.currentPrice) * 1000000,
      0
    );
    const avgPrice = sectorMarketCap / sectorStocks.length / 1000000;

    const etf = await prisma.marketIndex.create({
      data: {
        tickerSymbol: ticker,
        name: SECTOR_NAMES[ticker] || `${sector} ETF`,
        indexType: 'sector',
        sector,
        currentValue: new Prisma.Decimal(avgPrice * 10),
        previousClose: new Prisma.Decimal(avgPrice * 10),
        highValue24h: new Prisma.Decimal(avgPrice * 10.2),
        lowValue24h: new Prisma.Decimal(avgPrice * 9.8),
        isActive: true,
      },
    });

    // Add sector stocks as components with equal weight
    for (const stock of sectorStocks) {
      await prisma.indexComponent.create({
        data: {
          indexId: etf.id,
          botStockId: stock.id,
          weight: new Prisma.Decimal(1 / sectorStocks.length),
        },
      });
    }

    console.log(`  ✅ Created ${ticker} sector ETF`);
  }

  console.log('📊 Index seeding complete!');
}

if (require.main === module) {
  seedIndices()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
```

**Step 2: Run the seed**

Run: `npx ts-node prisma/seeds/indices.ts`

**Step 3: Commit**

```bash
git add packages/database/prisma/seeds/indices.ts
git commit -m "feat(db): add market index seed data (MINT35 + sector ETFs)"
```

---

## Phase 3: Backend Services

### Task 3.1: Create IndexService

**Files:**
- Create: `services/api-gateway/src/services/index.service.ts`

**Step 1: Create the service**

```typescript
import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

interface IndexData {
  tickerSymbol: string;
  name: string;
  indexType: 'master' | 'sector';
  sector?: string;
  currentValue: string;
  previousClose: string;
  change: string;
  changePercent: number;
  highValue24h: string;
  lowValue24h: string;
  volume24h: number;
  components?: { ticker: string; weight: number; price: string }[];
}

export class IndexService {
  private static UPDATE_INTERVAL_MS = 60 * 1000; // 1 minute

  /**
   * Get all market indices
   */
  async getAllIndices(): Promise<IndexData[]> {
    const indices = await prisma.marketIndex.findMany({
      where: { isActive: true },
      orderBy: [{ indexType: 'asc' }, { tickerSymbol: 'asc' }],
    });

    return indices.map((idx) => ({
      tickerSymbol: idx.tickerSymbol,
      name: idx.name,
      indexType: idx.indexType as 'master' | 'sector',
      sector: idx.sector || undefined,
      currentValue: idx.currentValue.toString(),
      previousClose: idx.previousClose.toString(),
      change: idx.change.toString(),
      changePercent: Number(idx.changePercent),
      highValue24h: idx.highValue24h.toString(),
      lowValue24h: idx.lowValue24h.toString(),
      volume24h: idx.volume24h,
    }));
  }

  /**
   * Get single index with components
   */
  async getIndexByTicker(ticker: string): Promise<IndexData | null> {
    const idx = await prisma.marketIndex.findUnique({
      where: { tickerSymbol: ticker },
      include: {
        components: {
          include: { botStock: true },
        },
      },
    });

    if (!idx) return null;

    return {
      tickerSymbol: idx.tickerSymbol,
      name: idx.name,
      indexType: idx.indexType as 'master' | 'sector',
      sector: idx.sector || undefined,
      currentValue: idx.currentValue.toString(),
      previousClose: idx.previousClose.toString(),
      change: idx.change.toString(),
      changePercent: Number(idx.changePercent),
      highValue24h: idx.highValue24h.toString(),
      lowValue24h: idx.lowValue24h.toString(),
      volume24h: idx.volume24h,
      components: idx.components.map((c) => ({
        ticker: c.botStock.tickerSymbol,
        weight: Number(c.weight),
        price: c.botStock.currentPrice.toString(),
      })),
    };
  }

  /**
   * Recalculate all index values based on component stocks
   */
  async recalculateIndices(): Promise<void> {
    const indices = await prisma.marketIndex.findMany({
      where: { isActive: true },
      include: {
        components: {
          include: { botStock: true },
        },
      },
    });

    for (const idx of indices) {
      if (idx.components.length === 0) continue;

      // Calculate weighted value
      let newValue = 0;
      for (const comp of idx.components) {
        newValue += Number(comp.botStock.currentPrice) * Number(comp.weight);
      }

      // Scale factor (indices are scaled for readability)
      const scaleFactor = idx.indexType === 'master' ? 100 : 10;
      newValue *= scaleFactor;

      const change = newValue - Number(idx.previousClose);
      const changePercent =
        Number(idx.previousClose) > 0
          ? (change / Number(idx.previousClose)) * 100
          : 0;

      await prisma.marketIndex.update({
        where: { id: idx.id },
        data: {
          currentValue: new Decimal(newValue),
          change: new Decimal(change),
          changePercent: new Decimal(changePercent),
          highValue24h:
            newValue > Number(idx.highValue24h)
              ? new Decimal(newValue)
              : idx.highValue24h,
          lowValue24h:
            newValue < Number(idx.lowValue24h)
              ? new Decimal(newValue)
              : idx.lowValue24h,
          lastTickAt: new Date(),
        },
      });
    }
  }

  /**
   * Reset daily values at midnight
   */
  async resetDailyValues(): Promise<void> {
    const indices = await prisma.marketIndex.findMany({
      where: { isActive: true },
    });

    for (const idx of indices) {
      await prisma.marketIndex.update({
        where: { id: idx.id },
        data: {
          previousClose: idx.currentValue,
          highValue24h: idx.currentValue,
          lowValue24h: idx.currentValue,
          change: new Decimal(0),
          changePercent: new Decimal(0),
          volume24h: 0,
        },
      });
    }
  }
}

export const indexService = new IndexService();
```

**Step 2: Commit**

```bash
git add services/api-gateway/src/services/index.service.ts
git commit -m "feat(api): add IndexService for market indices"
```

---

### Task 3.2: Create DividendService

**Files:**
- Create: `services/api-gateway/src/services/dividend.service.ts`

**Step 1: Create the service**

```typescript
import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

interface DividendSummary {
  today: string;
  thisWeek: string;
  allTime: string;
  lastPayoutAt: string | null;
}

interface DividendRecord {
  id: string;
  payoutType: string;
  stockType: string;
  ticker: string;
  shares: number;
  amount: string;
  dividendRate: string;
  payoutDate: string;
}

export class DividendService {
  private static MIN_PAYOUT = 1; // Minimum $1 payout
  private static OWNER_DIVIDEND_RATE = 0.05; // 5% of performance
  private static SHAREHOLDER_BASE_YIELD = 0.0001; // 0.01% base daily yield
  private static SHAREHOLDER_MAX_YIELD = 0.005; // 0.5% max daily yield

  /**
   * Calculate and distribute daily dividends for all players
   * Should run at midnight UTC
   */
  async processDailyDividends(): Promise<{ processed: number; totalPaid: string }> {
    console.log('💰 Processing daily dividends...');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    let totalProcessed = 0;
    let totalPaid = new Decimal(0);

    // 1. Process owner dividends (from their gameplay performance)
    const playerStocks = await prisma.playerStock.findMany({
      where: { isListed: true, listingStatus: 'active' },
      include: { user: { include: { playerStats: true } } },
    });

    for (const stock of playerStocks) {
      const stats = stock.user.playerStats;
      if (!stats) continue;

      // Calculate owner dividend based on their performance
      // Using net worth as proxy for "daily income" since we don't track daily separately
      const netWorth = Number(stats.netWorth);
      const ownerDividend = netWorth * DividendService.OWNER_DIVIDEND_RATE * 0.001; // Scale down

      if (ownerDividend >= DividendService.MIN_PAYOUT) {
        await prisma.$transaction([
          prisma.dividendPayout.create({
            data: {
              userId: stock.userId,
              payoutType: 'owner',
              stockType: 'player',
              playerStockId: stock.id,
              shares: stock.ownerShares,
              priceAtPayout: stock.currentPrice,
              dividendRate: new Decimal(DividendService.OWNER_DIVIDEND_RATE),
              amount: new Decimal(ownerDividend),
              payoutDate: now,
            },
          }),
          prisma.playerStats.update({
            where: { userId: stock.userId },
            data: {
              cash: { increment: ownerDividend },
              dividendEarningsTotal: { increment: ownerDividend },
              dividendEarningsToday: ownerDividend,
              lastDividendAt: now,
            },
          }),
        ]);

        totalPaid = totalPaid.add(new Decimal(ownerDividend));
        totalProcessed++;
      }
    }

    // 2. Process shareholder dividends (from stock performance)
    const holdings = await prisma.stockHolding.findMany({
      where: { shares: { gt: 0 } },
      include: {
        botStock: true,
        playerStock: true,
        user: { include: { playerStats: true } },
      },
    });

    for (const holding of holdings) {
      const stock = holding.botStock || holding.playerStock;
      if (!stock) continue;

      // Calculate yield based on stock performance
      const currentPrice = Number(stock.currentPrice);
      const previousClose = Number(stock.previousClose);
      const priceChange = previousClose > 0
        ? (currentPrice - previousClose) / previousClose
        : 0;

      // Yield increases with positive performance, volume, etc.
      let dailyYield = DividendService.SHAREHOLDER_BASE_YIELD;
      dailyYield += Math.max(0, priceChange * 0.1); // Bonus for positive movement
      dailyYield = Math.min(dailyYield, DividendService.SHAREHOLDER_MAX_YIELD);

      const dividendAmount = holding.shares * currentPrice * dailyYield;

      if (dividendAmount >= DividendService.MIN_PAYOUT) {
        await prisma.$transaction([
          prisma.dividendPayout.create({
            data: {
              userId: holding.userId,
              payoutType: 'shareholder',
              stockType: holding.stockType,
              playerStockId: holding.playerStockId,
              botStockId: holding.botStockId,
              shares: holding.shares,
              priceAtPayout: new Decimal(currentPrice),
              dividendRate: new Decimal(dailyYield),
              amount: new Decimal(dividendAmount),
              payoutDate: now,
            },
          }),
          prisma.playerStats.update({
            where: { userId: holding.userId },
            data: {
              cash: { increment: dividendAmount },
              dividendEarningsTotal: { increment: dividendAmount },
              dividendEarningsToday: dividendAmount,
              lastDividendAt: now,
            },
          }),
        ]);

        totalPaid = totalPaid.add(new Decimal(dividendAmount));
        totalProcessed++;
      }
    }

    console.log(`💰 Dividends processed: ${totalProcessed} payouts, $${totalPaid.toFixed(2)} total`);

    return {
      processed: totalProcessed,
      totalPaid: totalPaid.toFixed(2),
    };
  }

  /**
   * Get dividend summary for a player
   */
  async getPlayerDividendSummary(userId: string): Promise<DividendSummary> {
    const stats = await prisma.playerStats.findUnique({
      where: { userId },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekPayouts = await prisma.dividendPayout.aggregate({
      where: {
        userId,
        payoutDate: { gte: weekAgo },
      },
      _sum: { amount: true },
    });

    return {
      today: stats?.dividendEarningsToday?.toString() || '0',
      thisWeek: weekPayouts._sum.amount?.toString() || '0',
      allTime: stats?.dividendEarningsTotal?.toString() || '0',
      lastPayoutAt: stats?.lastDividendAt?.toISOString() || null,
    };
  }

  /**
   * Get dividend history for a player
   */
  async getPlayerDividendHistory(
    userId: string,
    limit = 50
  ): Promise<DividendRecord[]> {
    const payouts = await prisma.dividendPayout.findMany({
      where: { userId },
      orderBy: { payoutDate: 'desc' },
      take: limit,
      include: {
        playerStock: true,
        botStock: true,
      },
    });

    return payouts.map((p) => ({
      id: p.id,
      payoutType: p.payoutType,
      stockType: p.stockType,
      ticker:
        p.playerStock?.tickerSymbol ||
        p.botStock?.tickerSymbol ||
        'Unknown',
      shares: p.shares,
      amount: p.amount.toString(),
      dividendRate: p.dividendRate.toString(),
      payoutDate: p.payoutDate.toISOString(),
    }));
  }
}

export const dividendService = new DividendService();
```

**Step 2: Commit**

```bash
git add services/api-gateway/src/services/dividend.service.ts
git commit -m "feat(api): add DividendService for daily dividend payouts"
```

---

### Task 3.3: Create CircuitBreakerService

**Files:**
- Create: `services/api-gateway/src/services/circuitBreaker.service.ts`

**Step 1: Create the service**

```typescript
import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

interface HaltedStock {
  ticker: string;
  reason: string;
  haltedAt: string;
  resumesAt: string;
  priceChange: number;
}

interface CircuitBreakerStatus {
  marketHalted: boolean;
  haltReason?: string;
  resumesAt?: string;
  haltedStocks: HaltedStock[];
  mint35Change: number;
}

export class CircuitBreakerService {
  // Individual stock thresholds
  private static HALT_10_PERCENT = { threshold: 0.10, duration: 5 * 60 * 1000 }; // 5 min
  private static HALT_15_PERCENT = { threshold: 0.15, duration: 15 * 60 * 1000 }; // 15 min
  private static HALT_25_PERCENT = { threshold: 0.25, duration: 60 * 60 * 1000 }; // 1 hour

  // Market-wide thresholds (MINT35)
  private static MARKET_HALT_10 = { threshold: 0.10, duration: 15 * 60 * 1000 };
  private static MARKET_HALT_20 = { threshold: 0.20, duration: 60 * 60 * 1000 };
  private static MARKET_HALT_30 = { threshold: 0.30, duration: 24 * 60 * 60 * 1000 }; // Close for day

  private haltedStocks: Map<string, { resumesAt: Date; reason: string }> = new Map();
  private marketHaltedUntil: Date | null = null;
  private marketHaltReason: string | null = null;

  /**
   * Check if a stock is currently halted
   */
  isStockHalted(ticker: string): boolean {
    const halt = this.haltedStocks.get(ticker);
    if (!halt) return false;

    if (new Date() > halt.resumesAt) {
      this.haltedStocks.delete(ticker);
      return false;
    }

    return true;
  }

  /**
   * Check if market is halted
   */
  isMarketHalted(): boolean {
    if (!this.marketHaltedUntil) return false;

    if (new Date() > this.marketHaltedUntil) {
      this.marketHaltedUntil = null;
      this.marketHaltReason = null;
      return false;
    }

    return true;
  }

  /**
   * Check price movement and trigger halts if needed
   * Returns true if trading should be halted
   */
  async checkPriceMovement(
    ticker: string,
    currentPrice: number,
    previousClose: number,
    timeframeMinutes: number
  ): Promise<{ halted: boolean; reason?: string }> {
    if (previousClose <= 0) return { halted: false };

    const changePercent = Math.abs((currentPrice - previousClose) / previousClose);

    // Check against thresholds based on timeframe
    let haltDuration: number | null = null;
    let threshold: number | null = null;

    if (timeframeMinutes <= 30 && changePercent >= CircuitBreakerService.HALT_10_PERCENT.threshold) {
      haltDuration = CircuitBreakerService.HALT_10_PERCENT.duration;
      threshold = 10;
    } else if (timeframeMinutes <= 60 && changePercent >= CircuitBreakerService.HALT_15_PERCENT.threshold) {
      haltDuration = CircuitBreakerService.HALT_15_PERCENT.duration;
      threshold = 15;
    } else if (changePercent >= CircuitBreakerService.HALT_25_PERCENT.threshold) {
      haltDuration = CircuitBreakerService.HALT_25_PERCENT.duration;
      threshold = 25;
    }

    if (haltDuration && threshold) {
      const resumesAt = new Date(Date.now() + haltDuration);
      const direction = currentPrice > previousClose ? 'up' : 'down';
      const reason = `${ticker} moved ${direction} ${(changePercent * 100).toFixed(1)}% - ${threshold}% circuit breaker triggered`;

      this.haltedStocks.set(ticker, { resumesAt, reason });

      // Log market event
      await prisma.marketEvent.create({
        data: {
          eventType: 'circuit_breaker',
          severity: threshold >= 25 ? 'critical' : threshold >= 15 ? 'warning' : 'info',
          title: `${ticker} Trading Halted`,
          description: reason,
          affectedTickers: [ticker],
          priceImpact: new Decimal(changePercent * 100),
          duration: Math.floor(haltDuration / 1000),
          expiresAt: resumesAt,
          isActive: true,
        },
      });

      return { halted: true, reason };
    }

    return { halted: false };
  }

  /**
   * Check MINT35 index for market-wide halts
   */
  async checkMarketWideHalt(): Promise<{ halted: boolean; reason?: string }> {
    const mint35 = await prisma.marketIndex.findUnique({
      where: { tickerSymbol: 'MINT35' },
    });

    if (!mint35) return { halted: false };

    const changePercent = Math.abs(Number(mint35.changePercent) / 100);

    let haltDuration: number | null = null;
    let threshold: number | null = null;

    // Only trigger on drops (not rises)
    if (Number(mint35.change) < 0) {
      if (changePercent >= CircuitBreakerService.MARKET_HALT_30.threshold) {
        haltDuration = CircuitBreakerService.MARKET_HALT_30.duration;
        threshold = 30;
      } else if (changePercent >= CircuitBreakerService.MARKET_HALT_20.threshold) {
        haltDuration = CircuitBreakerService.MARKET_HALT_20.duration;
        threshold = 20;
      } else if (changePercent >= CircuitBreakerService.MARKET_HALT_10.threshold) {
        haltDuration = CircuitBreakerService.MARKET_HALT_10.duration;
        threshold = 10;
      }
    }

    if (haltDuration && threshold) {
      this.marketHaltedUntil = new Date(Date.now() + haltDuration);
      this.marketHaltReason = `MINT35 dropped ${(changePercent * 100).toFixed(1)}% - Level ${threshold} circuit breaker`;

      await prisma.marketEvent.create({
        data: {
          eventType: 'halt',
          severity: 'critical',
          title: 'Market-Wide Trading Halt',
          description: this.marketHaltReason,
          affectedTickers: ['MINT35'],
          priceImpact: new Decimal(changePercent * 100),
          duration: Math.floor(haltDuration / 1000),
          expiresAt: this.marketHaltedUntil,
          isActive: true,
        },
      });

      return { halted: true, reason: this.marketHaltReason };
    }

    return { halted: false };
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): CircuitBreakerStatus {
    const now = new Date();

    // Clean up expired halts
    for (const [ticker, halt] of this.haltedStocks.entries()) {
      if (now > halt.resumesAt) {
        this.haltedStocks.delete(ticker);
      }
    }

    const haltedStocks: HaltedStock[] = [];
    for (const [ticker, halt] of this.haltedStocks.entries()) {
      haltedStocks.push({
        ticker,
        reason: halt.reason,
        haltedAt: new Date(halt.resumesAt.getTime() - 5 * 60 * 1000).toISOString(),
        resumesAt: halt.resumesAt.toISOString(),
        priceChange: 0, // Would need to track this
      });
    }

    return {
      marketHalted: this.isMarketHalted(),
      haltReason: this.marketHaltReason || undefined,
      resumesAt: this.marketHaltedUntil?.toISOString(),
      haltedStocks,
      mint35Change: 0, // Would fetch from index
    };
  }
}

export const circuitBreakerService = new CircuitBreakerService();
```

**Step 2: Commit**

```bash
git add services/api-gateway/src/services/circuitBreaker.service.ts
git commit -m "feat(api): add CircuitBreakerService for trading halts"
```

---

### Task 3.4: Create MarketEventService

**Files:**
- Create: `services/api-gateway/src/services/marketEvent.service.ts`

**Step 1: Create the service**

```typescript
import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

interface MarketEventData {
  id: string;
  eventType: string;
  severity: string;
  title: string;
  description?: string;
  affectedTickers: string[];
  priceImpact?: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

type GameEventType =
  | 'player_heist_success'
  | 'player_heist_fail'
  | 'player_business_opened'
  | 'player_arrested'
  | 'player_level_up'
  | 'player_large_trade';

export class MarketEventService {
  private static EVENT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  // Map game events to affected sectors
  private static EVENT_SECTOR_MAP: Record<GameEventType, string[]> = {
    player_heist_success: ['industrial', 'tech'],
    player_heist_fail: ['industrial'],
    player_business_opened: ['consumer', 'finance'],
    player_arrested: [],
    player_level_up: [],
    player_large_trade: [],
  };

  // Price impact by event type
  private static EVENT_IMPACT: Record<GameEventType, number> = {
    player_heist_success: 0.02, // +2%
    player_heist_fail: -0.01, // -1%
    player_business_opened: 0.015, // +1.5%
    player_arrested: -0.03, // -3%
    player_level_up: 0.01, // +1%
    player_large_trade: 0.005, // +0.5%
  };

  /**
   * Get active market events
   */
  async getActiveEvents(limit = 20): Promise<MarketEventData[]> {
    const events = await prisma.marketEvent.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      severity: e.severity,
      title: e.title,
      description: e.description || undefined,
      affectedTickers: e.affectedTickers,
      priceImpact: e.priceImpact ? Number(e.priceImpact) : undefined,
      expiresAt: e.expiresAt?.toISOString(),
      isActive: e.isActive,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  /**
   * Get recent events (including expired)
   */
  async getRecentEvents(limit = 50): Promise<MarketEventData[]> {
    const events = await prisma.marketEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      severity: e.severity,
      title: e.title,
      description: e.description || undefined,
      affectedTickers: e.affectedTickers,
      priceImpact: e.priceImpact ? Number(e.priceImpact) : undefined,
      expiresAt: e.expiresAt?.toISOString(),
      isActive: e.isActive,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  /**
   * Create a market event from a game action
   */
  async createGameEvent(
    eventType: GameEventType,
    playerId: string,
    playerTicker?: string
  ): Promise<MarketEventData | null> {
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { username: true },
    });

    if (!player) return null;

    const affectedSectors = MarketEventService.EVENT_SECTOR_MAP[eventType];
    const priceImpact = MarketEventService.EVENT_IMPACT[eventType];

    // Get tickers for affected sectors
    const affectedStocks = await prisma.botStock.findMany({
      where: { sector: { in: affectedSectors }, isActive: true },
      select: { tickerSymbol: true },
    });

    const affectedTickers = affectedStocks.map((s) => s.tickerSymbol);

    // Add player's stock if they have one
    if (playerTicker) {
      affectedTickers.push(playerTicker);
    }

    const eventTitles: Record<GameEventType, string> = {
      player_heist_success: `${player.username} pulled off a successful heist!`,
      player_heist_fail: `${player.username}'s heist went wrong`,
      player_business_opened: `${player.username} opened a new business`,
      player_arrested: `${player.username} was arrested`,
      player_level_up: `${player.username} reached a new level`,
      player_large_trade: `${player.username} made a large trade`,
    };

    const event = await prisma.marketEvent.create({
      data: {
        eventType: 'player_action',
        severity: Math.abs(priceImpact) >= 0.02 ? 'warning' : 'info',
        title: eventTitles[eventType],
        description: `Market impact: ${priceImpact >= 0 ? '+' : ''}${(priceImpact * 100).toFixed(1)}%`,
        affectedTickers,
        priceImpact: new Decimal(priceImpact * 100),
        duration: Math.floor(MarketEventService.EVENT_DURATION_MS / 1000),
        expiresAt: new Date(Date.now() + MarketEventService.EVENT_DURATION_MS),
        triggeredBy: playerId,
        isActive: true,
      },
    });

    return {
      id: event.id,
      eventType: event.eventType,
      severity: event.severity,
      title: event.title,
      description: event.description || undefined,
      affectedTickers: event.affectedTickers,
      priceImpact: Number(event.priceImpact),
      expiresAt: event.expiresAt?.toISOString(),
      isActive: event.isActive,
      createdAt: event.createdAt.toISOString(),
    };
  }

  /**
   * Deactivate expired events
   */
  async cleanupExpiredEvents(): Promise<number> {
    const result = await prisma.marketEvent.updateMany({
      where: {
        isActive: true,
        expiresAt: { lt: new Date() },
      },
      data: { isActive: false },
    });

    return result.count;
  }
}

export const marketEventService = new MarketEventService();
```

**Step 2: Commit**

```bash
git add services/api-gateway/src/services/marketEvent.service.ts
git commit -m "feat(api): add MarketEventService for news and game events"
```

---

### Task 3.5: Create DelistingService

**Files:**
- Create: `services/api-gateway/src/services/delisting.service.ts`

**Step 1: Create the service**

```typescript
import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';

interface DelistingCheck {
  stockId: string;
  ticker: string;
  status: 'active' | 'warning' | 'delisted';
  weeklyVolume: number;
  weeklyTraders: number;
  ownerActive: boolean;
  priceAboveMinimum: boolean;
  warningWeek: number;
  action: 'none' | 'warning' | 'delist';
}

export class DelistingService {
  private static MIN_WEEKLY_VOLUME = 1000;
  private static MIN_WEEKLY_TRADERS = 3;
  private static MIN_OWNER_LOGINS = 3; // per week
  private static MIN_PRICE = 0.10;
  private static WARNING_WEEKS_BEFORE_DELIST = 2;
  private static DELIST_COOLDOWN_DAYS = 30;

  /**
   * Run weekly performance checks on all player stocks
   * Should run once per week (e.g., Sunday midnight UTC)
   */
  async runWeeklyCheck(): Promise<DelistingCheck[]> {
    console.log('📋 Running weekly delisting checks...');

    const results: DelistingCheck[] = [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stocks = await prisma.playerStock.findMany({
      where: { isListed: true },
      include: { user: true },
    });

    for (const stock of stocks) {
      // Get weekly trading stats
      const weeklyOrders = await prisma.stockOrder.findMany({
        where: {
          playerStockId: stock.id,
          createdAt: { gte: weekAgo },
        },
      });

      const weeklyVolume = weeklyOrders.reduce((sum, o) => sum + o.shares, 0);
      const uniqueTraders = new Set(weeklyOrders.map((o) => o.userId)).size;

      // Check owner activity (using lastOwnerLogin from schema)
      const ownerActive = stock.lastOwnerLogin
        ? stock.lastOwnerLogin > weekAgo
        : false;

      // Check price floor
      const priceAboveMinimum = Number(stock.currentPrice) >= DelistingService.MIN_PRICE;

      // Determine action
      let action: 'none' | 'warning' | 'delist' = 'none';
      let newStatus = stock.listingStatus;
      let newWarningWeek = stock.warningWeek;

      const meetsRequirements =
        weeklyVolume >= DelistingService.MIN_WEEKLY_VOLUME &&
        uniqueTraders >= DelistingService.MIN_WEEKLY_TRADERS &&
        ownerActive &&
        priceAboveMinimum;

      if (!priceAboveMinimum) {
        // Automatic delist for price floor breach
        action = 'delist';
        newStatus = 'delisted';
      } else if (!meetsRequirements) {
        newWarningWeek = stock.warningWeek + 1;

        if (newWarningWeek >= DelistingService.WARNING_WEEKS_BEFORE_DELIST) {
          action = 'delist';
          newStatus = 'delisted';
        } else {
          action = 'warning';
          newStatus = 'warning';
        }
      } else {
        // Reset warning if requirements met
        newWarningWeek = 0;
        newStatus = 'active';
      }

      // Update stock status
      await prisma.playerStock.update({
        where: { id: stock.id },
        data: {
          listingStatus: newStatus,
          warningWeek: newWarningWeek,
          weeklyVolume,
          weeklyTraders: uniqueTraders,
          isListed: newStatus !== 'delisted',
        },
      });

      // If delisting, payout shareholders
      if (action === 'delist') {
        await this.processDelisting(stock.id);
      }

      results.push({
        stockId: stock.id,
        ticker: stock.tickerSymbol,
        status: newStatus as 'active' | 'warning' | 'delisted',
        weeklyVolume,
        weeklyTraders: uniqueTraders,
        ownerActive,
        priceAboveMinimum,
        warningWeek: newWarningWeek,
        action,
      });
    }

    console.log(`📋 Delisting check complete: ${results.length} stocks reviewed`);
    return results;
  }

  /**
   * Process delisting - payout shareholders at last price
   */
  private async processDelisting(stockId: string): Promise<void> {
    const stock = await prisma.playerStock.findUnique({
      where: { id: stockId },
    });

    if (!stock) return;

    // Get all holdings of this stock
    const holdings = await prisma.stockHolding.findMany({
      where: { playerStockId: stockId, shares: { gt: 0 } },
    });

    // Payout each shareholder
    for (const holding of holdings) {
      const payoutAmount = holding.shares * Number(stock.currentPrice);

      await prisma.$transaction([
        // Credit cash
        prisma.playerStats.update({
          where: { userId: holding.userId },
          data: { cash: { increment: payoutAmount } },
        }),
        // Clear holding
        prisma.stockHolding.delete({
          where: { id: holding.id },
        }),
        // Create order record for the forced sale
        prisma.stockOrder.create({
          data: {
            userId: holding.userId,
            stockType: 'player',
            playerStockId: stockId,
            tickerSymbol: stock.tickerSymbol,
            orderType: 'sell',
            shares: holding.shares,
            pricePerShare: stock.currentPrice,
            totalAmount: new Decimal(payoutAmount),
            status: 'completed',
          },
        }),
      ]);
    }

    // Create market event
    await prisma.marketEvent.create({
      data: {
        eventType: 'halt',
        severity: 'critical',
        title: `${stock.tickerSymbol} Delisted`,
        description: `${stock.companyName} has been removed from the exchange. Shareholders paid out at $${Number(stock.currentPrice).toFixed(2)}/share.`,
        affectedTickers: [stock.tickerSymbol],
        isActive: true,
      },
    });
  }

  /**
   * Check if a player can create a new IPO (not in cooldown)
   */
  async canPlayerIPO(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check for existing active stock
    const activeStock = await prisma.playerStock.findFirst({
      where: { userId, isListed: true },
    });

    if (activeStock) {
      return { allowed: false, reason: 'You already have an active stock listed' };
    }

    // Check for recent delisting (cooldown)
    const recentDelist = await prisma.playerStock.findFirst({
      where: {
        userId,
        isListed: false,
        listingStatus: 'delisted',
        updatedAt: {
          gt: new Date(Date.now() - DelistingService.DELIST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentDelist) {
      const cooldownEnd = new Date(
        recentDelist.updatedAt.getTime() +
          DelistingService.DELIST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
      );
      return {
        allowed: false,
        reason: `Cooldown active until ${cooldownEnd.toISOString().split('T')[0]}`,
      };
    }

    return { allowed: true };
  }
}

export const delistingService = new DelistingService();
```

**Step 2: Commit**

```bash
git add services/api-gateway/src/services/delisting.service.ts
git commit -m "feat(api): add DelistingService for stock performance checks"
```

---

## Phase 4: API Routes

### Task 4.1: Add Index Routes

**Files:**
- Modify: `services/api-gateway/src/routes/stocks.ts`

**Step 1: Import new services at top of file**

```typescript
import { indexService } from '../services/index.service';
import { dividendService } from '../services/dividend.service';
import { circuitBreakerService } from '../services/circuitBreaker.service';
import { marketEventService } from '../services/marketEvent.service';
```

**Step 2: Add index routes after existing routes**

```typescript
// GET /api/v1/stocks/indices - Get all indices
router.get('/indices', async (req, res, next) => {
  try {
    const indices = await indexService.getAllIndices();
    res.json({ success: true, data: indices });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/indices/:ticker - Get index detail
router.get('/indices/:ticker', async (req, res, next) => {
  try {
    const index = await indexService.getIndexByTicker(req.params.ticker);
    if (!index) {
      return res.status(404).json({ success: false, error: 'Index not found' });
    }
    res.json({ success: true, data: index });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/dividends - Get player dividend summary
router.get('/dividends', requireAuth, async (req, res, next) => {
  try {
    const summary = await dividendService.getPlayerDividendSummary(req.user!.id);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/dividends/history - Get dividend history
router.get('/dividends/history', requireAuth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await dividendService.getPlayerDividendHistory(req.user!.id, limit);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/events - Get market events
router.get('/events', async (req, res, next) => {
  try {
    const events = await marketEventService.getActiveEvents();
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stocks/halts - Get halted stocks
router.get('/halts', async (req, res, next) => {
  try {
    const status = circuitBreakerService.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});
```

**Step 3: Commit**

```bash
git add services/api-gateway/src/routes/stocks.ts
git commit -m "feat(api): add routes for indices, dividends, events, and halts"
```

---

## Phase 5: Enhanced Bot System

### Task 5.1: Create Enhanced BotTrader Service

**Files:**
- Create: `services/api-gateway/src/services/enhancedBotTrader.service.ts`

This is a large file. Create it with the 22 bot configurations (5 market makers, 3 whales, 8 news-reactive, 6 sentiment) following the patterns established in the existing `botTrader.service.ts`.

**Key additions:**
- `MarketMakerBot` class - stabilizes prices, provides liquidity
- `WhaleBot` class - makes large occasional trades
- `NewsReactiveBot` class - responds to MarketEvent entries
- `SentimentBot` class - follows crowd behavior

**Step 1: Create skeleton with bot types**

```typescript
import { prisma } from '@mint/database';
import { Decimal } from '@prisma/client/runtime/library';
import { stockService } from './stock.service';
import { marketEventService } from './marketEvent.service';
import { circuitBreakerService } from './circuitBreaker.service';

type BotType = 'market_maker' | 'whale' | 'news_reactive' | 'sentiment';

interface EnhancedBot {
  id: string;
  name: string;
  botType: BotType;
  strategy: string;
  personality: 'aggressive' | 'moderate' | 'conservative';
  cash: Decimal;
  riskTolerance: number;
  tradeIntervalMs: number;
  positionSizeMultiplier: number;
  sectorFocus: string[];
}

export class EnhancedBotTraderService {
  private static TOTAL_BOT_CAPITAL = 80_000_000; // $80M total

  // Bot configurations
  private static BOTS: EnhancedBot[] = [
    // Market Makers (5) - $10M each = $50M
    { id: 'mm-1', name: 'StableForce Alpha', botType: 'market_maker', strategy: 'stabilize', personality: 'conservative', cash: new Decimal(10_000_000), riskTolerance: 0.2, tradeIntervalMs: 30_000, positionSizeMultiplier: 0.5, sectorFocus: [] },
    { id: 'mm-2', name: 'StableForce Beta', botType: 'market_maker', strategy: 'stabilize', personality: 'conservative', cash: new Decimal(10_000_000), riskTolerance: 0.2, tradeIntervalMs: 45_000, positionSizeMultiplier: 0.5, sectorFocus: [] },
    { id: 'mm-3', name: 'LiquidityPro', botType: 'market_maker', strategy: 'liquidity', personality: 'moderate', cash: new Decimal(10_000_000), riskTolerance: 0.3, tradeIntervalMs: 60_000, positionSizeMultiplier: 0.6, sectorFocus: [] },
    { id: 'mm-4', name: 'SpreadMaster', botType: 'market_maker', strategy: 'spread', personality: 'conservative', cash: new Decimal(10_000_000), riskTolerance: 0.15, tradeIntervalMs: 40_000, positionSizeMultiplier: 0.4, sectorFocus: [] },
    { id: 'mm-5', name: 'DepthBuilder', botType: 'market_maker', strategy: 'depth', personality: 'moderate', cash: new Decimal(10_000_000), riskTolerance: 0.25, tradeIntervalMs: 50_000, positionSizeMultiplier: 0.5, sectorFocus: [] },

    // Whales (3) - $6M each = $18M (for big moves)
    { id: 'whale-1', name: 'DeepPockets', botType: 'whale', strategy: 'accumulate', personality: 'aggressive', cash: new Decimal(6_000_000), riskTolerance: 0.7, tradeIntervalMs: 3_600_000, positionSizeMultiplier: 3.0, sectorFocus: ['tech', 'finance'] },
    { id: 'whale-2', name: 'SilentGiant', botType: 'whale', strategy: 'distribute', personality: 'moderate', cash: new Decimal(6_000_000), riskTolerance: 0.6, tradeIntervalMs: 4_800_000, positionSizeMultiplier: 2.5, sectorFocus: ['consumer', 'health'] },
    { id: 'whale-3', name: 'TidalWave', botType: 'whale', strategy: 'momentum', personality: 'aggressive', cash: new Decimal(6_000_000), riskTolerance: 0.8, tradeIntervalMs: 2_400_000, positionSizeMultiplier: 3.5, sectorFocus: ['energy', 'industrial'] },

    // News Reactive (8) - $750K each = $6M
    { id: 'news-1', name: 'FastNews Alpha', botType: 'news_reactive', strategy: 'trend_follow', personality: 'aggressive', cash: new Decimal(750_000), riskTolerance: 0.7, tradeIntervalMs: 10_000, positionSizeMultiplier: 1.5, sectorFocus: [] },
    { id: 'news-2', name: 'FastNews Beta', botType: 'news_reactive', strategy: 'trend_follow', personality: 'aggressive', cash: new Decimal(750_000), riskTolerance: 0.65, tradeIntervalMs: 15_000, positionSizeMultiplier: 1.4, sectorFocus: [] },
    { id: 'news-3', name: 'HeadlineHunter', botType: 'news_reactive', strategy: 'trend_follow', personality: 'moderate', cash: new Decimal(750_000), riskTolerance: 0.5, tradeIntervalMs: 20_000, positionSizeMultiplier: 1.2, sectorFocus: [] },
    { id: 'news-4', name: 'EventTracker', botType: 'news_reactive', strategy: 'trend_follow', personality: 'moderate', cash: new Decimal(750_000), riskTolerance: 0.55, tradeIntervalMs: 25_000, positionSizeMultiplier: 1.1, sectorFocus: [] },
    { id: 'news-5', name: 'Contrarian Alpha', botType: 'news_reactive', strategy: 'contrarian', personality: 'aggressive', cash: new Decimal(750_000), riskTolerance: 0.75, tradeIntervalMs: 12_000, positionSizeMultiplier: 1.6, sectorFocus: [] },
    { id: 'news-6', name: 'Contrarian Beta', botType: 'news_reactive', strategy: 'contrarian', personality: 'moderate', cash: new Decimal(750_000), riskTolerance: 0.6, tradeIntervalMs: 18_000, positionSizeMultiplier: 1.3, sectorFocus: [] },
    { id: 'news-7', name: 'SectorWatch', botType: 'news_reactive', strategy: 'sector_rotate', personality: 'moderate', cash: new Decimal(750_000), riskTolerance: 0.5, tradeIntervalMs: 30_000, positionSizeMultiplier: 1.0, sectorFocus: [] },
    { id: 'news-8', name: 'QuickReact', botType: 'news_reactive', strategy: 'trend_follow', personality: 'aggressive', cash: new Decimal(750_000), riskTolerance: 0.8, tradeIntervalMs: 8_000, positionSizeMultiplier: 1.8, sectorFocus: [] },

    // Sentiment (6) - $1M each = $6M
    { id: 'sent-1', name: 'CrowdFollower', botType: 'sentiment', strategy: 'follow_crowd', personality: 'moderate', cash: new Decimal(1_000_000), riskTolerance: 0.5, tradeIntervalMs: 45_000, positionSizeMultiplier: 1.0, sectorFocus: [] },
    { id: 'sent-2', name: 'MomentumRider', botType: 'sentiment', strategy: 'momentum', personality: 'aggressive', cash: new Decimal(1_000_000), riskTolerance: 0.7, tradeIntervalMs: 30_000, positionSizeMultiplier: 1.5, sectorFocus: [] },
    { id: 'sent-3', name: 'VolumeChaser', botType: 'sentiment', strategy: 'volume', personality: 'aggressive', cash: new Decimal(1_000_000), riskTolerance: 0.65, tradeIntervalMs: 35_000, positionSizeMultiplier: 1.3, sectorFocus: [] },
    { id: 'sent-4', name: 'HerdMentality', botType: 'sentiment', strategy: 'follow_crowd', personality: 'conservative', cash: new Decimal(1_000_000), riskTolerance: 0.35, tradeIntervalMs: 60_000, positionSizeMultiplier: 0.8, sectorFocus: [] },
    { id: 'sent-5', name: 'PanicSeller', botType: 'sentiment', strategy: 'panic', personality: 'aggressive', cash: new Decimal(1_000_000), riskTolerance: 0.8, tradeIntervalMs: 20_000, positionSizeMultiplier: 2.0, sectorFocus: [] },
    { id: 'sent-6', name: 'FOMOBuyer', botType: 'sentiment', strategy: 'fomo', personality: 'aggressive', cash: new Decimal(1_000_000), riskTolerance: 0.75, tradeIntervalMs: 25_000, positionSizeMultiplier: 1.8, sectorFocus: [] },
  ];

  // ... implement trading methods
}

export const enhancedBotTraderService = new EnhancedBotTraderService();
```

Due to the length, the full implementation should follow patterns from the existing botTrader.service.ts but with the new bot types and behaviors described in the design document.

**Step 2: Commit**

```bash
git add services/api-gateway/src/services/enhancedBotTrader.service.ts
git commit -m "feat(api): add EnhancedBotTraderService with 22 specialized bots"
```

---

## Phase 6: Frontend - This phase contains multiple tasks for UI components

Due to the extensive nature of the frontend work, here is a summary of the remaining tasks:

### Task 6.1: Create Cyberpunk Theme CSS
- File: `apps/web/src/styles/cyberpunk.css`
- Add dark charcoal background, neon accent colors, glass-morphism effects

### Task 6.2: Create StockIndexCard Component
- File: `apps/web/src/components/stocks/StockIndexCard.tsx`
- Display index value, change, mini chart

### Task 6.3: Create StockTickerTape Component
- File: `apps/web/src/components/stocks/StockTickerTape.tsx`
- Scrolling ticker with neon colors

### Task 6.4: Create DividendSummary Component
- File: `apps/web/src/components/stocks/DividendSummary.tsx`
- Show today/week/all-time dividends

### Task 6.5: Create MarketEventsFeed Component
- File: `apps/web/src/components/stocks/MarketEventsFeed.tsx`
- Live feed of market events and news

### Task 6.6: Create HaltedStocksBanner Component
- File: `apps/web/src/components/stocks/HaltedStocksBanner.tsx`
- Warning banner for circuit breaker halts

### Task 6.7: Rework StocksPage
- File: `apps/web/src/pages/StocksPage.tsx`
- Integrate all new components with cyberpunk styling

### Task 6.8: Update API Client
- File: `apps/web/src/api/game.ts`
- Add new API methods for indices, dividends, events

---

## Migration Checklist

After all tasks complete:

1. [ ] Run full database migration: `pnpm db:generate && pnpm db:push`
2. [ ] Seed stocks: `npx ts-node packages/database/prisma/seeds/stocks.ts`
3. [ ] Seed indices: `npx ts-node packages/database/prisma/seeds/indices.ts`
4. [ ] Seed trading bots: Create and run bot seed
5. [ ] Test all API endpoints
6. [ ] Test frontend components
7. [ ] Run bot trader service and verify market activity
8. [ ] Test dividend payout (manually trigger or wait for midnight)
9. [ ] Test circuit breakers with artificial price spikes
10. [ ] Full end-to-end testing

---

## Verification Commands

```bash
# Check database schema
pnpm db:studio

# Run API server
pnpm --filter @mint/api-gateway dev

# Run frontend
pnpm --filter @mint/web dev

# Check for TypeScript errors
pnpm typecheck

# Run linting
pnpm lint
```
