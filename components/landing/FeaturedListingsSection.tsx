"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Package } from "lucide-react";
import { motion } from "framer-motion";
import { ListingImage } from "@/components/ui";
import { BrowseCard } from "@/components/listings";
import type { Listing } from "@/types";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  for_sale: { label: "For Sale", color: "#4f46e5", bg: "rgba(79,70,229,0.1)" },
  free:     { label: "Free",     color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  donate:   { label: "Donate",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New", like_new: "Like New", good: "Good", fair: "Fair", poor: "Poor",
};

interface FeaturedListingsSectionProps {
  listings: Listing[];
}

export function FeaturedListingsSection({ listings }: FeaturedListingsSectionProps) {
  if (listings.length === 0) return null;

  const [hero, ...rest] = listings;
  const heroType = TYPE_CONFIG[hero.listing_type] ?? TYPE_CONFIG.for_sale;

  return (
    <section
      className="relative overflow-hidden bg-white py-20 px-5 md:px-8"
      style={{ borderTop: "1px solid #e8e4dc" }}
    >
      {/* Warm dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage: "radial-gradient(circle, #cdc4b6 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10b981]" />
              </span>
              <span className="text-xs font-bold tracking-[0.18em] uppercase text-[#10b981]">
                Live — updated daily
              </span>
            </div>
            <h2
              className="font-display leading-tight text-[#16130f]"
              style={{ fontSize: "clamp(36px, 4.5vw, 56px)" }}
            >
              Just listed
            </h2>
          </div>
          <Link
            href="/listings"
            className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#e8e4dc] bg-white px-4 py-2 text-sm font-semibold text-[#16130f] shadow-sm transition-all duration-200 hover:border-[#4f46e5] hover:text-[#4f46e5]"
          >
            See all <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </motion.div>

        {/* ── Hero listing ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5"
        >
          <Link
            href={`/listings/${hero.id}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#ebe5dc] bg-white transition-all duration-300 hover:border-[#d4c9b8] hover:shadow-[0_16px_48px_rgba(22,19,15,0.13)] md:flex-row"
            style={{ boxShadow: "0 4px 16px rgba(22,19,15,0.07)" }}
          >
            {/* Image */}
            <div className="relative h-56 w-full shrink-0 overflow-hidden bg-[#f5f1eb] md:h-auto md:w-[52%]">
              {hero.images[0] ? (
                <ListingImage
                  src={hero.images[0]}
                  fill
                  sizes="(max-width: 768px) 100vw, 52vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  alt={hero.title}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#a8a09a]">
                  <Package size={36} strokeWidth={1.4} />
                  <span className="text-xs">No photo</span>
                </div>
              )}

              {/* Gradient overlay on right edge (desktop) */}
              <div className="absolute inset-y-0 right-0 hidden w-16 bg-gradient-to-l from-white to-transparent md:block" />
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col justify-between gap-5 p-6 md:p-8">
              {/* Top row: type badge + condition */}
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wide"
                  style={{ background: heroType.bg, color: heroType.color }}
                >
                  {heroType.label}
                </span>
                <span className="rounded-full bg-[#f5f1eb] px-2.5 py-1 text-[11px] font-medium text-[#78726c]">
                  {CONDITION_LABELS[hero.condition]}
                </span>
                <span className="ml-auto text-[11px] text-[#a8a09a]">
                  {hero.category}
                </span>
              </div>

              {/* Title + description */}
              <div className="flex-1">
                <h3 className="mb-2 text-xl font-bold leading-snug text-[#16130f] md:text-2xl">
                  {hero.title}
                </h3>
                {hero.description && (
                  <p className="line-clamp-3 text-sm leading-relaxed text-[#78726c]">
                    {hero.description}
                  </p>
                )}
              </div>

              {/* Bottom row: price + location + CTA */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  {hero.listing_type === "for_sale" && hero.price != null ? (
                    <span className="text-2xl font-bold text-[#4f46e5]">
                      ₦{hero.price.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-lg font-bold" style={{ color: heroType.color }}>
                      {heroType.label}
                    </span>
                  )}
                  <div className="mt-1 flex items-center gap-1 text-[#a8a09a]">
                    <MapPin size={11} strokeWidth={2} />
                    <span className="text-xs">{hero.area}</span>
                  </div>
                </div>

                <span
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 group-hover:gap-3"
                  style={{ background: heroType.color }}
                >
                  View listing
                  <ArrowRight size={14} strokeWidth={2.5} />
                </span>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* ── Compact row ── */}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {rest.slice(0, 4).map((l, i) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              >
                <BrowseCard listing={l} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-8 sm:hidden text-center">
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 rounded-full border border-[#e8e4dc] px-6 py-3 text-sm font-semibold text-[#78726c] transition-all duration-200 hover:border-[#4f46e5] hover:text-[#4f46e5]"
          >
            See all listings <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}
