# Stock Market System Implementation Plan

## Overview

Build a full stock market system where:
1. Players can name their own stock ticker and list shares for others to buy
2. Players can buy/sell shares of other players' companies
3. 15 bot stocks provide difficulty and market dynamics
4. Stock prices fluctuate based on market simulation

## Database Schema

### New Tables

```prisma
// Player's listed company stock
model PlayerStock {
  id              String    @id @default(cuid())
  userId          String    @unique @map("user_id")
  tickerSymbol    String    @unique @map("ticker_symbol")
  companyName     String    @map("company_name")
  currentPrice    Decimal   @db.Decimal(18, 2) @map("current_price")
  previousClose   Decimal   @db.Decimal(18, 2) @map("previous_close")
  highPrice24h    Decimal   @db.Decimal(18, 2) @map("high_price_24h")
  lowPrice24h     Decimal   @db.Decimal(18, 2) @map("low_price_24h")
  totalShares     Int       @default(1000000) @map("total_shares")
  floatShares     Int       @default(500000) @map("float_shares") // available for trading
  ownerShares     Int       @default(500000) @map("owner_shares") // owner's shares
  marketCap       Decimal   @db.Decimal(24, 2) @map("market_cap")
  volume24h       Int       @default(0) @map("volume_24h")
  trend           String    @default("neutral")
  lastTickAt      DateTime  @default(now()) @map("last_tick_at")
  isListed        Boolean   @default(true) @map("is_listed")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  holdings        StockHolding[]
  orders          StockOrder[]
  priceHistory    StockPriceHistory[]

  @@map("player_stocks")
}

// Bot/NPC stocks (AAPL, MSFT, etc.)
model BotStock {
  id              String    @id @default(cuid())
  tickerSymbol    String    @unique @map("ticker_symbol")
  companyName     String    @map("company_name")
  sector          String    // tech, finance, energy, consumer, healthcare
  currentPrice    Decimal   @db.Decimal(18, 2) @map("current_price")
  previousClose   Decimal   @db.Decimal(18, 2) @map("previous_close")
  highPrice24h    Decimal   @db.Decimal(18, 2) @map("high_price_24h")
  lowPrice24h     Decimal   @db.Decimal(18, 2) @map("low_price_24h")
  basePrice       Decimal   @db.Decimal(18, 2) @map("base_price") // anchor price
  volatility      Decimal   @default(0.02) @db.Decimal(5, 4) // daily volatility
  trend           String    @default("neutral")
  trendStrength   Int       @default(1)
  volume24h       Int       @default(0) @map("volume_24h")
  description     String?
  lastTickAt      DateTime  @default(now()) @map("last_tick_at")
  isActive        Boolean   @default(true) @map("is_active")
  sortOrder       Int       @default(0) @map("sort_order")

  holdings        StockHolding[]
  orders          StockOrder[]
  priceHistory    StockPriceHistory[]

  @@map("bot_stocks")
}

// Player holdings of any stock (player or bot)
model StockHolding {
  id              String    @id @default(cuid())
  userId          String    @map("user_id")
  stockType       String    @map("stock_type") // 'player' or 'bot'
  playerStockId   String?   @map("player_stock_id")
  botStockId      String?   @map("bot_stock_id")
  shares          Int       @default(0)
  avgBuyPrice     Decimal   @db.Decimal(18, 2) @map("avg_buy_price")
  totalInvested   Decimal   @db.Decimal(20, 2) @map("total_invested")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  playerStock     PlayerStock? @relation(fields: [playerStockId], references: [id])
  botStock        BotStock?   @relation(fields: [botStockId], references: [id])

  @@unique([userId, stockType, playerStockId])
  @@unique([userId, stockType, botStockId])
  @@map("stock_holdings")
}

// Order history
model StockOrder {
  id              String    @id @default(cuid())
  userId          String    @map("user_id")
  stockType       String    @map("stock_type")
  playerStockId   String?   @map("player_stock_id")
  botStockId      String?   @map("bot_stock_id")
  orderType       String    @map("order_type") // 'buy' or 'sell'
  shares          Int
  pricePerShare   Decimal   @db.Decimal(18, 2) @map("price_per_share")
  totalAmount     Decimal   @db.Decimal(20, 2) @map("total_amount")
  status          String    @default("completed") // completed, cancelled
  createdAt       DateTime  @default(now()) @map("created_at")

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  playerStock     PlayerStock? @relation(fields: [playerStockId], references: [id])
  botStock        BotStock?   @relation(fields: [botStockId], references: [id])

  @@index([userId, createdAt])
  @@map("stock_orders")
}

// Price history for charts
model StockPriceHistory {
  id              String    @id @default(cuid())
  stockType       String    @map("stock_type")
  playerStockId   String?   @map("player_stock_id")
  botStockId      String?   @map("bot_stock_id")
  price           Decimal   @db.Decimal(18, 2)
  timestamp       DateTime  @default(now())

  playerStock     PlayerStock? @relation(fields: [playerStockId], references: [id], onDelete: Cascade)
  botStock        BotStock?   @relation(fields: [botStockId], references: [id], onDelete: Cascade)

  @@index([stockType, playerStockId, timestamp])
  @@index([stockType, botStockId, timestamp])
  @@map("stock_price_history")
}
```

## Bot Stocks (15 total)

Mix of sectors with varying volatility:

### Tech (5) - High volatility
1. **APEX** - Apex Technologies - $150 base - Gaming/metaverse company
2. **BYTE** - ByteStream Inc - $85 base - Cloud computing
3. **CHIP** - ChipMax Corp - $220 base - Semiconductor
4. **DIGI** - Digital Dynamics - $45 base - Cybersecurity startup
5. **ECHO** - EchoNet Systems - $120 base - AI/ML company

### Finance (3) - Medium volatility
6. **FBNK** - First National Bank - $75 base - Traditional banking
7. **GILT** - Gilt Capital - $180 base - Investment firm
8. **HDGE** - Hedge Masters - $95 base - Hedge fund

### Energy (3) - High volatility
9. **VOLT** - VoltPower Inc - $55 base - Renewable energy
10. **OILX** - OilMax Global - $90 base - Oil & gas
11. **SOLR** - Solar Dynamics - $35 base - Solar panel manufacturer

### Consumer (2) - Low volatility
12. **FOOD** - FoodCorp Int'l - $65 base - Food conglomerate
13. **LUXE** - LuxeGoods Inc - $200 base - Luxury retail

### Healthcare (2) - Medium volatility
14. **MEDS** - MedTech Solutions - $110 base - Medical devices
15. **CURE** - CureAll Pharma - $140 base - Pharmaceutical

## Price Simulation

### Player Stocks
- Base price tied to player's net worth ($1 per $10K net worth)
- Price fluctuates ±5% per tick (every 5-15 minutes)
- Trading volume affects volatility
- Owner's net worth changes affect base price

### Bot Stocks
- Mean reversion to base price over time
- Sector-wide trends (tech crash, energy boom, etc.)
- Random events trigger spikes/drops
- Volatility varies by stock type

## API Endpoints

### Stock Routes (`/api/v1/stocks`)

```
GET    /market                    - Get all stocks (player + bot) with prices
GET    /market/:ticker            - Get single stock details
GET    /player/:userId            - Get player's stock (if listed)
POST   /list                      - List your company stock
PUT    /list                      - Update company name
DELETE /list                      - Delist your stock

GET    /portfolio                 - Get user's holdings
POST   /buy                       - Buy shares { ticker, shares }
POST   /sell                      - Sell shares { ticker, shares }
GET    /orders                    - Get order history

GET    /watchlist                 - Get user's watchlist
POST   /watchlist/:ticker         - Add to watchlist
DELETE /watchlist/:ticker         - Remove from watchlist
```

## Frontend Components

### Stock Market Page (redesign of StocksPage.tsx)
1. **Market Overview** - Stock ticker bar (keep existing)
2. **All Stocks Tab** - Grid of player + bot stocks
3. **My Portfolio Tab** - User's holdings with P&L
4. **My Company Tab** - List/manage your stock
5. **Order History Tab** - Buy/sell history

### Stock Card Component
- Ticker symbol + company name
- Current price with change indicator
- Mini sparkline chart (24h)
- Buy/Sell buttons
- Market cap for player stocks

### Stock Detail Modal
- Full price chart (1h, 24h, 7d, 30d)
- Order book (simplified)
- Company info
- Buy/Sell interface with share quantity

## Implementation Order

### Phase 1: Database & Backend (2-3 hours)
1. Add new models to schema.prisma
2. Run migration
3. Create seed data for 15 bot stocks
4. Create stock.service.ts with price simulation
5. Create stock routes

### Phase 2: Frontend Market View (2-3 hours)
1. Update StocksPage with tabs
2. Create StockCard component
3. Implement market overview grid
4. Add buy/sell modals

### Phase 3: Portfolio & Trading (2 hours)
1. Portfolio view with holdings
2. Buy/Sell functionality
3. Order history

### Phase 4: Player Stocks (2 hours)
1. List your company form
2. Player stock price simulation
3. Link to player net worth

### Phase 5: Polish (1 hour)
1. Price charts
2. Watchlist
3. Real-time updates via polling

## Notes

- Player stocks are optional - only list if they want to
- Bot stocks always exist and provide market depth
- Price updates happen on-demand (like IPO system)
- No actual money - just in-game cash
- Market cap display for prestige/leaderboards
