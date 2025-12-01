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
