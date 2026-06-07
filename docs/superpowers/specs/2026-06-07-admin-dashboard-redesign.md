# Admin Dashboard Redesign — Design Spec

**Date:** 2026-06-07  
**Status:** Approved

## Goal

Bring the admin dashboard to full visual and structural parity with the user dashboard: same sidebar style, animations, mobile support, and TopBar (search, ⌘K shortcut, notifications, avatar menu).

## Approach

Parameterize the existing `Sidebar` component so both admin and user layouts share one implementation. No new visual primitives — everything reuses what already exists.

## Changes

### 1. `components/dashboard/Sidebar.tsx`

Add three props to the `Sidebar` component:

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `navItems` | `NavItem[]` | module-level `NAV_ITEMS` const | The list of nav links to render |
| `logoHref` | `string` | `"/dashboard"` | Where the logo and mobile drawer header link |
| `sectionLabel` | `string \| undefined` | `undefined` | Optional label rendered above the nav (e.g. "Admin") |

The `isActive` logic currently special-cases `"/"` and `"/dashboard"` as exact-match routes. Change the exact-match condition to `href === logoHref || href === "/"` so admin's `/admin/dashboard` is also treated as exact-match. All other routes use `startsWith`.

The user dashboard layout requires no changes — `NAV_ITEMS` stays as a module-level const and is used as the default value for the `navItems` prop.

### 2. `components/admin/AdminSidebar.tsx`

Replace the current bespoke implementation with a thin wrapper around `Sidebar`:

- Pass `ADMIN_NAV_ITEMS` (same six links as today: Dashboard, Users, Listings, Orders, Dispatchers, Charities)
- Pass `logoHref="/admin/dashboard"`
- Pass `sectionLabel="Admin"`

The `DrawerProfile` profile link (`/dashboard/profile`) stays as-is — admins are also users and can access their profile.

### 3. `app/admin/layout.tsx`

Match the user dashboard layout structure exactly:

- Add `"use client"` directive (required because `TopBar` is a client component)
- Change container background from `bg-card` → `bg-background`
- Add `<TopBar />` in the content column above `<main>`

The `TopBar` brings search (with ⌘K shortcut and `SearchModal`), notification bell, and avatar menu — all for free, no extra wiring needed.

## What stays the same

- All sidebar visual details: grid pattern background, spring `layoutId` animations for the active state, mobile drawer with backdrop, `DrawerProfile` with avatar/sign-out
- All admin page content (`app/admin/**`)
- `TopBar`, `SearchModal`, `NotificationBell`, `AvatarMenu` — reused without modification

## Out of scope

- Admin-specific search backend (the `SearchModal` uses the existing listings/claims search)
- Admin notifications (the bell uses the existing notifications hook — admins see their own notifications)
- Any admin page content changes
