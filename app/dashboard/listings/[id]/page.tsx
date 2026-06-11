"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ListingImage } from "@/components/ui";
import {
  ArrowLeft,
  MapPin,
  Pencil,
  Package,
  ChevronLeft,
  ChevronRight,
  Tag,
  Calendar,
  Layers,
  Share2,
  Check,
} from "lucide-react";
import { useListing } from "@/lib/hooks/useListings";

const TYPE_CONFIG = {
  for_sale: { label: "For Sale", color: "#4f46e5", bg: "rgba(79,70,229,0.08)" },
  free:     { label: "Free",     color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  donate:   { label: "Donate",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
} as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: "Available", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  sold:      { label: "Sold",      color: "#6366f1", bg: "rgba(99,102,241,0.08)" },
  claimed:   { label: "Claimed",   color: "#4f46e5", bg: "rgba(79,70,229,0.08)"  },
  donated:   { label: "Donated",   color: "#a855f7", bg: "rgba(168,85,247,0.08)" },
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New", like_new: "Like New", good: "Good", fair: "Fair", poor: "Poor",
};

const CONDITION_LEVEL: Record<string, number> = {
  new: 5, like_new: 4, good: 3, fair: 2, poor: 1,
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(iso));
}

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const total = images.length;

  if (total === 0) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center bg-surface border border-border"
        style={{ aspectRatio: "16/10" }}
      >
        <div className="flex flex-col items-center gap-3 text-text-subtle">
          <Package size={36} strokeWidth={1.25} />
          <span className="text-xs font-semibold tracking-widest uppercase">No photos</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="relative rounded-2xl overflow-hidden bg-surface border border-border group"
        style={{ aspectRatio: "16/10" }}
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
              sizes="(max-width: 1024px) 100vw, 65vw"
              className="object-cover"
              alt={`${title} — photo ${active + 1}`}
              priority
            />
          </motion.div>
        </AnimatePresence>

        {total > 1 && (
          <>
            <button
              onClick={() => setActive((i) => (i - 1 + total) % total)}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 opacity-0 group-hover:opacity-100 hover:scale-105"
              style={{ background: "rgba(0,0,0,0.5)", color: "white" }}
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setActive((i) => (i + 1) % total)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 opacity-0 group-hover:opacity-100 hover:scale-105"
              style={{ background: "rgba(0,0,0,0.5)", color: "white" }}
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
            <div
              className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.9)" }}
            >
              {active + 1} / {total}
            </div>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="relative shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-150"
              style={{
                width: 72, height: 72,
                borderColor: i === active ? "var(--color-primary, #4f46e5)" : "transparent",
                opacity: i === active ? 1 : 0.5,
              }}
            >
              <ListingImage src={img} fill sizes="72px" className="object-cover" alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = useListing(id);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!data?.listing) return;
    const url = `${window.location.origin}/listings/${id}`;
    try {
      if (navigator.share && navigator.canShare?.({ url })) {
        await navigator.share({ title: data.listing.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 rounded-full animate-pulse bg-border" />
          <div className="h-9 w-28 rounded-lg animate-pulse bg-border" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="space-y-4">
            <div className="rounded-2xl animate-pulse bg-border" style={{ aspectRatio: "16/10" }} />
            <div className="h-28 rounded-2xl animate-pulse bg-border" />
          </div>
          <div className="space-y-3">
            <div className="h-52 rounded-2xl animate-pulse bg-border" />
            <div className="h-9 rounded-lg animate-pulse bg-border" />
          </div>
        </div>
      </div>
    );
  }

  if (!data?.listing) {
    return (
      <div className="max-w-sm mx-auto text-center py-24 space-y-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-surface border border-border">
          <Package size={28} strokeWidth={1.25} className="text-text-subtle" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text mb-1">Listing not found</h2>
          <p className="text-sm text-text-muted">This listing may have been removed.</p>
        </div>
        <Link
          href="/dashboard/listings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft size={13} /> Back to listings
        </Link>
      </div>
    );
  }

  const { listing } = data;
  const typeConfig = TYPE_CONFIG[listing.listing_type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.for_sale;
  const statusConfig = STATUS_CONFIG[listing.status] ?? STATUS_CONFIG.available;
  const conditionLevel = CONDITION_LEVEL[listing.condition] ?? 3;

  return (
    <div className="space-y-6 pb-8">

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/listings"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors group"
        >
          <ArrowLeft size={13} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to listings
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="relative h-9 w-9 flex items-center justify-center rounded-lg bg-card border border-border hover:bg-surface transition-colors"
            title="Copy link"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="check" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
                  <Check size={14} strokeWidth={2.5} className="text-emerald-500" />
                </motion.span>
              ) : (
                <motion.span key="share" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
                  <Share2 size={14} strokeWidth={2} className="text-text-muted" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <Link
            href={`/dashboard/listings/${listing.id}/edit`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Pencil size={13} strokeWidth={2} /> Edit listing
          </Link>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* Left */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <ImageGallery images={listing.images ?? []} title={listing.title} />

          <div className="bg-card rounded-2xl border border-border p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle mb-3">Description</p>
            {listing.description ? (
              <p className="text-sm leading-relaxed text-text-muted whitespace-pre-wrap">{listing.description}</p>
            ) : (
              <p className="text-sm text-text-subtle italic">No description provided.</p>
            )}
          </div>
        </motion.div>

        {/* Right */}
        <motion.div
          className="flex flex-col gap-3 lg:sticky lg:top-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Price + title card */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-1.5">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                style={{ background: typeConfig.bg, color: typeConfig.color }}
              >
                {typeConfig.label}
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                style={{ background: statusConfig.bg, color: statusConfig.color }}
              >
                {statusConfig.label}
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-text-muted leading-snug mb-1">{listing.title}</p>
              {listing.listing_type === "for_sale" && listing.price != null && (
                <p className="text-3xl font-bold text-text tracking-tight">₦{listing.price.toLocaleString()}</p>
              )}
              {listing.listing_type === "free" && (
                <p className="text-3xl font-bold text-emerald-600 tracking-tight">Free</p>
              )}
            </div>

            <div className="pt-1 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-subtle font-medium">Condition</span>
                <span className="text-xs font-semibold text-text">{CONDITION_LABELS[listing.condition] ?? listing.condition}</span>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-full h-1.5 rounded-full ${i < conditionLevel ? "bg-primary" : "bg-border"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Metadata card */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {[
              { icon: MapPin,   label: "Location", value: listing.area },
              { icon: Layers,   label: "Category", value: listing.category },
              { icon: Calendar, label: "Posted",   value: formatDate(listing.created_at) },
              { icon: Tag,      label: "Type",     value: typeConfig.label, color: typeConfig.color },
            ].map(({ icon: Icon, label, value, color }, idx, arr) => (
              <div
                key={label}
                className={`flex items-center justify-between px-5 py-3.5 ${idx < arr.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex items-center gap-2.5 text-text-subtle">
                  <Icon size={13} strokeWidth={2} />
                  <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
                </div>
                <span
                  className="text-sm font-medium text-text"
                  style={color ? { color } : undefined}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Edit CTA */}
          <Link
            href={`/dashboard/listings/${listing.id}/edit`}
            className="w-full h-11 rounded-xl font-semibold text-sm transition-all duration-150 hover:bg-primary/90 active:scale-[0.98] bg-primary text-white flex items-center justify-center gap-2"
          >
            <Pencil size={14} strokeWidth={2} />
            Edit listing
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
