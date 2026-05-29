# Category Browse Redesign

**Date:** 2026-05-30
**Status:** Approved

## Problem

The home page is a flat grid of all listings. There is no sense of structure — a user landing on the site sees 100 items with no hierarchy. Most marketplaces group items by category so users can browse by intent ("I want electronics") rather than scrolling through everything.

## Solution

Split browsing into two distinct pages with two distinct intents:

| Route | Intent | Layout |
|---|---|---|
| `/` | Discovery — "what's available?" | Category sections, each a horizontal scroll row |
| `/search` | Intent — "I'm looking for X" | Flat grid with full filters |

---

## Page 1: Home (`app/page.tsx`)

### Zone 1 — Hero + toolbar (keep existing, simplified)
The existing indigo gradient hero (title, eyebrow, legend pills) stays unchanged.

The floating toolbar below it is simplified:
- **Keeps:** search input, For Sale / Free / Donate type tab segment
- **Removes:** category dropdown, condition dropdown, seller dropdown, sort dropdown (those live on `/search`)
- **Search submit** → `router.push('/search?q=...')`
- **Type tab selection** → updates a `listing_type` state that is passed as a param to all category section fetches; no navigation

### Zone 2 — Category sections
One section per category from `VALID_CATEGORIES` that has at least 1 available listing matching the active type tab filter.

**Section anatomy:**
```
Electronics                              See all 23 →
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────
│  carousel│ │  carousel│ │  carousel│ │  carousel│ │  ...
├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────
│ Title    │ │ Title    │ │ Title    │ │ Title    │ │
│ ₦45,000  │ │ FREE     │ │ ₦12,500  │ │ DONATE   │ │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────
```

- Section header: category name (left) + "See all N →" link (right)
- "See all →" navigates to `/search?category=<category>`
- Horizontal scroll container: `overflow-x-auto` with hidden scrollbar, `snap-x snap-mandatory`
- Cards are fixed-width (220px on mobile, 240px on desktop) with `shrink-0`
- On mobile: ~1.7 cards peek, hinting at scroll
- On desktop: 4–5 full cards visible before scroll
- Sections render in `VALID_CATEGORIES` order (predictable, not random)
- A category with 0 results for the active type tab is hidden entirely

**Data fetching:**
- One React Query call per category, fired in parallel
- Each fetches 6 newest `available` listings: `GET /api/listings?category=X&limit=6&sort=newest`
- If type tab is active (e.g. `listing_type=for_sale`), that param is added to each call
- No backend changes required — existing `/api/listings` endpoint handles this

### Zone 3 — Browse all CTA
A simple full-width banner at the bottom of the page:
> "Looking for something specific? [Search all listings →]"

Button navigates to `/search`.

---

## Page 2: Search (`app/search/page.tsx`) — new file

The existing `BrowseContent` component from `app/page.tsx` moved here with minimal changes:

- URL base: `/search` (was `/`)
- `updateUrl` calls `router.replace('/search?...')` instead of `/?...`
- Hero: compact section header instead of the large gradient banner — title reflects context ("Search results" when `q` is set, "All listings" otherwise, "Electronics" when category is set)
- All existing filters preserved: type tabs, category dropdown, condition, seller, sort, clear filters
- Flat grid with updated `BrowseCard` (carousel)
- Pagination (load more) unchanged

---

## Component: `BrowseCard` — image carousel

Updated in-place at `components/listings/BrowseCard.tsx`. Works identically whether rendered inside a home page horizontal scroll row or the search results grid.

**Behaviour:**
- `useState(0)` for current image index, local to each card
- If `listing.images.length === 1`: no carousel controls rendered
- If `listing.images.length > 1`: render left/right arrows + dot indicators
- **Arrows:** appear on hover (desktop via CSS group-hover), always visible on mobile
- **Dots:** rendered at the bottom-center of the image area; filled dot = current image
- **Click behaviour:** clicking an arrow cycles images and stops event propagation (does not navigate to listing). Clicking anywhere else on the card navigates to `/listings/[id]`.
- **No autoplay** — user-initiated only
- **Image count cap:** show max 5 images (already enforced at listing creation)

**Arrow styling:** small semi-transparent white circle buttons with a chevron icon, positioned absolutely over the image. Left button hidden when on first image; right button hidden when on last image.

---

## Files Changed

| File | Action |
|---|---|
| `app/page.tsx` | Rewrite — hero + type tab filter + category sections + CTA |
| `app/search/page.tsx` | New — existing BrowseContent moved here, URL updated |
| `components/listings/BrowseCard.tsx` | Update — add image carousel |
| `components/listings/index.ts` | No change |
| `lib/hooks/useListings.ts` | No change |
| `app/api/listings/route.ts` | No change |

---

## Out of Scope

- Infinite scroll on the home page sections (load more stays on search page only)
- Category landing pages (`/category/electronics`) — sections link directly to `/search?category=X`
- Personalisation or reordering sections based on user behaviour
- Skeleton loaders per section (global loading state is sufficient for now)
