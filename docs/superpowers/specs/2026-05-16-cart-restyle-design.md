# Cart Page Restyle — Design Spec

**Date:** 2026-05-16  
**Status:** Approved  
**Scope:** `app/cart/page.tsx`, `components/checkout/DeliveryTypeSelector.tsx`

---

## Overview

Restyle the cart page to feel warm, minimal, and trust-building — consistent with Declutter's brand personality. The design uses the existing design system tokens (earthy palette, serif display font, `rounded-2xl` surfaces) and introduces a two-column desktop layout. All three cart states (main cart, empty, anonymous buyer form) share the same shell for visual cohesion.

---

## Layout & Structure

**Container:** `max-w-5xl`, centered, `py-16 px-6`.

**Page header:** "Your cart" in `font-display text-3xl`, with item count in muted text inline (`3 items`). Sits above the two-column grid.

**Two-column grid:**
```
grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10
```
- **Left rail:** item list + delivery selector (or buyer form in anonymous checkout state)
- **Right column:** sticky summary panel (`sticky top-20`)

**Three-state consistency:**
All three states share the same page shell and two-column structure. The left column swaps content between states; the right panel stays in place. The empty state hides the right panel entirely.

---

## Components

### Cart Item Row

- Container: `rounded-2xl border border-border bg-card p-4 flex items-center gap-4`
- Image: `72×72px`, `rounded-xl object-cover`, pulled from Cloudinary
- Content (right of image):
  - Title: `font-medium text-[15px] text-text`
  - Location badge: small muted pill, `text-xs text-text-subtle` with a pin icon
  - Price: `font-display text-xl text-text` (serif)
- Remove button: floats far right, `×` icon in `text-text-subtle`, hover transitions to `text-error`
- Cards stack with `space-y-3`

### Delivery Type Selector (redesigned)

Replaces the existing radio inputs with two side-by-side clickable cards.

- Layout: `grid grid-cols-2 gap-3`
- Each card: `rounded-xl border-2 p-4 cursor-pointer transition-all`
- **Selected state:** `border-primary bg-primary/[0.04]`
- **Unselected state:** `border-border bg-card hover:border-border-strong`
- Card contents (top to bottom):
  - Lucide icon (`Truck` for delivery, `MapPin` for pickup), `size-5`
  - Title: `font-semibold text-sm mt-2`
  - Fee detail: `text-xs text-text-muted mt-0.5`
- The `DeliveryTypeSelector` component is updated in place — no new file needed

### Right Sticky Panel (Order Summary)

- Container: `rounded-2xl border bg-card p-6 sticky top-20`
- Heading: "Order summary" in `font-semibold text-sm text-text-muted uppercase tracking-wide`
- Line items per seller group:
  - Item name: truncated, left-aligned, `text-sm`
  - Price: right-aligned, `text-sm`
  - Delivery fee: muted, `text-sm`
- `border-t my-4` divider before total
- Grand total: `font-display text-2xl font-bold` left, price right
- Checkout button: full-width, `bg-foreground text-white rounded-xl py-3.5 font-semibold`, hover `opacity-90`
- Error message: `text-error text-sm mt-3` below button

### Empty State

- Left column content only (right panel hidden)
- Centered flex column with generous vertical padding
- Heading: "Nothing here yet" in `font-display text-2xl`
- Body: "Browse listings and add items to your cart." in `text-text-muted`
- CTA: outlined Browse button, `rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-card`

### Anonymous Buyer Form

- Same two-column shell as main cart state
- Left column:
  - Back chevron link at top (`← Back to cart`, `text-sm text-text-muted`)
  - "Your details" heading in `font-display text-2xl`
  - Four fields: Full Name, Email, Phone, Delivery/Contact Address
  - Uses existing `Input` component for consistent styling
- Right panel: identical sticky summary + "Continue to payment" button
- Total card shows above the button (same as authenticated checkout)

### Loading State

- Left rail: 3× skeleton pulse cards matching item card dimensions (`rounded-2xl border h-24 animate-pulse bg-border`)
- Right panel: skeleton lines for summary rows

---

## Files Changed

| File | Change |
|---|---|
| `app/cart/page.tsx` | Full restyle — layout, item rows, empty state, buyer form |
| `components/checkout/DeliveryTypeSelector.tsx` | Redesigned as clickable card selector |

No new files. `OrderSummary` component is inlined into the cart page right panel (it's only used here and inlining gives full layout control).

---

## Design Tokens Used

| Token | Value | Used for |
|---|---|---|
| `--color-surface` | `#fafaf8` | Page background |
| `--color-card` | `#ffffff` | Item cards, panel |
| `--color-border` | `#e8e4dc` | Card borders |
| `--color-primary` | `#4f46e5` | Selected delivery card |
| `--color-text-muted` | `#78726c` | Secondary text, labels |
| `--color-text-subtle` | `#a8a09a` | Remove button, badges |
| `--color-error` | `#ef4444` | Remove hover, error messages |
| `--font-display` | serif | Page heading, price, grand total |
| `--radius-xl` | 20px | Cards, panel |

---

## Out of Scope

- Checkout page (`/checkout`) — separate spec if needed
- Success page — unchanged
- Cart API — already fixed in prior session
- Authentication flow — unchanged
