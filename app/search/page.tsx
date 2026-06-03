"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  SlidersHorizontal,
  User,
  ArrowLeft,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { BrowseCard } from "@/components/listings";
import {
  usePublicListings,
  useBusinessSellers,
  useMaxListingPrice,
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
  { value: "", label: "Any" },
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

// ─── Sort dropdown ────────────────────────────────────────────────────────────

function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Sort";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border text-[13px] font-medium transition-colors"
        style={{
          borderColor: "#e0dbd3",
          color: "#56524d",
          background: "white",
        }}
      >
        {label}
        <ChevronDown size={13} strokeWidth={2} style={{ color: "#a8a09a" }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 z-30 min-w-[180px] rounded-2xl border border-[#e8e4dc] bg-white py-1.5 shadow-[0_8px_32px_rgba(22,19,15,0.10)]"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] transition-colors hover:bg-[#faf8f4]"
                style={{
                  color: value === opt.value ? "#4f46e5" : "#16130f",
                  fontWeight: value === opt.value ? 600 : 400,
                }}
              >
                <span className="flex-1">{opt.label}</span>
                {value === opt.value && (
                  <Check
                    size={12}
                    strokeWidth={2.5}
                    style={{ color: "#4f46e5" }}
                  />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Seller dropdown ──────────────────────────────────────────────────────────

function SellerDropdown({
  value,
  sellers,
  onChange,
}: {
  value: string;
  sellers: { id: string; name: string | null }[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedName = sellers.find((s) => s.id === value)?.name ?? null;
  const filtered = query.trim()
    ? sellers.filter((s) =>
        (s.name ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : sellers;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="inline-flex items-center gap-1.5 w-full px-3 py-2 rounded-lg border text-[13px] transition-colors"
        style={{
          borderColor: value ? "rgba(79,70,229,0.4)" : "#e0dbd3",
          background: value ? "rgba(79,70,229,0.04)" : "white",
          color: "#56524d",
        }}
      >
        <User
          size={13}
          strokeWidth={2}
          style={{ color: value ? "#4f46e5" : "#a8a09a" }}
        />
        <span className="flex-1 text-left truncate">
          {selectedName ?? "Any seller"}
        </span>
        <ChevronDown size={12} strokeWidth={2} style={{ color: "#a8a09a" }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            className="absolute left-0 top-full z-30 mt-1.5 w-full min-w-[200px] rounded-2xl border border-[#e8e4dc] bg-white shadow-[0_8px_32px_rgba(22,19,15,0.10)]"
          >
            <div className="px-3 pt-2.5 pb-1.5 border-b border-[#f0ece6]">
              <div className="relative">
                <Search
                  size={12}
                  strokeWidth={2}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#a8a09a]"
                />
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
            <div className="max-h-48 overflow-y-auto py-1.5">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors hover:bg-[#faf8f4]"
                style={{
                  color: !value ? "#4f46e5" : "#16130f",
                  fontWeight: !value ? 600 : 400,
                }}
              >
                <span className="flex-1">All sellers</span>
                {!value && (
                  <Check
                    size={12}
                    strokeWidth={2.5}
                    style={{ color: "#4f46e5" }}
                  />
                )}
              </button>
              {filtered.length === 0 && (
                <p className="px-4 py-3 text-xs text-[#a8a09a]">
                  No sellers found
                </p>
              )}
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onChange(s.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors hover:bg-[#faf8f4]"
                  style={{
                    color: value === s.id ? "#4f46e5" : "#16130f",
                    fontWeight: value === s.id ? 600 : 400,
                  }}
                >
                  <span className="flex-1 truncate">{s.name ?? "Unnamed"}</span>
                  {value === s.id && (
                    <Check
                      size={12}
                      strokeWidth={2.5}
                      style={{ color: "#4f46e5" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Price range slider ───────────────────────────────────────────────────────

function formatSliderPrice(v: number): string {
  if (v >= 1_000_000)
    return `₦${(v / 1_000_000) % 1 === 0 ? v / 1_000_000 : (v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${Math.round(v / 1_000)}K`;
  return `₦${v}`;
}

function PriceRangeSlider({
  minInput,
  maxInput,
  onMinChange,
  onMaxChange,
  sliderMax,
}: {
  minInput: string;
  maxInput: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  sliderMax: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const rawMin = minInput ? Math.min(Number(minInput), sliderMax) : 0;
  const rawMax = maxInput ? Math.min(Number(maxInput), sliderMax) : sliderMax;
  const minVal = Math.max(0, Math.min(rawMin, rawMax));
  const maxVal = Math.max(rawMin, rawMax, 0);

  const step = Math.max(10_000, Math.ceil(sliderMax / 500 / 10_000) * 10_000);

  const minPct = (minVal / sliderMax) * 100;
  const maxPct = (maxVal / sliderMax) * 100;

  const valueFromPointer = useCallback(
    (e: PointerEvent) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      return Math.round((pct * sliderMax) / step) * step;
    },
    [sliderMax, step],
  );

  const startDragMin = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const onMove = (ev: PointerEvent) => {
        const v = Math.min(valueFromPointer(ev), maxVal);
        onMinChange(v === 0 ? "" : String(v));
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener(
        "pointerup",
        () => el.removeEventListener("pointermove", onMove),
        { once: true },
      );
    },
    [valueFromPointer, maxVal, onMinChange],
  );

  const startDragMax = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const onMove = (ev: PointerEvent) => {
        const v = Math.max(valueFromPointer(ev), minVal);
        onMaxChange(v >= sliderMax ? "" : String(v));
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener(
        "pointerup",
        () => el.removeEventListener("pointermove", onMove),
        { once: true },
      );
    },
    [valueFromPointer, minVal, onMaxChange, sliderMax],
  );

  const atMax = !maxInput || Number(maxInput) >= sliderMax;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[12px]">
        <span
          style={{
            color: minVal === 0 ? "#a8a09a" : "#4f46e5",
            fontWeight: minVal === 0 ? 400 : 600,
          }}
        >
          {minVal === 0 ? "₦0" : formatSliderPrice(minVal)}
        </span>
        <span
          style={{
            color: atMax ? "#a8a09a" : "#4f46e5",
            fontWeight: atMax ? 400 : 600,
          }}
        >
          {atMax ? "Any max" : formatSliderPrice(maxVal)}
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative h-5 flex items-center select-none"
      >
        <div
          className="absolute inset-x-0 h-1.5 rounded-full"
          style={{ background: "#e8e4dc" }}
        />
        <div
          className="absolute h-1.5 rounded-full"
          style={{
            left: `${minPct}%`,
            right: `${100 - maxPct}%`,
            background: "#4f46e5",
          }}
        />
        <button
          type="button"
          onPointerDown={startDragMin}
          className="absolute w-4 h-4 rounded-full border-2 -translate-x-1/2 cursor-grab active:cursor-grabbing focus:outline-none transition-shadow"
          style={{
            left: `${minPct}%`,
            borderColor: "#4f46e5",
            background: "white",
            touchAction: "none",
            boxShadow: "0 1px 4px rgba(79,70,229,0.3)",
          }}
        />
        <button
          type="button"
          onPointerDown={startDragMax}
          className="absolute w-4 h-4 rounded-full border-2 -translate-x-1/2 cursor-grab active:cursor-grabbing focus:outline-none transition-shadow"
          style={{
            left: `${maxPct}%`,
            borderColor: "#4f46e5",
            background: "white",
            touchAction: "none",
            boxShadow: "0 1px 4px rgba(79,70,229,0.3)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Filter section wrapper ───────────────────────────────────────────────────

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p
        className="text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "#a8a09a" }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Sidebar filters ──────────────────────────────────────────────────────────

function SidebarFilters({
  listing_type,
  setListingType,
  category,
  setCategory,
  condition,
  setCondition,
  priceMinInput,
  setPriceMinInput,
  priceMaxInput,
  setPriceMaxInput,
  areaInput,
  setAreaInput,
  seller_id,
  setSellerId,
  sort,
  setSort,
  hasFilters,
  clearFilters,
  sellers,
  sliderMax,
}: {
  listing_type: ListingType | "";
  setListingType: (v: ListingType | "") => void;
  category: string;
  setCategory: (v: string) => void;
  condition: Condition | "";
  setCondition: (v: Condition | "") => void;
  priceMinInput: string;
  setPriceMinInput: (v: string) => void;
  priceMaxInput: string;
  setPriceMaxInput: (v: string) => void;
  areaInput: string;
  setAreaInput: (v: string) => void;
  seller_id: string;
  setSellerId: (v: string) => void;
  sort: BrowseParams["sort"];
  setSort: (v: BrowseParams["sort"]) => void;
  hasFilters: boolean;
  clearFilters: () => void;
  sellers: { id: string; name: string | null }[];
  sliderMax: number;
}) {
  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[13px] font-semibold"
          style={{ color: "#16130f" }}
        >
          Filters
        </span>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-[12px] font-medium transition-colors"
            style={{ color: "#a8a09a" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#a8a09a";
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Listing type */}
      <FilterSection title="Type">
        <div className="flex flex-col gap-1">
          {TYPE_TABS.map((tab) => {
            const selected = listing_type === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setListingType(tab.value)}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-left transition-all duration-150"
                style={{
                  background: selected ? `${tab.color}12` : "transparent",
                  color: selected ? tab.color : "#56524d",
                  fontWeight: selected ? 600 : 400,
                }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{ borderColor: selected ? tab.color : "#d1d5db" }}
                >
                  {selected && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: tab.color }}
                    />
                  )}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <div className="h-px" style={{ background: "#ede9e2" }} />

      {/* Category */}
      <FilterSection title="Category">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => setCategory("")}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] text-left transition-colors"
            style={{
              background: !category ? "rgba(79,70,229,0.08)" : "transparent",
              color: !category ? "#4f46e5" : "#56524d",
              fontWeight: !category ? 600 : 400,
            }}
          >
            All categories
            {!category && (
              <Check size={12} strokeWidth={2.5} style={{ color: "#4f46e5" }} />
            )}
          </button>
          {VALID_CATEGORIES.map((cat) => {
            const selected = category === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(selected ? "" : cat)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] text-left transition-colors"
                style={{
                  background: selected ? "rgba(79,70,229,0.08)" : "transparent",
                  color: selected ? "#4f46e5" : "#56524d",
                  fontWeight: selected ? 600 : 400,
                }}
              >
                {cat}
                {selected && (
                  <Check
                    size={12}
                    strokeWidth={2.5}
                    style={{ color: "#4f46e5" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <div className="h-px" style={{ background: "#ede9e2" }} />

      {/* Price range */}
      <FilterSection title="Price Range">
        <PriceRangeSlider
          minInput={priceMinInput}
          maxInput={priceMaxInput}
          onMinChange={setPriceMinInput}
          onMaxChange={setPriceMaxInput}
          sliderMax={sliderMax}
        />
      </FilterSection>

      <div className="h-px" style={{ background: "#ede9e2" }} />

      {/* Condition */}
      <FilterSection title="Condition">
        <div className="flex flex-col gap-0.5">
          {CONDITIONS.map((c) => {
            const selected = condition === c.value;
            return (
              <button
                key={c.value}
                onClick={() =>
                  setCondition(
                    selected && c.value !== ""
                      ? ""
                      : (c.value as Condition | ""),
                  )
                }
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] text-left transition-colors"
                style={{
                  background: selected ? "rgba(79,70,229,0.08)" : "transparent",
                  color: selected ? "#4f46e5" : "#56524d",
                  fontWeight: selected ? 600 : 400,
                }}
              >
                {c.label}
                {selected && (
                  <Check
                    size={12}
                    strokeWidth={2.5}
                    style={{ color: "#4f46e5" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <div className="h-px" style={{ background: "#ede9e2" }} />

      {/* Area */}
      <FilterSection title="Location">
        <div className="relative">
          <MapPin
            size={13}
            strokeWidth={2}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "#a8a09a" }}
          />
          <input
            type="text"
            placeholder="e.g. Lagos, Abuja…"
            value={areaInput}
            onChange={(e) => setAreaInput(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg border text-[13px] focus:outline-none transition-colors"
            style={{
              borderColor: "#e0dbd3",
              color: "#16130f",
              background: "white",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#4f46e5";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px rgba(79,70,229,0.10)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e0dbd3";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          {areaInput && (
            <button
              type="button"
              onClick={() => setAreaInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "#a8a09a" }}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </FilterSection>

      <div className="h-px" style={{ background: "#ede9e2" }} />

      {/* Seller */}
      <FilterSection title="Seller">
        <SellerDropdown
          value={seller_id}
          sellers={sellers}
          onChange={setSellerId}
        />
      </FilterSection>

      <div className="h-px" style={{ background: "#ede9e2" }} />

      {/* Sort */}
      <FilterSection title="Sort by">
        <div className="flex flex-col gap-0.5">
          {SORT_OPTIONS.map((opt) => {
            const selected = (sort ?? "newest") === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value as BrowseParams["sort"])}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] text-left transition-colors"
                style={{
                  background: selected ? "rgba(79,70,229,0.08)" : "transparent",
                  color: selected ? "#4f46e5" : "#56524d",
                  fontWeight: selected ? 600 : 400,
                }}
              >
                {opt.label}
                {selected && (
                  <Check
                    size={12}
                    strokeWidth={2.5}
                    style={{ color: "#4f46e5" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors mt-1"
          style={{ color: "#a8a09a" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#a8a09a";
          }}
        >
          <X size={13} strokeWidth={2.5} /> Clear all filters
        </button>
      )}
    </div>
  );
}

// ─── Pagination component ─────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    )
      pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  const btn = (
    label: React.ReactNode,
    target: number,
    active = false,
    disabled = false,
  ) => (
    <button
      key={String(label)}
      onClick={() => {
        if (!disabled) {
          onChange(target);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
      disabled={disabled}
      className="flex h-9 min-w-[36px] items-center justify-center rounded-lg px-2 text-[13px] font-medium transition-all duration-150 disabled:opacity-40"
      style={{
        background: active ? "#4f46e5" : "transparent",
        color: active ? "#ffffff" : "#56524d",
        border: active ? "none" : "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled)
          (e.currentTarget as HTMLElement).style.background = "#f0ece6";
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled)
          (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-10 flex items-center justify-center gap-1">
      {btn(
        <ChevronLeft size={15} strokeWidth={2} />,
        page - 1,
        false,
        page === 1,
      )}
      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-9 w-9 items-center justify-center text-[13px]"
            style={{ color: "#a8a09a" }}
          >
            …
          </span>
        ) : (
          btn(p, p as number, p === page)
        ),
      )}
      {btn(
        <ChevronRight size={15} strokeWidth={2} />,
        page + 1,
        false,
        page === totalPages,
      )}
    </div>
  );
}

// ─── Filter state ─────────────────────────────────────────────────────────────

function useFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [q, _setQ] = useState(searchParams.get("q") ?? "");
  const [listing_type, _setListingType] = useState<ListingType | "">(
    (searchParams.get("listing_type") as ListingType) ?? "",
  );
  const [category, _setCategory] = useState(searchParams.get("category") ?? "");
  const [condition, _setCondition] = useState<Condition | "">(
    (searchParams.get("condition") as Condition) ?? "",
  );
  const [area, _setArea] = useState(searchParams.get("area") ?? "");
  const [seller_id, _setSellerId] = useState(
    searchParams.get("seller_id") ?? "",
  );
  const [price_min, _setPriceMin] = useState(
    searchParams.get("price_min") ?? "",
  );
  const [price_max, _setPriceMax] = useState(
    searchParams.get("price_max") ?? "",
  );
  const [sort, _setSort] = useState<BrowseParams["sort"]>(
    (searchParams.get("sort") as BrowseParams["sort"]) ?? "newest",
  );
  const [page, setPage] = useState(1);

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) sp.set(k, v);
      });
      router.replace(`/search?${sp.toString()}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    updateUrl({
      q,
      listing_type,
      category,
      condition,
      area,
      seller_id,
      price_min,
      price_max,
      sort: sort ?? "newest",
    });
  }, [
    q,
    listing_type,
    category,
    condition,
    area,
    seller_id,
    price_min,
    price_max,
    sort,
    updateUrl,
  ]);

  // Sync q from URL when the navbar navigates to /search?q=...
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    if (urlQ !== q) {
      _setQ(urlQ);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function setQ(v: string) {
    _setQ(v);
    setPage(1);
  }
  function setListingType(v: ListingType | "") {
    _setListingType(v);
    setPage(1);
  }
  function setCategory(v: string) {
    _setCategory(v);
    setPage(1);
  }
  function setCondition(v: Condition | "") {
    _setCondition(v);
    setPage(1);
  }
  function setArea(v: string) {
    _setArea(v);
    setPage(1);
  }
  function setSellerId(v: string) {
    _setSellerId(v);
    setPage(1);
  }
  function setPriceMin(v: string) {
    _setPriceMin(v);
    setPage(1);
  }
  function setPriceMax(v: string) {
    _setPriceMax(v);
    setPage(1);
  }
  function setSort(v: BrowseParams["sort"]) {
    _setSort(v);
    setPage(1);
  }

  const hasFilters = !!(
    q ||
    listing_type ||
    category ||
    condition ||
    area ||
    seller_id ||
    price_min ||
    price_max
  );

  function clearFilters() {
    _setQ("");
    _setListingType("");
    _setCategory("");
    _setCondition("");
    _setArea("");
    _setSellerId("");
    _setPriceMin("");
    _setPriceMax("");
    _setSort("newest");
    setPage(1);
  }

  return {
    q,
    setQ,
    listing_type,
    setListingType,
    category,
    setCategory,
    condition,
    setCondition,
    area,
    setArea,
    seller_id,
    setSellerId,
    price_min,
    setPriceMin,
    price_max,
    setPriceMax,
    sort,
    setSort,
    page,
    setPage,
    hasFilters,
    clearFilters,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SearchContent() {
  const {
    q,
    listing_type,
    setListingType,
    category,
    setCategory,
    condition,
    setCondition,
    area,
    setArea,
    seller_id,
    setSellerId,
    price_min,
    setPriceMin,
    price_max,
    setPriceMax,
    sort,
    setSort,
    page,
    setPage,
    hasFilters,
    clearFilters,
  } = useFilter();

  const [priceMinInput, setPriceMinInput] = useState(price_min);
  const [priceMaxInput, setPriceMaxInput] = useState(price_max);
  const [areaInput, setAreaInput] = useState(area);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleClearFilters() {
    clearFilters();
    setPriceMinInput("");
    setPriceMaxInput("");
    setAreaInput("");
  }

  const { data: businessSellers = [] } = useBusinessSellers();
  const { data: sliderMax = 5_000_000 } = useMaxListingPrice();

  // Debounce price min
  useEffect(() => {
    const t = setTimeout(() => setPriceMin(priceMinInput), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceMinInput]);

  // Debounce price max
  useEffect(() => {
    const t = setTimeout(() => setPriceMax(priceMaxInput), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceMaxInput]);

  // Debounce area
  useEffect(() => {
    const t = setTimeout(() => setArea(areaInput), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaInput]);

  const browseParams: BrowseParams = {
    q: q || undefined,
    listing_type: listing_type || undefined,
    category: category || undefined,
    condition: condition || undefined,
    area: area || undefined,
    seller_id: seller_id || undefined,
    price_min: price_min ? Number(price_min) : undefined,
    price_max: price_max ? Number(price_max) : undefined,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const { data, isLoading, isFetching } = usePublicListings(browseParams);
  const listings = data?.listings ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeFilterCount = [
    !!listing_type,
    !!category,
    !!condition,
    !!area,
    !!seller_id,
    !!price_min,
    !!price_max,
  ].filter(Boolean).length;

  const contextLabel = q ? `"${q}"` : category || null;

  const sidebarFilterProps = {
    listing_type,
    setListingType,
    category,
    setCategory,
    condition,
    setCondition,
    priceMinInput,
    setPriceMinInput,
    priceMaxInput,
    setPriceMaxInput,
    areaInput,
    setAreaInput,
    seller_id,
    setSellerId,
    sort,
    setSort,
    hasFilters,
    clearFilters: handleClearFilters,
    sellers: businessSellers,
    sliderMax,
  };

  return (
    <main className="min-h-screen" style={{ background: "#f4f4f5" }}>
      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden"
        style={{
          paddingTop: 68,
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 15% 60%, rgba(99,102,241,0.40) 0%, transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(167,139,250,0.25) 0%, transparent 50%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-7 transition-colors duration-150"
            style={{ color: "rgba(255,255,255,0.48)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.88)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.48)";
            }}
          >
            <ArrowLeft size={13} strokeWidth={2} />
            Home
          </Link>

          <h1
            className="font-bold text-white leading-tight tracking-tight"
            style={{ fontSize: "clamp(22px, 4vw, 36px)" }}
          >
            {q ? (
              <>
                Results for{" "}
                <span style={{ color: "#a5b4fc" }}>&ldquo;{q}&rdquo;</span>
              </>
            ) : category ? (
              category
            ) : listing_type === "free" ? (
              "Free Items"
            ) : listing_type === "donate" ? (
              "Donation Pile"
            ) : (
              "Browse all listings"
            )}
          </h1>

          {!isLoading && (
            <p
              className="mt-2 text-[13px]"
              style={{ color: "rgba(255,255,255,0.48)" }}
            >
              {total.toLocaleString()} listing{total === 1 ? "" : "s"}
              {listing_type && (
                <span style={{ color: "rgba(255,255,255,0.28)" }}>
                  {" · "}
                  {TYPE_TABS.find((t) => t.value === listing_type)?.label}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex" style={{ borderTop: "1px solid #e8e4dc" }}>
        {/* ── Sidebar ── */}
        <aside
          className="hidden lg:block shrink-0 border-r"
          style={{
            width: 256,
            borderColor: "#e8e4dc",
            position: "sticky",
            top: 68,
            height: "calc(100vh - 68px)",
            alignSelf: "flex-start",
            overflowY: "auto",
            overscrollBehavior: "contain",
          }}
        >
          <div className="px-5 py-6">
            <SidebarFilters {...sidebarFilterProps} />
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0">
          {/* Mobile top bar — filter button only */}
          <div
            className="lg:hidden flex items-center gap-3 px-4 py-3 border-b"
            style={{ borderColor: "#e8e4dc", background: "#f4f4f5" }}
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border text-[13px] font-medium transition-colors shrink-0"
              style={{
                borderColor:
                  activeFilterCount > 0 ? "rgba(79,70,229,0.4)" : "#e0dbd3",
                background:
                  activeFilterCount > 0 ? "rgba(79,70,229,0.06)" : "white",
                color: activeFilterCount > 0 ? "#4f46e5" : "#56524d",
              }}
            >
              <SlidersHorizontal size={14} strokeWidth={2} />
              Filters
              {activeFilterCount > 0 && (
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: "#4f46e5" }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Results */}
          <div className="px-6 py-6 max-w-[1400px] mx-auto">
            {!isLoading && (
              <p className="mb-5 text-xs" style={{ color: "#a8a09a" }}>
                {total === 0
                  ? "No listings found"
                  : `${total.toLocaleString()} listing${total === 1 ? "" : "s"}`}
                {contextLabel && ` for ${contextLabel}`}
                {isFetching && !isLoading && (
                  <span style={{ color: "#c4bdb5" }}> · Updating…</span>
                )}
              </p>
            )}

            {isLoading && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse overflow-hidden rounded-xl border"
                    style={{ background: "white", borderColor: "#ebe5dc" }}
                  >
                    <div
                      className="aspect-4/3"
                      style={{ background: "#f0ece5" }}
                    />
                    <div className="flex flex-col gap-2 p-3.5">
                      <div
                        className="h-4 w-3/4 rounded"
                        style={{ background: "#f0ece5" }}
                      />
                      <div
                        className="h-3 w-1/2 rounded"
                        style={{ background: "#f0ece5" }}
                      />
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
              <div className="flex flex-col items-center py-24 text-center">
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border text-2xl"
                  style={{ background: "#f5f1eb", borderColor: "#e8e4dc" }}
                >
                  🔍
                </div>
                <p
                  className="mb-1 text-sm font-semibold"
                  style={{ color: "#16130f" }}
                >
                  No listings found
                </p>
                <p className="mb-6 text-xs" style={{ color: "#a8a09a" }}>
                  Try adjusting your search or filters
                </p>
                {hasFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="rounded-full border px-5 py-2 text-xs font-medium transition-colors hover:bg-[#f5f1eb]"
                    style={{ borderColor: "#e8e4dc", color: "#78726c" }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {!isLoading && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile filter drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 overflow-y-auto lg:hidden"
              style={{
                background: "white",
                boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "#e8e4dc" }}
              >
                <span
                  className="font-semibold text-[15px]"
                  style={{ color: "#16130f" }}
                >
                  Filters
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{ color: "#78726c" }}
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
              <div className="px-5 py-6">
                <SidebarFilters {...sidebarFilterProps} />
              </div>
              <div
                className="sticky bottom-0 px-5 py-4 border-t"
                style={{ borderColor: "#e8e4dc", background: "white" }}
              >
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-full h-11 rounded-xl font-semibold text-[14px] text-white transition-colors"
                  style={{ background: "#4f46e5" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#4338ca";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#4f46e5";
                  }}
                >
                  Show {total.toLocaleString()} result{total === 1 ? "" : "s"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
