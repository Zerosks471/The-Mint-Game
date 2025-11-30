# Premium Features Integration Design

**Date:** November 30, 2025
**Status:** Ready for implementation
**Phase:** 3 (Monetization) - Part 1

---

## Implementation Tasks

### Backend Tasks
- [ ] Task 1: Add premium income multiplier to game.service.ts
- [ ] Task 2: Add dynamic offline cap (24hr premium / 8hr free)
- [ ] Task 3: Ensure isPremium included in /user/me response

### Frontend Tasks
- [ ] Task 4: Create PremiumBadge.tsx component
- [ ] Task 5: Create UpgradeModal.tsx component
- [ ] Task 6: Create UpgradeButton.tsx component
- [ ] Task 7: Add premium badge + upgrade button to Layout.tsx navbar
- [ ] Task 8: Add premium badges to LeaderboardPage.tsx
- [ ] Task 9: Add premium section to StatsPage.tsx
- [ ] Task 10: Add upgrade CTA to DashboardPage.tsx offline modal

### Testing
- [ ] Task 11: Manual verification with database toggle

---

## Overview

Wire up existing `isPremium` database flag to unlock premium benefits throughout the app, with placeholder upgrade UI.

### Premium Benefits
- +10% income bonus (stacks with prestige multiplier)
- 24hr offline earnings cap (vs 8hr free)
- Premium badge on navbar, profile, leaderboards, friend lists
- 500 coins granted on subscription (handled later with Stripe)

### Scope
- Backend: Modify income calculation and offline collection logic
- Frontend: Add premium badges, upgrade CTAs, "Coming Soon" modal
- No Stripe integration yet - test by manually setting `isPremium=true`

---

## Backend Changes

### Income Calculation (game.service.ts)

Apply premium bonus when calculating `effectiveIncomeHour`:

```typescript
// Current: effectiveIncome = baseIncome * prestigeMultiplier
// New: effectiveIncome = baseIncome * prestigeMultiplier * premiumMultiplier

const premiumMultiplier = user.isPremium ? 1.10 : 1.0;
const effectiveIncome = baseIncome
  .mul(prestigeMultiplier)
  .mul(premiumMultiplier);
```

### Offline Collection (game.service.ts)

Dynamic cap check at collection time:

```typescript
// Replace: const maxHours = stats.offlineCapHours;
// With:
const maxHours = user.isPremium ? 24 : 8;
```

### API Response Enhancement

Add `isPremium` to user responses so frontend knows badge state:

```typescript
// In /user/me and /user/stats responses
{
  ...userData,
  isPremium: user.isPremium,
  premiumUntil: user.premiumUntil,
}
```

No new endpoints needed.

---

## Frontend Components

### PremiumBadge.tsx

Reusable badge component:

```typescript
interface PremiumBadgeProps {
  size?: 'sm' | 'md';  // sm for lists, md for profile
}

// Renders: star/crown icon with gold styling
// sm: 16px icon inline
// md: 24px icon with "Premium" text
```

### UpgradeModal.tsx

"Coming Soon" placeholder modal:

```typescript
interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Content:
// - "Upgrade to Premium" header
// - Benefits list (24hr offline, +10% income, 500 coins/mo, exclusive badge)
// - Price preview ($4.99/mo or $39.99/yr)
// - "Coming Soon" button (disabled state)
```

### UpgradeButton.tsx

CTA button that opens UpgradeModal:

```typescript
// Gold/gradient button
// Used in: navbar, settings, offline collection screen
```

---

## UI Placements

### Navbar (Layout.tsx)
- Show `PremiumBadge` next to username if premium
- Show `UpgradeButton` (small, subtle) if not premium

### Leaderboard (LeaderboardPage.tsx)
- Add `PremiumBadge` next to usernames of premium players
- Shows social proof, encourages conversion

### Profile/Stats (StatsPage.tsx)
- Premium section showing active benefits if premium
- "Upgrade" CTA card if not premium, listing benefits

### Offline Collection Modal (DashboardPage.tsx)
- If not premium and earnings were capped at 8hr:
  - Show "You missed X hours of earnings"
  - "Upgrade to Premium for 24hr cap" CTA

---

## Testing Strategy

### Manual Testing

Test by directly setting database values:

```sql
-- Enable premium for a test user
UPDATE users SET is_premium = true, premium_until = NOW() + INTERVAL '30 days' WHERE email = 'test@example.com';

-- Disable premium
UPDATE users SET is_premium = false, premium_until = NULL WHERE email = 'test@example.com';
```

### Verification Checklist
- [ ] Income shows +10% when premium (check effective vs base in stats)
- [ ] Offline cap extends to 24hr
- [ ] Badge appears in navbar, leaderboards, profile
- [ ] Upgrade button/modal shows for free users
- [ ] Upgrade button hidden for premium users
- [ ] Premium benefits disappear when `is_premium` set to false

---

## Files to Modify

| File | Changes |
|------|---------|
| `services/api-gateway/src/services/game.service.ts` | Income multiplier, offline cap |
| `apps/web/src/components/Layout.tsx` | Navbar badge + upgrade button |
| `apps/web/src/pages/LeaderboardPage.tsx` | Premium badges on rankings |
| `apps/web/src/pages/StatsPage.tsx` | Premium status section |
| `apps/web/src/pages/DashboardPage.tsx` | Upgrade CTA on capped earnings |

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/components/PremiumBadge.tsx` | Reusable badge component |
| `apps/web/src/components/UpgradeModal.tsx` | Coming soon upgrade modal |
| `apps/web/src/components/UpgradeButton.tsx` | CTA button |

---

## Next Steps (After This)

1. Stripe Checkout integration
2. Webhook handling for subscription events
3. Mint Coins store
4. Cosmetics shop

---

*Design finalized November 30, 2025*
