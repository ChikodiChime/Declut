"use client";

import Link from "next/link";
import { MapPin, Package } from "lucide-react";
import { ListingImage } from "@/components/ui";
import type { Listing } from "@/types";

const TYPE_LABEL: Record<string, string> = { for_sale: "For Sale", free: "Free", donate: "Donate" };
const TYPE_COLOR: Record<string, string> = {
  for_sale: "#4f46e5",
  free:     "#10b981",
  donate:   "#f59e0b",
};

export function CarouselCard({ listing }: { listing: Listing }) {
  const color = TYPE_COLOR[listing.listing_type] ?? "#4f46e5";
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block shrink-0 rounded-2xl overflow-hidden bg-white"
      style={{
        width: "280px",
        border: "1px solid #e8e4dc",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(79,70,229,0.07)",
      }}
    >
      <div className="relative w-full bg-[#f4f1ec]" style={{ aspectRatio: "4/3" }}>
        {listing.images[0] ? (
          <ListingImage
            src={listing.images[0]}
            fill
            sizes="280px"
            className="object-cover"
            alt={listing.title}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#a8a09a]">
            <Package size={28} strokeWidth={1.5} />
            <span className="text-xs">No photo</span>
          </div>
        )}
        <span
          className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ color, background: `${color}18` }}
        >
          {TYPE_LABEL[listing.listing_type]}
        </span>
      </div>

      <div className="p-4">
        <p className="font-semibold text-sm text-[#16130f] leading-snug mb-1.5 line-clamp-1">
          {listing.title}
        </p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin size={11} className="shrink-0 text-[#a8a09a]" />
            <span className="text-xs text-[#a8a09a] truncate">{listing.area}</span>
          </div>
          {listing.listing_type === "for_sale" && listing.price != null ? (
            <span className="text-sm font-bold shrink-0" style={{ color }}>
              ₦{listing.price.toLocaleString()}
            </span>
          ) : (
            <span className="text-xs font-semibold shrink-0" style={{ color }}>
              {listing.listing_type === "free" ? "Free" : "Donate"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
