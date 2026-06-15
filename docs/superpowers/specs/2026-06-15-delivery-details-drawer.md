# Delivery Details Drawer

**Date:** 2026-06-15
**Status:** Approved

## Problem

The `ActiveHeroCard` truncates pickup and drop-off addresses because the card layout is space-constrained. Dispatchers need to see the full addresses to navigate to the correct location.

## Solution

Tapping the `ActiveHeroCard` body opens a bottom-sheet drawer showing the full pickup address, full drop-off address, and buyer phone contact. The code input + Confirm button stay on the card and are not part of the tap target.

---

## Component Design

### ActiveHeroCard (modified)

- The card body (stripe, labels, item image, title, buyer name, location summary row) becomes a tap target that sets `isOpen = true`
- Location summary row shows areas only (`listing.area → buyer_area`) — short, truncated, just enough to identify the route
- A chevron-right icon on the location summary row signals the card is tappable
- Code input + Confirm button sit below the tappable card body in a separate `<div>` — clicking them does not open the drawer
- Manages `isOpen: boolean` state internally

### DeliveryDetailsDrawer (new component, same file)

**Trigger:** `isOpen` prop from `ActiveHeroCard`
**Close:** tap the backdrop, drag handle tap, or any close button

**Layout (bottom sheet):**
```
┌─────────────────────────────┐
│  ── (drag handle)           │
│  Samsung Galaxy S23 Ultra   │  ← item title
│                             │
│  📦 Collect from            │
│  12 Adeola Odeku Street,    │
│  Victoria Island, Lagos     │  ← full pickup_address, wraps freely
│                             │
│  ──────────────────────     │
│                             │
│  📍 Deliver to              │
│  7B Admiralty Way,          │
│  Lekki Phase 1, Lagos       │  ← full buyer_address, wraps freely
│                             │
│  ──────────────────────     │
│                             │
│  [📞 Call buyer] [⧉ Copy]   │  ← only shown if buyer_phone exists
└─────────────────────────────┘
```

**Animation:** Framer Motion `y` slide from bottom (same pattern used elsewhere in the codebase). Backdrop fades in. Uses `AnimatePresence` for mount/unmount.

**No external library** — fixed overlay + slide-up panel, self-contained.

---

## File Changes

| Action | File | Change |
|--------|------|--------|
| Modify | `app/dispatch/(portal)/page.tsx` | Add `DeliveryDetailsDrawer` component; modify `ActiveHeroCard` to add tap handler, location summary row, isOpen state |

Single file change. The drawer lives in the same file as `ActiveHeroCard` since it's tightly coupled — it uses the same `DispatchOrder` type and is not reused elsewhere.

---

## Data Flow

- No new API calls or hooks needed
- All data already on `order`: `listing.pickup_address`, `listing.area`, `buyer_address`, `buyer_area`, `buyer_phone`, `listing.title`
- `isOpen` is local `useState` in `ActiveHeroCard` — no lifting needed

---

## Out of Scope

- Copy-to-clipboard for addresses (buyer phone already has copy; addresses are for navigation)
- Deep-link to maps app (future enhancement)
- Swipe-to-dismiss gesture (tap backdrop is sufficient for MVP)
