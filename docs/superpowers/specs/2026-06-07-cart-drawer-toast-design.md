# Cart Drawer & Add-to-Cart Toast

**Date:** 2026-06-07  
**Status:** Approved

## Overview

Two related UX improvements to the cart interaction on the public-facing site:

1. A non-invasive toast notification when a user adds an item to their cart from a `BrowseCard`
2. A slide-in drawer from the right when the user clicks the cart icon in the navbar

---

## 1. Add-to-Cart Toast

### Trigger
`handleAddToCart` in `BrowseCard` after a successful add (both authenticated and session-cart paths).

### Behaviour
- Uses `sonner` (already imported in `BrowseCard`)
- `toast.success("[item title] added to cart", { action: { label: "View cart", onClick: () => router.push("/cart") } })`
- Fires after the existing `setCartState("done")` call
- No structural changes to `BrowseCard` — one additional line

---

## 2. Cart Drawer

### Opening
- The `CartButton` in `NavbarWrapper` (`NavbarContent`) becomes a `<button>` (not a `<Link>`)
- Clicking it sets `cartDrawerOpen = true` in `NavbarContent` state (alongside existing `mobileOpen` / `searchOpen`)
- `CartButton` receives an `onOpen` callback prop

### Component
New file: `components/layout/CartDrawer.tsx`

Rendered inside the existing `NavbarContent` fragment, receives:
- `open: boolean`
- `onClose: () => void`

### Layout
```
┌─────────────────────┐
│ Cart  (X close)     │  ← header
├─────────────────────┤
│ [img] Title   ₦price│  ← item row
│                  [X]│
│ [img] Title   ₦price│
│                  [X]│
│  …                  │
├─────────────────────┤
│ View cart  [Checkout]│  ← footer
└─────────────────────┘
```
Overlay: fixed full-screen dim behind the panel. Click overlay → close.

### Data fetching
- Fetches on open: `fetch("/api/cart")` for authenticated users; falls back to `getSessionCart()` + `fetch("/api/cart?listing_ids=...")` for guests (same pattern as `app/cart/page.tsx`)
- Local `items` state inside `CartDrawer` — independent of the cart page
- Re-fetches each time the drawer opens (no stale data)

### Item rows
- Thumbnail (48×48, rounded), title (truncated), price
- X remove button: calls `DELETE /api/cart/:id` (authenticated) or `removeFromSessionCart(id)` (guest), then removes item from local state and dispatches `cart-updated` event to sync the navbar badge

### States
- **Loading:** 3 skeleton rows (pulse animation)
- **Empty:** "Your cart is empty" message + "Browse listings" link → `/`
- **Populated:** item list + footer actions

### Footer
- Left: "View cart" text link → `/cart`, closes drawer
- Right: "Checkout" filled button → `/cart`, closes drawer
  - Both navigate to the cart page where the full checkout flow lives

### Accessibility
- `role="dialog"`, `aria-modal="true"`, `aria-label="Cart"`
- Focus trapped inside while open
- `Escape` key closes the drawer

---

## Files Changed

| File | Change |
|---|---|
| `components/listings/BrowseCard.tsx` | Add one `toast.success(...)` call after cart add |
| `components/layout/CartDrawer.tsx` | **New** — drawer component |
| `components/layout/NavbarWrapper.tsx` | Add `cartDrawerOpen` state; convert `CartButton` to button; render `CartDrawer` |

No changes to `app/cart/page.tsx` or `lib/hooks/useCart.ts`.
