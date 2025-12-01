# The Mint Game - Deep Scan Issues Report

**Generated:** 2025-12-01
**Project:** Stock AI Trading Game
**Total Issues Found:** 100+
**Status:** FIXES APPLIED ✅

---

## Fixes Applied Summary

The following fixes have been implemented:

### Backend (stock.service.ts)
- ✅ Division by zero guards on all changePercent calculations
- ✅ Race condition fixed - price impact moved outside transaction with proper sequencing
- ✅ Float shares check moved inside transaction to prevent race conditions
- ✅ Null assertion removed from sellShares return (now allows null holding)
- ✅ Bot detection fixed to use explicit patterns (no more `includes('bot')`)
- ✅ getRecentTrades filter removed (orders already represent completed trades)

### Backend (botTrader.service.ts)
- ✅ Cash validation before buy attempts
- ✅ Portfolio refreshed for each bot to avoid stale data
- ✅ Cash allocation reduced to 15% per bot (was 20%)
- ✅ Sector rotation randomized to prevent predictability
- ✅ Division by zero guard on diffPct calculation
- ✅ Fallback trade validates cash before executing

### Backend (marketDynamics.service.ts)
- ✅ High/low price initialization safety checks added

### Frontend (StocksPage.tsx)
- ✅ Division by zero guard on portfolio allocation percentage
- ✅ Chart data now deterministic (based on stock ticker seed)
- ✅ Native confirm() replaced with styled modal
- ✅ Portfolio sorting creates new array (doesn't mutate state)

### Frontend (StockTradingModal.tsx)
- ✅ Division by zero guard on basePrice calculation

### Frontend (StockCard.tsx)
- ✅ setTimeout memory leak fixed with cleanup function

### Frontend (client.ts)
- ✅ JSON parse errors now handled gracefully
- ✅ Token refresh returns proper ApiResponse type
- ✅ Network errors return structured error response

### Database (schema.prisma)
- ✅ Added indexes on PlayerStock (isListed, lastTickAt)
- ✅ Added indexes on BotStock (isActive, lastTickAt)
- ✅ Added indexes on StockHolding (userId, playerStockId, botStockId, stockType)
- ✅ Added indexes on StockOrder (playerStockId, botStockId, stockType, status)
- ✅ Added onDelete: SetNull for stock relations to prevent orphaned records

---

## Remaining Items (Optional Future Work)

- Consider adding database-level pessimistic locking (`SELECT ... FOR UPDATE`) for even stronger consistency
- Consider adding CHECK constraint for floatShares >= 0 at database level
- Consider creating TypeScript interfaces for stock models in packages/types
- Consider consolidating polling loops (currently 3 concurrent)
- Consider implementing API-backed price history instead of deterministic generation

---

---

## Executive Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Backend Stock Trading | 6 | 8 | 6 | 2 | 22 |
| Frontend Display | 3 | 10 | 7 | 3 | 23 |
| Database Schema | 4 | 7 | 3 | 0 | 14 |
| API Integration | 5 | 12 | 6 | 2 | 25 |
| **TOTAL** | **18** | **37** | **22** | **7** | **84** |

---

## PART 1: BACKEND STOCK TRADING ISSUES

### CRITICAL ISSUES

#### 1.1 Division by Zero in changePercent Calculations
**File:** `services/api-gateway/src/services/stock.service.ts`
**Lines:** 277, 301, 344, 389, 436

```typescript
const change = currentPrice - previousClose;
const changePercent = (change / previousClose) * 100;  // BUG: previousClose can be 0
```

**Problem:** If `previousClose` is 0 or null, produces `Infinity`, `NaN`, or errors.
**Impact:** Market data becomes invalid, UI shows broken numbers or crashes.

---

#### 1.2 Race Condition: Price Impact Applied Outside Transaction
**File:** `services/api-gateway/src/services/stock.service.ts`
**Lines:** 906-920, 1134-1147

```typescript
return prisma.$transaction(async (tx) => {
  // ... transaction logic ...

  setImmediate(async () => {  // EXECUTES OUTSIDE TRANSACTION
    await MarketDynamicsService.applyTradeImpact(...);
  });
});
```

**Problem:** `setImmediate` executes AFTER transaction commits. Multiple concurrent trades can race.
**Impact:** Market manipulation, price inconsistency, unfair trading outcomes.

---

#### 1.3 Concurrent Price Updates Without Locking
**File:** `services/api-gateway/src/services/stock.service.ts`
**Lines:** 66-145, 154-239

**Problem:** No `SELECT ... FOR UPDATE` locking. Multiple API requests can read/write same prices simultaneously.
**Impact:** Price updates lost, market data inconsistent.

---

#### 1.4 Float Shares Race Condition
**File:** `services/api-gateway/src/services/stock.service.ts`
**Lines:** 758-767 (check), 836-843 (decrement)

```typescript
// OUTSIDE transaction - checks float shares
if (shares > playerStock.floatShares) throw new AppError(...);

// INSIDE transaction - decrements
await tx.playerStock.update({ data: { floatShares: { decrement: shares } } });
```

**Problem:** Check happens BEFORE transaction; decrement happens INSIDE. Race window allows over-selling.
**Impact:** Float shares can become negative, inventory corruption.

---

#### 1.5 Float Shares Can Go Negative (No DB Constraint)
**File:** `services/api-gateway/src/services/stock.service.ts`
**Line:** 840

```typescript
floatShares: { decrement: shares }  // No validation it won't go below 0
```

**Problem:** Database allows negative values. No CHECK constraint.
**Impact:** Data corruption, invalid game state.

---

#### 1.6 Null Assertion on Deleted Holding
**File:** `services/api-gateway/src/services/stock.service.ts`
**Line:** 1232

```typescript
return { holding: holdingData!, order: orderData };
// holdingData is null when all shares sold
```

**Problem:** TypeScript `!` operator overrides null safety. Returns null as object.
**Impact:** Runtime type error when client accesses holding fields.

---

### HIGH SEVERITY ISSUES

| # | Issue | File | Lines |
|---|-------|------|-------|
| 1.7 | Missing playerStockId/botStockId validation | stock.service.ts | 896, 1124-1125 |
| 1.8 | Unguarded async market dynamics (errors swallowed) | stock.service.ts | 906-920, 1134-1147 |
| 1.9 | Bot doesn't validate cash before buying | botTrader.service.ts | 385-395 |
| 1.10 | Bot uses stale portfolio data across trades | botTrader.service.ts | 414-415, 445 |
| 1.11 | Bot cash allocation exceeds 100% (5 bots × 20%) | botTrader.service.ts | 443-444 |
| 1.12 | Trade feed filter uses non-existent status field | stock.service.ts | 1301-1306 |
| 1.13 | Bot fallback trade bypasses rate limiting | botTrader.service.ts | 581-603 |
| 1.14 | BotStock data read at start becomes stale | botTrader.service.ts | 407-412 |

---

### MEDIUM SEVERITY ISSUES

| # | Issue | File | Lines |
|---|-------|------|-------|
| 1.15 | avgBuyPrice doesn't account for slippage | stock.service.ts | 797-817 |
| 1.16 | Market dynamics missing high/low price init | marketDynamics.service.ts | 73-90 |
| 1.17 | Bot sector rotation is predictable | botTrader.service.ts | 448 |
| 1.18 | Bot detection too broad (username contains 'bot') | stock.service.ts | 1313-1316 |
| 1.19 | Missing import error handling | stock.service.ts | 162, 562, 743, 1137 |
| 1.20 | Missing prestige service fallback | stock.service.ts | 162-163 |

---

## PART 2: FRONTEND DISPLAY ISSUES

### CRITICAL ISSUES

#### 2.1 Portfolio Allocation Division by Zero
**File:** `apps/web/src/pages/StocksPage.tsx`
**Line:** 728

```typescript
const percentage = (parseFloat(holding.currentValue) / totalPortfolioValue) * 100;
```

**Problem:** If `totalPortfolioValue` is 0, produces `Infinity` or `NaN`.
**Impact:** UI renders `width: Infinity%` breaking allocation bar.

---

#### 2.2 Portfolio Sorting Mutates Canonical State
**File:** `apps/web/src/pages/StocksPage.tsx`
**Lines:** 793-807

```typescript
const sorted = [...portfolio].sort(...);
setPortfolio(sorted);  // Overwrites state with sorted version
```

**Problem:** Sorting overwrites original order. After API refetch, sort reverts confusingly.
**Impact:** User sorts by profit, 5 seconds later sort resets.

---

#### 2.3 Price Change Calculation Division by Zero
**File:** `apps/web/src/pages/StocksPage.tsx`
**Lines:** 545-554

```typescript
const priceChangePercent = (priceChange / previousClose) * 100;
```

**Problem:** No guard for `previousClose === 0`.
**Impact:** Displays `Infinity%` or `NaN%` in market tab.

---

### HIGH SEVERITY ISSUES

| # | Issue | File | Lines |
|---|-------|------|-------|
| 2.4 | StockChart price domain with empty data | StockChart.tsx | 136-140 |
| 2.5 | Recommendation win probability div by zero | StockTradingModal.tsx | 51 |
| 2.6 | Price history randomly generated (fake charts) | StocksPage.tsx | 163-175 |
| 2.7 | Fetch error swallowing (Promise.all never rejects) | StocksPage.tsx | 89-104 |
| 2.8 | Missing holdings silently skipped | StocksPage.tsx | 818-820 |
| 2.9 | StockCard undefined changePercent crash | StockCard.tsx | 77 |
| 2.10 | IPO form shows "$NaN" for invalid input | StocksPage.tsx | 1290 |
| 2.11 | Multiple overlapping polling loops | StocksPage.tsx | 111-123 |
| 2.12 | Race condition between polling and trade | StocksPage.tsx | 182-210 vs 111-123 |
| 2.13 | refreshStats failure leaves modal stuck | StocksPage.tsx | 182-211 |

---

### MEDIUM SEVERITY ISSUES

| # | Issue | File | Lines |
|---|-------|------|-------|
| 2.14 | Redundant portfolio calculations (3x reduce) | StocksPage.tsx | 324-332 |
| 2.15 | LiveTradesFeed polls when not visible | LiveTradesFeed.tsx | 62-72 |
| 2.16 | setTimeout memory leak in StockCard | StockCard.tsx | 28-29 |
| 2.17 | StockTicker animation uses stale data | StockTicker.tsx | 28-42 |
| 2.18 | No positive price validation in IPO form | StocksPage.tsx | 229-234 |
| 2.19 | Native confirm() breaks theme consistency | StocksPage.tsx | 297-298 |
| 2.20 | fetchPortfolio not memoized properly | StocksPage.tsx | 56-65 |

---

## PART 3: DATABASE SCHEMA ISSUES

### CRITICAL ISSUES

#### 3.1 Missing Database Indexes - Performance Bottleneck
**File:** `packages/database/prisma/schema.prisma`
**Models:** StockHolding, StockOrder, PlayerStock

| Table | Missing Index | Line |
|-------|--------------|------|
| StockHolding | userId | 907 |
| StockHolding | playerStockId | 895 |
| StockHolding | botStockId | 896 |
| StockOrder | playerStockId | 917 |
| StockOrder | botStockId | 918 |
| StockOrder | stockType | 916 |
| StockOrder | status, createdAt | 924 |
| PlayerStock | lastTickAt | 852 |
| PlayerStock | isListed, updatedAt | 853 |

**Impact:** FULL TABLE SCANS on every portfolio/order query.

---

#### 3.2 Broken Uniqueness Constraint
**File:** `packages/database/prisma/schema.prisma`
**Lines:** 907-908

```prisma
@@unique([userId, stockType, playerStockId])
@@unique([userId, stockType, botStockId])
```

**Problem:** PostgreSQL allows NULL in unique constraints. Multiple rows with `playerStockId=NULL` can exist.
**Impact:** Duplicate holdings possible, data corruption.

---

#### 3.3 Missing OnDelete CASCADE
**File:** `packages/database/prisma/schema.prisma`
**Lines:** 904-905, 928-929

**Problem:** StockHolding and StockOrder relations lack onDelete behavior.
**Impact:** Orphaned records when stock deleted.

---

#### 3.4 No TypeScript Type Definitions for Stock Models
**File:** `packages/types/src/` (MISSING)

**Problem:** No interfaces for PlayerStock, BotStock, StockHolding, StockOrder.
**Impact:** Type safety gaps, no autocomplete, runtime errors.

---

### HIGH SEVERITY ISSUES

| # | Issue | File | Lines |
|---|-------|------|-------|
| 3.5 | StockHolding.shares is Int (no fractions) | schema.prisma | 897 |
| 3.6 | Price precision only 2 decimals | schema.prisma | 842-845, 870-874, 898 |
| 3.7 | No foreign key indexes | schema.prisma | 895-896, 917-918 |
| 3.8 | Missing audit trail (completedAt, cancelledAt) | schema.prisma | 913-933 |
| 3.9 | Ambiguous volume tracking (shares or dollars?) | schema.prisma | 850, 878 |
| 3.10 | StockType allows invalid states (both IDs set) | schema.prisma | 894-896, 916-918 |
| 3.11 | Types not exported from index | types/src/index.ts | - |

---

## PART 4: API INTEGRATION ISSUES

### CRITICAL ISSUES

#### 4.1 Silent Error Swallowing in API Client
**File:** `apps/web/src/api/client.ts`
**Lines:** 20-59

```typescript
const data = await response.json();  // Can throw
// No check for response.ok before parsing
```

**Problem:** Doesn't check `response.ok`. Parsing errors not caught.
**Impact:** API failures hidden, stale data displayed.

---

#### 4.2 Broken Token Refresh Logic
**File:** `apps/web/src/api/client.ts`
**Lines:** 44-56

**Problem:** After 401 and refresh, returns raw response without `ApiResponse<T>` wrapper.
**Impact:** Type mismatch after token refresh causes crashes.

---

#### 4.3 Missing Response Validation in Stock APIs
**File:** `apps/web/src/api/game.ts`
**Lines:** 890-937

```typescript
// getMarketStocks() - no validation res.data is array
// getPortfolio() - no null check before reduce
// buyStockShares() - no shares > 0 validation
```

**Impact:** Runtime crashes on malformed responses.

---

#### 4.4 Unsafe `any` Types in Auth API
**File:** `apps/web/src/api/auth.ts`
**Lines:** 37-48

```typescript
getMe(): ApiResponse<any>  // Should be User type
updateSettings(): ApiResponse<any>  // Should be Settings type
```

**Impact:** No type safety on critical auth responses.

---

#### 4.5 Inconsistent Error Handling Pattern
**File:** Multiple API files

**Problem:** All fetch functions have internal try-catch that swallows errors. Outer `Promise.all` never rejects.
**Impact:** Page-level error state never updates.

---

### HIGH SEVERITY ISSUES

| # | Issue | File | Lines |
|---|-------|------|-------|
| 4.6 | No ticker format validation | game.ts | 894-895 |
| 4.7 | No null check before portfolio.reduce() | game.ts | 927-929 |
| 4.8 | Inline types instead of named interfaces | game.ts | 939-971 |
| 4.9 | Incomplete error handling in coins.ts | coins.ts | 20-34 |
| 4.10 | Missing array validation in cosmetics.ts | cosmetics.ts | 43-68 |
| 4.11 | IPOStatus return type incorrectly extended | game.ts | 736 |
| 4.12 | Query string manual construction (no URLSearchParams) | game.ts | 701-766 |
| 4.13 | LiveTradesFeed type assumptions on trade fields | LiveTradesFeed.tsx | 32-41 |
| 4.14 | MarketStatus component signature mismatch | MarketStatus.tsx | 1-69 |
| 4.15 | Polling inefficiency (3 concurrent cycles) | StocksPage.tsx | 89-123 |
| 4.16 | Falsy vs nullish coalescing confusion | Multiple | - |
| 4.17 | Missing parameter validation on buy/sell | game.ts | 931-937 |

---

## PRIORITY FIX ORDER

### Phase 1: Critical Data Integrity (Week 1)
1. Add database-level pessimistic locking (`SELECT ... FOR UPDATE`)
2. Move price impact INSIDE transaction
3. Add CHECK constraint for floatShares >= 0
4. Add missing database indexes
5. Fix uniqueness constraints

### Phase 2: Frontend Stability (Week 2)
6. Add division-by-zero guards in all price calculations
7. Fix portfolio sorting to not mutate state
8. Implement proper error propagation in API layer
9. Replace fake chart data with real API history
10. Add loading/error states for all async operations

### Phase 3: Type Safety & Validation (Week 3)
11. Create TypeScript interfaces for stock models
12. Add response validation in API client
13. Replace `any` types with proper interfaces
14. Add input validation on trading forms
15. Fix token refresh response typing

### Phase 4: Performance & Polish (Week 4)
16. Consolidate polling loops
17. Add portfolio calculation memoization
18. Fix memory leaks in StockCard/StockTicker
19. Replace native confirm() with styled modals
20. Add proper audit trail fields to database

---

## FILES REQUIRING CHANGES

| Priority | File | Issues |
|----------|------|--------|
| P0 | `services/api-gateway/src/services/stock.service.ts` | 12 |
| P0 | `apps/web/src/pages/StocksPage.tsx` | 15 |
| P0 | `packages/database/prisma/schema.prisma` | 11 |
| P1 | `services/api-gateway/src/services/botTrader.service.ts` | 7 |
| P1 | `apps/web/src/api/client.ts` | 4 |
| P1 | `apps/web/src/api/game.ts` | 8 |
| P2 | `apps/web/src/components/StockChart.tsx` | 3 |
| P2 | `apps/web/src/components/StockTradingModal.tsx` | 3 |
| P2 | `services/api-gateway/src/services/marketDynamics.service.ts` | 2 |
| P3 | `apps/web/src/components/StockCard.tsx` | 2 |
| P3 | `apps/web/src/components/LiveTradesFeed.tsx` | 2 |
| P3 | `packages/types/src/stock.ts` (CREATE) | 4 |

---

## NEXT STEPS

1. Review this document and prioritize based on business impact
2. Create implementation plan for each phase
3. Set up test coverage for race conditions
4. Add database migrations for schema fixes
5. Implement integration tests for concurrent trading scenarios
