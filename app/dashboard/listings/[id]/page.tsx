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
  Info,
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
        className="rounded-2xl flex items-center justify-center bg-surface border border-border/50 shadow-sm"
        style={{ aspectRatio: "16/10" }}
      >
        <div className="flex flex-col items-center gap-4 text-text-subtle">
          <div className="w-20 h-20 rounded-full bg-surface border-2 border-border flex items-center justify-center">
            <Package size={32} strokeWidth={1.5} />
          </div>
          <span className="text-sm font-medium">No photos available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative rounded-2xl overflow-hidden bg-surface border border-border/50 shadow-lg group"
        style={{ aspectRatio: "16/10" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
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
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
              style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setActive((i) => (i + 1) % total)}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
              style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
            <div
              className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md"
              style={{ background: "rgba(0,0,0,0.5)", color: "white" }}
            >
              {active + 1} / {total}
            </div>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="relative shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105"
              style={{
                width: 80, height: 80,
                borderColor: i === active ? "var(--color-primary, #4f46e5)" : "transparent",
                opacity: i === active ? 1 : 0.6,
              }}
            >
              <ListingImage src={img} fill sizes="80px" className="object-cover" alt="" />
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
  const [shareSuccess, setShareSuccess] = useState(false);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded-full animate-pulse bg-border" />
          <div className="h-10 w-32 rounded-xl animate-pulse bg-border" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            <div className="aspect-16/10 rounded-2xl animate-pulse bg-border" />
            <div className="h-32 rounded-2xl animate-pulse bg-border" />
          </div>
          <div className="space-y-4">
            <div className="h-48 rounded-2xl animate-pulse bg-border" />
            <div className="h-32 rounded-2xl animate-pulse bg-border" />
          </div>
        </div>
      </div>
    );
  }

  if (!data?.listing) {
    return (
      <div className="max-w-md mx-auto text-center py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto bg-surface border border-border shadow-lg">
            <Package size={32} strokeWidth={1.5} className="text-text-subtle" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text mb-2">Listing not found</h2>
            <p className="text-sm text-text-muted">This listing may have been removed or doesn&apos;t exist.</p>
          </div>
          <Link 
            href="/dashboard/listings" 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all duration-200 hover:scale-105"
          >
            <ArrowLeft size={14} /> Back to listings
          </Link>
        </motion.div>
      </div>
    );
  }

  const { listing } = data;
  const typeConfig = TYPE_CONFIG[listing.listing_type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.for_sale;
  const statusConfig = STATUS_CONFIG[listing.status] ?? STATUS_CONFIG.available;
  const conditionLevel = CONDITION_LEVEL[listing.condition] ?? 3;

  return (
    <div className="space-y-6 pb-12">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <Link
          href="/dashboard/listings"
          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text transition-colors group"
        >
          <ArrowLeft size={14} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" /> 
          Back to listings
        </Link>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="relative p-2.5 rounded-xl bg-surface border border-border hover:bg-border/50 transition-colors"
            title="Share listing"
          >
            <Share2 size={16} strokeWidth={2} className="text-text-subtle" />
            {shareSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-primary text-white text-xs font-medium whitespace-nowrap"
              >
                Link copied!
              </motion.div>
            )}
          </button>
          <Link
            href={`/dashboard/listings/${listing.id}/edit`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all duration-200 hover:scale-105 shadow-sm"
          >
            <Pencil size={14} strokeWidth={2} /> Edit
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <ImageGallery images={listing.images ?? []} title={listing.title} />

          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <Info size={18} strokeWidth={2} className="text-primary" />
                <h2 className="text-lg font-bold text-text">About this item</h2>
              </div>
              {listing.description ? (
                <p className="text-sm leading-relaxed text-text-muted whitespace-pre-wrap">{listing.description}</p>
              ) : (
                <p className="text-sm text-text-subtle italic">No description provided</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-px bg-border/30">
              <div className="bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} strokeWidth={2} className="text-text-subtle" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Location</span>
                </div>
                <p className="text-sm font-semibold text-text">{listing.area}</p>
              </div>
              <div className="bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Layers size={16} strokeWidth={2} className="text-text-subtle" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Category</span>
                </div>
                <p className="text-sm font-semibold text-text">{listing.category}</p>
              </div>
              <div className="bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} strokeWidth={2} className="text-text-subtle" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Posted</span>
                </div>
                <p className="text-sm font-semibold text-text">{formatDate(listing.created_at)}</p>
              </div>
              <div className="bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={16} strokeWidth={2} className="text-text-subtle" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Condition</span>
                </div>
                <p className="text-sm font-semibold text-text">
                  {CONDITION_LABELS[listing.condition] ?? listing.condition}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col gap-4 lg:sticky lg:top-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="bg-card rounded-2xl border border-border/50 shadow-lg overflow-hidden">
            <div className="h-2" style={{ backgroundColor: typeConfig.color }} />
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: typeConfig.bg, color: typeConfig.color }}
                >
                  {typeConfig.label}
                </span>
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: statusConfig.bg, color: statusConfig.color }}
                >
                  {statusConfig.label}
                </span>
              </div>

              <div>
                <h1 className="text-xl font-bold text-text leading-tight mb-3">{listing.title}</h1>
                {listing.listing_type === "for_sale" && listing.price != null && (
                  <p className="text-3xl font-bold text-text">
                    ₦{listing.price.toLocaleString()}
                  </p>
                )}
                {listing.listing_type === "free" && (
                  <p className="text-3xl font-bold text-emerald-600">
                    Free
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Condition</span>
                  <span className="text-sm font-bold text-text">
                    {CONDITION_LABELS[listing.condition] ?? listing.condition}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                        i < conditionLevel 
                          ? "bg-primary shadow-sm" 
                          : "bg-border"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Link
            href={`/dashboard/listings/${listing.id}/edit`}
            className="w-full h-12 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 bg-primary text-white flex items-center justify-center gap-2 shadow-lg"
          >
            <Pencil size={16} strokeWidth={2} />
            Edit listing
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
