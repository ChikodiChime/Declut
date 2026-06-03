"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ListingImage } from "@/components/ui";
import {
  Package,
  MapPin,
  Gift,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  Clock,
  X,
} from "lucide-react";

import { useCart } from "@/lib/hooks/useCart";
import { addToSessionCart } from "@/lib/session-cart";
import { CartIdleIcon } from "@/components/icons/CartIdleIcon";
import { CartDoneIcon } from "@/components/icons/CartDoneIcon";
import type { Listing } from "@/types";

type ActionState = "idle" | "loading" | "done";

type ClaimFeedback = {
  kind: "success" | "error";
  text: string;
  sub?: string;
} | null;

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
  const [cartState, setCartState] = useState<ActionState>("idle");
  const [claimState, setClaimState] = useState<ActionState>("idle");
  const [claimFeedback, setClaimFeedback] = useState<ClaimFeedback>(null);
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
    if (inCart || cartState !== "idle") return;
    addToCartOptimistic(listing.id);
    setCartState("loading");
    const [res] = await Promise.all([
      fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listing.id }),
      }),
      new Promise<void>((r) => setTimeout(r, 700)),
    ]);
    if (res.status === 401) {
      addToSessionCart(listing.id);
      window.dispatchEvent(new Event("cart-updated"));
    } else if (res.ok) {
      window.dispatchEvent(new Event("cart-updated"));
    }
    setCartState("done");
    setTimeout(() => setCartState("idle"), 2000);
  }

  async function handleClaim(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (claimState !== "idle") return;
    setClaimState("loading");
    const [res] = await Promise.all([
      fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listing.id }),
      }),
      new Promise<void>((r) => setTimeout(r, 700)),
    ]);

    if (res.status === 401) {
      router.push(`/auth/login?next=/listings/${listing.id}`);
      return;
    }

    let feedback: ClaimFeedback;
    if (res.ok) {
      feedback = {
        kind: "success",
        text: "Claim sent!",
        sub: "Waiting for the seller to respond",
      };
      setClaimState("done");
      setTimeout(() => setClaimState("idle"), 3000);
    } else {
      const body = await res.json().catch(() => ({}));
      const msg: string = body?.error?.message ?? "";
      if (res.status === 409) {
        feedback = msg.includes("no longer available")
          ? { kind: "error", text: "No longer available", sub: "Someone else may have claimed it" }
          : { kind: "error", text: "Already claimed", sub: "You already have a pending claim" };
      } else {
        feedback = { kind: "error", text: "Couldn't claim", sub: "Please try again" };
      }
      setClaimState("idle");
    }

    setClaimFeedback(feedback);
    setTimeout(() => setClaimFeedback(null), 4000);
  }

  return (
    <Link
      href={`/listings/${listing.id}`}
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

        {/* Hover action button — top right */}
        {listing.status === "available" && (
          <div className="absolute right-2.5 top-2.5 z-10">
            {listing.listing_type === "for_sale" && (
              <button
                onClick={handleAddToCart}
                disabled={cartState === "loading"}
                aria-label={inCart || cartState === "done" ? "Added to cart" : "Add to cart"}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ease-out disabled:cursor-not-allowed ${
                  inCart || cartState !== "idle"
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-100 sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto"
                }`}
                style={{
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                  transform: cartState === "done" ? "scale(1.18)" : "scale(1)",
                }}
                onMouseEnter={(e) => {
                  if (cartState !== "idle") return;
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  if (cartState !== "idle") return;
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                }}
              >
                {cartState === "loading" ? (
                  <Loader2 size={22} strokeWidth={2} className="animate-spin" style={{ color: type.color }} />
                ) : inCart || cartState === "done" ? (
                  <CartDoneIcon color={type.color} />
                ) : (
                  <CartIdleIcon color="#374151" />
                )}
              </button>
            )}

            {listing.listing_type === "free" && (
              <button
                onClick={handleClaim}
                disabled={claimState === "loading"}
                aria-label="Claim item"
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ease-out disabled:cursor-not-allowed ${
                  claimState !== "idle"
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-100 sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto"
                }`}
                style={{
                  background:
                    claimState === "done" ? type.color : "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                  transform: claimState === "done" ? "scale(1.18)" : "scale(1)",
                }}
                onMouseEnter={(e) => {
                  if (claimState !== "idle") return;
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  if (claimState !== "idle") return;
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                }}
              >
                {claimState === "loading" ? (
                  <Loader2
                    size={22}
                    strokeWidth={2}
                    className="animate-spin"
                    style={{ color: type.color }}
                  />
                ) : claimState === "done" ? (
                  <Check size={22} strokeWidth={2} style={{ color: "white" }} />
                ) : (
                  <Gift size={22} strokeWidth={1.5} style={{ color: "#374151" }} />
                )}
              </button>
            )}
          </div>
        )}

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

        {/* Claim feedback overlay */}
        {claimFeedback && (
          <div
            className="absolute inset-x-0 bottom-0 z-20 flex items-start gap-2 px-3 py-2.5 transition-all duration-300"
            style={{
              background:
                claimFeedback.kind === "success"
                  ? "rgba(5,95,70,0.93)"
                  : "rgba(127,29,29,0.93)",
              backdropFilter: "blur(6px)",
            }}
          >
            <div className="mt-0.5 shrink-0">
              {claimFeedback.kind === "success" ? (
                <Clock size={12} strokeWidth={2.5} style={{ color: "rgba(255,255,255,0.85)" }} />
              ) : (
                <X size={12} strokeWidth={2.5} style={{ color: "rgba(255,255,255,0.85)" }} />
              )}
            </div>
            <div>
              <p className="text-[12px] font-semibold leading-tight text-white">
                {claimFeedback.text}
              </p>
              {claimFeedback.sub && (
                <p className="text-[10.5px] mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.72)" }}>
                  {claimFeedback.sub}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 p-3.5 gap-2.5">
        {/* Title */}
        <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-text">
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

      </div>
    </Link>
  );
}
