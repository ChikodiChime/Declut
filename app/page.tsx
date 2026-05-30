"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, ArrowRight, MapPin,
  Smartphone, Shirt, Armchair, Plug, Dumbbell,
  Gift, Heart,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { BrowseCard } from "@/components/listings";
import { ListingImage } from "@/components/ui";
import { usePublicListings } from "@/lib/hooks/useListings";
import type { Listing } from "@/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const FEATURED_CATEGORIES = [
  "Electronics",
  "Clothing & Accessories",
  "Furniture & Home",
  "Appliances",
  "Sports & Outdoors",
];

const CATEGORY_CONFIG: Record<string, { Icon: LucideIcon; bg: string; color: string }> = {
  "Electronics":            { Icon: Smartphone, bg: "#eef2ff", color: "#4f46e5" },
  "Clothing & Accessories": { Icon: Shirt,      bg: "#fdf2f8", color: "#c026d3" },
  "Furniture & Home":       { Icon: Armchair,   bg: "#fff7ed", color: "#ea580c" },
  "Appliances":             { Icon: Plug,       bg: "#eff6ff", color: "#2563eb" },
  "Sports & Outdoors":      { Icon: Dumbbell,   bg: "#f0fdf4", color: "#16a34a" },
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

// ─── Free item horizontal card ────────────────────────────────────────────────

function FreeItemCard({ listing }: { listing: Listing }) {
  const router = useRouter();

  return (
    <Link
      href={`/${listing.id}`}
      className="group flex h-full items-center gap-4 rounded-2xl bg-white px-5 py-4 transition-all duration-200"
      style={{
        border: "1px solid #e8f5ee",
        boxShadow: "0 1px 3px rgba(16,185,129,0.04)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#a7f3d0";
        el.style.boxShadow = "0 4px 16px rgba(16,185,129,0.10)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#e8f5ee";
        el.style.boxShadow = "0 1px 3px rgba(16,185,129,0.04)";
      }}
    >
      {/* Square thumbnail */}
      <div
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl"
        style={{ background: "rgba(16,185,129,0.08)" }}
      >
        {listing.images[0] ? (
          <ListingImage
            src={listing.images[0]}
            fill
            sizes="80px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            alt={listing.title}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl">📦</div>
        )}
      </div>

      {/* Details — flex column, fills remaining width */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug" style={{ color: "#16130f" }}>
          {listing.title}
        </p>

        <div className="flex items-center gap-1.5">
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: "rgba(16,185,129,0.1)", color: "#059669" }}
          >
            {CONDITION_LABELS[listing.condition]}
          </span>
          <span style={{ color: "#d1d5db" }}>·</span>
          <div className="flex min-w-0 items-center gap-1">
            <MapPin size={9} strokeWidth={2} style={{ color: "#b8b0a8", flexShrink: 0 }} />
            <span className="truncate text-[11px]" style={{ color: "#a8a09a" }}>
              {listing.area}
            </span>
          </div>
        </div>

        {/* Claim sits at the bottom of the text column */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/${listing.id}`); }}
          className="mt-1 self-start rounded-full px-4 py-1.5 text-[11px] font-bold transition-all duration-150"
          style={{ background: "#10b981", color: "white" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#059669"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#10b981"; }}
        >
          Claim for free
        </button>
      </div>
    </Link>
  );
}

// ─── Free items section ───────────────────────────────────────────────────────

function FreeItemsSection() {
  const { data, isLoading } = usePublicListings({
    listing_type: "free",
    limit: 8,
    sort: "newest",
  });
  const listings = data?.listings ?? [];
  const total = data?.total ?? 0;

  if (!isLoading && listings.length === 0) return null;

  return (
    <section
      className="relative py-12 my-6"
      style={{
        background: "linear-gradient(180deg, #f0fdf8 0%, #ecfdf5 100%)",
        borderTop: "1px solid #c6f0e2",
        borderBottom: "1px solid #c6f0e2",
      }}
    >
      {/* Subtle dot texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(circle, #a7f3d0 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-7 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(16,185,129,0.12)" }}>
                <Gift size={17} strokeWidth={2} style={{ color: "#059669" }} />
              </div>
              <h2 className="text-xl font-semibold" style={{ color: "#064e3b" }}>
                Free Items
              </h2>
              {!isLoading && total > 0 && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#059669" }}
                >
                  {total}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Claim something for nothing — no strings attached
            </p>
          </div>

          <Link
            href="/search?listing_type=free"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-150 hover:gap-2.5"
            style={{ borderColor: "#a7f3d0", color: "#059669", background: "white" }}
          >
            See all <ArrowRight size={12} strokeWidth={2.2} />
          </Link>
        </div>

        {/* Horizontal scroll row — 4 cards visible on desktop */}
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[280px] lg:w-[320px] shrink-0 flex animate-pulse items-center gap-4 rounded-2xl bg-white px-4 py-3.5"
                  style={{ border: "1px solid #e8f5ee" }}
                >
                  <div className="h-[72px] w-[72px] shrink-0 rounded-xl" style={{ background: "#d1fae5" }} />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-3.5 w-3/4 rounded" style={{ background: "#d1fae5" }} />
                    <div className="h-3 w-1/2 rounded" style={{ background: "#d1fae5" }} />
                  </div>
                  <div className="h-7 w-14 shrink-0 rounded-full" style={{ background: "#d1fae5" }} />
                </div>
              ))
            : listings.map((listing) => (
                <div key={listing.id} className="w-[280px] lg:w-[320px] shrink-0">
                  <FreeItemCard listing={listing} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}

// ─── Donation item card ───────────────────────────────────────────────────────

function DonationItemCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/${listing.id}`}
      className="group flex h-full items-center gap-4 rounded-2xl bg-white px-5 py-4 transition-all duration-200"
      style={{
        border: "1px solid #fde8a0",
        boxShadow: "0 1px 3px rgba(245,158,11,0.04)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#fbbf24";
        el.style.boxShadow = "0 4px 16px rgba(245,158,11,0.12)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#fde8a0";
        el.style.boxShadow = "0 1px 3px rgba(245,158,11,0.04)";
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl"
        style={{ background: "rgba(245,158,11,0.08)" }}
      >
        {listing.images[0] ? (
          <ListingImage
            src={listing.images[0]}
            fill
            sizes="80px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            alt={listing.title}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl">📦</div>
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug" style={{ color: "#16130f" }}>
          {listing.title}
        </p>

        <div className="flex items-center gap-1.5">
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: "rgba(245,158,11,0.12)", color: "#b45309" }}
          >
            {CONDITION_LABELS[listing.condition]}
          </span>
          <span style={{ color: "#d1d5db" }}>·</span>
          <div className="flex min-w-0 items-center gap-1">
            <MapPin size={9} strokeWidth={2} style={{ color: "#b8b0a8", flexShrink: 0 }} />
            <span className="truncate text-[11px]" style={{ color: "#a8a09a" }}>
              {listing.area}
            </span>
          </div>
        </div>

        <span
          className="mt-1 self-start rounded-full px-3 py-1 text-[10px] font-bold"
          style={{ background: "rgba(245,158,11,0.1)", color: "#b45309" }}
        >
          ♥ Going to charity
        </span>
      </div>
    </Link>
  );
}

// ─── Donation pile section ────────────────────────────────────────────────────

function DonationPileSection() {
  const { data, isLoading } = usePublicListings({
    listing_type: "donate",
    limit: 8,
    sort: "newest",
  });
  const listings = data?.listings ?? [];
  const total = data?.total ?? 0;

  if (!isLoading && listings.length === 0) return null;

  return (
    <section
      className="relative py-12 my-6"
      style={{
        background: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)",
        borderTop: "1px solid #fde68a",
        borderBottom: "1px solid #fde68a",
      }}
    >
      {/* Subtle dot texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle, #fcd34d 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-7 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(245,158,11,0.12)" }}>
                <Heart size={17} strokeWidth={2} style={{ color: "#b45309" }} />
              </div>
              <h2 className="text-xl font-semibold" style={{ color: "#78350f" }}>
                Donation Pile
              </h2>
              {!isLoading && total > 0 && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: "rgba(245,158,11,0.18)", color: "#b45309" }}
                >
                  {total}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: "#92400e" }}>
              Items going to charities — give them a good send-off
            </p>
            <p className="mt-3 text-sm max-w-md" style={{ color: "#78350f" }}>
              Got something gathering dust?{" "}
              <Link href="/listings/new" className="font-semibold underline underline-offset-2 hover:no-underline" style={{ color: "#b45309" }}>
                List it as a donation
              </Link>{" "}
              and let it go to a charity that actually needs it. Takes 2 minutes.
            </p>
          </div>

          <Link
            href="/search?listing_type=donate"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-150 hover:gap-2.5"
            style={{ borderColor: "#fbbf24", color: "#b45309", background: "white" }}
          >
            See all <ArrowRight size={12} strokeWidth={2.2} />
          </Link>
        </div>

        {/* Horizontal scroll row */}
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[280px] lg:w-[320px] shrink-0 flex animate-pulse items-center gap-4 rounded-2xl bg-white px-4 py-3.5"
                  style={{ border: "1px solid #fde8a0" }}
                >
                  <div className="h-20 w-20 shrink-0 rounded-xl" style={{ background: "#fde68a" }} />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-3.5 w-3/4 rounded" style={{ background: "#fde68a" }} />
                    <div className="h-3 w-1/2 rounded" style={{ background: "#fde68a" }} />
                    <div className="h-5 w-1/3 rounded-full mt-1" style={{ background: "#fde68a" }} />
                  </div>
                </div>
              ))
            : listings.map((listing) => (
                <div key={listing.id} className="w-[280px] lg:w-[320px] shrink-0">
                  <DonationItemCard listing={listing} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({ category }: { category: string }) {
  const { data, isLoading } = usePublicListings({
    category,
    listing_type: "for_sale",
    limit: 8,
    sort: "newest",
  });
  const listings = data?.listings ?? [];
  const total = data?.total ?? 0;

  if (!isLoading && listings.length === 0) return null;

  const searchHref = `/search?category=${encodeURIComponent(category)}&listing_type=for_sale`;

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {(() => {
            const cfg = CATEGORY_CONFIG[category];
            if (!cfg) return null;
            const { Icon, bg, color } = cfg;
            return (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: bg }}
              >
                <Icon size={15} strokeWidth={2} style={{ color }} />
              </div>
            );
          })()}
          <h2 className="text-base font-semibold" style={{ color: "#16130f" }}>
            {category}
          </h2>
          {!isLoading && total > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: "#f0ece6", color: "#78726c" }}
            >
              {total}
            </span>
          )}
        </div>

        {!isLoading && total > 0 && (
          <Link
            href={searchHref}
            className="flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: "#4f46e5" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#4338ca"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#4f46e5"; }}
          >
            See all <ArrowRight size={12} strokeWidth={2.2} />
          </Link>
        )}
      </div>

      {/* Horizontal scroll row */}
      <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-1 px-4 sm:px-6">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-[200px] sm:w-[230px] lg:w-[265px] shrink-0 animate-pulse overflow-hidden rounded-2xl border"
                style={{ background: "white", borderColor: "#ebe5dc" }}
              >
                <div className="aspect-4/3 rounded-t-2xl" style={{ background: "#f0ece5" }} />
                <div className="flex flex-col gap-2 p-3.5">
                  <div className="h-3.5 w-3/4 rounded" style={{ background: "#f0ece5" }} />
                  <div className="h-3 w-1/2 rounded" style={{ background: "#f0ece5" }} />
                  <div className="h-7 w-full rounded-xl mt-1" style={{ background: "#f0ece5" }} />
                </div>
              </div>
            ))
          : listings.map((listing) => (
              <div key={listing.id} className="w-[200px] sm:w-[230px] lg:w-[265px] shrink-0 flex flex-col">
                <BrowseCard listing={listing} />
              </div>
            ))}
      </div>
    </section>
  );
}

// ─── Home page ────────────────────────────────────────────────────────────────

function HomeContent() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = inputValue.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <main className="min-h-screen" style={{ background: "#fafaf8" }}>
      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden px-4 sm:px-6 pt-[110px] md:pt-[130px] pb-10 md:pb-14"
        style={{
          marginTop: "-80px",
          background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 55%, #4338ca 100%)",
        }}
      >
        {/* Dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Glow orbs */}
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[80px]" style={{ background: "rgba(165,180,252,0.25)" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full blur-[70px]" style={{ background: "rgba(245,158,11,0.15)" }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#a5b4fc" }} />
                <span className="text-[11px] font-medium tracking-wide" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Nigeria&apos;s marketplace
                </span>
              </div>
              <h1 className="font-display text-white leading-tight" style={{ fontSize: "clamp(28px, 5vw, 44px)" }}>
                Browse listings
              </h1>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Buy, sell, give, and donate across Nigeria
              </p>
            </div>

            {/* Type legend pills */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "For Sale", color: "#a5b4fc" },
                { label: "Free", color: "#6ee7b7" },
                { label: "Donate", color: "#fcd34d" },
              ].map((t) => (
                <span key={t.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="relative mt-8 flex items-center max-w-xl"
          >
            <Search size={16} strokeWidth={2} className="absolute left-4 pointer-events-none" style={{ color: "rgba(255,255,255,0.45)" }} />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search for anything…"
              className="w-full rounded-2xl h-12 pl-11 pr-[120px] text-sm focus:outline-none placeholder:text-white/35"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "white",
              }}
              onFocus={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.16)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.32)"; }}
              onBlur={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => { setInputValue(""); inputRef.current?.focus(); }}
                className="absolute right-24 flex h-6 w-6 items-center justify-center rounded-full"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 h-8 rounded-xl px-4 text-xs font-semibold transition-all duration-150"
              style={{ background: "rgba(255,255,255,0.95)", color: "#1e1b4b" }}
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* ── Category sections ── */}
      <div className="max-w-6xl mx-auto pt-8 pb-6">
        {FEATURED_CATEGORIES.map((category) => (
          <CategorySection key={category} category={category} />
        ))}
      </div>

      {/* ── Free items section ── */}
      <FreeItemsSection />

      {/* ── Donation pile ── */}
      <DonationPileSection />

      {/* ── Browse all CTA ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div
          className="rounded-2xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%)",
          }}
        >
          <div>
            <p className="text-white font-semibold text-base">Looking for something specific?</p>
            <p className="text-white/55 text-sm mt-0.5">Search and filter across all listings</p>
          </div>
          <Link
            href="/search"
            className="shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-150 hover:gap-3"
            style={{ background: "rgba(255,255,255,0.95)", color: "#1e1b4b" }}
          >
            Search all listings <ArrowRight size={14} strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
