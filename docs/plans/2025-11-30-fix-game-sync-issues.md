# Fix Game Mechanics Sync Issues Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix synchronization issues between frontend state, displayed cash, and backend data so game mechanics work in harmony.

**Architecture:** Consolidate cash display to a single source of truth in the gameStore. Remove duplicate ticker logic from CashTicker component. Ensure all game actions immediately update displayedCash. Add smooth client-side animation for business cycles.

**Tech Stack:** React, Zustand, TypeScript

---

## Task 1: Remove Duplicate Cash Ticker from CashTicker Component

**Files:**
- Modify: `apps/web/src/pages/DashboardPage.tsx:11-113`

**Problem:** CashTicker has its own `requestAnimationFrame` loop that duplicates the store's ticker, causing income to appear to accumulate at 2x the real rate.

**Step 1: Simplify CashTicker to use store's displayedCash directly**

Replace the entire CashTicker component (lines 11-113) with:

```tsx
// Smooth cash ticker component - uses store's displayedCash directly
function CashTicker() {
  const { stats, displayedCash, incomePerSecond, startTicker, stopTicker } = useGameStore();
  const [minuteProgress, setMinuteProgress] = useState(0);
  const minuteStartRef = useRef<number>(Date.now());
  const animationRef = useRef<number | null>(null);

  const incomePerHour = parseFloat(stats?.effectiveIncomeHour || '0');
  const incomePerMin = incomePerHour / 60;

  // Generate sparkline data based on income trend
  const sparklineData = useMemo(() => {
    const baseValue = displayedCash;
    const data: number[] = [];
    for (let i = 0; i < 12; i++) {
      const variation = (Math.random() - 0.3) * incomePerMin;
      data.push(Math.max(0, baseValue - (12 - i) * incomePerMin + variation));
    }
    return data;
  }, [Math.floor(displayedCash / 100), incomePerMin]);

  // Start/stop the store's ticker
  useEffect(() => {
    if (stats) {
      startTicker();
    }
    return () => stopTicker();
  }, [stats, startTicker, stopTicker]);

  // Animate only the minute progress ring (not the cash value)
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const elapsedInMinute = (now - minuteStartRef.current) % 60000;
      setMinuteProgress(elapsedInMinute / 60000);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const formatSmallCurrency = (amount: number) => {
    if (amount < 0.01) return `$${amount.toFixed(4)}`;
    if (amount < 1) return `$${amount.toFixed(3)}`;
    return formatCurrency(amount);
  };

  const formattedCash = displayedCash.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <StatCard
      icon="💵"
      value={formattedCash}
      label="Total Cash"
      color="mint"
      badge={incomePerHour > 0 ? 'earning' : undefined}
      badgeColor="green"
      sparklineData={incomePerHour > 0 ? sparklineData : undefined}
      subtitle={
        incomePerHour > 0 ? (
          <div className="space-y-1">
            <StatRow label="Per Minute" value={`+${formatSmallCurrency(incomePerMin)}`} valueColor="mint" />
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">This Minute</span>
              <div className="flex items-center gap-2">
                <ProgressRing value={minuteProgress * 100} color="mint" size={16} strokeWidth={2} />
                <span className="font-mono text-zinc-300">{Math.floor(minuteProgress * 60)}s</span>
              </div>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
```

**Step 2: Remove unused imports**

Update the imports at the top of the file (line 1):

```tsx
import { useEffect, useState, useRef, useMemo } from 'react';
```

(Remove unused imports if any were only used by the old implementation)

**Step 3: Verify the fix**

Run: `pnpm --filter @mint/web dev`

Test manually:
1. Open dashboard, watch cash ticker
2. Verify cash increments at normal rate (not 2x)
3. Compare displayed income rate with actual accumulation

**Step 4: Commit**

```bash
git add apps/web/src/pages/DashboardPage.tsx
git commit -m "fix: remove duplicate cash ticker animation loop

The CashTicker component had its own requestAnimationFrame loop
that duplicated the store's ticker, causing cash to appear to
accumulate at 2x the real rate. Now uses store's displayedCash directly."
```

---

## Task 2: Fix Race Condition in startTicker

**Files:**
- Modify: `apps/web/src/stores/gameStore.ts:273-311`

**Problem:** `collectEarnings()` is called without awaiting, so ticker might increment stale values.

**Step 1: Make startTicker await initial collectEarnings**

Replace the `startTicker` function (lines 273-311) with:

```typescript
  // Start real-time cash ticker (updates displayed cash every 100ms)
  startTicker: async () => {
    // Clear any existing intervals
    const existingTicker = get().tickerInterval;
    const existingSync = get().syncInterval;
    if (existingTicker) clearInterval(existingTicker);
    if (existingSync) clearInterval(existingSync);

    // Initialize displayedCash from current stats
    const stats = get().stats;
    if (stats) {
      const incomePerHour = parseFloat(stats.effectiveIncomeHour);
      const cash = parseFloat(stats.cash);
      set({
        displayedCash: cash,
        lastSyncedCash: cash,
        incomePerSecond: incomePerHour / 3600,
        syncFailed: false,
      });
    }

    // Collect from server immediately to sync - AWAIT this
    await get().collectEarnings();

    // Update displayed cash locally every 100ms
    const tickerInterval = setInterval(() => {
      const { displayedCash, incomePerSecond, syncFailed } = get();
      // Don't increment if sync failed (wait for recovery)
      if (incomePerSecond > 0 && !syncFailed) {
        set({ displayedCash: displayedCash + incomePerSecond * 0.1 });
      }
    }, 100);

    // Sync with server every 2 seconds
    const syncInterval = setInterval(() => {
      get().collectEarnings();
    }, 2000);

    set({ tickerInterval, syncInterval });
  },
```

**Step 2: Update the type signature**

Update the interface (around line 56) to make startTicker async:

```typescript
  // Ticker
  collectEarnings: () => Promise<void>;
  startTicker: () => Promise<void>;
  stopTicker: () => void;
```

**Step 3: Verify the fix**

Run: `pnpm --filter @mint/web dev`

Test: Open dashboard, verify initial cash value matches server state immediately.

**Step 4: Commit**

```bash
git add apps/web/src/stores/gameStore.ts
git commit -m "fix: await collectEarnings in startTicker to prevent race condition

Previously, collectEarnings was called without awaiting, so the ticker
could start incrementing stale displayedCash before the server response
arrived. Now awaits the initial sync before starting the ticker."
```

---

## Task 3: Update displayedCash Immediately After Game Actions

**Files:**
- Modify: `apps/web/src/stores/gameStore.ts:147-233`

**Problem:** Game actions update `stats.cash` but not `displayedCash`, causing a jarring 2-second delay.

**Step 1: Create helper to sync displayedCash from stats**

Add this helper function inside the store (after line 86, before fetchStats):

```typescript
  // Helper to sync displayedCash from stats after game actions
  syncDisplayedCashFromStats: () => {
    const stats = get().stats;
    if (stats) {
      const cash = parseFloat(stats.cash);
      const incomePerHour = parseFloat(stats.effectiveIncomeHour);
      set({
        displayedCash: cash,
        lastSyncedCash: cash,
        incomePerSecond: incomePerHour / 3600,
      });
    }
  },
```

**Step 2: Add to interface**

Add to the GameState interface (around line 62):

```typescript
  // Helpers
  clearError: () => void;
  reset: () => void;
  refreshStats: () => Promise<void>;
  syncDisplayedCashFromStats: () => void;
```

**Step 3: Update buyProperty to sync displayedCash**

Replace `buyProperty` (lines 147-156):

```typescript
  buyProperty: async (typeId: number) => {
    set({ error: null });
    const response = await gameApi.buyProperty(typeId);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerProperties()]);
      get().syncDisplayedCashFromStats();
      return true;
    }
    set({ error: response.error?.message || 'Failed to buy property' });
    return false;
  },
```

**Step 4: Update upgradeProperty to sync displayedCash**

Replace `upgradeProperty` (lines 158-166):

```typescript
  upgradeProperty: async (propertyId: string) => {
    set({ error: null });
    const response = await gameApi.upgradeProperty(propertyId);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerProperties()]);
      get().syncDisplayedCashFromStats();
      return true;
    }
    set({ error: response.error?.message || 'Failed to upgrade property' });
    return false;
  },
```

**Step 5: Update hireManager to sync displayedCash**

Replace `hireManager` (lines 169-177):

```typescript
  hireManager: async (propertyId: string) => {
    set({ error: null });
    const response = await gameApi.hireManager(propertyId);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerProperties()]);
      get().syncDisplayedCashFromStats();
      return true;
    }
    set({ error: response.error?.message || 'Failed to hire manager' });
    return false;
  },
```

**Step 6: Update sellProperty to sync displayedCash**

Replace `sellProperty` (lines 180-189):

```typescript
  sellProperty: async (propertyId: string, quantity: number = 1) => {
    set({ error: null });
    const response = await gameApi.sellProperty(propertyId, quantity);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerProperties()]);
      get().syncDisplayedCashFromStats();
      return true;
    }
    set({ error: response.error?.message || 'Failed to sell property' });
    return false;
  },
```

**Step 7: Update buyBusiness to sync displayedCash**

Replace `buyBusiness` (lines 191-200):

```typescript
  buyBusiness: async (typeId: number) => {
    set({ error: null });
    const response = await gameApi.buyBusiness(typeId);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerBusinesses()]);
      get().syncDisplayedCashFromStats();
      return true;
    }
    set({ error: response.error?.message || 'Failed to buy business' });
    return false;
  },
```

**Step 8: Update levelUpBusiness to sync displayedCash**

Replace `levelUpBusiness` (lines 202-211):

```typescript
  levelUpBusiness: async (businessId: string) => {
    set({ error: null });
    const response = await gameApi.levelUpBusiness(businessId);
    if (response.success) {
      await Promise.all([get().fetchStats(), get().fetchPlayerBusinesses()]);
      get().syncDisplayedCashFromStats();
      return true;
    }
    set({ error: response.error?.message || 'Failed to level up business' });
    return false;
  },
```

**Step 9: Update collectBusinessRevenue to sync displayedCash**

Replace `collectBusinessRevenue` (lines 213-222):

```typescript
  collectBusinessRevenue: async (businessId: string) => {
    set({ error: null });
    const response = await gameApi.collectBusinessRevenue(businessId);
    if (response.success && response.data) {
      await Promise.all([get().fetchStats(), get().fetchPlayerBusinesses()]);
      get().syncDisplayedCashFromStats();
      return response.data.collected;
    }
    set({ error: response.error?.message || 'Failed to collect revenue' });
    return null;
  },
```

**Step 10: Update collectOfflineEarnings to sync displayedCash**

Replace `collectOfflineEarnings` (lines 224-233):

```typescript
  collectOfflineEarnings: async () => {
    set({ error: null });
    const response = await gameApi.collectOfflineEarnings();
    if (response.success && response.data) {
      await Promise.all([get().fetchStats(), get().fetchOfflineStatus()]);
      get().syncDisplayedCashFromStats();
      return response.data.collected;
    }
    set({ error: response.error?.message || 'Failed to collect offline earnings' });
    return null;
  },
```

**Step 11: Verify the fix**

Run: `pnpm --filter @mint/web dev`

Test manually:
1. Buy a property - cash should decrease immediately in ticker
2. Collect business revenue - cash should increase immediately
3. Collect offline earnings - cash should update immediately

**Step 12: Commit**

```bash
git add apps/web/src/stores/gameStore.ts
git commit -m "fix: sync displayedCash immediately after all game actions

Added syncDisplayedCashFromStats helper that updates displayedCash,
lastSyncedCash, and incomePerSecond from the latest stats.
Called after every game action to eliminate the 2-second delay
before cash changes appear in the ticker."
```

---

## Task 4: Add Smooth Business Cycle Progress Animation

**Files:**
- Modify: `apps/web/src/pages/BusinessesPage.tsx:245-341`

**Problem:** Business cycle progress only updates every 5 seconds, causing choppy UI.

**Step 1: Create animated progress component**

Add this new component before `OwnedBusinessCard` (around line 237):

```tsx
// Animated cycle progress that updates in real-time
function AnimatedCycleProgress({
  cycleStart,
  cycleSeconds,
  cycleComplete
}: {
  cycleStart: string;
  cycleSeconds: number;
  cycleComplete: boolean;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (cycleComplete) {
      setProgress(100);
      return;
    }

    const updateProgress = () => {
      const startTime = new Date(cycleStart).getTime();
      const elapsed = (Date.now() - startTime) / 1000;
      const newProgress = Math.min(100, (elapsed / cycleSeconds) * 100);
      setProgress(newProgress);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100);

    return () => clearInterval(interval);
  }, [cycleStart, cycleSeconds, cycleComplete]);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-zinc-500">Cycle Progress</span>
        <span className="font-medium text-zinc-200">
          {cycleComplete ? 'Ready!' : `${Math.floor(progress)}%`}
        </span>
      </div>
      <div className="w-full bg-dark-border rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-100 ${
            cycleComplete ? 'bg-green-500' : 'bg-purple-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

**Step 2: Update OwnedBusinessCard to use AnimatedCycleProgress**

In `OwnedBusinessCard`, replace the cycle progress section (lines 273-292) with:

```tsx
      {/* Cycle Progress */}
      <AnimatedCycleProgress
        cycleStart={business.currentCycleStart}
        cycleSeconds={business.cycleSeconds}
        cycleComplete={business.cycleComplete}
      />
      <p className="text-xs text-zinc-600 -mt-3 mb-4">
        Cycle time: {formatTime(business.cycleSeconds)}
      </p>
```

**Step 3: Add currentCycleStart to PlayerBusiness type if needed**

Check `apps/web/src/api/game.ts` - the `PlayerBusiness` interface should already include `currentCycleStart`. If not, add it:

```typescript
export interface PlayerBusiness {
  // ... existing fields
  currentCycleStart: string;
  // ...
}
```

**Step 4: Reduce polling interval since we have real-time animation**

In `BusinessesPage`, change the refresh interval (lines 39-45) from 5 seconds to 10 seconds since progress is now animated client-side:

```tsx
  // Refresh businesses every 10 seconds (progress is animated client-side)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPlayerBusinesses();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchPlayerBusinesses]);
```

**Step 5: Verify the fix**

Run: `pnpm --filter @mint/web dev`

Test:
1. Go to Businesses page
2. Watch a business cycle progress
3. Verify progress bar animates smoothly every 100ms
4. Verify "Ready!" appears when cycle completes

**Step 6: Commit**

```bash
git add apps/web/src/pages/BusinessesPage.tsx
git commit -m "fix: add smooth real-time animation for business cycle progress

Added AnimatedCycleProgress component that updates every 100ms
using the stored cycleStart timestamp. This eliminates the choppy
5-second jumps and provides smooth visual feedback.
Reduced polling interval to 10s since animation is client-side."
```

---

## Task 5: Fix startTicker Call in CashTicker (async handling)

**Files:**
- Modify: `apps/web/src/pages/DashboardPage.tsx:27-32`

**Problem:** After making startTicker async (Task 2), we need to handle the Promise in CashTicker.

**Step 1: Update the useEffect that calls startTicker**

Replace the startTicker useEffect in CashTicker (around lines 27-32 after Task 1 changes):

```tsx
  // Start/stop the store's ticker
  useEffect(() => {
    if (stats) {
      // startTicker is async but we don't need to await it here
      // as it handles its own state updates
      void startTicker();
    }
    return () => stopTicker();
  }, [stats, startTicker, stopTicker]);
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm --filter @mint/web typecheck`

Expected: No errors related to startTicker Promise handling.

**Step 3: Commit**

```bash
git add apps/web/src/pages/DashboardPage.tsx
git commit -m "fix: properly handle async startTicker in CashTicker useEffect"
```

---

## Task 6: Final Integration Test

**Step 1: Run full type check**

Run: `pnpm typecheck`

Expected: No TypeScript errors.

**Step 2: Run linter**

Run: `pnpm lint`

Expected: No linting errors (or only pre-existing ones).

**Step 3: Manual integration test**

Test the following scenarios:

1. **Cash ticker sync:**
   - Open dashboard
   - Verify cash increments at correct rate (not 2x)
   - Verify initial value matches server immediately

2. **Property actions:**
   - Buy a property - cash decreases immediately
   - Upgrade a property - cash decreases immediately
   - Sell a property - cash increases immediately
   - Hire manager - cash decreases immediately

3. **Business actions:**
   - Buy a business - cash decreases immediately
   - Level up business - cash decreases immediately
   - Wait for cycle to complete
   - Collect revenue via mini-game - cash increases immediately after success

4. **Business cycle animation:**
   - Watch cycle progress bar
   - Verify smooth animation (not choppy 5-second jumps)
   - Verify "Ready!" appears exactly when cycle completes

5. **Offline earnings:**
   - Close app, wait, reopen
   - Collect offline earnings - cash increases immediately

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: verify game sync fixes working correctly"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `DashboardPage.tsx` | Remove duplicate ticker loop in CashTicker, use store's displayedCash directly |
| `gameStore.ts` | Make startTicker async, add syncDisplayedCashFromStats helper, call it after all game actions |
| `BusinessesPage.tsx` | Add AnimatedCycleProgress component for smooth real-time cycle progress |

## Expected Outcomes

1. Cash ticker shows correct income rate (not 2x)
2. No race condition on initial load
3. All game actions immediately reflect in cash display
4. Business cycle progress animates smoothly
5. Mini-game rewards appear immediately after success
