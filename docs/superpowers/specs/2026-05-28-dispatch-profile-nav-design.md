# Dispatch Portal — Profile Page & Navigation

**Date:** 2026-05-28  
**Status:** Approved

## Problem

The dispatch portal (`/dispatch`) is a single-page experience with no navigation structure and no way for a dispatcher to view their account info or all-time earnings. The buyer phone number is fetched from the API but never shown in the UI, making it impossible to contact a buyer during delivery.

## Solution

Three targeted additions using only existing data and API endpoints:

1. Shared layout with bottom navigation (Orders | Profile)
2. Dispatcher profile page with account info and all-time stats
3. Phone contact row on active delivery cards

---

## Section 1: Layout & Bottom Navigation

### File
`app/dispatch/layout.tsx` — wraps `/dispatch` (orders) and `/dispatch/profile` only. The login and register routes (`/dispatch/login`, `/dispatch/register`) are siblings, not children, so they are unaffected.

### Bottom Nav Bar
- Sticky, bottom of viewport, respects mobile safe area (`pb-safe` / `padding-bottom: env(safe-area-inset-bottom)`)
- `bg-surface/90 backdrop-blur-md border-t border-border` — matches the header's glass treatment
- Two tabs:
  - **Orders** — `Truck` icon, links to `/dispatch`
  - **Profile** — `User` icon, links to `/dispatch/profile`
- Active tab: icon + label in `text-primary`, small top indicator bar (`bg-primary`)
- Inactive tab: `text-text-subtle`
- Page content wrapped with `pb-20` so nothing hides behind the nav

### Header change
Remove the sign-out button from `DispatchHeader` — sign-out moves to the profile page. The header becomes logo + greeting + badge only, less cluttered.

---

## Section 2: Profile Page (`/dispatch/profile`)

### Data
- `useMe()` — name, email, created_at
- `useCompletedDeliveries()` — full history (not filtered to current month) for all-time stats

No new API endpoints required.

### Page structure

**1. Account hero card** (dark gradient, matches earnings hero)
- Initials avatar circle (first letter of name, white on primary background)
- Full name, email address
- "Member since [Month Year]" derived from `user.created_at`

**2. All-time stats row** — three `StatCard` components:
- Total deliveries (count of all completed)
- Total earned (₦, sum of all `delivery_fee`)
- Avg per delivery (₦, total earned ÷ total deliveries, or `—` if 0)

**3. Account details card**
- Clean label/value rows: Name, Email, Account type ("Dispatcher"), Member since
- Same `bg-card rounded-xl shadow-card` pattern as the rest of the app

**4. Sign out**
- Full-width outline `Button` at the bottom
- Calls `useSignOut()` — same mutation used previously in the header

---

## Section 3: Phone Contact on Active Delivery Cards

### Location
Inside `DeliveryCard` in `app/dispatch/page.tsx`, below the address block, above the code verification row.

### Behaviour
- Only renders when `order.buyer_phone` is truthy
- `tel:` anchor opens native dialer on mobile — primary action
- Copy-to-clipboard icon button alongside it for desktop / already-on-call scenarios
- Visual: small pill row with `Phone` icon, muted label "Call buyer", phone number in `font-mono`
- Uses `navigator.clipboard.writeText()` with a brief "Copied" toast on success

---

## Constraints

- No new DB columns or API routes
- All data already available via existing hooks
- Profile page is read-only — no editing in this pass
- No charts or paginated history — those are future scope

## Files touched

| File | Change |
|------|--------|
| `app/dispatch/layout.tsx` | **New** — shared layout with bottom nav |
| `app/dispatch/profile/page.tsx` | **New** — profile page |
| `app/dispatch/page.tsx` | Add phone row to `DeliveryCard`; remove sign-out from `DispatchHeader` |
