# Stripe Integration Design

**Date:** November 30, 2025
**Status:** Ready for implementation
**Phase:** 3 (Monetization) - Part 2

---

## Overview

Integrate Stripe Checkout for premium subscriptions. Users click "Subscribe" in the UpgradeModal, get redirected to Stripe-hosted checkout, and return to the app after payment. Webhook events update premium status and grant Mint Coins.

### Flow

```
User clicks "Subscribe" in UpgradeModal
         ↓
Frontend calls POST /api/v1/subscriptions/checkout
         ↓
Backend creates Stripe Checkout Session
         ↓
User redirected to Stripe-hosted checkout
         ↓
After payment, Stripe sends webhook events
         ↓
Backend updates user.isPremium + grants 500 Mint Coins
         ↓
User redirected back to app with success URL
```

---

## New Files

| File | Purpose |
|------|---------|
| `services/api-gateway/src/routes/subscriptions.ts` | Checkout, webhook, status, portal endpoints |
| `services/api-gateway/src/services/subscription.service.ts` | Stripe API logic |
| `apps/web/src/pages/SubscriptionSuccessPage.tsx` | Post-checkout success page |
| `apps/web/src/pages/SubscriptionCancelPage.tsx` | Checkout cancelled page |

---

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
```

---

## API Endpoints

### POST /api/v1/subscriptions/checkout

Creates a Stripe Checkout Session and returns the redirect URL.

**Request:**
```typescript
{ plan: "monthly" | "annual" }
```

**Response:**
```typescript
{ checkoutUrl: "https://checkout.stripe.com/..." }
```

**Logic:**
- Creates or retrieves Stripe customer using `user.stripeCustomerId`
- Stores `stripeCustomerId` on user if new
- Sets success URL: `{APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`
- Sets cancel URL: `{APP_URL}/subscription/cancel`

### POST /api/v1/subscriptions/webhook

Handles Stripe webhook events. No auth required - verified by Stripe signature.

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set `isPremium=true`, set `premiumUntil`, grant 500 Mint Coins, create Subscription record |
| `customer.subscription.updated` | Update `premiumUntil` on renewal |
| `customer.subscription.deleted` | Set `isPremium=false`, clear `premiumUntil` |
| `invoice.payment_failed` | Log warning (optional: send email) |

### GET /api/v1/subscriptions/status

Returns current subscription status for logged-in user.

**Response:**
```typescript
{
  isPremium: boolean,
  plan: "monthly" | "annual" | null,
  expiresAt: string | null,
  cancelAtPeriodEnd: boolean
}
```

### POST /api/v1/subscriptions/portal

Creates Stripe Customer Portal session for managing billing.

**Response:**
```typescript
{ portalUrl: "https://billing.stripe.com/..." }
```

---

## Frontend Changes

### UpgradeModal.tsx

Update from "Coming Soon" to functional checkout:

```typescript
const handleSubscribe = async (plan: 'monthly' | 'annual') => {
  setLoading(true);
  try {
    const { checkoutUrl } = await api.post('/subscriptions/checkout', { plan });
    window.location.href = checkoutUrl;
  } catch (error) {
    toast.error('Failed to start checkout');
    setLoading(false);
  }
};
```

- Two buttons: "Monthly $4.99/mo" and "Annual $39.99/yr (Save 33%)"
- Loading state while creating checkout session
- Error handling with toast notification

### SubscriptionSuccessPage.tsx

Route: `/subscription/success`

- "Welcome to Premium!" heading
- Animated confetti or celebration
- List of activated benefits:
  - +10% income bonus
  - 24-hour offline earnings
  - 500 Mint Coins added
  - Premium badge unlocked
- "Start Playing" button → Dashboard

### SubscriptionCancelPage.tsx

Route: `/subscription/cancel`

- "No problem!" heading
- Brief message about trying again later
- List premium benefits as reminder
- "Back to Game" button → Dashboard

### StatsPage.tsx Updates

For premium users, add subscription management section:

```typescript
{user.isPremium && (
  <div>
    <p>Premium until: {formatDate(user.premiumUntil)}</p>
    <button onClick={openPortal}>Manage Subscription</button>
  </div>
)}
```

---

## Database Updates

### Subscription Record

When checkout completes, create record in `subscriptions` table:

```typescript
{
  userId: user.id,
  planId: 'premium_monthly' | 'premium_annual',
  stripeCustomerId: session.customer,
  stripeSubscriptionId: session.subscription,
  status: 'active',
  currentPeriodStart: subscription.current_period_start,
  currentPeriodEnd: subscription.current_period_end
}
```

### User Updates

On successful subscription:
```typescript
user.isPremium = true;
user.premiumUntil = subscription.current_period_end;
user.stripeCustomerId = customer.id;
playerStats.premiumCurrency += 500; // Grant Mint Coins
```

On subscription cancelled/expired:
```typescript
user.isPremium = false;
user.premiumUntil = null;
```

---

## Local Development Setup

### 1. Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

### 2. Forward Webhooks

```bash
stripe listen --forward-to localhost:3001/api/v1/subscriptions/webhook
```

Copy the webhook secret (`whsec_...`) to `.env`.

### 3. Create Test Products

In Stripe Dashboard (Test Mode):

1. Create Product: "The Mint Premium"
2. Add Price: $4.99/month recurring → copy `price_...` ID
3. Add Price: $39.99/year recurring → copy `price_...` ID
4. Add to `.env`:
   ```
   STRIPE_PRICE_MONTHLY=price_...
   STRIPE_PRICE_ANNUAL=price_...
   ```

### 4. Configure Customer Portal

In Stripe Dashboard → Settings → Customer Portal:
- Enable subscription cancellation
- Enable subscription switching
- Set default return URL

---

## Test Cards

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0025 0000 3155 | Requires 3D Secure |

Use any future expiry date and any 3-digit CVC.

---

## Implementation Tasks

### Backend Tasks
- [ ] Task 1: Install Stripe SDK (`pnpm add stripe` in api-gateway)
- [ ] Task 2: Add Stripe env vars to .env.example
- [ ] Task 3: Create subscription.service.ts with Stripe client
- [ ] Task 4: Implement POST /checkout endpoint
- [ ] Task 5: Implement POST /webhook endpoint with signature verification
- [ ] Task 6: Implement GET /status endpoint
- [ ] Task 7: Implement POST /portal endpoint
- [ ] Task 8: Register routes in routes/index.ts

### Frontend Tasks
- [ ] Task 9: Update UpgradeModal with functional checkout buttons
- [ ] Task 10: Create SubscriptionSuccessPage.tsx
- [ ] Task 11: Create SubscriptionCancelPage.tsx
- [ ] Task 12: Add routes to App.tsx
- [ ] Task 13: Add "Manage Subscription" to StatsPage for premium users
- [ ] Task 14: Add subscription API functions to api/

### Testing Tasks
- [ ] Task 15: Test checkout flow with test cards
- [ ] Task 16: Test webhook handling (subscription created/cancelled)
- [ ] Task 17: Verify premium status updates correctly
- [ ] Task 18: Verify Mint Coins granted on subscription
- [ ] Task 19: Test Customer Portal access

---

## Verification Checklist

- [ ] Checkout redirects to Stripe
- [ ] Successful payment sets `isPremium=true`
- [ ] 500 Mint Coins granted on first subscription
- [ ] Premium badge appears in navbar after subscribing
- [ ] Success page shows after payment
- [ ] Customer Portal allows subscription management
- [ ] Cancellation sets `isPremium=false` at period end
- [ ] Webhook signature verification rejects invalid requests

---

## Security Considerations

- Webhook endpoint uses raw body for signature verification
- No sensitive data logged
- Customer Portal used for all billing management (PCI compliant)
- Stripe handles all card data (never touches our servers)

---

*Design finalized November 30, 2025*
