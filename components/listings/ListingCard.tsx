"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ListingImage } from "@/components/ui";
import { Pencil, Trash2, Package } from "lucide-react";
import { CustomDropdown } from "@/components/ui";
import { useDeleteListing, useUpdateListing } from "@/lib/hooks/useListings";
import type { Listing, ListingStatus } from "@/types";

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "claimed", label: "Claimed" },
  { value: "donated", label: "Donated" },
];

const TYPE_LABELS: Record<string, string> = {
  for_sale: "For Sale",
  free: "Free",
  donate: "Donate",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const STATUS_STYLES: Record<string, string> = {
  available: "bg-success/10 text-success",
  sold: "bg-accent/10 text-accent",
  claimed: "bg-primary/10 text-primary",
  donated: "bg-purple-100 text-purple-600",
};

interface ListingCardProps {
  listing: Listing;
  basePath?: string;
}

export function ListingRow({ listing, basePath = "/dashboard/listings" }: ListingCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();
  const { mutate: deleteListing, isPending: isDeleting } = useDeleteListing();
  const { mutate: updateListing, isPending: isUpdating } = useUpdateListing(listing.id);

  const listingHref = `${basePath}/${listing.id}`;
  const editHref = `${basePath}/${listing.id}/edit`;

  function stopPropagation(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
  }

  return (
    <motion.div
      layout
      className="group bg-card rounded-xl border border-border flex items-center gap-4 px-4 py-3 cursor-pointer hover:border-border-strong transition-colors duration-200"
      style={{ boxShadow: "var(--shadow-sm)" }}
      whileHover={{ boxShadow: "0 8px 24px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05)" }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      role="link"
      tabIndex={0}
      onClick={() => router.push(listingHref)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(listingHref); }
      }}
    >
      {/* Thumbnail */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-surface border border-border">
        {listing.images[0] ? (
          <ListingImage
            src={listing.images[0]}
            fill
            sizes="56px"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            alt={listing.title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-subtle">
            <Package size={18} strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{listing.title}</p>
        <p className="text-xs text-text-subtle mt-0.5 truncate">
          {[listing.area, TYPE_LABELS[listing.listing_type], CONDITION_LABELS[listing.condition]].filter(Boolean).join(" · ")}
        </p>
        <p className="text-[11px] text-text-subtle/60 mt-0.5">{relativeDate(listing.created_at)}</p>
      </div>

      {/* Status dropdown */}
      <div
        className="shrink-0 w-32"
        onClick={stopPropagation}
        onKeyDown={stopPropagation}
      >
        <CustomDropdown
          size="sm"
          options={STATUS_OPTIONS}
          value={listing.status}
          onChange={(value) => updateListing({ status: value as ListingStatus })}
          disabled={isUpdating}
        />
      </div>

      {/* Price */}
      <div className="shrink-0 w-24 text-right">
        {listing.listing_type === "for_sale" && listing.price != null ? (
          <span className="text-sm font-bold text-primary">₦{listing.price.toLocaleString()}</span>
        ) : (
          <span className="text-xs text-text-subtle capitalize">{listing.listing_type === "free" ? "Free" : "Donate"}</span>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        onClick={stopPropagation}
        onKeyDown={stopPropagation}
      >
        <Link href={editHref}>
          <div className="rounded-md border border-primary/20 bg-primary/8 p-2 text-primary hover:bg-primary hover:text-white hover:border-primary transition-all duration-150">
            <Pencil size={14} strokeWidth={1.75} />
          </div>
        </Link>

        <AnimatePresence mode="wait">
          {confirmDelete ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="flex gap-1"
            >
              <button
                onClick={() => deleteListing(listing.id)}
                disabled={isDeleting}
                className="rounded-md border border-error/40 bg-error/5 text-error text-[11px] font-semibold px-2.5 py-2 hover:bg-error/10 transition-colors disabled:opacity-60"
              >
                {isDeleting ? "…" : "Yes"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-border px-2.5 py-2 text-[11px] text-text-muted hover:bg-surface transition-colors"
              >
                ✕
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="delete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              onClick={() => setConfirmDelete(true)}
              className="rounded-md border border-primary/20 bg-primary/8 p-2 text-primary hover:bg-error hover:text-white hover:border-error transition-all duration-150"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function ListingCard({ listing, basePath = "/dashboard/listings" }: ListingCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();
  const { mutate: deleteListing, isPending: isDeleting } = useDeleteListing();
  const { mutate: updateListing, isPending: isUpdating } = useUpdateListing(listing.id);

  const listingHref = `${basePath}/${listing.id}`;
  const editHref = `${basePath}/${listing.id}/edit`;

  function stopPropagation(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
  }

  return (
    <motion.div
      layout
      className="group bg-card rounded-2xl border border-border overflow-hidden flex flex-col cursor-pointer hover:border-border-strong hover:shadow-md transition-all duration-200"
      style={{ boxShadow: "var(--shadow-card)" }}
      role="link"
      tabIndex={0}
      onClick={() => router.push(listingHref)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(listingHref);
        }
      }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-surface overflow-hidden">
        {listing.images[0] ? (
          <ListingImage
            src={listing.images[0]}
            fill
            sizes="(max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            alt={listing.title}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-text-subtle">
            <Package size={24} strokeWidth={1.5} />
            <span className="text-[11px]">No photo</span>
          </div>
        )}

        {/* Type badge */}
        <div className="absolute bottom-2 left-2">
          <span className="px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-semibold backdrop-blur-sm">
            {TYPE_LABELS[listing.listing_type]}
          </span>
        </div>

      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2.5 flex-1">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-text line-clamp-2 leading-snug flex-1">
            {listing.title}
          </h3>
          <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[listing.status]}`}>
            {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
          </span>
        </div>

        {/* Area + price */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-text-subtle truncate">{listing.area}</p>
          {listing.listing_type === "for_sale" && listing.price != null && (
            <span className="text-sm font-bold text-primary shrink-0">
              ₦{listing.price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Dropdown + actions row */}
        <div
          className="flex items-center gap-1.5 mt-auto"
          onClick={stopPropagation}
          onKeyDown={stopPropagation}
        >
          <div className="flex-1 min-w-0">
            <CustomDropdown
              options={STATUS_OPTIONS}
              value={listing.status}
              onChange={(value) => updateListing({ status: value as ListingStatus })}
              disabled={isUpdating}
            />
          </div>

          <Link href={editHref}>
            <div className="rounded-md border border-border py-3 px-3 text-text-muted hover:bg-surface hover:text-text transition-colors">
              <Pencil size={16} strokeWidth={1.75} />
            </div>
          </Link>

          <AnimatePresence mode="wait">
            {confirmDelete ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="flex gap-1"
              >
                <button
                  onClick={() => deleteListing(listing.id)}
                  disabled={isDeleting}
                  className="rounded-md border border-error/40 bg-error/5 text-error text-[11px] font-semibold px-3 py-3 hover:bg-error/10 transition-colors disabled:opacity-60"
                >
                  {isDeleting ? "…" : "Yes"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md border border-border px-3 py-3 text-[11px] text-text-muted hover:bg-surface transition-colors"
                >
                  ✕
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="delete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                onClick={() => setConfirmDelete(true)}
                className="rounded-md border border-border py-3 px-3 text-text-muted hover:border-error/40 hover:text-error hover:bg-error/5 transition-all"
              >
                <Trash2 size={16} strokeWidth={1.75} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
