# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The Mint** is an idle financial tycoon simulation game. Players build investment empires through real estate, business management, and strategic decision-making.

## Architecture

This is a **pnpm monorepo** using **Turborepo** for build orchestration:

```
apps/web/              → React frontend (Vite, Tailwind, Zustand) - port 5173
services/api-gateway/  → Express.js API server - port 3001
packages/database/     → Prisma ORM schema and client
packages/types/        → Shared TypeScript interfaces
packages/utils/        → Shared utility functions
```

**Stack:** React 18 + TypeScript + Vite | Express.js + PostgreSQL + Redis | Prisma ORM

## Essential Commands

```bash
# Development
pnpm setup           # First-time setup (installs deps, starts Docker, pushes DB schema)
pnpm dev             # Start all services (frontend + API + Docker)
pnpm docker:up       # Start PostgreSQL, Redis, MailHog containers

# Building & Quality
pnpm build           # Build all packages
pnpm lint            # ESLint across monorepo
pnpm typecheck       # TypeScript checking

# Database (packages/database)
pnpm db:generate     # Generate Prisma client after schema changes
pnpm db:push         # Push schema changes to database
pnpm db:migrate      # Create a migration file
pnpm db:studio       # Open Prisma Studio GUI

# Single package commands
pnpm --filter @mint/web dev
pnpm --filter @mint/api-gateway dev
pnpm --filter @mint/database generate
```

## Development Setup

1. Requires **Node 20+** (see .nvmrc) and **Docker**
2. Copy `.env.example` to `.env` and configure
3. Run `pnpm setup` for complete initialization

**Local Services (Docker):**

- PostgreSQL on port 5434
- Redis on port 6379
- MailHog on ports 1025 (SMTP) / 8025 (Web UI)
- Adminer on port 8080 (Database web admin - http://localhost:8080)

## Code Patterns

**Adding API endpoints:** Create route in `services/api-gateway/src/routes/`, register in routes index

**Database changes:** Edit `packages/database/prisma/schema.prisma`, then run:

```bash
pnpm db:generate && pnpm db:push
```

**Shared types:** Add to `packages/types/src/`, export from index.ts

**Frontend proxies `/api/*` to backend** - configured in Vite

## Key Configuration

- **TypeScript:** Strict mode enabled (tsconfig.base.json)
- **ESLint:** `@typescript-eslint/recommended` + Prettier integration
- **Prettier:** Single quotes, semicolons, 100 char width, trailing commas

## Design Documents

Implementation plans are in `/docs/plans/`:

- `2025-11-28-the-mint-technical-design.md` - System architecture
- `2025-11-28-phase-1-core-game-mvp.md` - Current implementation phase
- `2025-11-29-passive-income-system-design.md` - Income mechanics design

## Stocks Page Deep Scan (Web)

- **Location**: `apps/web/src/pages/StocksPage.tsx`
- **Purpose**: Main in-game stock market experience (Market, Portfolio, My Company IPO, Orders).

### Critical Issues Found

- **Undefined state setter**: `setRealTimePrices` is called in `fetchMarketStocks` but no `useState` for `realTimePrices` exists and the value is never used. This is a hard error and dead code.
- **Broken MarketStatus props**:
  - `MarketStatus` is declared as `MarketStatus({ lastTickAt }: MarketStatusProps)` without any `MarketStatusProps` definition or import.
  - `StocksPage` renders `<MarketStatus />` without props, while the component signature expects one.

### Major Logic / Data Issues

- **Unsafe price math**:
  - Price change % in the market table and `StockChart` divides by `previousClose` without guarding for `0`/missing values, which can produce `Infinity`/`NaN` and ugly UI.
- **IPO summary NaN risk**:
  - `formatCurrency(parseFloat(marketCap))` can show `$NaN` if user input is invalid, even when other fields look fine.
- **fetchAllData error handling is misleading**:
  - `fetchAllData` wraps `Promise.all([...])` in a `try/catch`, but each fetch function swallows errors and only logs them, so the combined promise almost never rejects and the page-level `error` state rarely updates.

### Performance / UX Concerns

- **Multiple polling loops**:
  - `StocksPage` polls stocks/portfolio every 5s and `LiveTradesFeed` polls trades every 3s; this can be noisy for the API and the client.
- **Random chart history**:
  - `handleViewStock` generates a random 24h history every open, making charts feel fake and non-deterministic relative to the backend price.
- **Portfolio sorting mutates canonical state**:
  - Sorting directly mutates the `portfolio` state array, losing the original order and mixing view concerns with data storage.
- **Native confirm dialog**:
  - `handleDelist` uses `window.confirm`, which breaks visual consistency with the rest of the game’s UI.

### Fix Strategy (Implemented / Planned)

- Remove or properly wire the unused `setRealTimePrices` state.
- Define a simple `MarketStatusProps` type or inline props, and/or simplify `MarketStatus` to take no props (since `lastTickAt` is unused).
- Guard all price percentage math against `0`/falsy denominators; render graceful fallbacks when data is missing.
- Consolidate portfolio aggregate calculations (e.g., reuse `totalInvested`) to avoid repeated `reduce` calls.
- Replace native `confirm` with a styled in-game confirmation pattern when delisting.
- Revisit polling and chart history in a future pass to prefer shared live data streams or API-backed history over random client-side generation.
