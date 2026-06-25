"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { ListingImage, AddressPickerModal } from "@/components/ui";
import { useAddresses } from "@/lib/hooks/useAddresses";
import { BrowseCard, ListingStructuredData } from "@/components/listings";
import {
  ArrowLeft,
  MapPin,
  Package,
  User,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Bike,
  Car,
  Truck,
  Share2,
  Star,
} from "lucide-react";
import { DELIVERY_RATES, DEFAULT_SIZE_CATEGORY } from "@/lib/constants";
import { useListing, usePublicListings } from "@/lib/hooks/useListings";
import { useCart } from "@/lib/hooks/useCart";
import { addToSessionCart } from "@/lib/session-cart";
import type { ListingWithSeller, SizeCategory } from "@/types";
import { useMe } from "@/lib/hooks/useAuth";
import {
  useMyClaims,
  useClaimListing,
  useUpdateClaim,
} from "@/lib/hooks/useClaims";

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  for_sale: { label: "For Sale", color: "#4f46e5", bg: "rgba(79,70,229,0.08)" },
  free: { label: "Free", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  donate: { label: "Donated", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
} as const;

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};
const CONDITION_LEVEL: Record<string, number> = {
  new: 5,
  like_new: 4,
  good: 3,
  fair: 2,
  poor: 1,
};

// ── ImageGallery ──────────────────────────────────────────────────────────────

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const total = images.length;
  const prev = () => setActive((i) => (i - 1 + total) % total);
  const next = () => setActive((i) => (i + 1) % total);

  if (total === 0) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center"
        style={{
          aspectRatio: "4/3",
          background: "#f0ece4",
          border: "1px solid #e8e2da",
        }}
      >
        <div className="flex flex-col items-center gap-3 text-[#a8a09a]">
          <Package size={48} strokeWidth={1} />
          <span className="text-xs font-semibold tracking-[0.12em] uppercase">
            No photos
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          aspectRatio: "4/3",
          background: "#f0ece4",
          border: "1px solid #e8e2da",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
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

        {/* Prev / Next arrows */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-150 hover:scale-105"
              style={{ background: "rgba(22,19,15,0.52)", color: "white" }}
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-150 hover:scale-105"
              style={{ background: "rgba(22,19,15,0.52)", color: "white" }}
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>

            {/* Counter */}
            <div
              className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md"
              style={{
                background: "rgba(22,19,15,0.48)",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {active + 1} / {total}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="relative shrink-0 rounded-xl overflow-hidden transition-all duration-200"
              style={{
                width: 80,
                height: 80,
                border:
                  i === active ? "2px solid #4f46e5" : "2px solid #e8e2da",
                boxShadow:
                  i === active ? "0 0 0 3px rgba(79,70,229,0.15)" : "none",
              }}
            >
              <ListingImage
                src={img}
                fill
                sizes="80px"
                className="object-cover transition-opacity duration-200"
                style={{ opacity: i === active ? 1 : 0.65 }}
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: addresses = [] } = useAddresses();
  const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;

  if (listing.listing_type === "donate") {
    return (
      <div
        className="rounded-2xl px-5 py-4 text-center"
        style={{
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.2)",
        }}
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
    (c) => c.listing_id === listing.id && c.status !== "cancelled",
  );

  if (existingClaim?.status === "pending") {
    return (
      <div className="flex flex-col gap-3">
        <div
          className="rounded-2xl px-5 py-4 flex items-start gap-3"
          style={{
            background: "#fffbeb",
            border: "1px solid rgba(217,119,6,0.22)",
          }}
        >
          <Clock
            size={15}
            className="text-[#d97706] shrink-0 mt-0.5"
            strokeWidth={2}
          />
          <div>
            <p className="text-[13.5px] font-semibold text-[#92400e]">
              Claim pending
            </p>
            <p className="text-[12px] text-[#d97706] mt-0.5">
              Waiting for the seller to respond
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            updateClaim({ id: existingClaim.id, status: "cancelled" })
          }
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
          style={{
            background: "#ecfdf5",
            border: "1px solid rgba(16,185,129,0.22)",
          }}
        >
          <CheckCircle2
            size={15}
            className="text-[#10b981] shrink-0 mt-0.5"
            strokeWidth={2}
          />
          <div>
            <p className="text-[13.5px] font-semibold text-[#065f46]">
              Claim accepted!
            </p>
            {existingClaim.pickup_address && (
              <p className="text-[12px] text-[#10b981] mt-1 flex items-center gap-1">
                <MapPin size={11} strokeWidth={2.5} />
                {existingClaim.pickup_address}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() =>
            updateClaim({ id: existingClaim.id, status: "completed" })
          }
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
        style={{ background: "#f4f4f5", border: "1px solid #e8e4dc" }}
      >
        <p className="text-[13px] font-medium text-[#78726c]">
          You collected this item
        </p>
      </div>
    );
  }

  if (existingClaim) return null;

  if (listing.status !== "available") {
    return (
      <div
        className="rounded-2xl px-5 py-4 text-center"
        style={{ background: "#f4f4f5", border: "1px solid #e8e4dc" }}
      >
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#a8a09a]">
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
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "#059669")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "#10b981")
        }
      >
        Claim for Free
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setPickerOpen(true)}
        disabled={claiming}
        className="w-full h-14 rounded-2xl font-semibold text-[15px] tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-60 text-white flex items-center justify-center gap-2"
        style={{ background: "#10b981" }}
        onMouseEnter={(e) => {
          if (!claiming) e.currentTarget.style.background = "#059669";
        }}
        onMouseLeave={(e) => {
          if (!claiming) e.currentTarget.style.background = "#10b981";
        }}
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

      <AddressPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose pickup address"
        currentAddress={defaultAddr?.address ?? null}
        onConfirm={(address) => {
          setPickerOpen(false);
          claim({ listing_id: listing.id, pickup_address: address });
        }}
      />
    </>
  );
}

// ── Hero config ───────────────────────────────────────────────────────────────

const HERO_CONFIG = {
  gradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)",
  glow1: "rgba(99,102,241,0.40)",
  glow2: "rgba(167,139,250,0.25)",
} as const;

const VEHICLE_MAP: Record<
  SizeCategory,
  {
    label: string;
    icon: React.ComponentType<{
      size?: number;
      strokeWidth?: number;
      className?: string;
    }>;
  }
> = {
  small: { label: "Motorbike", icon: Bike },
  medium: { label: "Car", icon: Car },
  large: { label: "Van", icon: Truck },
  extra_large: { label: "Large Van", icon: Package },
};

const TYPE_BADGE = {
  for_sale: { bg: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.90)" },
  free: { bg: "rgba(16,185,129,0.90)", color: "#ffffff" },
  donate: { bg: "rgba(245,158,11,0.90)", color: "#ffffff" },
} as const;

// ── RelatedItems ──────────────────────────────────────────────────────────────

function RelatedItems({
  category,
  listingType,
  currentId,
}: {
  category: string;
  listingType: string;
  currentId: string;
}) {
  const { data, isLoading } = usePublicListings({
    category,
    listing_type: listingType as "for_sale" | "free" | "donate",
    limit: 7,
    sort: "newest",
  });

  const listings = (data?.listings ?? [])
    .filter((l) => l.id !== currentId)
    .slice(0, 6);

  if (!isLoading && listings.length === 0) return null;

  return (
    <section className="mt-14 mb-4">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold text-[#16130f]">
          Related items
        </h2>
        <Link
          href={`/search?category=${encodeURIComponent(category)}&listing_type=${listingType}`}
          className="inline-flex items-center gap-1 text-[12px] font-medium transition-colors"
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
      </div>

      <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-1 -mx-4 px-4 lg:-mx-10 lg:px-10">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-[200px] sm:w-[230px] lg:w-[265px] shrink-0 animate-pulse overflow-hidden rounded-2xl border"
                style={{ background: "white", borderColor: "#ebe5dc" }}
              >
                <div className="aspect-4/3" style={{ background: "#f0ece5" }} />
                <div className="flex flex-col gap-2 p-3">
                  <div
                    className="h-3 w-3/4 rounded"
                    style={{ background: "#f0ece5" }}
                  />
                  <div
                    className="h-3 w-1/2 rounded"
                    style={{ background: "#f0ece5" }}
                  />
                </div>
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ListingDetailSkeleton() {
  return (
    <main className="min-h-screen bg-[#f4f4f5] px-4 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="h-3.5 w-12 bg-[#e8e4dc] rounded animate-pulse mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-[58%_1fr] gap-8 lg:gap-14">
          <div
            className="rounded-3xl bg-[#e8e4dc] animate-pulse"
            style={{ aspectRatio: "4/3" }}
          />
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
  const [shareSuccess, setShareSuccess] = useState(false);
  const inCart = isInCart(id);

  const handleShare = async () => {
    if (!data?.listing) return;

    const shareUrl = `${window.location.origin}/listings/${id}`;
    const shareData = {
      title: data.listing.title,
      text: `Check out this listing: ${data.listing.title}`,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Share failed:", err);
      }
    }
  };

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
      <main className="min-h-screen bg-[#f4f4f5] flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-full bg-[#f0ece4] flex items-center justify-center mx-auto mb-5">
            <Package size={26} strokeWidth={1.25} className="text-[#a8a09a]" />
          </div>
          <h2 className="font-display text-2xl text-[#16130f] mb-2">
            Not found
          </h2>
          <p className="text-[#78726c] text-sm mb-6 leading-relaxed">
            This listing may have been removed or is no longer available.
          </p>
          <Link
            href="/"
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

  const badgeStyle = TYPE_BADGE[listing.listing_type];

  return (
    <main className="min-h-screen bg-[#f4f4f5]">
      <ListingStructuredData listing={listing} />
      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: HERO_CONFIG.gradient }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse at 15% 60%, ${HERO_CONFIG.glow1} 0%, transparent 55%), radial-gradient(ellipse at 80% 10%, ${HERO_CONFIG.glow2} 0%, transparent 50%)`,
          }}
        />
        {/* Dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 lg:px-10 pt-7 pb-12">
          {/* Back + breadcrumb row */}
          <div className="flex items-center justify-between mb-8">
            <div
              className="flex items-center gap-2 text-[12px]"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-white"
                style={{ color: "inherit" }}
              >
                <ArrowLeft size={12} strokeWidth={2} />
                Back
              </button>
              <span>·</span>
              <Link
                href="/"
                className="transition-colors hover:text-white"
                style={{ color: "inherit" }}
              >
                Home
              </Link>
              <span>›</span>
              <Link
                href={`/search?category=${encodeURIComponent(listing.category)}&listing_type=${listing.listing_type}`}
                className="transition-colors hover:text-white"
                style={{ color: "inherit" }}
              >
                {listing.category}
              </Link>
            </div>
            
            <button
              onClick={handleShare}
              className="relative p-2 rounded-lg transition-all duration-200 hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.8)" }}
              title="Share listing"
            >
              <Share2 size={16} strokeWidth={2} />
              {shareSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-white text-[#16130f] text-xs font-medium whitespace-nowrap shadow-lg"
                >
                  Link copied!
                </motion.div>
              )}
            </button>
          </div>

          {/* Type badge */}
          <span
            className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4"
            style={{ background: badgeStyle.bg, color: badgeStyle.color }}
          >
            {typeConfig.label}
          </span>

          {/* Title */}
          <h1
            className="text-white font-bold leading-tight tracking-tight mb-5"
            style={{ fontSize: "clamp(22px, 4vw, 40px)", maxWidth: "720px" }}
          >
            {listing.title}
          </h1>

          {/* Price */}
          {listing.listing_type === "for_sale" && listing.price != null ? (
            <p
              className="text-white font-bold"
              style={{ fontSize: "clamp(20px, 3vw, 28px)" }}
            >
              ₦{listing.price.toLocaleString()}
            </p>
          ) : listing.listing_type === "free" ? (
            <p
              className="font-bold text-white"
              style={{ fontSize: "clamp(20px, 3vw, 28px)" }}
            >
              Free
            </p>
          ) : null}
        </div>
      </div>

      {/* Content + Related */}
      <div className="px-4 lg:px-10 py-10 pb-16 max-w-6xl mx-auto">
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
                <MapPin
                  size={12}
                  strokeWidth={2.5}
                  className="text-[#b0a89f]"
                />
                <span>{listing.area}</span>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="h-px bg-[#ede9e2]" />

            {/* Delivery info */}
            {listing.listing_type === "for_sale" &&
              (() => {
                const sizeKey = listing.size_category ?? DEFAULT_SIZE_CATEGORY;
                const vehicle = VEHICLE_MAP[sizeKey];
                const Icon = vehicle.icon;
                const lagosFee = DELIVERY_RATES.lagos[sizeKey];
                const outsideFee = DELIVERY_RATES.outside[sizeKey];
                return (
                  <div
                    className="flex items-start gap-3 rounded-xl px-4 py-3.5"
                    style={{
                      background: "#f8f6f3",
                      border: "1px solid #ede9e2",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "#ede9e2" }}
                    >
                      <Icon
                        size={15}
                        strokeWidth={1.75}
                        className="text-[#78726c]"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#b0a89f]">
                        Delivery
                      </p>
                      <p className="text-[13.5px] font-semibold text-[#16130f] mt-0.5">
                        via {vehicle.label}
                      </p>
                      <p className="text-[12px] text-[#78726c] mt-0.5">
                        ₦{lagosFee.toLocaleString()} Lagos · ₦
                        {outsideFee.toLocaleString()} outside
                      </p>
                    </div>
                  </div>
                );
              })()}

            {/* ── Divider ── */}
            <div className="h-px bg-[#ede9e2]" />

            {/* Seller */}
            {seller && (
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                  style={{
                    background: seller.avatar_url ? "#ffffff" : "#f0ece4",
                    border: seller.avatar_url ? "2px solid #e5e7eb" : "none",
                  }}
                >
                  {seller.avatar_url ? (
                    <CldImage
                      src={seller.avatar_url}
                      width={44}
                      height={44}
                      alt={seller.name ?? "Seller"}
                      className="w-full h-full object-cover"
                    />
                  ) : seller.account_type === "business" ? (
                    <Building2 size={16} strokeWidth={1.75} className="text-[#78726c]" />
                  ) : (
                    <span className="text-sm font-semibold" style={{ color: "#78726c" }}>
                      {(seller.name ?? "S")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[10px] font-semibold uppercase text-[#b0a89f]"
                    style={{ letterSpacing: "0.11em" }}
                  >
                    Listed by
                  </p>
                  <p className="text-[14px] font-semibold text-[#16130f] mt-0.5">
                    {seller.name ?? "Seller"}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                    {seller.avg_rating != null && seller.review_count > 0 && (
                      <span className="flex items-center gap-1 text-[12px] text-[#78726c]">
                        <Star size={11} strokeWidth={0} fill="#f59e0b" />
                        {seller.avg_rating.toFixed(1)}
                        <span className="text-[#c4bdb6]">·</span>
                        {seller.review_count} review{seller.review_count !== 1 ? "s" : ""}
                      </span>
                    )}
                    {seller.total_listings > 0 && (
                      <span className="text-[12px] text-[#b0a89f]">
                        {seller.total_listings} item{seller.total_listings !== 1 ? "s" : ""} listed
                      </span>
                    )}
                    {seller.created_at && (
                      <span className="text-[12px] text-[#b0a89f]">
                        Since{" "}
                        {new Date(seller.created_at).toLocaleDateString("en-NG", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/search?seller_id=${seller.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium transition-colors"
                    style={{ color: "#4f46e5" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#4338ca" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#4f46e5" }}
                  >
                    More from {seller.name ?? "this seller"}
                    <ArrowRight size={11} strokeWidth={2.2} />
                  </Link>
                </div>
              </div>
            )}

            {/* ── Divider ── */}
            <div className="h-px bg-[#ede9e2]" />

            {/* CTA */}
            {listing.listing_type === "for_sale" &&
              listing.status === "available" && (
                <button
                  onClick={handleAddToCart}
                  disabled={inCart || addingToCart}
                  className="w-full h-14 rounded-2xl font-semibold text-[15px] tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    background: inCart ? "#f0ece4" : "#4f46e5",
                    color: inCart ? "#78726c" : "#ffffff",
                  }}
                  onMouseEnter={(e) => {
                    if (!inCart) e.currentTarget.style.background = "#4338ca";
                  }}
                  onMouseLeave={(e) => {
                    if (!inCart) e.currentTarget.style.background = "#4f46e5";
                  }}
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

            {listing.listing_type === "for_sale" &&
              listing.status === "sold" && (
                <div
                  className="rounded-2xl px-5 py-4 text-center"
                  style={{ background: "#f4f4f5", border: "1px solid #e8e4dc" }}
                >
                  <p
                    className="text-[11.5px] font-semibold uppercase text-[#a8a09a]"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    Sold
                  </p>
                </div>
              )}

            {listing.listing_type !== "for_sale" && (
              <ClaimCTA listing={listing} />
            )}
          </motion.div>
        </div>

        {/* ── Related items ── */}
        <RelatedItems
          category={listing.category}
          listingType={listing.listing_type}
          currentId={listing.id}
        />
      </div>
    </main>
  );
}
