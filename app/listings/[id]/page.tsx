"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ListingImage } from "@/components/ui";
import {
  ArrowLeft,
  MapPin,
  Package,
  User,
  Building2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useListing } from "@/lib/hooks/useListings";
import { useCart } from "@/lib/hooks/useCart";
import { addToSessionCart } from "@/lib/session-cart";
import type { ListingWithSeller } from "@/types";
import { useMe } from "@/lib/hooks/useAuth";
import {
  useMyClaims,
  useClaimListing,
  useUpdateClaim,
} from "@/lib/hooks/useClaims";

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  for_sale: { label: "For Sale", color: "#4f46e5", bg: "rgba(79,70,229,0.08)" },
  free:     { label: "Free",     color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  donate:   { label: "Donated",  color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
} as const;

const CONDITION_LABELS: Record<string, string> = {
  new: "New", like_new: "Like New", good: "Good", fair: "Fair", poor: "Poor",
};
const CONDITION_LEVEL: Record<string, number> = {
  new: 5, like_new: 4, good: 3, fair: 2, poor: 1,
};

// ── ImageGallery ──────────────────────────────────────────────────────────────

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div
        className="rounded-3xl flex items-center justify-center"
        style={{ aspectRatio: "4/3", background: "#f0ece4" }}
      >
        <div className="flex flex-col items-center gap-3 text-[#a8a09a]">
          <Package size={48} strokeWidth={1} />
          <span className="text-xs font-semibold tracking-[0.12em] uppercase">No photos</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{ aspectRatio: "4/3", background: "#f0ece4" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0"
          >
            <ListingImage
              src={images[active]}
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover"
              alt={`${title} — photo ${active + 1}`}
              priority
            />
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <div
            className="absolute bottom-4 right-4 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide backdrop-blur-md"
            style={{ background: "rgba(22,19,15,0.48)", color: "rgba(255,255,255,0.92)" }}
          >
            {active + 1} / {images.length}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="relative shrink-0 w-[68px] h-[68px] rounded-xl overflow-hidden transition-all duration-200"
              style={{
                outline: i === active ? "2.5px solid #4f46e5" : "2.5px solid transparent",
                outlineOffset: 2,
                opacity: i === active ? 1 : 0.48,
              }}
            >
              <ListingImage
                src={img}
                fill
                sizes="68px"
                className="object-cover"
                alt={`Thumbnail ${i + 1}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ConditionBar ──────────────────────────────────────────────────────────────

function ConditionBar({ condition }: { condition: string }) {
  const level = CONDITION_LEVEL[condition] ?? 3;
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-[5px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-[9px] h-[9px] rounded-full"
            style={{ background: i < level ? "#4f46e5" : "#e8e4dc" }}
          />
        ))}
      </div>
      <span className="text-[13px] text-[#78726c] font-medium">
        {CONDITION_LABELS[condition] ?? condition}
      </span>
    </div>
  );
}

// ── ClaimCTA ──────────────────────────────────────────────────────────────────

function ClaimCTA({ listing }: { listing: ListingWithSeller }) {
  const { data: me, isLoading: meLoading } = useMe();
  const { data: myClaims, isLoading: claimsLoading } = useMyClaims({
    enabled: listing.listing_type === "free",
  });
  const { mutate: claim, isPending: claiming } = useClaimListing();
  const { mutate: updateClaim, isPending: updating } = useUpdateClaim();

  if (listing.listing_type === "donate") {
    return (
      <div
        className="rounded-2xl px-5 py-4 text-center"
        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
      >
        <p
          className="text-[11.5px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "#d97706" }}
        >
          Donated to charity
        </p>
      </div>
    );
  }

  if (listing.listing_type !== "free") return null;

  if (meLoading || (me && claimsLoading)) {
    return <div className="h-14 rounded-2xl bg-[#f0ece4] animate-pulse" />;
  }

  const existingClaim = myClaims?.find(
    (c) => c.listing_id === listing.id && c.status !== "cancelled"
  );

  if (existingClaim?.status === "pending") {
    return (
      <div className="flex flex-col gap-3">
        <div
          className="rounded-2xl px-5 py-4 flex items-start gap-3"
          style={{ background: "#fffbeb", border: "1px solid rgba(217,119,6,0.22)" }}
        >
          <Clock size={15} className="text-[#d97706] shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="text-[13.5px] font-semibold text-[#92400e]">Claim pending</p>
            <p className="text-[12px] text-[#d97706] mt-0.5">Waiting for the seller to respond</p>
          </div>
        </div>
        <button
          onClick={() => updateClaim({ id: existingClaim.id, status: "cancelled" })}
          disabled={updating}
          className="text-[12px] text-[#a8a09a] hover:text-[#78726c] underline underline-offset-4 text-center transition-colors disabled:opacity-50 py-1"
        >
          Cancel claim
        </button>
      </div>
    );
  }

  if (existingClaim?.status === "accepted") {
    return (
      <div className="flex flex-col gap-3">
        <div
          className="rounded-2xl px-5 py-4 flex items-start gap-3"
          style={{ background: "#ecfdf5", border: "1px solid rgba(16,185,129,0.22)" }}
        >
          <CheckCircle2 size={15} className="text-[#10b981] shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="text-[13.5px] font-semibold text-[#065f46]">Claim accepted!</p>
            {existingClaim.pickup_address && (
              <p className="text-[12px] text-[#10b981] mt-1 flex items-center gap-1">
                <MapPin size={11} strokeWidth={2.5} />
                {existingClaim.pickup_address}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => updateClaim({ id: existingClaim.id, status: "completed" })}
          disabled={updating}
          className="w-full h-14 rounded-2xl font-semibold text-[15px] tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-60 text-white flex items-center justify-center gap-2"
          style={{ background: "#10b981" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#059669")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#10b981")}
        >
          {updating ? "Marking collected…" : "Mark as Collected"}
        </button>
      </div>
    );
  }

  if (existingClaim?.status === "completed") {
    return (
      <div
        className="rounded-2xl px-5 py-4 text-center"
        style={{ background: "#fafaf8", border: "1px solid #e8e4dc" }}
      >
        <p className="text-[13px] font-medium text-[#78726c]">You collected this item</p>
      </div>
    );
  }

  if (existingClaim) return null;

  if (listing.status !== "available") {
    return (
      <div
        className="rounded-2xl px-5 py-4 text-center"
        style={{ background: "#fafaf8", border: "1px solid #e8e4dc" }}
      >
        <p
          className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#a8a09a]"
        >
          Already claimed
        </p>
      </div>
    );
  }

  if (!me) {
    return (
      <Link
        href={`/auth/login?next=/listings/${listing.id}`}
        className="w-full h-14 rounded-2xl font-semibold text-[15px] tracking-tight transition-all duration-200 text-white flex items-center justify-center"
        style={{ background: "#10b981" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#059669")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#10b981")}
      >
        Claim for Free
      </Link>
    );
  }

  return (
    <button
      onClick={() => claim(listing.id)}
      disabled={claiming}
      className="w-full h-14 rounded-2xl font-semibold text-[15px] tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-60 text-white flex items-center justify-center gap-2"
      style={{ background: "#10b981" }}
      onMouseEnter={(e) => { if (!claiming) e.currentTarget.style.background = "#059669"; }}
      onMouseLeave={(e) => { if (!claiming) e.currentTarget.style.background = "#10b981"; }}
    >
      {claiming ? (
        <>
          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Claiming…
        </>
      ) : (
        "Claim for Free"
      )}
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ListingDetailSkeleton() {
  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="h-3.5 w-12 bg-[#e8e4dc] rounded animate-pulse mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-[58%_1fr] gap-8 lg:gap-14">
          <div className="rounded-3xl bg-[#e8e4dc] animate-pulse" style={{ aspectRatio: "4/3" }} />
          <div className="flex flex-col gap-5 pt-2">
            <div className="h-4 w-24 bg-[#e8e4dc] rounded-full animate-pulse" />
            <div className="h-9 w-4/5 bg-[#e8e4dc] rounded animate-pulse" />
            <div className="h-9 w-1/3 bg-[#e8e4dc] rounded animate-pulse" />
            <div className="space-y-2 mt-2">
              <div className="h-3.5 w-full bg-[#e8e4dc] rounded animate-pulse" />
              <div className="h-3.5 w-5/6 bg-[#e8e4dc] rounded animate-pulse" />
              <div className="h-3.5 w-4/6 bg-[#e8e4dc] rounded animate-pulse" />
            </div>
            <div className="h-14 w-full bg-[#e8e4dc] rounded-2xl animate-pulse mt-4" />
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useListing(id);
  const { isInCart, addToCartOptimistic } = useCart();
  const [addingToCart, setAddingToCart] = useState(false);
  const inCart = isInCart(id);

  async function handleAddToCart() {
    if (inCart || addingToCart) return;
    addToCartOptimistic(id);
    setAddingToCart(true);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: id }),
    });
    setAddingToCart(false);
    if (res.status === 401) {
      addToSessionCart(id);
      window.dispatchEvent(new Event("cart-updated"));
      return;
    }
    if (res.ok) window.dispatchEvent(new Event("cart-updated"));
  }

  if (isLoading) return <ListingDetailSkeleton />;

  if (error || !data?.listing) {
    return (
      <main className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-full bg-[#f0ece4] flex items-center justify-center mx-auto mb-5">
            <Package size={26} strokeWidth={1.25} className="text-[#a8a09a]" />
          </div>
          <h2 className="font-display text-2xl text-[#16130f] mb-2">Not found</h2>
          <p className="text-[#78726c] text-sm mb-6 leading-relaxed">
            This listing may have been removed or is no longer available.
          </p>
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#e8e4dc] text-[13px] font-medium text-[#16130f] hover:bg-[#f0ece4] transition-colors"
          >
            <ArrowLeft size={13} />
            Browse listings
          </Link>
        </div>
      </main>
    );
  }

  const listing = data.listing as ListingWithSeller;
  const seller = listing.seller;
  const typeConfig = TYPE_CONFIG[listing.listing_type];

  return (
    <main className="min-h-screen bg-[#fafaf8]">
      {/* Back nav */}
      <div className="px-4 lg:px-10 pt-7 pb-2 max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="group inline-flex items-center gap-2 text-[13px] font-medium text-[#b0a89f] hover:text-[#16130f] transition-colors duration-200"
        >
          <ArrowLeft
            size={14}
            strokeWidth={2.5}
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          />
          Back
        </button>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-10 py-7 pb-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[58%_1fr] gap-8 lg:gap-16">

          {/* ── Left: Images ── */}
          <ImageGallery images={listing.images} title={listing.title} />

          {/* ── Right: Details ── */}
          <motion.div
            className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Type + category */}
            <div className="flex items-center gap-2.5">
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase"
                style={{
                  color: typeConfig.color,
                  background: typeConfig.bg,
                  letterSpacing: "0.08em",
                }}
              >
                {typeConfig.label}
              </span>
              <span
                className="text-[11px] font-semibold uppercase text-[#a8a09a]"
                style={{ letterSpacing: "0.08em" }}
              >
                {listing.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display leading-[1.15] text-[#16130f] tracking-[-0.01em]" style={{ fontSize: "clamp(1.5rem, 5vw, 2.4rem)" }}>
              {listing.title}
            </h1>

            {/* Price */}
            {listing.listing_type === "for_sale" && listing.price != null ? (
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[#4f46e5] leading-none" style={{ fontSize: "clamp(1rem, 3.5vw, 1.4rem)" }}>₦</span>
                <span className="font-display text-[#4f46e5] leading-none tracking-tight" style={{ fontSize: "clamp(1.75rem, 7vw, 3rem)" }}>
                  {listing.price.toLocaleString()}
                </span>
              </div>
            ) : listing.listing_type === "free" ? (
              <span className="font-display text-[#10b981] leading-none" style={{ fontSize: "clamp(1.75rem, 7vw, 2.8rem)" }}>Free</span>
            ) : null}

            {/* Description */}
            {listing.description && (
              <p className="text-[14px] text-[#78726c] leading-[1.8] whitespace-pre-wrap">
                {listing.description}
              </p>
            )}

            {/* ── Divider ── */}
            <div className="h-px bg-[#ede9e2]" />

            {/* Condition + Location */}
            <div className="flex flex-col gap-3">
              <ConditionBar condition={listing.condition} />
              <div className="flex items-center gap-2 text-[13px] text-[#78726c]">
                <MapPin size={12} strokeWidth={2.5} className="text-[#b0a89f]" />
                <span>{listing.area}</span>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="h-px bg-[#ede9e2]" />

            {/* Seller */}
            {seller && (
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "#f0ece4" }}
                >
                  {seller.account_type === "business" ? (
                    <Building2 size={16} strokeWidth={1.75} className="text-[#78726c]" />
                  ) : (
                    <User size={16} strokeWidth={1.75} className="text-[#78726c]" />
                  )}
                </div>
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase text-[#b0a89f]"
                    style={{ letterSpacing: "0.11em" }}
                  >
                    Listed by
                  </p>
                  <p className="text-[14px] font-semibold text-[#16130f] mt-0.5">
                    {seller.name ?? "Seller"}
                  </p>
                </div>
              </div>
            )}

            {/* ── Divider ── */}
            <div className="h-px bg-[#ede9e2]" />

            {/* CTA */}
            {listing.listing_type === "for_sale" && listing.status === "available" && (
              <button
                onClick={handleAddToCart}
                disabled={inCart || addingToCart}
                className="w-full h-14 rounded-2xl font-semibold text-[15px] tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: inCart ? "#f0ece4" : "#4f46e5",
                  color: inCart ? "#78726c" : "#ffffff",
                }}
                onMouseEnter={(e) => { if (!inCart) e.currentTarget.style.background = "#4338ca"; }}
                onMouseLeave={(e) => { if (!inCart) e.currentTarget.style.background = "#4f46e5"; }}
              >
                {addingToCart ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Adding…
                  </>
                ) : inCart ? (
                  "In Cart"
                ) : (
                  "Add to Cart"
                )}
              </button>
            )}

            {listing.listing_type === "for_sale" && listing.status === "sold" && (
              <div
                className="rounded-2xl px-5 py-4 text-center"
                style={{ background: "#fafaf8", border: "1px solid #e8e4dc" }}
              >
                <p
                  className="text-[11.5px] font-semibold uppercase text-[#a8a09a]"
                  style={{ letterSpacing: "0.1em" }}
                >
                  Sold
                </p>
              </div>
            )}

            {listing.listing_type !== "for_sale" && <ClaimCTA listing={listing} />}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
