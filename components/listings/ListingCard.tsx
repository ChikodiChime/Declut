"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ListingImage } from "@/components/ui";
import { Pencil, Trash2, AlertTriangle, Package } from "lucide-react";
import { Button, CustomDropdown } from "@/components/ui";
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

export function ListingCard({
  listing,
  basePath = "/dashboard/listings",
}: ListingCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();
  const { mutate: deleteListing, isPending: isDeleting } = useDeleteListing();
  const { mutate: updateListing, isPending: isUpdating } = useUpdateListing(
    listing.id,
  );

  const listingHref = `${basePath}/${listing.id}`;
  const editHref = `${basePath}/${listing.id}/edit`;

  return (
    <motion.div
      layout
      className="bg-card rounded-xl shadow-card flex flex-col cursor-pointer"
      role="link"
      tabIndex={0}
      onClick={() => router.push(listingHref)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(listingHref);
        }
      }}
    >
      {/* Image */}
      <div className="relative aspect-4/3 bg-surface rounded-t-xl overflow-hidden">
        {listing.images[0] ? (
          <ListingImage
            src={listing.images[0]}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            alt={listing.title}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-text-muted">
            <Package size={28} strokeWidth={1.5} />
            <span className="text-xs">No photo</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-black/55 text-white text-[11px] font-semibold backdrop-blur-sm">
            {TYPE_LABELS[listing.listing_type]}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[listing.status]}`}
          >
            {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-semibold text-text truncate text-sm leading-snug">
            {listing.title}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-text-muted">{listing.area}</p>
            {listing.listing_type === "for_sale" && listing.price != null && (
              <span className="text-sm font-bold text-primary">
                ₦{listing.price.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Status dropdown */}
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <CustomDropdown
            options={STATUS_OPTIONS}
            value={listing.status}
            onChange={(value) =>
              updateListing({ status: value as ListingStatus })
            }
            disabled={isUpdating}
          />
        </div>

        {/* Actions */}
        <div
          className="flex gap-2 mt-auto"
          onClick={(event) => event.stopPropagation()}
        >
          <Link href={editHref} className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <Pencil size={13} strokeWidth={2} />
              Edit
            </Button>
          </Link>

          <AnimatePresence mode="wait">
            {confirmDelete ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex gap-1 flex-1"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-error text-error hover:bg-error/5 gap-1"
                  loading={isDeleting}
                  onClick={() => deleteListing(listing.id)}
                >
                  <AlertTriangle size={12} strokeWidth={2.5} />
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-3"
                  onClick={() => setConfirmDelete(false)}
                >
                  ✕
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="delete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="text-error border-error hover:bg-error/5"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
