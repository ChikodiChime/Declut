"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { BrowseCard } from "@/components/listings";
import { usePublicListings, BrowseParams } from "@/lib/hooks/useListings";
import { VALID_CATEGORIES } from "@/app/api/listings/utils";
import type { ListingType } from "@/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_TABS: { value: ListingType | ""; label: string; color: string }[] = [
  { value: "", label: "All", color: "#16130f" },
  { value: "for_sale", label: "For Sale", color: "#4f46e5" },
  { value: "free", label: "Free", color: "#10b981" },
  { value: "donate", label: "Donate", color: "#f59e0b" },
];

const CATEGORY_ICONS: Record<string, string> = {
  "Electronics":            "📱",
  "Clothing & Accessories": "👗",
  "Furniture & Home":       "🛋️",
  "Appliances":             "🔌",
  "Books & Stationery":     "📚",
  "Kids & Baby":            "🧸",
  "Sports & Outdoors":      "⚽",
  "Vehicles & Parts":       "🚗",
  "Other":                  "📦",
};

// ─── Category section ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  category: string;
  listingType: ListingType | "";
}

function CategorySection({ category, listingType }: CategorySectionProps) {
  const params: BrowseParams = {
    category,
    listing_type: listingType || undefined,
    limit: 8,
    sort: "newest",
  };

  const { data, isLoading } = usePublicListings(params);
  const listings = data?.listings ?? [];
  const total = data?.total ?? 0;

  // Hide empty sections (after load)
  if (!isLoading && listings.length === 0) return null;

  const searchHref = listingType
    ? `/search?category=${encodeURIComponent(category)}&listing_type=${listingType}`
    : `/search?category=${encodeURIComponent(category)}`;

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none" aria-hidden>
            {CATEGORY_ICONS[category] ?? "📦"}
          </span>
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
                className="w-[200px] sm:w-[220px] shrink-0 animate-pulse overflow-hidden rounded-2xl border"
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
              <div key={listing.id} className="w-[200px] sm:w-[220px] shrink-0">
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
  const [activeType, setActiveType] = useState<ListingType | "">("");
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

      {/* ── Type filter tabs ── */}
      <div className="sticky z-20 pointer-events-none" style={{ top: 72 }}>
        <div
          className="mx-auto pointer-events-auto"
          style={{
            maxWidth: "min(72rem, calc(100% - 24px))",
            marginTop: 10,
          }}
        >
          <div
            className="inline-flex rounded-full p-0.5"
            style={{
              background: "rgba(255,255,255,0.90)",
              backdropFilter: "blur(16px) saturate(160%)",
              WebkitBackdropFilter: "blur(16px) saturate(160%)",
              border: "1px solid rgba(232,228,220,0.9)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset, 0 4px 16px rgba(22,19,15,0.10)",
            }}
          >
            {TYPE_TABS.map((tab) => {
              const isSelected = activeType === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveType(tab.value)}
                  className="rounded-full px-4 h-8 text-[12px] font-semibold transition-all duration-200"
                  style={{
                    background: isSelected ? tab.color : "transparent",
                    color: isSelected ? "white" : "#56524d",
                    boxShadow: isSelected ? `0 1px 3px ${tab.color}55` : "none",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Category sections ── */}
      <div className="max-w-6xl mx-auto pt-8 pb-6">
        {VALID_CATEGORIES.map((category) => (
          <CategorySection
            key={`${category}-${activeType}`}
            category={category}
            listingType={activeType}
          />
        ))}
      </div>

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
