"use client";

import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { Package, MapPin } from "lucide-react";
import type { Listing } from "@/types";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; borderHover: string }> = {
  for_sale: { label: "For Sale", color: "#4f46e5", bg: "rgba(79,70,229,0.1)",  border: "#ddd8fc", borderHover: "#a5b4fc" },
  free:     { label: "Free",     color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "#c6f0e2", borderHover: "#6ee7b7" },
  donate:   { label: "Donate",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "#fde8a0", borderHover: "#fbbf24" },
};

const CONDITION_LABELS: Record<string, string> = {
  new:      "New",
  like_new: "Like New",
  good:     "Good",
  fair:     "Fair",
  poor:     "Poor",
};

interface BrowseCardProps {
  listing: Listing;
}

export function BrowseCard({ listing }: BrowseCardProps) {
  const type = TYPE_CONFIG[listing.listing_type] ?? TYPE_CONFIG.for_sale;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-white transition-all duration-300 hover:-translate-y-0.5"
      style={{
        borderColor: type.border,
        boxShadow: "0 2px 8px rgba(22,19,15,0.05)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = type.borderHover;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px rgba(22,19,15,0.10), 0 0 0 1px ${type.borderHover}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = type.border;
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(22,19,15,0.05)";
      }}
    >
      {/* Type accent — top edge */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[3px] z-10"
        style={{
          background: `linear-gradient(90deg, ${type.color}00 0%, ${type.color}cc 40%, ${type.color} 50%, ${type.color}cc 60%, ${type.color}00 100%)`,
        }}
      />

      {/* Image */}
      <div className="relative aspect-4/3 overflow-hidden" style={{ background: type.bg }}>
        {listing.images[0] ? (
          <CldImage
            src={listing.images[0]}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            alt={listing.title}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#a8a09a]">
            <Package size={28} strokeWidth={1.5} />
            <span className="text-xs">No photo</span>
          </div>
        )}

        {/* Type badge */}
        <div className="absolute left-2.5 top-2.5">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-md"
            style={{ background: "rgba(255,255,255,0.9)", color: type.color }}
          >
            {type.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#16130f]">
          {listing.title}
        </h3>

        <div className="flex items-center justify-between gap-2">
          {listing.listing_type === "for_sale" && listing.price != null ? (
            <span className="text-[15px] font-bold text-[#4f46e5]">
              ₦{listing.price.toLocaleString()}
            </span>
          ) : (
            <span
              className="text-sm font-bold"
              style={{ color: type.color }}
            >
              {type.label}
            </span>
          )}

          <span className="shrink-0 rounded-full bg-[#f5f1eb] px-2 py-0.5 text-[11px] font-medium text-[#78726c]">
            {CONDITION_LABELS[listing.condition]}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[#a8a09a]">
          <MapPin size={11} strokeWidth={2} />
          <span className="truncate text-[11px]">{listing.area}</span>
        </div>
      </div>
    </Link>
  );
}
