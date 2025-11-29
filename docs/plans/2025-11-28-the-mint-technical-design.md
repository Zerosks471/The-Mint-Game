# The Mint - Technical Design Document

**Version:** 1.0
**Date:** November 28, 2025
**Status:** Approved

---

## Executive Summary

**The Mint** is an idle financial tycoon simulation game where players build investment empires through real estate, business management, and strategic decision-making. This document provides the complete technical specification for building The Mint as a web-first application with plans for future iOS expansion.

### Key Decisions

| Decision | Choice |
|----------|--------|
| **Game Name** | The Mint |
| **Platform** | Web-first (React), iOS later (React Native) |
| **Complexity** | Mid-complexity management (properties + businesses) |
| **Social Features** | Leaderboards + light social (friends, clubs) |
| **Monetization** | Cosmetics + time-savers (subscription model) |
| **Prestige System** | Soft prestige ("Go Public") |
| **Offline Earnings** | Capped (8h free / 24h premium) |
| **Visual Style** | Playful illustrated |
| **Scale** | Startup (10K-100K users, 4-8 month MVP) |
| **MVP Scope** | Real Estate + Businesses (stocks in Phase 2) |

---

## Table of Contents

1. [Technical Architecture](#1-technical-architecture)
2. [Database Schema](#2-database-schema)
3. [API Gateway & Security](#3-api-gateway--security)
4. [Authentication System](#4-authentication-system)
5. [UI Wireframes](#5-ui-wireframes)
6. [Development Roadmap](#6-development-roadmap)
7. [Monetization Plan](#7-monetization-plan)

---

## 1. Technical Architecture

### System Overview

```
                                    ┌─────────────────┐
                                    │   CloudFlare    │
                                    │   (CDN/WAF)     │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
            ┌───────▼───────┐       ┌────────▼────────┐      ┌───────▼───────┐
            │  React Web    │       │  API Gateway    │      │  WebSocket    │
            │  (Vercel)     │       │  (Express.js)   │      │  Server       │
            └───────────────┘       └────────┬────────┘      └───────┬───────┘
                                             │                       │
                    ┌────────────────────────┼───────────────────────┤
                    │            │           │           │           │
            ┌───────▼───┐ ┌──────▼────┐ ┌────▼─────┐ ┌───▼────┐ ┌────▼─────┐
            │   User    │ │   Game    │ │ Payment  │ │Leaderb.│ │  Social  │
            │  Service  │ │  State    │ │ Service  │ │Service │ │ Service  │
            └─────┬─────┘ └─────┬─────┘ └────┬─────┘ └───┬────┘ └────┬─────┘
                  │             │            │           │           │
            ┌─────▼─────────────▼────────────▼───────────▼───────────▼─────┐
            │                        PostgreSQL                             │
            │              (Primary + Read Replica)                         │
            └──────────────────────────┬───────────────────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │     Redis       │
                              │ (Cache/Sessions)│
                              └─────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React + TypeScript + Vite | Web application |
| Styling | Tailwind CSS | UI components |
| State | Zustand | Client state management |
| Backend | Node.js + Express.js | API services |
| Database | PostgreSQL | Primary data store |
| Cache | Redis | Sessions, caching, pub/sub |
| Payments | Stripe | Web subscriptions |
| Hosting | Vercel (FE) + Railway (BE) | Cloud infrastructure |
| CDN | CloudFlare | CDN, WAF, DDoS protection |

### Service Responsibilities

| Service | Responsibility |
|---------|---------------|
| **API Gateway** | Routing, rate limiting, auth validation |
| **User Service** | Registration, auth, profiles, settings |
| **Game State Service** | Properties, businesses, income calc, prestige |
| **Payment Service** | Stripe integration, subscriptions, receipts |
| **Leaderboard Service** | Rankings, friend comparisons, clubs |
| **Social Service** | Friends, notifications, achievements |
| **WebSocket Server** | Real-time updates, income ticks |

---

## 2. Database Schema

### User Domain

```sql
-- Core user account
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    username            VARCHAR(50) UNIQUE NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,

    -- Profile
    display_name        VARCHAR(100),
    avatar_id           VARCHAR(100) DEFAULT 'default_avatar',
    bio                 VARCHAR(500),
    country_code        VARCHAR(2),
    timezone            VARCHAR(50) DEFAULT 'UTC',

    -- Account status
    email_verified      BOOLEAN DEFAULT FALSE,
    email_verify_token  VARCHAR(255),
    account_status      VARCHAR(20) DEFAULT 'active',

    -- Security
    password_reset_token    VARCHAR(255),
    password_reset_expires  TIMESTAMP,
    failed_login_attempts   INT DEFAULT 0,
    locked_until            TIMESTAMP,
    two_factor_enabled      BOOLEAN DEFAULT FALSE,
    two_factor_secret       VARCHAR(255),

    -- Preferences
    theme                   VARCHAR(20) DEFAULT 'light',
    sound_enabled           BOOLEAN DEFAULT TRUE,
    music_enabled           BOOLEAN DEFAULT TRUE,
    notifications_enabled   BOOLEAN DEFAULT TRUE,
    language                VARCHAR(10) DEFAULT 'en',

    -- Premium
    is_premium              BOOLEAN DEFAULT FALSE,
    premium_until           TIMESTAMP,
    stripe_customer_id      VARCHAR(255),

    -- Onboarding
    tutorial_completed      BOOLEAN DEFAULT FALSE,
    referral_code           VARCHAR(50) UNIQUE,
    referred_by_user_id     UUID REFERENCES users(id),

    -- Analytics
    signup_platform         VARCHAR(20),
    signup_ip               INET,

    -- Timestamps
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    last_login_at           TIMESTAMP,
    last_active_at          TIMESTAMP,
    deleted_at              TIMESTAMP
);

-- Player game stats
CREATE TABLE player_stats (
    user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Currency
    cash                    DECIMAL(24,2) DEFAULT 1000.00,
    premium_currency        INT DEFAULT 0,
    lifetime_cash_earned    DECIMAL(28,2) DEFAULT 0,

    -- Progression
    player_level            INT DEFAULT 1,
    experience_points       BIGINT DEFAULT 0,

    -- Prestige
    prestige_level          INT DEFAULT 0,
    prestige_points         INT DEFAULT 0,
    prestige_multiplier     DECIMAL(6,4) DEFAULT 1.0000,
    times_prestiged         INT DEFAULT 0,

    -- Income tracking
    base_income_per_hour    DECIMAL(20,2) DEFAULT 0,
    current_multiplier      DECIMAL(8,4) DEFAULT 1.0000,
    effective_income_hour   DECIMAL(20,2) DEFAULT 0,

    -- Offline mechanics
    last_collection_at      TIMESTAMP DEFAULT NOW(),
    offline_cap_hours       INT DEFAULT 8,

    -- Statistics
    total_properties_owned  INT DEFAULT 0,
    total_businesses_owned  INT DEFAULT 0,
    highest_net_worth       DECIMAL(24,2) DEFAULT 0,
    total_play_time_mins    INT DEFAULT 0,

    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);
```

### Property Domain

```sql
-- Property type definitions
CREATE TABLE property_types (
    id                  SERIAL PRIMARY KEY,
    slug                VARCHAR(50) UNIQUE NOT NULL,
    name                VARCHAR(100) NOT NULL,
    description         VARCHAR(500),
    icon_url            VARCHAR(500),
    image_url           VARCHAR(500),

    -- Category & unlock
    category            VARCHAR(50) NOT NULL,
    tier                INT DEFAULT 1,
    unlock_requirement  JSONB,

    -- Base economics
    base_cost           DECIMAL(20,2) NOT NULL,
    cost_multiplier     DECIMAL(8,4) DEFAULT 1.15,
    base_income_hour    DECIMAL(16,2) NOT NULL,
    income_multiplier   DECIMAL(8,4) DEFAULT 1.10,

    -- Manager
    manager_cost        DECIMAL(18,2),
    manager_name        VARCHAR(100),

    -- Limits
    max_quantity        INT DEFAULT 1000,
    max_upgrade_level   INT DEFAULT 100,

    -- Metadata
    sort_order          INT DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Player's owned properties
CREATE TABLE player_properties (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_type_id    INT NOT NULL REFERENCES property_types(id),

    -- Ownership
    quantity            INT DEFAULT 1,
    total_spent         DECIMAL(22,2) DEFAULT 0,

    -- Upgrades
    upgrade_level       INT DEFAULT 0,

    -- Manager
    manager_hired       BOOLEAN DEFAULT FALSE,
    manager_hired_at    TIMESTAMP,

    -- Calculated
    current_income_hour DECIMAL(18,2) DEFAULT 0,
    next_purchase_cost  DECIMAL(20,2),
    next_upgrade_cost   DECIMAL(20,2),

    -- Cosmetic
    skin_id             VARCHAR(100),

    first_purchased_at  TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, property_type_id)
);
```

### Business Domain

```sql
-- Business type definitions
CREATE TABLE business_types (
    id                  SERIAL PRIMARY KEY,
    slug                VARCHAR(50) UNIQUE NOT NULL,
    name                VARCHAR(100) NOT NULL,
    description         VARCHAR(500),
    icon_url            VARCHAR(500),
    image_url           VARCHAR(500),

    -- Category & unlock
    category            VARCHAR(50) NOT NULL,
    tier                INT DEFAULT 1,
    unlock_requirement  JSONB,

    -- Base economics
    base_cost           DECIMAL(20,2) NOT NULL,
    base_revenue        DECIMAL(16,2) NOT NULL,
    cycle_seconds       INT DEFAULT 3600,

    -- Scaling
    level_cost_mult     DECIMAL(8,4) DEFAULT 1.12,
    level_revenue_mult  DECIMAL(8,4) DEFAULT 1.08,

    -- Employees
    max_employees       INT DEFAULT 10,
    employee_base_cost  DECIMAL(16,2),
    employee_bonus_pct  DECIMAL(5,2) DEFAULT 5.00,

    -- Limits
    max_level           INT DEFAULT 200,

    sort_order          INT DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Player's owned businesses
CREATE TABLE player_businesses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_type_id    INT NOT NULL REFERENCES business_types(id),

    -- Level & progression
    level               INT DEFAULT 1,
    total_invested      DECIMAL(22,2) DEFAULT 0,

    -- Employees
    employee_count      INT DEFAULT 0,

    -- Cycle tracking
    current_cycle_start TIMESTAMP DEFAULT NOW(),
    cycle_seconds       INT,
    cycles_completed    BIGINT DEFAULT 0,
    total_revenue       DECIMAL(24,2) DEFAULT 0,

    -- Automation
    is_automated        BOOLEAN DEFAULT FALSE,

    -- Calculated
    current_revenue     DECIMAL(18,2) DEFAULT 0,
    next_level_cost     DECIMAL(20,2),

    purchased_at        TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, business_type_id)
);
```

### Social Domain

```sql
-- Friend relationships
CREATE TABLE friendships (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              VARCHAR(20) DEFAULT 'pending',
    requested_at        TIMESTAMP DEFAULT NOW(),
    responded_at        TIMESTAMP,

    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

-- Investment clubs
CREATE TABLE clubs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    description         VARCHAR(500),
    owner_id            UUID NOT NULL REFERENCES users(id),
    is_public           BOOLEAN DEFAULT TRUE,
    member_count        INT DEFAULT 1,
    max_members         INT DEFAULT 20,
    club_level          INT DEFAULT 1,
    income_bonus_pct    DECIMAL(5,2) DEFAULT 5.00,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Club memberships
CREATE TABLE club_memberships (
    club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                VARCHAR(20) DEFAULT 'member',
    status              VARCHAR(20) DEFAULT 'active',
    joined_at           TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (club_id, user_id)
);

-- Leaderboard cache
CREATE TABLE leaderboard_entries (
    leaderboard_id      VARCHAR(50) NOT NULL,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank                INT NOT NULL,
    previous_rank       INT,
    score               DECIMAL(28,2) NOT NULL,
    username            VARCHAR(50),
    display_name        VARCHAR(100),
    avatar_id           VARCHAR(100),
    updated_at          TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (leaderboard_id, user_id)
);
```

### Payment Domain

```sql
-- Subscriptions
CREATE TABLE subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id             VARCHAR(50) NOT NULL,
    stripe_customer_id  VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    status              VARCHAR(50) NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end  TIMESTAMP NOT NULL,
    trial_start         TIMESTAMP,
    trial_end           TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Purchases
CREATE TABLE purchases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_type        VARCHAR(50) NOT NULL,
    product_id          VARCHAR(100) NOT NULL,
    product_name        VARCHAR(100) NOT NULL,
    quantity            INT DEFAULT 1,
    price               DECIMAL(10,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'USD',
    payment_method      VARCHAR(50) NOT NULL,
    stripe_payment_id   VARCHAR(255),
    status              VARCHAR(50) NOT NULL,
    fulfilled           BOOLEAN DEFAULT FALSE,
    fulfilled_at        TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW()
);
```

### Achievements & Cosmetics

```sql
-- Achievement definitions
CREATE TABLE achievements (
    id                  VARCHAR(50) PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    description         VARCHAR(255) NOT NULL,
    icon_url            VARCHAR(500),
    category            VARCHAR(50) NOT NULL,
    tier                VARCHAR(20) DEFAULT 'bronze',
    points              INT DEFAULT 10,
    requirement_type    VARCHAR(50) NOT NULL,
    requirement_value   DECIMAL(24,2) NOT NULL,
    reward_cash         DECIMAL(18,2) DEFAULT 0,
    reward_premium      INT DEFAULT 0,
    reward_cosmetic_id  VARCHAR(100),
    is_secret           BOOLEAN DEFAULT FALSE,
    sort_order          INT DEFAULT 0,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Player achievements
CREATE TABLE player_achievements (
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id      VARCHAR(50) NOT NULL REFERENCES achievements(id),
    progress            DECIMAL(24,2) DEFAULT 0,
    is_completed        BOOLEAN DEFAULT FALSE,
    reward_claimed      BOOLEAN DEFAULT FALSE,
    completed_at        TIMESTAMP,
    claimed_at          TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id)
);

-- Cosmetic definitions
CREATE TABLE cosmetics (
    id                  VARCHAR(100) PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    description         VARCHAR(255),
    type                VARCHAR(50) NOT NULL,
    category            VARCHAR(50),
    rarity              VARCHAR(20) DEFAULT 'common',
    preview_url         VARCHAR(500),
    asset_url           VARCHAR(500),
    acquisition_type    VARCHAR(50) NOT NULL,
    premium_cost        INT,
    is_available        BOOLEAN DEFAULT TRUE,
    sort_order          INT DEFAULT 0,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Player cosmetics
CREATE TABLE player_cosmetics (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cosmetic_id         VARCHAR(100) NOT NULL REFERENCES cosmetics(id),
    is_equipped         BOOLEAN DEFAULT FALSE,
    acquired_via        VARCHAR(50) NOT NULL,
    acquired_at         TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, cosmetic_id)
);
```

---

## 3. API Gateway & Security

### Middleware Stack

1. **Request Logging** - Request ID, timing, user tracking
2. **Trust Proxy** - CloudFlare header validation
3. **Security Headers** - Helmet, CSP, HSTS
4. **CORS** - Origin validation
5. **Body Parser** - JSON with size limits
6. **Input Sanitization** - XSS, injection prevention
7. **Rate Limiting** - Redis-backed, per-endpoint limits
8. **Authentication** - JWT validation
9. **Idempotency** - Request deduplication

### Rate Limits

| Endpoint Type | Window | Max Requests |
|---------------|--------|--------------|
| Global | 1 min | 100 |
| Auth | 15 min | 10 |
| Password Reset | 1 hour | 3 |
| Game Actions | 1 min | 300 |
| Payments | 1 min | 20 |
| Leaderboards | 1 min | 60 |

### Security Measures

- **JWT Authentication** with refresh token rotation
- **Token reuse detection** - Invalidate entire session on reuse
- **Bcrypt password hashing** (12 rounds)
- **Breached password checking** (HaveIBeenPwned API)
- **Account lockout** after 5 failed attempts
- **Impossible travel detection**
- **Input validation** with Zod schemas
- **SQL injection prevention** via parameterized queries
- **XSS prevention** via input sanitization
- **CSRF protection** via SameSite cookies

---

## 4. Authentication System

### Token Architecture

| Token Type | Lifetime | Storage | Purpose |
|------------|----------|---------|---------|
| Access Token | 15 min | Memory | API authorization |
| Refresh Token | 7-30 days | HTTP-only cookie | Token renewal |

### Authentication Flows

1. **Registration** - Email/password, validation, verification email
2. **Login** - Credential check, 2FA if enabled, session creation
3. **Token Refresh** - Automatic rotation, reuse detection
4. **Password Reset** - Secure token, email verification
5. **2FA** - TOTP with backup codes

### Session Management

- Multi-device support
- Session listing and revocation
- Logout single device or all devices
- Activity logging

---

## 5. UI Wireframes

### Design System

| Element | Value |
|---------|-------|
| Primary Color | #10B981 (Mint Green) |
| Secondary Color | #3B82F6 (Blue) |
| Accent Color | #F59E0B (Gold) |
| Premium Color | #A855F7 (Purple) |
| Font (Headings) | Plus Jakarta Sans |
| Font (Body) | Inter |
| Border Radius | 4-24px |

### Core Screens

1. **Main Dashboard** - Portfolio overview, income display, quick actions
2. **Properties** - Real estate management with buy/upgrade
3. **Businesses** - Business ventures with cycle mechanics
4. **Go Public** - Prestige system with perk shop
5. **Leaderboards** - Global and friend rankings
6. **Social** - Friends list and clubs
7. **Premium Store** - Subscriptions and cosmetics
8. **Settings** - Account and preferences

### Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom nav |
| Tablet | 640-1024px | 2 columns, bottom nav |
| Desktop | > 1024px | 3-4 columns, side nav |

---

## 6. Development Roadmap

### Phase Overview

| Phase | Duration | Goal |
|-------|----------|------|
| Phase 0 | 2 weeks | Foundation & setup |
| Phase 1 | 6 weeks | Core game MVP |
| Phase 2 | 4 weeks | Social & polish |
| Phase 3 | 4 weeks | Monetization & launch |
| Phase 4 | 4 weeks | Post-launch iteration |

### Phase 0: Foundation (Weeks 1-2)

- Monorepo setup (pnpm/Turborepo)
- CI/CD pipeline (GitHub Actions)
- Docker development environment
- Database with Prisma
- API gateway foundation
- Frontend scaffold
- Staging deployment

### Phase 1: Core Game MVP (Weeks 3-8)

- Authentication system
- 10-15 property types
- 8-10 business types
- Income calculation engine
- Offline earnings
- Main dashboard
- Internal alpha

### Phase 2: Social & Polish (Weeks 9-12)

- Prestige system with perks
- Leaderboards (global, friends, weekly)
- Friends system with gifts
- Clubs with bonuses
- WebSocket real-time updates
- 20+ achievements
- Daily login rewards
- UI polish and animations
- Closed beta

### Phase 3: Monetization & Launch (Weeks 13-16)

- Stripe subscriptions ($4.99/mo, $39.99/yr)
- Premium currency (Mint Coins)
- Cosmetics store
- Security audit
- Performance optimization
- Production infrastructure
- Legal compliance
- Open beta / soft launch

### Phase 4: Post-Launch (Weeks 17-20)

- Launch support and monitoring
- Bug fixes and balance adjustments
- Analytics implementation
- User feedback integration
- First content update
- Engagement features

### Future: iOS (Months 6-9)

- React Native development
- Apple In-App Purchase integration
- App Store submission

---

## 7. Monetization Plan

### Revenue Streams

| Stream | Target Revenue Share |
|--------|---------------------|
| Subscriptions | 60% |
| Premium Currency | 35% |
| iOS IAP (future) | 40% post-iOS |

### Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Full game, 8hr offline cap, basic cosmetics |
| Premium Monthly | $4.99/mo | +10% income, 24hr offline, 500 coins/mo, exclusive cosmetics |
| Premium Annual | $39.99/yr | Same as monthly + 2 months free + 1000 bonus coins |

### Mint Coins Packages

| Package | Coins | Bonus | Price |
|---------|-------|-------|-------|
| Starter | 100 | 0 | $0.99 |
| Popular | 500 | +50 | $4.99 |
| Value | 1,200 | +200 | $9.99 |
| Premium | 2,500 | +500 | $19.99 |
| Mega | 6,000 | +1,500 | $44.99 |

### Coin Spending

| Category | Price Range |
|----------|-------------|
| Avatar Frames | 100-300 coins |
| Avatars | 200-500 coins |
| Profile Themes | 300-750 coins |
| Property Skins | 150-400 coins |
| Business Skins | 150-400 coins |
| Special Effects | 500-1000 coins |
| Boosts | 50-200 coins |

### Target Metrics

| Metric | Target |
|--------|--------|
| Free to Premium | 3-5% |
| Trial to Paid | 40-60% |
| Monthly Churn | < 8% |
| ARPU | $0.10-0.50 |
| LTV | $25-50 |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | High | High | Strict MVP, phase gates |
| Technical debt | Medium | Medium | Code reviews, refactor sprints |
| Payment delays | Medium | High | Start Stripe early |
| Performance issues | Medium | Medium | Early load testing |
| Game balance | High | Medium | Spreadsheet modeling, beta testing |
| Low retention | Medium | High | Analytics, fast iteration |
| Security breach | Low | Critical | Security audit, best practices |

---

## Team Recommendations

### Minimum Viable Team (3-4 people)

- Full-Stack Lead (1)
- Frontend Developer (1)
- Backend Developer (1)
- Designer/PM (0.5-1)

### Ideal Team (5-6 people)

- Tech Lead (1)
- Frontend Developers (2)
- Backend Developers (2)
- UI/UX Designer (1)
- QA Engineer (0.5)
- Product Manager (0.5)

---

## Infrastructure Costs (Monthly)

| Service | Estimated Cost |
|---------|---------------|
| Vercel (Frontend) | $20-50 |
| Railway/Render (Backend) | $50-150 |
| PostgreSQL (Managed) | $25-100 |
| Redis (Managed) | $25-50 |
| CloudFlare | $20 |
| Monitoring | $25-100 |
| **Total** | **$150-500** |

---

## Appendix

### A. Stripe Product Setup

Create in Stripe Dashboard:
- Product: "The Mint Premium"
  - Price: $4.99/month (recurring)
  - Price: $39.99/year (recurring)
- Product: "Mint Coins"
  - Prices for each coin package (one-time)

### B. Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Auth
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_ANNUAL=price_...

# App
APP_URL=https://themint.game
API_URL=https://api.themint.game
```

### C. Initial Content

**Properties (MVP):**
1. Small Apartment (Residential, Tier 1)
2. Downtown Apartment (Residential, Tier 2)
3. Suburban House (Residential, Tier 2)
4. Luxury Condo (Residential, Tier 3)
5. Beach Villa (Residential, Tier 4)
6. Corner Store (Commercial, Tier 1)
7. Office Space (Commercial, Tier 2)
8. Shopping Mall (Commercial, Tier 3)
9. Skyscraper (Commercial, Tier 4)
10. Private Mansion (Luxury, Tier 5)

**Businesses (MVP):**
1. Food Truck (Food, Tier 1)
2. Coffee Shop (Food, Tier 2)
3. Restaurant (Food, Tier 3)
4. App Development (Tech, Tier 1)
5. Tech Startup (Tech, Tier 2)
6. Tech Giant (Tech, Tier 4)
7. Retail Store (Retail, Tier 1)
8. Department Store (Retail, Tier 3)

---

*Document prepared for The Mint development team.*
