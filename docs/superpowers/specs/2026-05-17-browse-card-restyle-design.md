# BrowseCard Restyle — Design Spec

**Date:** 2026-05-17  
**Status:** Approved  
**Scope:** `components/listings/BrowseCard.tsx`

---

## Overview

Refine the existing BrowseCard component to feel more premium and consistent with the Declutter design system established across cart and checkout. The type color system (indigo/green/amber for for_sale/free/donate) is preserved as the primary visual differentiator. The top accent gradient line is removed. The CTA is always pinned to the bottom of the card regardless of title length.

---

## Card Shell

- `rounded-2xl border bg-card` — upgraded from `rounded-xl`
- Border color: type-colored (unchanged) — `#ddd8fc` for_sale / `#c6f0e2` free / `#fde8a0` donate
- **Hover state:** border intensifies to hover color + soft shadow. No translate lift. Implemented via `onMouseEnter`/`onMouseLeave` (required — Tailwind cannot generate runtime type colors)
- Shadow resting: `0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)`
- Shadow hover: `0 4px 16px rgba(22,19,15,0.10), 0 0 0 1px ${type.borderHover}`
- **No top accent line** — the `h-[3px]` gradient bar is removed entirely

---

## Image Zone

- `aspect-4/3 overflow-hidden` — unchanged
- Background fill: `type.bg` — unchanged
- Image: `object-cover`, zooms `scale-105` on `group-hover`, `duration-500` — unchanged
- No-image fallback: `Package` icon + "No photo" text — unchanged
- **Type badge:** top-left frosted pill — `rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm` with `background: rgba(255,255,255,0.92)` and `color: type.color` — unchanged

---

## Content Zone

`flex flex-col flex-1 p-4 gap-0` — uses `flex-1` so content fills remaining card height.

Internal layout (top to bottom):

### 1. Title
`line-clamp-2 text-sm font-semibold leading-snug text-text mb-3`

### 2. Location + Condition row
`flex items-center justify-between gap-2 mb-3`
- Left: `MapPin` size 11 + area text `text-[11px] text-text-subtle truncate`
- Right: condition pill — `rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-text-muted`

### 3. Spacer
`flex-1` — pushes price + CTA to the bottom

### 4. Price
`font-display text-lg mb-3` in `type.color`
- `for_sale`: `₦{price.toLocaleString()}`
- `free`: "Free"
- `donate`: "Donate"

### 5. CTA — pinned to bottom
Full-width `rounded-xl py-2 text-xs font-semibold transition-all duration-200`

| Type | State | Background | Text | Icon | Label |
|---|---|---|---|---|---|
| `for_sale` | available, not in cart | `type.color` (#4f46e5) | white | `ShoppingCart` size 13 | "Add to Cart" |
| `for_sale` | in cart | `#f5f1eb` | `#78726c` | `ShoppingCart` size 13 | "In Cart" |
| `for_sale` | unavailable | hidden | — | — | — |
| `free` | available | `#10b981` | white | `Gift` size 13 | "Claim" |
| `free` | unavailable | hidden | — | — | — |
| `donate` | any | no CTA rendered | — | — | — |

CTA for `for_sale` uses `onClick={handleAddToCart}` with `disabled={inCart}`.  
CTA for `free` uses `onClick={handleClaim}`.

---

## What Does Not Change

- `TYPE_CONFIG` color map — values unchanged
- `CONDITION_LABELS` map — unchanged
- `handleAddToCart` logic — unchanged
- `handleClaim` logic — unchanged
- `useCart` hook usage — unchanged
- `CldImage` for images — unchanged
- Grid layout on the browse page — unchanged

---

## Files Changed

| File | Change |
|---|---|
| `components/listings/BrowseCard.tsx` | Restyle only — no logic changes |
