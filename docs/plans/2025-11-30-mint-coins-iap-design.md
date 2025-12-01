# Mint Coins In-App Purchase Design

**Date:** November 30, 2025
**Status:** Ready for implementation
**Phase:** 3 (Monetization) - Part 4

---

## Overview

Add direct purchase of Mint Coins via Stripe Checkout (one-time payments). Players can buy coin packages to spend in the Cosmetics Shop.

### Flow

```
User clicks "Buy Coins" (navbar/shop/insufficient funds prompt)
         ↓
BuyCoinsModal opens showing 4 packages
         ↓
User selects package → POST /api/v1/coins/checkout
         ↓
Backend creates Stripe Checkout (one-time payment)
         ↓
User redirected to Stripe → completes payment
         ↓
Stripe webhook (checkout.session.completed) → grants coins
         ↓
User redirected to /coins/success with confirmation
```

---

## Coin Packages

| ID | Coins | Price | Bonus | Label |
|----|-------|-------|-------|-------|
| coins_100 | 100 | $0.99 | — | — |
| coins_550 | 550 | $4.99 | +10% | Popular |
| coins_1200 | 1200 | $9.99 | +20% | Best Value |
| coins_2600 | 2600 | $19.99 | +30% | — |

---

## New Files

| File | Purpose |
|------|---------|
| `services/api-gateway/src/services/coins.service.ts` | Package definitions, checkout, fulfillment |
| `services/api-gateway/src/routes/coins.ts` | API endpoints |
| `apps/web/src/components/BuyCoinsModal.tsx` | Purchase modal UI |
| `apps/web/src/pages/CoinsSuccessPage.tsx` | Post-purchase confirmation |
| `apps/web/src/api/coins.ts` | API client functions |

---

## API Endpoints

### GET /api/v1/coins/packages

Returns available packages and user's current balance.

```typescript
// Response
{
  packages: [
    { id: "coins_100", coins: 100, price: 99, bonus: null, label: null },
    { id: "coins_550", coins: 550, price: 499, bonus: 10, label: "Popular" },
    { id: "coins_1200", coins: 1200, price: 999, bonus: 20, label: "Best Value" },
    { id: "coins_2600", coins: 2600, price: 1999, bonus: 30, label: null }
  ],
  balance: 500
}
```

### POST /api/v1/coins/checkout

Creates Stripe Checkout session for one-time payment.

```typescript
// Request
{ packageId: "coins_550" }

// Response
{ checkoutUrl: "https://checkout.stripe.com/..." }
```

### POST /api/v1/coins/webhook

Handles Stripe webhook for coin fulfillment. Uses same signature verification pattern as subscriptions.

---

## Frontend Design

### BuyCoinsModal

```
┌─────────────────────────────────────────────────┐
│  Get Mint Coins                    [X] Close    │
├─────────────────────────────────────────────────┤
│  Current Balance: 🪙 500                        │
├─────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐│
│  │   100   │ │   550   │ │  1200   │ │  2600  ││
│  │  coins  │ │  coins  │ │  coins  │ │ coins  ││
│  │         │ │  +10%   │ │  +20%   │ │  +30%  ││
│  │  $0.99  │ │  $4.99  │ │  $9.99  │ │ $19.99 ││
│  │         │ │[Popular]│ │[Best ⭐]│ │        ││
│  └─────────┘ └─────────┘ └─────────┘ └────────┘│
│                                                 │
│  Secure checkout powered by Stripe 🔒          │
└─────────────────────────────────────────────────┘
```

### Trigger Points

1. **Navbar** - Click coin balance to open modal
2. **Shop page** - "Get Coins" button
3. **Insufficient funds** - Auto-prompt when trying to buy cosmetic

### CoinsSuccessPage

Route: `/coins/success`

- Celebratory animation
- Shows coins added to balance
- "Back to Shop" CTA

---

## Implementation Tasks

### Backend
- [ ] Create coins.service.ts with package definitions
- [ ] Create coins.ts routes
- [ ] Register routes in index.ts
- [ ] Add raw body parsing for webhook

### Frontend
- [ ] Create BuyCoinsModal.tsx
- [ ] Create CoinsSuccessPage.tsx
- [ ] Add coins API client
- [ ] Add /coins/success route
- [ ] Make navbar balance clickable
- [ ] Add "Get Coins" to Shop
- [ ] Add insufficient funds prompt

### Stripe Setup
- [ ] Create 4 one-time products in Dashboard
- [ ] Add STRIPE_PRICE_COINS_* env vars

---

*Design finalized November 30, 2025*
