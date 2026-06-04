# BrowseCard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `BrowseCard` to feel premium and editorial — portrait image, bold price hierarchy, type-colored accents.

**Architecture:** Three self-contained edits to one component (`BrowseCard.tsx`) — image aspect ratio, footer layout, border+strip — plus skeleton updates in the two pages that render the card. No new files, no new dependencies.

**Tech Stack:** React 19, Next.js 16 App Router, Tailwind CSS 4, inline styles for dynamic type-color values.

**Spec:** `docs/superpowers/specs/2026-06-04-browse-card-redesign.md`

---

## Task 1: Change image aspect ratio to 3:4 and update skeletons

**Files:**
- Modify: `components/listings/BrowseCard.tsx` (line 189)
- Modify: `app/page.tsx` (CategorySection skeleton, ~line 612)
- Modify: `app/search/page.tsx` (search grid skeleton, ~lines 1289, 1293)

This task changes only the image container's aspect ratio class. The carousel, badges, and action buttons are unaffected — they position absolutely inside the container and scale automatically.

- [ ] **Step 1: Update aspect ratio in BrowseCard**

In `components/listings/BrowseCard.tsx`, find the image area div (currently line 189):

```tsx
// Before
<div
  className="relative aspect-4/3 overflow-hidden rounded-t-2xl"
  style={{ background: type.bg }}
>

// After
<div
  className="relative aspect-3/4 overflow-hidden rounded-t-2xl"
  style={{ background: type.bg }}
>
```

- [ ] **Step 2: Update CategorySection skeleton in landing page**

In `app/page.tsx`, find the skeleton inside `CategorySection` (~line 612). There are two skeletons that need updating — one loading skeleton div and the image portion of it:

```tsx
// Before
className="w-[200px] sm:w-[230px] lg:w-[265px] shrink-0 animate-pulse overflow-hidden rounded-2xl border"

// The inner image placeholder div:
// Before
<div
  className="aspect-4/3 rounded-t-2xl"
  style={{ background: "#f0ece5" }}
/>

// After
<div
  className="aspect-3/4 rounded-t-2xl"
  style={{ background: "#f0ece5" }}
/>
```

- [ ] **Step 3: Update search page skeleton**

In `app/search/page.tsx`, find the loading skeleton grid (~line 1289). Update the image placeholder:

```tsx
// Before
<div
  className="aspect-4/3"
  style={{ background: "#f0ece5" }}
/>

// After
<div
  className="aspect-3/4"
  style={{ background: "#f0ece5" }}
/>
```

- [ ] **Step 4: Start dev server and verify aspect ratio**

```bash
npm run dev
```

Open `http://localhost:3000` in a browser. The category scroll rows should show tall portrait cards instead of landscape. Open `http://localhost:3000/search` to confirm the grid also shows portrait cards. Check that skeletons (visible briefly on load) also match the portrait shape.

- [ ] **Step 5: Commit**

```bash
git add components/listings/BrowseCard.tsx app/page.tsx app/search/page.tsx
git commit -m "feat: change BrowseCard image aspect ratio to portrait (3:4)"
```

---

## Task 2: Redesign footer layout

**Files:**
- Modify: `components/listings/BrowseCard.tsx` (card body section, lines 397–433)

Change: price moves to its own top row (larger, bolder), title stays one line but weight drops to `font-medium`, condition pill gets the listing type color tint instead of flat grey, condition and location consolidate into a single meta row.

- [ ] **Step 1: Replace the card body section**

In `components/listings/BrowseCard.tsx`, find and replace the entire `{/* ── Card body ── */}` section:

```tsx
// Before (lines ~397–433)
{/* ── Card body ── */}
<div className="flex flex-col flex-1 p-3.5 gap-2.5 ">
  {/* Title */}
  <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-text">
    {listing.title}
  </h3>

  {/* Price + condition — same row, clear hierarchy */}
  <div className="flex items-center justify-between gap-2">
    <p
      className="font-display text-[15px] font-bold leading-none"
      style={{ color: type.color }}
    >
      {listing.listing_type === "for_sale" && listing.price != null
        ? `₦${listing.price.toLocaleString()}`
        : type.label}
    </p>
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: "#f0ece6", color: "#78726c" }}
    >
      {CONDITION_LABELS[listing.condition]}
    </span>
  </div>

  {/* Location */}
  <div className="flex items-center gap-1.5">
    <MapPin
      size={10}
      strokeWidth={2}
      className="shrink-0"
      style={{ color: "#b8b0a8" }}
    />
    <span className="truncate text-[11px]" style={{ color: "#a8a09a" }}>
      {listing.area}
    </span>
  </div>
</div>

// After
{/* ── Card body ── */}
<div className="flex flex-col flex-1 p-3.5 gap-2">
  {/* Price */}
  <p
    className="font-display text-lg font-bold leading-none"
    style={{ color: type.color }}
  >
    {listing.listing_type === "for_sale" && listing.price != null
      ? `₦${listing.price.toLocaleString()}`
      : type.label}
  </p>

  {/* Title */}
  <h3 className="line-clamp-1 text-sm font-medium leading-snug text-text">
    {listing.title}
  </h3>

  {/* Meta: condition + location */}
  <div className="flex items-center gap-1.5">
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: type.bg, color: type.color }}
    >
      {CONDITION_LABELS[listing.condition]}
    </span>
    <span style={{ color: "#d1d5db" }}>·</span>
    <div className="flex min-w-0 items-center gap-1">
      <MapPin
        size={10}
        strokeWidth={2}
        className="shrink-0"
        style={{ color: "#b8b0a8" }}
      />
      <span className="truncate text-[11px]" style={{ color: "#a8a09a" }}>
        {listing.area}
      </span>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Verify in browser**

With the dev server running (`npm run dev`), check `http://localhost:3000`:
- Price should appear at the top of the footer, large and in the type color
- Title sits below in slightly lighter weight
- Condition pill below title, tinted with the listing type color (indigo for sale items, green for free, amber for donate)
- Location follows the condition pill on the same row

- [ ] **Step 3: Commit**

```bash
git add components/listings/BrowseCard.tsx
git commit -m "feat: redesign BrowseCard footer — price-first hierarchy, type-colored meta"
```

---

## Task 3: Add type-colored border and accent strip

**Files:**
- Modify: `components/listings/BrowseCard.tsx` (Link element opening tag, ~line 170; closing tag area ~line 434)

Adds a subtle border that matches the listing type color, a stronger hover state, and a 3px accent strip at the bottom of the card.

- [ ] **Step 1: Update the Link element's style and hover handlers**

In `components/listings/BrowseCard.tsx`, find the `<Link>` element opening (line ~170). Replace only the `style`, `onMouseEnter`, and `onMouseLeave` props:

```tsx
// Before
<Link
  href={`/listings/${listing.id}`}
  className="group relative flex h-full flex-col rounded-2xl bg-white transition-all duration-300"
  style={{
    boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
  }}
  onMouseEnter={(e) => {
    const el = e.currentTarget as HTMLElement;
    el.style.boxShadow =
      "0 6px 20px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)";
  }}
  onMouseLeave={(e) => {
    const el = e.currentTarget as HTMLElement;
    el.style.boxShadow =
      "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)";
  }}
>

// After
<Link
  href={`/listings/${listing.id}`}
  className="group relative flex h-full flex-col rounded-2xl bg-white transition-all duration-300"
  style={{
    border: `1px solid ${type.border}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  }}
  onMouseEnter={(e) => {
    const el = e.currentTarget as HTMLElement;
    el.style.borderColor = type.borderHover;
    el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.10)";
  }}
  onMouseLeave={(e) => {
    const el = e.currentTarget as HTMLElement;
    el.style.borderColor = type.border;
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
  }}
>
```

- [ ] **Step 2: Add accent strip before the closing Link tag**

Immediately before `</Link>` (after the card body div closes), add:

```tsx
      {/* Accent strip */}
      <div
        style={{
          height: 3,
          background: type.color,
          borderRadius: "0 0 16px 16px",
        }}
      />
    </Link>
```

- [ ] **Step 3: Verify in browser**

With the dev server running, check `http://localhost:3000` and `http://localhost:3000/search`:
- Cards should have a faint colored border (indigo tint for sale items, green for free, amber for donate)
- Hovering a card should deepen the border color and lift the shadow
- A thin colored bar should be visible at the very bottom of each card
- The bar's bottom corners should match the card's rounded corners (no sharp edges)

- [ ] **Step 4: Commit**

```bash
git add components/listings/BrowseCard.tsx
git commit -m "feat: add type-colored border and accent strip to BrowseCard"
```

---

## Task 4: Cross-check and final verification

**Files:** None — read-only verification pass.

- [ ] **Step 1: Check all three listing types render correctly**

On `http://localhost:3000`, verify:
- For Sale cards (indigo): indigo border, indigo price text, indigo-tinted condition pill, indigo accent strip
- On `http://localhost:3000/search?listing_type=free`: green border, "Free" label in green, green-tinted pill, green strip
- On `http://localhost:3000/search?listing_type=donate`: amber border, "Donate" label in amber, amber-tinted pill, amber strip

- [ ] **Step 2: Check multi-image carousel still works**

On any card with multiple images, hover to reveal the prev/next arrows and click through images. Confirm dot indicators update correctly.

- [ ] **Step 3: Check mobile layout**

Resize browser to mobile width (~375px). Confirm:
- Cards remain portrait aspect ratio
- Footer text does not overflow or wrap unexpectedly (title stays single line)
- Accent strip is visible at the bottom

- [ ] **Step 4: Check the "no image" fallback**

If any listing has no images, the card should show the Package icon placeholder centered in the portrait image area (no broken layout).

- [ ] **Step 5: Final commit if any last-minute fixes were needed**

```bash
git add -p
git commit -m "fix: address visual issues from BrowseCard redesign review"
```

If no fixes were needed, skip this step.
