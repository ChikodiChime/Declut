# Dispatcher Portal Redesign

**Date:** 2026-05-26
**Scope:** `app/dispatch/page.tsx`, `lib/hooks/useDispatch.ts`, two new API endpoints, two existing API endpoint extensions. No DB schema changes.

## Problem

The dispatch portal was built functionally but feels like an afterthought:
- The header has a broken "My purchases" link (a buyer screen, meaningless for dispatchers)
- Available order cards don't show pickup zone or drop-off zone — dispatchers can't evaluate a job before claiming
- Active delivery cards don't show where to collect the item from (seller's area)
- No completed deliveries tab — no earnings visibility, no sense of progress
- No personal greeting or context — the portal feels anonymous

## Goal

A gig-worker companion app feel: mobile-first, clear information hierarchy, earnings visibility, and the right context at each step of the job lifecycle.

---

## Section 1: Header + Earnings Hero

### Header
- Logo left, dispatcher's first name right (from auth context), sign-out icon button
- Remove the "My purchases" link entirely

### Earnings Hero
A card rendered below the header, above the tabs. Two stats side-by-side:
- **This month** — sum of `delivery_fee` on the dispatcher's `delivered` orders for the current calendar month, formatted as ₦X,XXX
- **Deliveries** — count of those same orders

If no completed deliveries: shows ₦0 / 0 with subtext "Start earning below."

Data source: `GET /api/dispatch/stats` (new endpoint, see API section).

---

## Section 2: Available Order Card Upgrade

### Current issues
- Shows `listing.area` as a generic location pin with no destination context
- Delivery fee is small and de-emphasised

### New card layout
1. Item image (left, 64×64) + item title + truncated listing area
2. **Route row**: `[pickup zone] → [drop-off zone]` — pickup zone = `listing.area`, drop-off zone = `buyer_area` (new field, server-derived)
3. **Delivery fee** — large, bold, right-aligned, indigo — this is the dispatcher's pay
4. Claim button — same position, slightly larger touch target (min 44px height)

### API change: `/api/dispatch/orders`
Add `buyer_area` to the response. Derived server-side from `buyer_address`: split on the first comma and trim. No DB change. Example: `"14 Admiralty Way, Lekki Phase 1, Lagos"` → `"14 Admiralty Way"`. If `buyer_address` has no comma, return the full string.

Also add `delivery_fee` to the select (currently missing from this endpoint).

---

## Section 3: Active Delivery Card Upgrade

### Current issues
- Shows buyer address but not seller's collection zone — dispatchers don't know where to go first
- Code entry is visually the most prominent element rather than the delivery context

### New card layout
1. Item image + title (same as now)
2. **Two-step address block**:
   - `Collect from:` — `listing.area` (seller's neighbourhood)
   - `Deliver to:` — `buyer_address` (buyer's full address)
3. Instruction hint ("Ask the buyer for their 4-digit code…") — styled as a secondary info block below addresses
4. Code entry + Confirm button at the bottom (same logic, better hierarchy)

### API change: `/api/dispatch/orders/mine`
Add `listing.area` to the listing select in the Supabase query. Already returns `buyer_address`.

---

## Section 4: Completed Tab + Per-Delivery Earnings

### New "Completed" third tab
Added to the pill tab row alongside "Available" and "My deliveries".

**Monthly summary row** (top of list):
- Format: `"May 2026 — ₦X,XXX from N deliveries"`
- Derived client-side from the completed orders list: filter by current month, sum `delivery_fee`, count

**Per-delivery cards** (read-only):
- Item image + title
- Route: `pickup zone → drop-off zone` (same fields as available card)
- Delivery fee earned — right-aligned, green, prominent
- Date completed

**Empty state**: "No completed deliveries yet. Claim a job from Available to get started."

### New endpoint: `GET /api/dispatch/orders/completed`
- Auth: dispatcher only
- Query: `status = 'delivered'`, `dispatcher_id = authUser.id`, ordered by `created_at DESC`
- Returns: `id`, `delivery_fee`, `created_at`, `listing: { title, images, area }`, `buyer_area` (server-derived same as available orders)
- Shared query key `['dispatch', 'completed']` — the earnings hero reuses this via a client-side aggregate so there's no double-fetch with `/api/dispatch/stats`

> Note: `/api/dispatch/stats` is only needed for the hero pre-load (fast, single number). If we go with shared query key approach, stats endpoint can be skipped and hero data derived from the completed query. Prefer the shared key approach to avoid an extra round-trip.

---

## API Summary

| Change | Type | Detail |
|--------|------|--------|
| `GET /api/dispatch/orders` | Extend | Add `delivery_fee` to select; add `buyer_area` server-derived field |
| `GET /api/dispatch/orders/mine` | Extend | Add `listing.area` to listing select |
| `GET /api/dispatch/orders/completed` | New | Delivered orders for the dispatcher, with `buyer_area` |

No new DB migrations. No changes to proxy.ts.

---

## Frontend Summary

| File | Change |
|------|--------|
| `app/dispatch/page.tsx` | Full overhaul: new header, earnings hero, upgraded cards, completed tab |
| `lib/hooks/useDispatch.ts` | Add `useCompletedDeliveries()` hook; update `DispatchOrder` type to include `delivery_fee` and `buyer_area`; update `useAvailableOrders` to expect new fields |

---

## Out of Scope

- Full seller street address on active delivery card (zone-level only for now)
- Push notifications for new available orders (the existing 30s poll stays)
- Earnings history beyond the current month
- Dispatcher profile page
