"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { BrowseCard } from "@/components/listings";
import { Button } from "@/components/ui";
import { usePublicListings, BrowseParams } from "@/lib/hooks/useListings";
import { VALID_CATEGORIES } from "@/app/api/listings/utils";
import type { ListingType, Condition } from "@/types";

const TYPE_TABS: { value: ListingType | ""; label: string; color: string }[] = [
  { value: "",         label: "All",      color: "#16130f" },
  { value: "for_sale", label: "For Sale", color: "#4f46e5" },
  { value: "free",     label: "Free",     color: "#10b981" },
  { value: "donate",   label: "Donate",   color: "#f59e0b" },
];

const CONDITIONS: { value: Condition | ""; label: string }[] = [
  { value: "",         label: "Any condition" },
  { value: "new",      label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good",     label: "Good" },
  { value: "fair",     label: "Fair" },
  { value: "poor",     label: "Poor" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest",     label: "Newest first" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

const PAGE_SIZE = 24;

// ─── Compact animated pill dropdown ──────────────────────────────────────────
interface PillDropdownProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder: string;
  isActive?: boolean;
}

function PillDropdown({ value, options, onChange, placeholder, isActive }: PillDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-150"
        style={{
          borderColor: isActive ? "#4f46e5" : "#e8e4dc",
          background:  isActive ? "rgba(79,70,229,0.06)" : "white",
          color:       isActive ? "#4f46e5" : "#78726c",
        }}
      >
        {currentLabel}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.16 }}>
          <ChevronDown size={12} strokeWidth={2.2} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            style={{ transformOrigin: "top left" }}
            className="absolute left-0 top-full z-30 mt-2 min-w-[168px] rounded-2xl border border-[#e8e4dc] bg-white py-1.5 shadow-[0_8px_32px_rgba(22,19,15,0.10),0_2px_8px_rgba(22,19,15,0.06)]"
          >
            {options.map((option) => {
              const selected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs transition-colors hover:bg-[#faf8f4]"
                  style={{ color: selected ? "#4f46e5" : "#16130f", fontWeight: selected ? 600 : 400 }}
                >
                  <span className="flex-1">{option.label}</span>
                  {selected && <Check size={12} strokeWidth={2.5} className="shrink-0" style={{ color: "#4f46e5" }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Filter state hook ────────────────────────────────────────────────────────
function useFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [q,            _setQ]           = useState(searchParams.get("q") ?? "");
  const [listing_type, _setListingType] = useState<ListingType | "">((searchParams.get("listing_type") as ListingType) ?? "");
  const [category,     _setCategory]    = useState(searchParams.get("category") ?? "");
  const [condition,    _setCondition]   = useState<Condition | "">((searchParams.get("condition") as Condition) ?? "");
  const [sort,         _setSort]        = useState<BrowseParams["sort"]>((searchParams.get("sort") as BrowseParams["sort"]) ?? "newest");
  const [limit, setLimit]               = useState(PAGE_SIZE);

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
      router.replace(`/listings?${sp.toString()}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    updateUrl({ q, listing_type, category, condition, sort: sort ?? "newest" });
  }, [q, listing_type, category, condition, sort, updateUrl]);

  function setQ(v: string)                    { _setQ(v);            setLimit(PAGE_SIZE); }
  function setListingType(v: ListingType | "") { _setListingType(v); setLimit(PAGE_SIZE); }
  function setCategory(v: string)              { _setCategory(v);    setLimit(PAGE_SIZE); }
  function setCondition(v: Condition | "")     { _setCondition(v);   setLimit(PAGE_SIZE); }
  function setSort(v: BrowseParams["sort"])    { _setSort(v);        setLimit(PAGE_SIZE); }

  const hasFilters = !!(q || listing_type || category || condition);

  function clearFilters() {
    _setQ(""); _setListingType(""); _setCategory(""); _setCondition(""); _setSort("newest");
    setLimit(PAGE_SIZE);
  }

  return { q, setQ, listing_type, setListingType, category, setCategory, condition, setCondition, sort, setSort, limit, setLimit, hasFilters, clearFilters };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function BrowseContent() {
  const {
    q, setQ,
    listing_type, setListingType,
    category, setCategory,
    condition, setCondition,
    sort, setSort,
    limit, setLimit,
    hasFilters, clearFilters,
  } = useFilter();

  const [inputValue, setInputValue] = useState(q);

  const browseParams: BrowseParams = {
    q:            q || undefined,
    listing_type: listing_type || undefined,
    category:     category || undefined,
    condition:    condition || undefined,
    sort,
    limit,
    offset: 0,
  };

  const { data, isLoading, isFetching } = usePublicListings(browseParams);
  const listings = data?.listings ?? [];
  const total    = data?.total    ?? 0;
  const hasMore  = listings.length < total;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(inputValue.trim());
  }

  const categoryOptions = [
    { value: "", label: "All categories" },
    ...VALID_CATEGORIES.map((c) => ({ value: c, label: c })),
  ];

  const activeTab = TYPE_TABS.find((t) => t.value === listing_type) ?? TYPE_TABS[0];

  return (
    <main className="min-h-screen" style={{ background: "#fafaf8" }}>
      {/* ── Page header ── */}
      <div
        className="relative overflow-hidden px-4 sm:px-6 py-10 md:py-14"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 55%, #4338ca 100%)" }}
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
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-[80px]"
          style={{ background: "rgba(165,180,252,0.25)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full blur-[70px]"
          style={{ background: "rgba(245,158,11,0.15)" }}
        />

        <div className="relative max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            {/* Eyebrow */}
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#a5b4fc" }} />
              <span className="text-[11px] font-medium tracking-wide" style={{ color: "rgba(255,255,255,0.65)" }}>
                Nigeria&apos;s marketplace
              </span>
            </div>
            <h1
              className="font-display text-white leading-tight"
              style={{ fontSize: "clamp(28px, 5vw, 44px)" }}
            >
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
              { label: "Free",     color: "#6ee7b7" },
              { label: "Donate",   color: "#fcd34d" },
            ].map((t) => (
              <span
                key={t.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/70"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sticky toolbar ── */}
      <div
        className="sticky top-0 z-20 border-b"
        style={{ borderColor: "#e8e4dc", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3">

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search
              size={15}
              strokeWidth={2}
              className="absolute left-4 pointer-events-none"
              style={{ color: "#c4bdb5" }}
            />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search listings…"
              className="w-full rounded-full border py-2.5 pl-10 pr-24 text-sm transition-all duration-200 focus:outline-none"
              style={{
                borderColor: "#e8e4dc",
                background: "#fafaf8",
                color: "#16130f",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.12)"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "#e8e4dc"; e.currentTarget.style.boxShadow = "none"; }}
            />
            <div className="absolute right-1.5 flex items-center gap-0.5">
              {inputValue && (
                <button
                  type="button"
                  onClick={() => { setInputValue(""); setQ(""); }}
                  className="rounded-full p-1.5 transition-colors hover:bg-[#f5f1eb]"
                  style={{ color: "#a8a09a" }}
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
              )}
              <button
                type="submit"
                className="rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
                style={{ background: "#4f46e5" }}
              >
                Search
              </button>
            </div>
          </form>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type tabs — pill group */}
            <div
              className="flex gap-0.5 rounded-full p-0.5"
              style={{ background: "#f0ece5" }}
            >
              {TYPE_TABS.map((tab) => {
                const isSelected = listing_type === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setListingType(tab.value)}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200"
                    style={{
                      background: isSelected ? tab.color : "transparent",
                      color:      isSelected ? "white"   : "#78726c",
                      boxShadow:  isSelected ? `0 1px 4px ${tab.color}55` : "none",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden h-4 w-px sm:block" style={{ background: "#e8e4dc" }} />

            {/* Filter pills */}
            <PillDropdown
              value={category}
              options={categoryOptions}
              onChange={setCategory}
              placeholder="Category"
              isActive={!!category}
            />
            <PillDropdown
              value={condition}
              options={CONDITIONS}
              onChange={(v) => setCondition(v as Condition | "")}
              placeholder="Condition"
              isActive={!!condition}
            />

            {/* Sort — pushed right */}
            <div className="ml-auto flex items-center gap-2">
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs transition-colors"
                  style={{ color: "#c4bdb5" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#c4bdb5"; }}
                >
                  <X size={11} strokeWidth={2.5} />
                  Clear
                </button>
              )}
              <PillDropdown
                value={sort ?? "newest"}
                options={SORT_OPTIONS}
                onChange={(v) => setSort(v as BrowseParams["sort"])}
                placeholder="Sort"
                isActive={sort !== "newest"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Results area ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Count */}
        {!isLoading && (
          <p className="mb-5 text-xs" style={{ color: "#a8a09a" }}>
            {total === 0
              ? "No listings found"
              : `${total.toLocaleString()} listing${total === 1 ? "" : "s"}`}
            {isFetching && !isLoading && <span style={{ color: "#c4bdb5" }}> · Updating…</span>}
          </p>
        )}

        {/* Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-xl border"
                style={{ background: "white", borderColor: "#ebe5dc" }}
              >
                <div className="aspect-4/3 rounded-t-xl" style={{ background: "#f0ece5" }} />
                <div className="flex flex-col gap-2 p-3.5">
                  <div className="h-4 w-3/4 rounded" style={{ background: "#f0ece5" }} />
                  <div className="h-3 w-1/2 rounded" style={{ background: "#f0ece5" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!isLoading && listings.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <BrowseCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && listings.length === 0 && (
          <div className="flex flex-col items-center py-28 text-center">
            <div
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border text-2xl"
              style={{ background: "#f5f1eb", borderColor: "#e8e4dc" }}
            >
              🔍
            </div>
            <p className="mb-1 text-sm font-semibold" style={{ color: "#16130f" }}>
              No listings found
            </p>
            <p className="mb-6 text-xs" style={{ color: "#a8a09a" }}>
              Try adjusting your search or filters
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="rounded-full border px-5 py-2 text-xs font-medium transition-colors hover:bg-[#f5f1eb]"
                style={{ borderColor: "#e8e4dc", color: "#78726c" }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Load more */}
        {!isLoading && hasMore && (
          <div className="mt-10 text-center">
            <Button
              variant="outline"
              loading={isFetching}
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  )
}
