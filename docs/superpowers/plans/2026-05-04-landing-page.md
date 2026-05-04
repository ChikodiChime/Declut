# Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal centered hero with a full scrolling landing page featuring a split hero, how it works, category strip, featured listings, and CTA banner.

**Architecture:** `app/page.tsx` is a server component — it fetches the 8 newest listings from Supabase directly and passes them as props to `FeaturedListingsSection`. Each section lives in its own file under `components/landing/`. No client components needed (all sections are static or receive server-fetched data as props).

**Tech Stack:** Next.js App Router (server components), Tailwind CSS 4, Supabase anon client, Lucide icons, `BrowseCard` component for featured listings.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `components/landing/HeroSection.tsx` | Split hero: headline, CTAs, decorative card collage |
| Create | `components/landing/HowItWorksSection.tsx` | 3-step section with diagonal top edge and watermark numbers |
| Create | `components/landing/CategoryStripSection.tsx` | Horizontally scrollable category card strip |
| Create | `components/landing/CtaBannerSection.tsx` | Full-width indigo band with diagonal clips and CTA to /listings |
| Create | `components/landing/FeaturedListingsSection.tsx` | Asymmetric grid of up to 8 BrowseCards, hidden if empty |
| Modify | `app/page.tsx` | Compose all sections; fetch featured listings server-side |

---

## Task 1: HeroSection

**Files:**
- Create: `components/landing/HeroSection.tsx`

- [ ] **Step 1: Create the file**

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

const COLLAGE_CARDS = [
  {
    title: "iPhone 14 Pro",
    subtitle: "Excellent condition",
    badge: "For Sale",
    price: "₦180,000",
    badgeClass: "bg-primary/10 text-primary",
    rotate: "-rotate-[5deg]",
    position: "top-4 left-0",
    zIndex: "z-10",
  },
  {
    title: "Blue Leather Sofa",
    subtitle: "Pick up only · Lagos",
    badge: "Free",
    price: null,
    badgeClass: "bg-success/10 text-success",
    rotate: "rotate-[3deg]",
    position: "top-20 left-16",
    zIndex: "z-20",
  },
  {
    title: "Kids' Bicycle",
    subtitle: "Donated to charity",
    badge: "Donate",
    price: null,
    badgeClass: "bg-accent/10 text-accent",
    rotate: "rotate-[8deg]",
    position: "top-36 left-8",
    zIndex: "z-30",
  },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[92vh] bg-surface flex items-center overflow-hidden px-4 py-16">
      {/* Blobs */}
      <div
        className="absolute top-0 right-0 w-[520px] h-[520px] rounded-full bg-primary pointer-events-none"
        style={{ opacity: 0.05, transform: "translate(35%, -35%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent pointer-events-none"
        style={{ opacity: 0.06, transform: "translate(-35%, 35%)" }}
      />

      <div className="relative w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left: copy */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-text leading-[1.08]">
              Your stuff has
              <br />
              <span className="text-primary">a second story.</span>
            </h1>
            <p className="text-lg text-text-muted leading-relaxed max-w-md">
              Nigeria&apos;s marketplace to sell, give away, or donate what you
              no longer need — to real people near you.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button href="/listings" size="lg" className="gap-2">
              Browse listings <ArrowRight size={18} strokeWidth={2} />
            </Button>
            <Button href="/auth/signup" variant="outline" size="lg">
              Start selling
            </Button>
          </div>
        </div>

        {/* Right: card collage — hidden on mobile */}
        <div className="relative h-80 hidden md:block">
          {COLLAGE_CARDS.map((card) => (
            <div
              key={card.title}
              className={`absolute ${card.position} ${card.rotate} ${card.zIndex} w-56 bg-card rounded-xl shadow-elevated p-3.5 border border-border`}
            >
              <div className="aspect-video bg-surface rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                <span className="text-3xl">📦</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-text text-sm truncate">{card.title}</p>
                  <p className="text-[11px] text-text-muted truncate">{card.subtitle}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${card.badgeClass}`}>
                  {card.badge}
                </span>
              </div>
              {card.price && (
                <p className="text-sm font-bold text-primary mt-1.5">{card.price}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/HeroSection.tsx
git commit -m "feat: add landing HeroSection — split layout with card collage"
```

---

## Task 2: HowItWorksSection

**Files:**
- Create: `components/landing/HowItWorksSection.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Search, Handshake, RefreshCw } from "lucide-react";

const STEPS = [
  {
    number: "1",
    icon: Search,
    title: "Find something you love",
    body: "Browse listings by category or search. No account needed.",
  },
  {
    number: "2",
    icon: Handshake,
    title: "Connect with the seller",
    body: "Claim a free item, buy securely, or see a donated item find a new home.",
  },
  {
    number: "3",
    icon: RefreshCw,
    title: "Repeat",
    body: "List your own stuff and pass it forward.",
  },
];

export function HowItWorksSection() {
  return (
    <section
      className="bg-card py-20 px-4"
      style={{ clipPath: "polygon(0 5%, 100% 0, 100% 100%, 0 100%)" }}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-text mb-14">How it works</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative pl-2">
                {/* Watermark number */}
                <span
                  className="absolute -top-4 -left-2 text-[120px] font-black text-primary leading-none select-none pointer-events-none"
                  style={{ opacity: 0.06 }}
                >
                  {step.number}
                </span>

                {/* Content */}
                <div className="relative space-y-3 pt-10">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                    <Icon size={20} className="text-primary" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-bold text-text">{step.title}</h3>
                  <p className="text-text-muted leading-relaxed">{step.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/HowItWorksSection.tsx
git commit -m "feat: add landing HowItWorksSection — 3 steps with watermark numbers"
```

---

## Task 3: CategoryStripSection

**Files:**
- Create: `components/landing/CategoryStripSection.tsx`

- [ ] **Step 1: Create the file**

The categories must exactly match `VALID_CATEGORIES` from `app/api/listings/utils.ts` so the filter on `/listings` works.

```tsx
import Link from "next/link";
import { Cpu, Sofa, Shirt, Plug, BookOpen, Baby, Dumbbell, Car, Package } from "lucide-react";

const CATEGORIES = [
  { label: "Electronics",            slug: "Electronics",           icon: Cpu,      color: "#4F46E5", bg: "rgba(79,70,229,0.08)"   },
  { label: "Furniture & Home",       slug: "Furniture & Home",      icon: Sofa,     color: "#F59E0B", bg: "rgba(245,158,11,0.08)"  },
  { label: "Clothing & Accessories", slug: "Clothing & Accessories",icon: Shirt,    color: "#EC4899", bg: "rgba(236,72,153,0.08)"  },
  { label: "Appliances",             slug: "Appliances",            icon: Plug,     color: "#6366F1", bg: "rgba(99,102,241,0.08)"  },
  { label: "Books & Stationery",     slug: "Books & Stationery",    icon: BookOpen, color: "#10B981", bg: "rgba(16,185,129,0.08)"  },
  { label: "Kids & Baby",            slug: "Kids & Baby",           icon: Baby,     color: "#F97316", bg: "rgba(249,115,22,0.08)"  },
  { label: "Sports & Outdoors",      slug: "Sports & Outdoors",     icon: Dumbbell, color: "#14B8A6", bg: "rgba(20,184,166,0.08)"  },
  { label: "Vehicles & Parts",       slug: "Vehicles & Parts",      icon: Car,      color: "#64748B", bg: "rgba(100,116,139,0.08)" },
  { label: "Other",                  slug: "Other",                 icon: Package,  color: "#94A3B8", bg: "rgba(148,163,184,0.08)" },
];

export function CategoryStripSection() {
  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-6xl mx-auto mb-8">
        <h2 className="text-4xl font-bold text-text">
          What&apos;s{" "}
          <span className="border-b-[3px] border-primary pb-0.5">waiting</span>{" "}
          for you
        </h2>
      </div>

      {/* Full-bleed scrollable strip */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex gap-3 w-max pb-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                href={`/listings?category=${encodeURIComponent(cat.slug)}`}
                className="flex flex-col items-center justify-center gap-3 w-28 h-36 rounded-2xl border border-border bg-card hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 shrink-0 px-3 text-center"
                style={{ background: cat.bg }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${cat.color}18` }}
                >
                  <Icon size={22} strokeWidth={1.75} style={{ color: cat.color }} />
                </div>
                <span className="text-xs font-semibold text-text leading-tight">
                  {cat.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add `no-scrollbar` utility to `globals.css`**

Open `app/globals.css` and append after the existing spinner styles:

```css
/* Hide scrollbar but keep scroll behaviour */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

- [ ] **Step 3: Commit**

```bash
git add components/landing/CategoryStripSection.tsx app/globals.css
git commit -m "feat: add landing CategoryStripSection — full-bleed scrollable strip"
```

---

## Task 4: FeaturedListingsSection

**Files:**
- Create: `components/landing/FeaturedListingsSection.tsx`

- [ ] **Step 1: Create the file**

This is a server-safe component — no `"use client"` directive. It receives listings as a prop so the parent (`page.tsx`) can fetch them once server-side.

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrowseCard } from "@/components/listings";
import { Button } from "@/components/ui";
import type { Listing } from "@/types";

interface FeaturedListingsSectionProps {
  listings: Listing[];
}

export function FeaturedListingsSection({ listings }: FeaturedListingsSectionProps) {
  if (listings.length === 0) return null;

  const large = listings.slice(0, 2);
  const small = listings.slice(2, 5);
  const remaining = listings.slice(5);

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            <h2 className="text-4xl font-bold text-text">Just listed</h2>
          </div>
          <Link
            href="/listings"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            See all <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Mobile: uniform 2-col grid */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {listings.map((listing) => (
            <BrowseCard key={listing.id} listing={listing} />
          ))}
        </div>

        {/* Desktop: asymmetric layout */}
        <div className="hidden md:grid md:grid-cols-[3fr_2fr] gap-5">
          {/* Left: 2 large cards */}
          <div className="flex flex-col gap-5">
            {large.map((listing) => (
              <BrowseCard key={listing.id} listing={listing} />
            ))}
          </div>

          {/* Right: 3 small + remaining */}
          <div className="flex flex-col gap-4">
            {small.map((listing) => (
              <BrowseCard key={listing.id} listing={listing} />
            ))}
            {remaining.map((listing) => (
              <BrowseCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="sm:hidden text-center pt-2">
          <Button href="/listings" variant="outline" className="gap-2">
            See all listings <ArrowRight size={16} strokeWidth={2} />
          </Button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/FeaturedListingsSection.tsx
git commit -m "feat: add landing FeaturedListingsSection — asymmetric grid, hidden when empty"
```

---

## Task 5: CtaBannerSection

**Files:**
- Create: `components/landing/CtaBannerSection.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";

export function CtaBannerSection() {
  return (
    <section
      className="relative bg-primary py-24 px-4 overflow-hidden text-center"
      style={{
        clipPath: "polygon(0 6%, 100% 0, 100% 94%, 0 100%)",
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-white pointer-events-none"
        style={{ opacity: 0.04, transform: "translate(-30%, -30%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white pointer-events-none"
        style={{ opacity: 0.04, transform: "translate(30%, 30%)" }}
      />

      <div className="relative max-w-2xl mx-auto space-y-4">
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
          Ready to explore?
        </h2>
        <p className="text-lg text-white/75">
          Everything near you, all in one place.
        </p>
        <div className="pt-4">
          <Button
            href="/listings"
            className="gap-2 border border-white/40 bg-white/10 text-white hover:bg-white/20 focus:ring-white"
            size="lg"
          >
            Browse all listings <ArrowRight size={18} strokeWidth={2} />
          </Button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/CtaBannerSection.tsx
git commit -m "feat: add landing CtaBannerSection — diagonal indigo band with CTA"
```

---

## Task 6: Wire up app/page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx` entirely**

```tsx
import { supabase } from "@/lib/supabase";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { CategoryStripSection } from "@/components/landing/CategoryStripSection";
import { FeaturedListingsSection } from "@/components/landing/FeaturedListingsSection";
import { CtaBannerSection } from "@/components/landing/CtaBannerSection";
import type { Listing } from "@/types";

async function getFeaturedListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) return [];
  return (data ?? []) as Listing[];
}

export default async function Home() {
  const listings = await getFeaturedListings();

  return (
    <main>
      <HeroSection />
      <HowItWorksSection />
      <CategoryStripSection />
      <FeaturedListingsSection listings={listings} />
      <CtaBannerSection />
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire up landing page with all 5 sections and server-fetched listings"
```

---

## Task 7: Smoke Test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify in browser at `http://localhost:3000`**

Check:
- [ ] Hero renders with split layout at wide viewport; collapses to single column below `md`
- [ ] Card collage hidden on mobile
- [ ] How It Works section has diagonal top edge and watermark numbers
- [ ] Category strip scrolls horizontally; no scrollbar visible; each card links to `/listings?category=<name>`
- [ ] Featured listings: if DB has data, asymmetric grid shows at desktop, 2-col grid at mobile; if DB empty, section not rendered
- [ ] CTA banner has diagonal clips top and bottom, white CTA button links to `/listings`
- [ ] No console errors

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.
