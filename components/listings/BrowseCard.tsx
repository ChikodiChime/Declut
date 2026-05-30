"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ListingImage } from "@/components/ui";
import {
  Package,
  MapPin,
  ShoppingCart,
  Gift,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";
import { addToSessionCart } from "@/lib/session-cart";
import type { Listing } from "@/types";

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; borderHover: string }
> = {
  for_sale: {
    label: "For Sale",
    color: "#4f46e5",
    bg: "rgba(79,70,229,0.1)",
    border: "#ddd8fc",
    borderHover: "#a5b4fc",
  },
  free: {
    label: "Free",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "#c6f0e2",
    borderHover: "#6ee7b7",
  },
  donate: {
    label: "Donate",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "#fde8a0",
    borderHover: "#fbbf24",
  },
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

interface BrowseCardProps {
  listing: Listing;
}

export function BrowseCard({ listing }: BrowseCardProps) {
  const router = useRouter();
  const { isInCart, addToCartOptimistic } = useCart();
  const [addingToCart, setAddingToCart] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const type = TYPE_CONFIG[listing.listing_type] ?? TYPE_CONFIG.for_sale;
  const inCart = isInCart(listing.id);
  const images = listing.images;
  const hasMultiple = images.length > 1;

  function prevImg(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setImgIdx((i) => (i - 1 + images.length) % images.length);
  }

  function nextImg(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setImgIdx((i) => (i + 1) % images.length);
  }

  function goToImg(e: React.MouseEvent, idx: number) {
    e.preventDefault();
    e.stopPropagation();
    setImgIdx(idx);
  }

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inCart || addingToCart) return;
    addToCartOptimistic(listing.id);
    setAddingToCart(true);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listing.id }),
    });
    setAddingToCart(false);
    if (res.status === 401) {
      addToSessionCart(listing.id);
      window.dispatchEvent(new Event("cart-updated"));
      return;
    }
    if (res.ok) window.dispatchEvent(new Event("cart-updated"));
  }

  async function handleClaim(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/${listing.id}`);
  }

  return (
    <Link
      href={`/${listing.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300"
      style={{
        borderColor: type.border,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = type.borderHover;
        el.style.boxShadow = `0 4px 16px rgba(22,19,15,0.10), 0 0 0 1px ${type.borderHover}`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = type.border;
        el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)";
      }}
    >
      {/* ── Image + carousel ── */}
      <div className="relative aspect-4/3 overflow-hidden" style={{ background: type.bg }}>
        {images.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-subtle">
            <Package size={28} strokeWidth={1.5} />
            <span className="text-xs">No photo</span>
          </div>
        ) : (
          /* Sliding track — translate based on current index */
          <div
            className="absolute inset-0 flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${imgIdx * 100}%)` }}
          >
            {images.map((src, i) => (
              <div key={src || i} className="relative w-full h-full shrink-0 overflow-hidden">
                <ListingImage
                  src={src}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  alt={listing.title}
                />
              </div>
            ))}
          </div>
        )}

        {/* Type badge */}
        <div className="absolute left-2.5 top-2.5">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.92)", color: type.color }}
          >
            {type.label}
          </span>
        </div>

        {/* Prev arrow */}
        {hasMultiple && imgIdx > 0 && (
          <button
            onClick={prevImg}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
          </button>
        )}

        {/* Next arrow */}
        {hasMultiple && imgIdx < images.length - 1 && (
          <button
            onClick={nextImg}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          >
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => goToImg(e, i)}
                aria-label={`Image ${i + 1}`}
                className="transition-all duration-200 rounded-full"
                style={{
                  width: i === imgIdx ? 14 : 5,
                  height: 5,
                  background: i === imgIdx ? "white" : "rgba(255,255,255,0.55)",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 p-3.5 gap-2.5">
        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text">
          {listing.title}
        </h3>

        {/* Price + condition — same row, clear hierarchy */}
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-[15px] font-bold leading-none" style={{ color: type.color }}>
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
          <MapPin size={10} strokeWidth={2} className="shrink-0" style={{ color: "#b8b0a8" }} />
          <span className="truncate text-[11px]" style={{ color: "#a8a09a" }}>
            {listing.area}
          </span>
        </div>

        {/* CTA */}
        {listing.listing_type === "for_sale" && listing.status === "available" && (
          <button
            onClick={handleAddToCart}
            disabled={inCart}
            className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed"
            style={{
              background: inCart ? "#f5f1eb" : type.color,
              color: inCart ? "#78726c" : "white",
            }}
          >
            <ShoppingCart size={12} strokeWidth={2} />
            {inCart ? "In Cart" : "Add to Cart"}
          </button>
        )}

        {listing.listing_type === "free" && listing.status === "available" && (
          <button
            onClick={handleClaim}
            className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all duration-200"
            style={{ background: type.color, color: "white" }}
          >
            <Gift size={12} strokeWidth={2} />
            Claim
          </button>
        )}
      </div>
    </Link>
  );
}
