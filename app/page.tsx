"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ArrowRight,
  MapPin,
  Smartphone,
  Shirt,
  Armchair,
  Plug,
  Dumbbell,
  Gift,
  Heart,
  BookOpen,
  Baby,
  Car,
  Package,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { BrowseCard, BrowseCardSkeleton } from "@/components/listings";
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

const CATEGORY_CONFIG: Record<
  string,
  { Icon: LucideIcon; bg: string; color: string }
> = {
  Electronics: { Icon: Smartphone, bg: "#eef2ff", color: "#4f46e5" },
  "Clothing & Accessories": { Icon: Shirt, bg: "#fdf2f8", color: "#c026d3" },
  "Furniture & Home": { Icon: Armchair, bg: "#fff7ed", color: "#ea580c" },
  Appliances: { Icon: Plug, bg: "#eff6ff", color: "#2563eb" },
  "Sports & Outdoors": { Icon: Dumbbell, bg: "#f0fdf4", color: "#16a34a" },
  "Books & Stationery": { Icon: BookOpen, bg: "#fefce8", color: "#ca8a04" },
  "Kids & Baby": { Icon: Baby, bg: "#fff1f2", color: "#e11d48" },
  "Vehicles & Parts": { Icon: Car, bg: "#f0f9ff", color: "#0284c7" },
  Other: { Icon: Package, bg: "#f5f5f4", color: "#78716c" },
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
      href={`/listings/${listing.id}`}
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
          <div className="flex h-full w-full items-center justify-center text-xl">
            📦
          </div>
        )}
      </div>

      {/* Details — flex column, fills remaining width */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p
          className="line-clamp-2 text-sm font-semibold leading-snug"
          style={{ color: "#16130f" }}
        >
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
            <MapPin
              size={9}
              strokeWidth={2}
              style={{ color: "#b8b0a8", flexShrink: 0 }}
            />
            <span className="truncate text-[11px]" style={{ color: "#a8a09a" }}>
              {listing.area}
            </span>
          </div>
        </div>

        {/* Claim sits at the bottom of the text column */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/listings/${listing.id}`);
          }}
          className="mt-1 self-start rounded-full px-4 py-1.5 text-[11px] font-bold transition-all duration-150"
          style={{ background: "#10b981", color: "white" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#059669";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#10b981";
          }}
        >
          Claim for free
        </button>
      </div>
    </Link>
  );
}

// ─── Horizontal card skeletons ────────────────────────────────────────────────

function FreeItemCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="relative overflow-hidden flex items-center gap-4 rounded-2xl bg-white px-5 py-4"
      style={{ border: "1px solid #e8f5ee" }}
    >
      <div
        className="skeleton-shimmer"
        style={{ animationDelay: `${(index % 4) * 0.12}s` }}
      />
      <div
        className="h-20 w-20 shrink-0 rounded-xl"
        style={{ background: "#d1fae5" }}
      />
      <div className="flex flex-1 flex-col gap-2">
        <div
          className="h-3.5 w-4/5 rounded"
          style={{ background: "#d1fae5" }}
        />
        <div className="h-3 w-3/5 rounded" style={{ background: "#d1fae5" }} />
        <div className="flex items-center gap-1.5 mt-0.5">
          <div
            className="h-4 w-14 rounded-full"
            style={{ background: "#d1fae5" }}
          />
          <div
            className="h-1 w-1 rounded-full"
            style={{ background: "#a7f3d0" }}
          />
          <div className="h-3 w-16 rounded" style={{ background: "#d1fae5" }} />
        </div>
        <div
          className="mt-1 h-7 w-28 rounded-full"
          style={{ background: "#a7f3d0" }}
        />
      </div>
    </div>
  );
}

function DonationItemCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="relative overflow-hidden flex items-center gap-4 rounded-2xl bg-white px-5 py-4"
      style={{ border: "1px solid #fde8a0" }}
    >
      <div
        className="skeleton-shimmer"
        style={{ animationDelay: `${(index % 4) * 0.12}s` }}
      />
      <div
        className="h-20 w-20 shrink-0 rounded-xl"
        style={{ background: "#fde68a" }}
      />
      <div className="flex flex-1 flex-col gap-2">
        <div
          className="h-3.5 w-4/5 rounded"
          style={{ background: "#fde68a" }}
        />
        <div className="h-3 w-3/5 rounded" style={{ background: "#fde68a" }} />
        <div className="flex items-center gap-1.5 mt-0.5">
          <div
            className="h-4 w-14 rounded-full"
            style={{ background: "#fde68a" }}
          />
          <div
            className="h-1 w-1 rounded-full"
            style={{ background: "#fbbf24" }}
          />
          <div className="h-3 w-16 rounded" style={{ background: "#fde68a" }} />
        </div>
        <div
          className="mt-1 h-5 w-28 rounded-full"
          style={{ background: "#fde68a" }}
        />
      </div>
    </div>
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
    <section className="py-10 max-w-6xl mx-auto px-4 sm:px-6">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-7 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white"
                style={{
                  boxShadow:
                    "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)",
                }}
              >
                <Gift size={17} strokeWidth={2} style={{ color: "#059669" }} />
              </div>
              <h2
                className="text-xl font-semibold"
                style={{ color: "#16130f" }}
              >
                Free Items
              </h2>
              {!isLoading && total > 0 && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: "rgba(16,185,129,0.15)",
                    color: "#059669",
                  }}
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
            style={{
              borderColor: "#a7f3d0",
              color: "#059669",
              background: "white",
            }}
          >
            See all <ArrowRight size={12} strokeWidth={2.2} />
          </Link>
        </div>

        {/* Horizontal scroll row — 4 cards visible on desktop */}
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 px-4">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-[280px] lg:w-[320px] shrink-0">
                  <FreeItemCardSkeleton index={i} />
                </div>
              ))
            : listings.map((listing) => (
                <div
                  key={listing.id}
                  className="w-[280px] lg:w-[320px] shrink-0"
                >
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
      href={`/listings/${listing.id}`}
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
          <div className="flex h-full w-full items-center justify-center text-xl">
            📦
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p
          className="line-clamp-2 text-sm font-semibold leading-snug"
          style={{ color: "#16130f" }}
        >
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
            <MapPin
              size={9}
              strokeWidth={2}
              style={{ color: "#b8b0a8", flexShrink: 0 }}
            />
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
    <section className="py-10 max-w-6xl mx-auto px-4 sm:px-6">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-7 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white"
                style={{
                  boxShadow:
                    "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)",
                }}
              >
                <Heart size={17} strokeWidth={2} style={{ color: "#b45309" }} />
              </div>
              <h2
                className="text-xl font-semibold"
                style={{ color: "#16130f" }}
              >
                Donation Pile
              </h2>
              {!isLoading && total > 0 && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: "rgba(245,158,11,0.18)",
                    color: "#b45309",
                  }}
                >
                  {total}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Items going to charities — give them a good send-off
            </p>
            <p className="mt-3 text-sm max-w-md" style={{ color: "#6b7280" }}>
              Got something gathering dust?{" "}
              <Link
                href="/dashboard/listings/new"
                prefetch={false}
                className="font-semibold underline underline-offset-2 hover:no-underline"
                style={{ color: "#16130f" }}
              >
                List it as a donation
              </Link>{" "}
              and let it go to a charity that actually needs it. Takes 2
              minutes.
            </p>
          </div>

          <Link
            href="/search?listing_type=donate"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-150 hover:gap-2.5"
            style={{
              borderColor: "#fbbf24",
              color: "#b45309",
              background: "white",
            }}
          >
            See all <ArrowRight size={12} strokeWidth={2.2} />
          </Link>
        </div>

        {/* Horizontal scroll row */}
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 px-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[280px] lg:w-[320px] shrink-0">
                  <DonationItemCardSkeleton index={i} />
                </div>
              ))
            : listings.map((listing) => (
                <div
                  key={listing.id}
                  className="w-[280px] lg:w-[320px] shrink-0"
                >
                  <DonationItemCard listing={listing} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}

// ─── Browse by category section ───────────────────────────────────────────────

const ALL_CATEGORIES = [
  "Electronics",
  "Clothing & Accessories",
  "Furniture & Home",
  "Appliances",
  "Sports & Outdoors",
  "Books & Stationery",
  "Kids & Baby",
  "Vehicles & Parts",
  "Other",
] as const;

function CategoryCard({ cat, Icon }: { cat: string; Icon: LucideIcon }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={`/search?category=${encodeURIComponent(cat)}`}
      className="shrink-0 flex flex-col items-center gap-2.5 rounded-2xl px-4 py-4 text-center transition-all duration-200"
      style={{
        minWidth: "96px",
        flex: "1 1 0",
        background: hovered ? "#16130f" : "white",
        boxShadow: hovered
          ? "0 4px 12px rgba(0,0,0,0.08)"
          : "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200"
        style={{ background: hovered ? "rgba(255,255,255,0.10)" : "#f5f0ea" }}
      >
        <Icon
          size={18}
          strokeWidth={1.75}
          style={{ color: hovered ? "white" : "#16130f" }}
        />
      </div>
      <span
        className="text-[11px] font-medium leading-tight"
        style={{ color: hovered ? "rgba(255,255,255,0.85)" : "#44403c" }}
      >
        {cat}
      </span>
    </Link>
  );
}

function BrowseByCategorySection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-4">
      {/* <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#a8a09a" }}>
          Browse by category
        </h2>
        <Link
          href="/search"
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: "#78726c" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#16130f"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#78726c"; }}
        >
          All listings <ArrowRight size={11} strokeWidth={2.2} />
        </Link>
      </div> */}

      <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
        {ALL_CATEGORIES.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          if (!cfg) return null;
          return <CategoryCard key={cat} cat={cat} Icon={cfg.Icon} />;
        })}
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
            const { Icon } = cfg;
            return (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white"
                style={{
                  boxShadow:
                    "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)",
                }}
              >
                <Icon size={15} strokeWidth={2} style={{ color: "#44403c" }} />
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
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#4338ca";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#4f46e5";
            }}
          >
            See all <ArrowRight size={12} strokeWidth={2.2} />
          </Link>
        )}
      </div>

      {/* Horizontal scroll row */}
      <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-1 pb-5 px-5 sm:px-7">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-[200px] sm:w-[230px] lg:w-[265px] shrink-0"
              >
                <BrowseCardSkeleton index={i} />
              </div>
            ))
          : listings.map((listing) => (
              <div
                key={listing.id}
                className="w-[200px] sm:w-[230px] lg:w-[265px] shrink-0 flex flex-col"
              >
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
    <main className="min-h-screen">
      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden flex flex-col"
        style={{ marginTop: "-76px" }}
      >
        {/* Background photo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "url('/hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center 35%",
          }}
        />
        {/* Left-heavy gradient — dark on left for legibility, photo visible on right */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.80) 35%, rgba(0,0,0,0.40) 65%, rgba(0,0,0,0.05) 100%)",
          }}
        />

        {/* Left-aligned content — mirrors Fiverr's layout */}
        <div
          className="relative w-full flex-1 flex flex-col justify-center px-6 md:px-10 pt-44 pb-40 mx-auto"
          style={{ maxWidth: "1280px" }}
        >
          {/* Headline */}
          <h1
            className="text-white leading-[1.04] tracking-tight font-display"
            style={{ fontSize: "clamp(38px, 5.5vw, 72px)" }}
          >
            Sell what you{" "}
            <span className="relative inline-block whitespace-nowrap">
              don&apos;t need.
              <svg
                aria-hidden
                viewBox="0 0 200 10"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute -bottom-2 left-0 w-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 7 C30 2, 65 9, 100 5 S148 1, 172 6 S190 9, 198 5"
                  stroke="#a5b4fc"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <br />
            Find what you do.
          </h1>

          {/* Search bar — rectangular with icon-only dark button, Fiverr-style */}
          <form
            onSubmit={handleSearch}
            className="mt-9 flex items-stretch w-full overflow-hidden"
            style={{
              maxWidth: "780px",
              borderRadius: "8px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div
              className="relative flex-1 flex items-center"
              style={{ minWidth: 0 }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search for phones, furniture, clothes…"
                className="w-full h-[60px] px-5 text-[15px] focus:outline-none"
                style={{ background: "#ffffff", color: "#16130f" }}
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ color: "#9ca3af" }}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="h-[60px] w-[60px] flex shrink-0 items-center justify-center transition-colors duration-150"
              style={{ background: "#16130f", color: "white" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#4f46e5";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#16130f";
              }}
            >
              <Search size={20} strokeWidth={2} />
            </button>
          </form>

          {/* Category chips — outlined pills with arrow, Fiverr-style */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            {FEATURED_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  router.push(
                    `/search?category=${encodeURIComponent(cat)}&listing_type=for_sale`,
                  )
                }
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium transition-all duration-150"
                style={{
                  borderRadius: "99px",
                  border: "1px solid rgba(255,255,255,0.50)",
                  color: "rgba(255,255,255,0.90)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "rgba(255,255,255,0.14)";
                  el.style.borderColor = "rgba(255,255,255,0.90)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "transparent";
                  el.style.borderColor = "rgba(255,255,255,0.50)";
                }}
              >
                {cat}
                <ArrowRight size={12} strokeWidth={2.2} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Browse by category ── */}
      <BrowseByCategorySection />

      {/* ── Category sections ── */}
      <div className="max-w-6xl mx-auto pt-4 pb-6">
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
            <p className="text-white font-semibold text-base">
              Looking for something specific?
            </p>
            <p className="text-white/55 text-sm mt-0.5">
              Search and filter across all listings
            </p>
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
