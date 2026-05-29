"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  ChevronDown,
  Check,
  X,
  SlidersHorizontal,
  User,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { BrowseCard } from "@/components/listings";
import { Button } from "@/components/ui";
import {
  usePublicListings,
  useBusinessSellers,
  BrowseParams,
} from "@/lib/hooks/useListings";
import { VALID_CATEGORIES } from "@/app/api/listings/utils";
import type { ListingType, Condition } from "@/types";

const TYPE_TABS: { value: ListingType | ""; label: string; color: string }[] = [
  { value: "", label: "All", color: "#16130f" },
  { value: "for_sale", label: "For Sale", color: "#4f46e5" },
  { value: "free", label: "Free", color: "#10b981" },
  { value: "donate", label: "Donate", color: "#f59e0b" },
];

const CONDITIONS: { value: Condition | ""; label: string }[] = [
  { value: "", label: "Any condition" },
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

const PAGE_SIZE = 24;

// ─── Pill dropdown ────────────────────────────────────────────────────────────
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
        className="inline-flex items-center gap-1.5 rounded-full border px-3.5 h-8 text-xs font-medium transition-all duration-150"
        style={{
          borderColor: isActive ? "rgba(79,70,229,0.45)" : "rgba(232,228,220,0.9)",
          background: isActive ? "rgba(79,70,229,0.04)" : "white",
          color: isActive ? "#16130f" : "#56524d",
        }}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: "#4f46e5" }}
          />
        )}
        {currentLabel}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.16 }}
          style={{ color: "#a8a09a" }}
        >
          <ChevronDown size={12} strokeWidth={2.2} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
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

// ─── Seller dropdown ──────────────────────────────────────────────────────────
interface SellerDropdownProps {
  value: string;
  sellers: { id: string; name: string | null }[];
  onChange: (id: string) => void;
}

function SellerDropdown({ value, sellers, onChange }: SellerDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedName = sellers.find((s) => s.id === value)?.name ?? null;
  const filtered = query.trim()
    ? sellers.filter((s) => (s.name ?? "").toLowerCase().includes(query.toLowerCase()))
    : sellers;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = !!value;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="inline-flex items-center gap-1.5 rounded-full border px-3.5 h-8 text-xs font-medium transition-all duration-150"
        style={{
          borderColor: isActive ? "rgba(79,70,229,0.45)" : "rgba(232,228,220,0.9)",
          background: isActive ? "rgba(79,70,229,0.04)" : "white",
          color: isActive ? "#16130f" : "#56524d",
        }}
      >
        {isActive && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#4f46e5" }} />}
        <User size={11} strokeWidth={2} className="shrink-0" style={{ color: isActive ? "#4f46e5" : "#a8a09a" }} />
        <span className="max-w-[100px] truncate">{selectedName ?? "Seller"}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.16 }} style={{ color: "#a8a09a" }}>
          <ChevronDown size={12} strokeWidth={2.2} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            style={{ transformOrigin: "top left" }}
            className="absolute left-0 top-full z-30 mt-2 w-56 rounded-2xl border border-[#e8e4dc] bg-white shadow-[0_8px_32px_rgba(22,19,15,0.10),0_2px_8px_rgba(22,19,15,0.06)]"
          >
            <div className="px-3 pt-2.5 pb-1.5 border-b border-[#f0ece6]">
              <div className="relative flex items-center">
                <Search size={12} strokeWidth={2} className="absolute left-2.5 pointer-events-none text-[#a8a09a]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sellers…"
                  className="w-full rounded-lg bg-[#f8f5f0] py-1.5 pl-7 pr-2 text-xs focus:outline-none placeholder:text-[#c4bdb5]"
                  style={{ color: "#16130f" }}
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto py-1.5">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs transition-colors hover:bg-[#faf8f4]"
                style={{ color: !value ? "#4f46e5" : "#16130f", fontWeight: !value ? 600 : 400 }}
              >
                <span className="flex-1">All sellers</span>
                {!value && <Check size={12} strokeWidth={2.5} style={{ color: "#4f46e5" }} />}
              </button>
              {filtered.length === 0 && <p className="px-4 py-3 text-xs text-[#a8a09a]">No sellers found</p>}
              {filtered.map((s) => {
                const selected = value === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { onChange(s.id); setOpen(false); setQuery(""); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs transition-colors hover:bg-[#faf8f4]"
                    style={{ color: selected ? "#4f46e5" : "#16130f", fontWeight: selected ? 600 : 400 }}
                  >
                    <span className="flex-1 truncate">{s.name ?? "Unnamed"}</span>
                    {selected && <Check size={12} strokeWidth={2.5} style={{ color: "#4f46e5" }} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Filter state ─────────────────────────────────────────────────────────────
function useFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [q, _setQ] = useState(searchParams.get("q") ?? "");
  const [listing_type, _setListingType] = useState<ListingType | "">((searchParams.get("listing_type") as ListingType) ?? "");
  const [category, _setCategory] = useState(searchParams.get("category") ?? "");
  const [condition, _setCondition] = useState<Condition | "">((searchParams.get("condition") as Condition) ?? "");
  const [seller_id, _setSellerId] = useState(searchParams.get("seller_id") ?? "");
  const [sort, _setSort] = useState<BrowseParams["sort"]>((searchParams.get("sort") as BrowseParams["sort"]) ?? "newest");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
      router.replace(`/search?${sp.toString()}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    updateUrl({ q, listing_type, category, condition, seller_id, sort: sort ?? "newest" });
  }, [q, listing_type, category, condition, seller_id, sort, updateUrl]);

  function setQ(v: string) { _setQ(v); setLimit(PAGE_SIZE); }
  function setListingType(v: ListingType | "") { _setListingType(v); setLimit(PAGE_SIZE); }
  function setCategory(v: string) { _setCategory(v); setLimit(PAGE_SIZE); }
  function setCondition(v: Condition | "") { _setCondition(v); setLimit(PAGE_SIZE); }
  function setSellerId(v: string) { _setSellerId(v); setLimit(PAGE_SIZE); }
  function setSort(v: BrowseParams["sort"]) { _setSort(v); setLimit(PAGE_SIZE); }

  const hasFilters = !!(q || listing_type || category || condition || seller_id);

  function clearFilters() {
    _setQ(""); _setListingType(""); _setCategory(""); _setCondition(""); _setSellerId(""); _setSort("newest"); setLimit(PAGE_SIZE);
  }

  return { q, setQ, listing_type, setListingType, category, setCategory, condition, setCondition, seller_id, setSellerId, sort, setSort, limit, setLimit, hasFilters, clearFilters };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function SearchContent() {
  const { q, setQ, listing_type, setListingType, category, setCategory, condition, setCondition, seller_id, setSellerId, sort, setSort, limit, setLimit, hasFilters, clearFilters } = useFilter();
  const [inputValue, setInputValue] = useState(q);
  const [filterOpen, setFilterOpen] = useState(false);
  const { data: businessSellers = [] } = useBusinessSellers();

  const activeFilterCount = [!!listing_type, !!category, !!condition, !!seller_id, !!sort && sort !== "newest"].filter(Boolean).length;

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed === q) return;
    const timer = setTimeout(() => setQ(trimmed), 280);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const browseParams: BrowseParams = {
    q: q || undefined,
    listing_type: listing_type || undefined,
    category: category || undefined,
    condition: condition || undefined,
    seller_id: seller_id || undefined,
    sort,
    limit,
    offset: 0,
  };

  const { data, isLoading, isFetching } = usePublicListings(browseParams);
  const listings = data?.listings ?? [];
  const total = data?.total ?? 0;
  const hasMore = listings.length < total;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(inputValue.trim());
  }

  const categoryOptions = [
    { value: "", label: "All categories" },
    ...VALID_CATEGORIES.map((c) => ({ value: c, label: c })),
  ];

  // Derive a human-readable context label for the header
  const contextLabel = q ? `"${q}"` : category || null;

  return (
    <main className="min-h-screen" style={{ background: "#fafaf8" }}>
      {/* ── Compact header ── */}
      <div
        className="pt-[88px] pb-5 px-4 sm:px-6 border-b"
        style={{ borderColor: "#e8e4dc", background: "white" }}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center h-8 w-8 rounded-full border transition-colors hover:bg-[#f5f1eb] shrink-0"
            style={{ borderColor: "#e8e4dc", color: "#78726c" }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "#16130f" }}>
              {contextLabel ? `Results for ${contextLabel}` : "All listings"}
            </h1>
            {!isLoading && (
              <p className="text-xs mt-0.5" style={{ color: "#a8a09a" }}>
                {total.toLocaleString()} listing{total === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky toolbar ── */}
      <div className="sticky z-20 pointer-events-none" style={{ top: 0 }}>
        <div
          className="mx-auto pointer-events-auto rounded-[20px] md:rounded-full"
          style={{
            maxWidth: "min(72rem, calc(100% - 24px))",
            marginTop: 12,
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(16px) saturate(160%)",
            WebkitBackdropFilter: "blur(16px) saturate(160%)",
            border: "1px solid rgba(232,228,220,0.9)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 2px rgba(22,19,15,0.04), 0 12px 32px -18px rgba(22,19,15,0.18)",
          }}
        >
          {/* Mobile */}
          <div className="md:hidden">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <form onSubmit={handleSearch} className="relative flex items-center flex-1">
                <Search size={14} strokeWidth={2} className="absolute left-3.5 pointer-events-none" style={{ color: "#a8a09a" }} />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Search listings…"
                  className="w-full rounded-full bg-transparent h-9 pl-9 pr-9 text-sm focus:outline-none placeholder:text-[#a8a09a]"
                  style={{ color: "#16130f" }}
                />
                {inputValue && (
                  <button type="button" onClick={() => { setInputValue(""); setQ(""); }} aria-label="Clear search" className="absolute right-2 rounded-full p-1 transition-colors hover:bg-[#f5f1eb]" style={{ color: "#a8a09a" }}>
                    <X size={12} strokeWidth={2.5} />
                  </button>
                )}
              </form>
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-xs font-semibold transition-all duration-150"
                style={{
                  background: filterOpen || activeFilterCount > 0 ? "rgba(79,70,229,0.08)" : "rgba(22,19,15,0.05)",
                  color: filterOpen || activeFilterCount > 0 ? "#4f46e5" : "#56524d",
                  border: `1px solid ${filterOpen || activeFilterCount > 0 ? "rgba(79,70,229,0.25)" : "rgba(22,19,15,0.1)"}`,
                }}
              >
                <SlidersHorizontal size={13} strokeWidth={2} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: "#4f46e5" }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            <AnimatePresence>
              {filterOpen && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15, ease: "easeOut" }}>
                  <div className="px-3 pb-3 pt-1 flex flex-wrap gap-2 items-center">
                    <div className="flex gap-0.5 rounded-full p-0.5" style={{ background: "rgba(22,19,15,0.04)" }}>
                      {TYPE_TABS.map((tab) => {
                        const isSelected = listing_type === tab.value;
                        return (
                          <button key={tab.value} onClick={() => setListingType(tab.value)} className="rounded-full px-3 h-7 text-[11.5px] font-semibold transition-all duration-200" style={{ background: isSelected ? tab.color : "transparent", color: isSelected ? "white" : "#56524d", boxShadow: isSelected ? `0 1px 3px ${tab.color}55` : "none" }}>
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                    <PillDropdown value={category} options={categoryOptions} onChange={setCategory} placeholder="Category" isActive={!!category} />
                    <PillDropdown value={condition} options={CONDITIONS} onChange={(v) => setCondition(v as Condition | "")} placeholder="Condition" isActive={!!condition} />
                    <SellerDropdown value={seller_id} sellers={businessSellers} onChange={setSellerId} />
                    <PillDropdown value={sort ?? "newest"} options={SORT_OPTIONS} onChange={(v) => setSort(v as BrowseParams["sort"])} placeholder="Sort" isActive={sort !== "newest"} />
                    {hasFilters && (
                      <button onClick={() => { clearFilters(); setFilterOpen(false); }} className="inline-flex items-center gap-1 text-[11.5px] font-medium transition-colors px-1" style={{ color: "#a8a09a" }} onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#a8a09a"; }}>
                        <X size={11} strokeWidth={2.5} /> Clear
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex flex-wrap items-center gap-2 px-2.5 py-2">
            <form onSubmit={handleSearch} className="relative flex items-center min-w-[200px] flex-1">
              <Search size={14} strokeWidth={2} className="absolute left-3.5 pointer-events-none" style={{ color: "#a8a09a" }} />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search listings…"
                className="w-full rounded-full bg-transparent h-9 pl-9 pr-9 text-sm focus:outline-none placeholder:text-[#a8a09a]"
                style={{ color: "#16130f" }}
              />
              {inputValue && (
                <button type="button" onClick={() => { setInputValue(""); setQ(""); }} aria-label="Clear" className="absolute right-2 rounded-full p-1 transition-colors hover:bg-[#f5f1eb]" style={{ color: "#a8a09a" }}>
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </form>

            <div className="h-6 w-px shrink-0" style={{ background: "rgba(22,19,15,0.08)" }} />

            <div className="flex gap-0.5 rounded-full p-0.5" style={{ background: "rgba(22,19,15,0.04)" }}>
              {TYPE_TABS.map((tab) => {
                const isSelected = listing_type === tab.value;
                return (
                  <button key={tab.value} onClick={() => setListingType(tab.value)} className="rounded-full px-3 h-7 text-[11.5px] font-semibold transition-all duration-200" style={{ background: isSelected ? tab.color : "transparent", color: isSelected ? "white" : "#56524d", boxShadow: isSelected ? `0 1px 3px ${tab.color}55` : "none" }}>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <PillDropdown value={category} options={categoryOptions} onChange={setCategory} placeholder="Category" isActive={!!category} />
            <PillDropdown value={condition} options={CONDITIONS} onChange={(v) => setCondition(v as Condition | "")} placeholder="Condition" isActive={!!condition} />
            <SellerDropdown value={seller_id} sellers={businessSellers} onChange={setSellerId} />

            <div className="ml-auto flex items-center gap-2">
              {hasFilters && (
                <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[11.5px] font-medium transition-colors px-2" style={{ color: "#a8a09a" }} onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#a8a09a"; }}>
                  <X size={11} strokeWidth={2.5} /> Clear
                </button>
              )}
              <PillDropdown value={sort ?? "newest"} options={SORT_OPTIONS} onChange={(v) => setSort(v as BrowseParams["sort"])} placeholder="Sort" isActive={sort !== "newest"} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {!isLoading && (
          <p className="mb-5 text-xs" style={{ color: "#a8a09a" }}>
            {total === 0 ? "No listings found" : `${total.toLocaleString()} listing${total === 1 ? "" : "s"}`}
            {isFetching && !isLoading && <span style={{ color: "#c4bdb5" }}> · Updating…</span>}
          </p>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-xl border" style={{ background: "white", borderColor: "#ebe5dc" }}>
                <div className="aspect-4/3 rounded-t-xl" style={{ background: "#f0ece5" }} />
                <div className="flex flex-col gap-2 p-3.5">
                  <div className="h-4 w-3/4 rounded" style={{ background: "#f0ece5" }} />
                  <div className="h-3 w-1/2 rounded" style={{ background: "#f0ece5" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && listings.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <BrowseCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {!isLoading && listings.length === 0 && (
          <div className="flex flex-col items-center py-28 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border text-2xl" style={{ background: "#f5f1eb", borderColor: "#e8e4dc" }}>
              🔍
            </div>
            <p className="mb-1 text-sm font-semibold" style={{ color: "#16130f" }}>No listings found</p>
            <p className="mb-6 text-xs" style={{ color: "#a8a09a" }}>Try adjusting your search or filters</p>
            {hasFilters && (
              <button onClick={clearFilters} className="rounded-full border px-5 py-2 text-xs font-medium transition-colors hover:bg-[#f5f1eb]" style={{ borderColor: "#e8e4dc", color: "#78726c" }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {!isLoading && hasMore && (
          <div className="mt-10 text-center">
            <Button variant="outline" loading={isFetching} onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
