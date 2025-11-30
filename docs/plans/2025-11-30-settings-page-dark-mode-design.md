# Settings Page & Dark Mode Design

**Date:** November 30, 2025
**Status:** Ready for implementation

---

## Overview

Add a user settings page with account management, appearance controls (dark mode), and preferences. Implement dark mode across all pages using Tailwind's class-based approach.

---

## Settings Page Structure

**SettingsPage.tsx** will have 5 card sections:

### 1. Account Details
- View/edit display name
- View email & username (read-only)
- Avatar selection (future: upload custom)

### 2. Security
- Change password form
  - Current password field
  - New password field
  - Confirm new password field
- Validation: min 8 chars, must include number

### 3. Appearance
- Dark/Light mode toggle switch
- Persists to database `theme` field

### 4. Preferences
- Sound effects toggle
- Music toggle
- Notifications toggle

### 5. Danger Zone
- Delete account button (red styling)
- Confirmation modal with warning text
- 30-day soft delete (sets `deletedAt`, can recover)
- After 30 days: permanent deletion via scheduled job

---

## API Endpoints

### PATCH `/api/v1/user/settings`
Update user preferences:
```typescript
{
  displayName?: string;
  theme?: 'light' | 'dark';
  soundEnabled?: boolean;
  musicEnabled?: boolean;
  notificationsEnabled?: boolean;
}
```

### POST `/api/v1/user/change-password`
```typescript
{
  currentPassword: string;
  newPassword: string;
}
```

### POST `/api/v1/user/delete-account`
```typescript
{
  password: string; // Confirm with password
}
```
Sets `deletedAt = NOW()`, `accountStatus = 'deleted'`

---

## Dark Mode Implementation

### How It Works

1. **ThemeProvider** wraps the app, reads initial theme from user's `theme` field (default: "light")
2. Adds/removes `dark` class on `<html>` element (Tailwind's class-based dark mode)
3. Theme state stored in Zustand store for instant reactivity
4. On toggle, immediately updates UI + calls API to persist to database

### New Files

| File | Purpose |
|------|---------|
| `stores/themeStore.ts` | Theme state + toggle function |
| `components/ThemeProvider.tsx` | Initializes theme on app load |
| `pages/SettingsPage.tsx` | Settings page component |

### Styling Approach

All existing components get `dark:` variant classes:

```css
/* Background */
bg-white → bg-white dark:bg-gray-900
bg-gray-50 → bg-gray-50 dark:bg-gray-800

/* Text */
text-gray-900 → text-gray-900 dark:text-white
text-gray-600 → text-gray-600 dark:text-gray-300
text-gray-500 → text-gray-500 dark:text-gray-400

/* Borders */
border-gray-200 → border-gray-200 dark:border-gray-700

/* Cards/Panels */
bg-white shadow-lg → bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50
```

### Files to Update

| File | Changes |
|------|---------|
| `Layout.tsx` | Header, nav, main background + Settings nav link |
| `DashboardPage.tsx` | Cards, stats, offline modal |
| `StatsPage.tsx` | Summary cards (chart already dark) |
| `LeaderboardPage.tsx` | Table rows, rank cards |
| `PropertiesPage.tsx` | Property cards, modals |
| `BusinessesPage.tsx` | Business cards |
| `PrestigePage.tsx` | Prestige cards |
| `AchievementsPage.tsx` | Achievement cards |
| `AuthPage.tsx` | Login/register forms |
| `UpgradeModal.tsx` | Modal styling |
| `DailyRewardModal.tsx` | Modal styling |
| `index.html` | Add dark background to prevent flash |

---

## Navigation

Add to Layout.tsx navbar (user menu area):
- Settings gear icon button
- Links to `/settings` route

Add route in App.tsx:
```tsx
<Route path="/settings" element={<SettingsPage />} />
```

---

## Implementation Tasks

### Backend
- [ ] Create PATCH `/api/v1/user/settings` endpoint
- [ ] Create POST `/api/v1/user/change-password` endpoint
- [ ] Create POST `/api/v1/user/delete-account` endpoint

### Frontend - Core
- [ ] Create `themeStore.ts` with theme state and toggle
- [ ] Create `ThemeProvider.tsx` component
- [ ] Create `SettingsPage.tsx` with all sections
- [ ] Add Settings route and nav link

### Frontend - Dark Mode Styling
- [ ] Update `index.html` with dark background
- [ ] Update `Layout.tsx` with dark styles
- [ ] Update `AuthPage.tsx` with dark styles
- [ ] Update `DashboardPage.tsx` with dark styles
- [ ] Update `StatsPage.tsx` with dark styles
- [ ] Update `LeaderboardPage.tsx` with dark styles
- [ ] Update `PropertiesPage.tsx` with dark styles
- [ ] Update `BusinessesPage.tsx` with dark styles
- [ ] Update `PrestigePage.tsx` with dark styles
- [ ] Update `AchievementsPage.tsx` with dark styles
- [ ] Update modal components with dark styles

---

*Design finalized November 30, 2025*
