# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The Mint** is an idle financial tycoon simulation game. Players build investment empires through real estate, business management, stock trading, and strategic decision-making.

## Architecture

This is a **pnpm monorepo** using **Turborepo** for build orchestration:

```
apps/
  web/                 → React frontend (Vite, Tailwind, Zustand) - port 5173
  admin/               → Admin dashboard UI (Vite, React) - port 3003

services/
  api-gateway/         → Express.js main API server - port 3000
  admin-dashboard/     → Admin API server - port 3002

packages/
  database/            → Prisma ORM schema and client
  types/               → Shared TypeScript interfaces
  utils/               → Shared utility functions
```

**Stack:** React 18 + TypeScript + Vite | Express.js + PostgreSQL + Redis | Prisma ORM | Stripe

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
pnpm --filter @mint/admin dev
pnpm --filter @mint/admin-dashboard dev
```

## Development Setup

1. Requires **Node 20+** (see .nvmrc) and **Docker**
2. Copy `.env.example` to `.env` and configure
3. Run `pnpm setup` for complete initialization

**Local Services (Docker):**
- PostgreSQL on port 5434
- Redis on port 6379
- MailHog on ports 1025 (SMTP) / 8025 (Web UI)
- Adminer on port 8080 (Database web admin)

**Application Ports:**
- Main Web App: http://localhost:5173
- Main API: http://localhost:3000
- Admin Dashboard UI: http://localhost:3003
- Admin API: http://localhost:3002

## Stripe Integration

Stripe is fully integrated for monetization:

**Environment Variables:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
```

**Webhook Setup (Local Development):**
```bash
stripe listen --forward-to localhost:3000/api/v1/subscriptions/webhook
```

**Purchase Types:**
- Premium subscriptions (monthly $4.99, annual $39.99)
- Mint Coins (4 tiers: 100-2600 coins)

**Unified Webhook Handler:**
All Stripe webhooks go to `/api/v1/subscriptions/webhook` and route based on `metadata.type`:
- `coin_purchase` → Grants coins
- `subscription` → Activates premium + 500 bonus coins

## Premium Features

| Feature | Free | Premium |
|---------|------|---------|
| Income Multiplier | 1.0x | 1.1x (+10%) |
| Offline Cap | 8 hours | 24 hours |
| Mint Coins on Subscribe | - | 500 coins |
| Premium Badge | - | Visible on leaderboards |

## Stock Market System

- **35 Bot Stocks** pre-seeded across 6 sectors (tech, finance, energy, consumer, health, industrial)
- **Player IPO** system - players can launch their own company stock
- **Bot Trading** - 15+ bots with different strategies (momentum, contrarian, mean reversion)
- **Price Simulation** - Mean reversion + volatility with tick intervals of 5-15 minutes

## Code Patterns

**Adding API endpoints:** Create route in `services/api-gateway/src/routes/`, register in routes index

**Database changes:** Edit `packages/database/prisma/schema.prisma`, then run:
```bash
pnpm db:generate && pnpm db:push
```

**Shared types:** Add to `packages/types/src/`, export from index.ts

**Frontend proxies `/api/*` to backend** - configured in Vite

## API Route Structure

All routes mounted at `/api/v1/`:
- `/auth` - Authentication (login, register, refresh)
- `/user` - Profile and user management
- `/game` - Core game logic (properties, businesses, income)
- `/prestige` - Prestige/upgrade system
- `/daily` - Daily login rewards
- `/leaderboards` - Player rankings
- `/achievements` - Achievement tracking
- `/ipo` - IPO system for player stocks
- `/friends` - Friend system
- `/clubs` - Club/guild system
- `/gifts` - Gift sending
- `/subscriptions` - Stripe subscriptions + unified webhooks
- `/coins` - Coin purchases
- `/cosmetics` - Cosmetics shop
- `/minigames` - Mini-game activities
- `/progression` - Phases, projects, upgrades
- `/stocks` - Stock market trading
- `/notifications` - In-game notifications

## Admin Dashboard

Separate microservice at http://localhost:3003 with pages for:
- Dashboard (overview stats)
- Users (player management, premium, coins)
- Economy (cash circulation, market data)
- Analytics (retention, revenue)
- Stocks (bot stocks, player IPOs)
- GameConfig (property/business settings)
- Coupons (promotional codes)
- Cosmetics (item management)
- System/Security/Logs/Health

## Key Configuration

- **TypeScript:** Strict mode enabled (tsconfig.base.json)
- **ESLint:** `@typescript-eslint/recommended` + Prettier integration
- **Prettier:** Single quotes, semicolons, 100 char width, trailing commas

## Design Documents

Implementation plans are in `/docs/plans/`:
- `IMPLEMENTATION-STATUS.md` - Current progress tracker
- `2025-11-28-the-mint-technical-design.md` - System architecture
- Archived plans in `/docs/plans/archive/`
