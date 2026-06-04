# BrowseCard Redesign Spec

**Date:** 2026-06-04  
**Component:** `components/listings/BrowseCard.tsx`  
**Used on:** Landing page (category horizontal scroll rows) + Search page (grid)

## Goal

Redesign the `BrowseCard` to feel more premium and editorial — closer to a fashion/lifestyle marketplace than a classifieds directory. All existing data (title, price, condition, location) is retained; only the visual treatment changes.

## Design Direction

Premium/editorial. The photo dominates, the price reads with authority, and the listing type color system ties the card together.

## Image Area

- **Aspect ratio:** 3:4 (portrait) — up from 4:3. This is the primary editorial upgrade; items feel more considered.
- **Background fill:** Faint tint of the listing type color (same as current `type.bg`).
- **Image carousel:** Retained as-is — prev/next arrows appear on hover, dot indicators at the bottom.
- **Type badge:** Top-left, unchanged.
- **Action button (cart/claim):** Top-right, unchanged.

## Card Footer

White background. Fixed vertical layout — consistent card height across the grid because the title is always one line.

### Layout (top to bottom)

1. **Price** — `text-lg` (18px), `font-bold`. Full-width row. For free/donate listings, renders the type label ("Free" / "Donate") in the type color instead of a price.
2. **Title** — `text-sm`, `font-medium`, `line-clamp-1`. One line only — enforces uniform card height.
3. **Meta row** — condition pill + location pin + area text. Condition pill background uses a faint tint of the listing type color (replacing the current flat grey `#f0ece6`), matching the card's color theme.

### Accent strip

A 3px bar rendered as a sibling `<div>` at the root card level (after the footer, not inside it), so it sits flush at the very bottom with no padding gap. Bottom corners are `rounded-b-2xl` to follow the card shape. Color matches listing type: indigo (`#4f46e5`) for sale, emerald (`#10b981`) for free, amber (`#f59e0b`) for donate.

## Border & Shadow

- **Border:** `1px solid` using the listing type's low-opacity border color (from the existing `TYPE_CONFIG.border` values). Replaces the current borderless shadow-only approach.
- **Hover:** Border color intensifies to `TYPE_CONFIG.borderHover`. Shadow lifts to `0 8px 24px rgba(0,0,0,0.10)`.
- **Resting shadow:** `0 2px 8px rgba(0,0,0,0.05)`.

## What Does Not Change

- Cart / claim action logic and state machine
- Image carousel navigation logic
- Claimed status badge
- Skeleton loading shape in parent pages (will need updating to 3:4)
- Responsive grid layout on search page
- Responsive horizontal scroll on landing page

## Skeleton Update

The skeleton placeholders in `app/page.tsx` (CategorySection) and `app/search/page.tsx` must be updated from `aspect-4/3` to `aspect-3/4` to match the new card shape.
