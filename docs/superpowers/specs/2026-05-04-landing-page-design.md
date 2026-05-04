# Landing Page Redesign — Spec

**Date:** 2026-05-04  
**Status:** Approved  
**Audience:** Unauthenticated visitors (both first-timers and returning users); buyers do not need to log in.

---

## Goal

Replace the current minimal centered hero with a full scrolling landing page that communicates what Declutter is, how it works, what's available, and pushes visitors to browse listings or sign up to sell.

---

## Page Structure (5 sections)

### 1. Hero

**Layout:** Two-column split at `md` breakpoint and above. Left: headline + subtext + CTAs. Right: decorative collage of 3 overlapping, slightly-rotated listing card previews (static/placeholder). On mobile: single centered column, card collage hidden.

**Copy:**
- Headline (large, ~60–72px): "Your stuff has / a second story." — "second story" on its own line in `--color-primary`
- Sub: "Nigeria's marketplace to sell, give away, or donate what you no longer need — to real people near you."
- Primary CTA: "Browse listings" → `/listings`
- Secondary CTA: "Start selling" (outline) → `/auth/signup`

**Visual details:**
- Existing decorative blobs retained and repositioned to suit the split layout
- Headline font-size scales: `text-5xl md:text-6xl lg:text-7xl`
- Card collage: 3 `ListingCard`-style mockup divs, absolutely positioned, with `rotate-[-4deg]`, `rotate-[2deg]`, `rotate-[6deg]` respectively and a drop shadow

---

### 2. How It Works

**Layout:** Full-width section, `bg-card` background, diagonal top edge via `clip-path: polygon(0 4%, 100% 0, 100% 100%, 0 100%)`. Three steps in a horizontal row at `md`+, stacked on mobile.

**Steps:**
1. **Find something you love** — Browse listings by category or search. No account needed.
2. **Connect with the seller** — Claim a free item, buy securely, or see a donated item find a new home.
3. **Repeat** — List your own stuff and pass it forward.

**Visual details:**
- Each step: large faint background number ("1", "2", "3") in `text-primary/8`, `text-[120px]` as an absolutely-positioned watermark
- Step content sits above the watermark: icon, bold title, body text
- Section header: "How it works" — left-aligned, `text-4xl font-bold`

---

### 3. Browse by Category

**Layout:** Full-bleed horizontally scrollable strip of category cards. No edge padding (bleeds to screen edge). Cards are tall rectangles (~120px wide, ~140px tall).

**Categories (9):**
| Label | Icon (lucide) | Accent color |
|---|---|---|
| Electronics | `Cpu` | `--color-primary` |
| Fashion | `Shirt` | `#EC4899` |
| Furniture | `Sofa` | `#F59E0B` |
| Books | `BookOpen` | `#10B981` |
| Home & Kitchen | `UtensilsCrossed` | `#6366F1` |
| Toys & Kids | `Puzzle` | `#F97316` |
| Sports | `Dumbbell` | `#14B8A6` |
| Free Items | `Gift` | `--color-success` |
| Donations | `Heart` | `--color-accent` |

Each card: colored icon, bold label, item count (static placeholder "—" until counts are wired up). Cards link to `/listings?category=<slug>`.

**Section header:** "What's waiting for you" — left-aligned, `text-4xl font-bold`, accent underline only under "waiting" using a `border-b-2 border-primary` inline span.

**Mobile:** horizontal scroll with `-webkit-overflow-scrolling: touch`, scroll snap, no scrollbar visible.

---

### 4. Featured Listings

**Layout:** Asymmetric grid at `md`+:
- Left column (wider): 2 large cards stacked
- Right column: 3 smaller cards stacked

On mobile: uniform 2-column grid.

**Content:** Up to 8 newest listings fetched server-side via Supabase (`SELECT * FROM listings ORDER BY created_at DESC LIMIT 8`). If 0 listings exist, entire section is hidden.

**Card details:**
- Photo, title, price / "Free" / "Donate" badge
- Listing type badge rendered as a corner ribbon (CSS `::before` with `position: absolute`, rotated, color-coded: indigo for Sale, green for Free, amber for Donate)
- Hover: `rotate-1 scale-[1.02]` + elevated shadow (`--shadow-elevated`), `transition-all duration-200`

**Section header:** "Just listed" — left-aligned, `text-4xl font-bold`, with a `w-2.5 h-2.5 rounded-full bg-success animate-pulse` dot inline before the text.

---

### 5. CTA Banner

**Layout:** Full-width band, `bg-primary`, diagonal clip on both top and bottom edges via `clip-path: polygon(0 5%, 100% 0, 100% 95%, 0 100%)`. Centered content.

**Copy:**
- Line 1: "Ready to explore?" — white, `text-4xl font-bold`
- Line 2: "Everything near you, all in one place." — white/80, `text-lg`
- Button: "Browse all listings →" — white-outlined, links to `/listings`

**Visual details:**
- Two large faint decorative circles in background (same blob treatment as hero), `bg-white/5`
- Vertical padding: `py-20` to give the band weight

---

## Responsive Behaviour

| Breakpoint | Hero | How It Works | Categories | Featured | CTA |
|---|---|---|---|---|---|
| Mobile (`<md`) | Single column, no card collage | Stacked steps | Horizontal scroll | 2-col grid | Centered, reduced padding |
| Desktop (`md+`) | Two-column split | 3-col horizontal | Full-bleed strip | Asymmetric grid | Full width with clip |

---

## Data Requirements

- Featured listings: server component fetches from Supabase, max 8, ordered by `created_at DESC`
- Category counts: deferred (show "—" placeholder for now; wire up in a follow-up)
- No auth required for any section

---

## Out of Scope

- Search bar in hero (future)
- Animated entrance transitions (future)
- Real category counts (follow-up task)
- Testimonials / social proof section
