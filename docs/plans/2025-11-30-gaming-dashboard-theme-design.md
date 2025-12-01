# Gaming Dashboard Theme Design

**Date:** 2025-11-30
**Status:** Approved
**Style:** Gaming Dashboard with Multi-color Graphs

## Overview

Complete visual overhaul of The Mint's UI from a traditional light/dark theme to a gaming dashboard aesthetic. Dark mode only, with vibrant neon accents, gradient-filled charts, and glow effects.

## Color System

### Base Palette

| Element | Color | Hex |
|---------|-------|-----|
| Background (base) | Rich Black | `#0a0a0f` |
| Card Surface | Dark Charcoal | `#12121a` |
| Card Elevated | Lighter Charcoal | `#1a1a24` |
| Input Background | Deep Black | `#0f0f15` |
| Border Default | Subtle Gray | `#2a2a3a` |
| Border Subtle | Darker Gray | `#1f1f2a` |
| Text Primary | White | `#f4f4f5` |
| Text Secondary | Muted Gray | `#71717a` |
| Text Muted | Dark Gray | `#52525b` |

### Accent Colors (with Glow Variants)

| Purpose | Color Name | Hex | Glow (40% opacity) |
|---------|------------|-----|---------------------|
| Cash/Money | Mint | `#10b981` | `rgba(16, 185, 129, 0.4)` |
| Income | Cyan | `#06b6d4` | `rgba(6, 182, 212, 0.4)` |
| Properties | Blue | `#3b82f6` | `rgba(59, 130, 246, 0.4)` |
| Businesses | Purple | `#a855f7` | `rgba(168, 85, 247, 0.4)` |
| Level/XP | Pink | `#ec4899` | `rgba(236, 72, 153, 0.4)` |
| Gold Coins | Amber | `#f59e0b` | `rgba(245, 158, 11, 0.4)` |

### CSS Variables

```css
:root {
  /* Backgrounds */
  --bg-base: #0a0a0f;
  --bg-card: #12121a;
  --bg-elevated: #1a1a24;
  --bg-input: #0f0f15;

  /* Borders */
  --border-default: #2a2a3a;
  --border-subtle: #1f1f2a;

  /* Text */
  --text-primary: #f4f4f5;
  --text-secondary: #71717a;
  --text-muted: #52525b;

  /* Accent Colors */
  --mint: #10b981;
  --mint-glow: rgba(16, 185, 129, 0.4);
  --cyan: #06b6d4;
  --cyan-glow: rgba(6, 182, 212, 0.4);
  --blue: #3b82f6;
  --blue-glow: rgba(59, 130, 246, 0.4);
  --purple: #a855f7;
  --purple-glow: rgba(168, 85, 247, 0.4);
  --pink: #ec4899;
  --pink-glow: rgba(236, 72, 153, 0.4);
  --amber: #f59e0b;
  --amber-glow: rgba(245, 158, 11, 0.4);
}
```

## Component Designs

### Card Styles

**Base Card:**
- Background: `var(--bg-card)`
- Border: `1px solid var(--border-default)`
- Border radius: `16px`
- Backdrop filter: `blur(8px)`

**Stat Card:**
- Left border accent (3px) in metric color
- Icon top-left
- Large value in white
- Label in muted gray
- Optional mini sparkline chart
- Hover: colored border + glow box-shadow

```css
.stat-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 0 20px var(--accent-glow),
              0 4px 24px rgba(0, 0, 0, 0.3);
}
```

### Sidebar Navigation

**Layout Change:** Horizontal tabs → Vertical sidebar

**Sidebar Specs:**
- Width: 240px expanded, 64px collapsed
- Background: `var(--bg-card)` with right border
- Position: Fixed left

**Nav Items:**
- Active: `border-left: 3px solid var(--mint)` + `background: rgba(16, 185, 129, 0.1)`
- Hover: `background: var(--bg-elevated)`
- Icons: 20px, accent color when active

**Structure:**
```
┌────────────┐
│  THE MINT  │  ← Logo with mint glow
├────────────┤
│ 🏠 Dashboard│  ← Main navigation
│ 🏢 Properties│
│ 💼 Businesses│
│ 📈 Stocks   │
│ 🚀 Go Public│
├────────────┤
│ 📊 Stats    │  ← Secondary navigation
│ 🏆 Rankings │
│ 🎖️ Achieve  │
│ 🛍️ Shop     │
├────────────┤
│ ⚙️ Settings │  ← Bottom-pinned
│ 🚪 Logout   │
└────────────┘
```

### Charts with Gradient Fills

**Library:** Recharts

**Line/Area Chart:**
- Smooth curved lines (`type="monotone"`)
- Gradient fill beneath (color at 40% opacity → transparent)
- Line stroke width: 2-3px
- Line glow: `filter: drop-shadow(0 0 6px var(--glow-color))`
- Grid lines: `var(--border-subtle)` at 30% opacity
- Axis labels: `var(--text-muted)`

**Gradient Definition:**
```jsx
<defs>
  <linearGradient id="mintGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
  </linearGradient>
</defs>
```

**Donut/Progress Charts:**
- Gradient stroke (e.g., purple → pink)
- Center value in white
- Subtle glow around active arc

### Stats Page Layout

**Hero Chart:** Net Worth Over Time (full width, mint gradient)

**Secondary Charts Grid (2x2):**
- Income Trend (cyan)
- Properties Value (blue)
- Business Revenue (purple)
- Level Progress - donut (pink)

**Time Range Selector:** `[7D] [30D] [90D] [ALL]`
- Active: `bg-elevated` + mint text + subtle glow

## Implementation Plan

### Phase 1: Foundation
1. Update `tailwind.config.js` with new color palette
2. Update `src/index.css` with CSS variables and utilities
3. Remove light mode from `themeStore.ts`
4. Remove ThemeProvider light mode logic
5. Update `index.html` to default dark

### Phase 2: Layout
6. Create `Sidebar.tsx` component
7. Rewrite `Layout.tsx` with sidebar structure
8. Update header (remove nav tabs, keep stats bar)
9. Add sidebar collapse/expand functionality

### Phase 3: Components
10. Create `StatCard.tsx` with glow variants
11. Install recharts: `pnpm add recharts`
12. Create `GradientChart.tsx` (reusable area chart)
13. Create `DonutChart.tsx` (progress circles)
14. Update `AnimatedCounter` styling

### Phase 4: Pages
15. Update `DashboardPage.tsx` with new stat cards
16. Add sparkline charts to dashboard cards
17. Rebuild `StatsPage.tsx` with full chart suite
18. Update all other pages (Properties, Businesses, etc.)

### Phase 5: Polish
19. Add hover glow animations
20. Implement sidebar mobile responsiveness
21. Update modals (DailyReward, BuyCoins, etc.)
22. Test all interactions and transitions

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `apps/web/tailwind.config.js` | Modify | New color palette |
| `apps/web/src/index.css` | Modify | CSS variables, remove light mode |
| `apps/web/src/stores/themeStore.ts` | Simplify | Remove light mode |
| `apps/web/src/components/ThemeProvider.tsx` | Simplify | Default dark only |
| `apps/web/src/components/Layout.tsx` | Rewrite | Sidebar layout |
| `apps/web/src/components/Sidebar.tsx` | Create | New sidebar nav |
| `apps/web/src/components/ui/StatCard.tsx` | Create | Stat card with glow |
| `apps/web/src/components/ui/GradientChart.tsx` | Create | Area chart component |
| `apps/web/src/components/ui/DonutChart.tsx` | Create | Progress donut |
| `apps/web/src/pages/DashboardPage.tsx` | Modify | New cards + sparklines |
| `apps/web/src/pages/StatsPage.tsx` | Modify | Full chart suite |
| `apps/web/src/pages/*.tsx` | Modify | Update all page styles |
| `apps/web/package.json` | Modify | Add recharts |

## Dependencies

```bash
pnpm --filter @mint/web add recharts
```

## Breaking Changes

- Light mode removed entirely
- Layout changes from horizontal nav to sidebar
- All components get new color classes
- Theme toggle in settings becomes obsolete
