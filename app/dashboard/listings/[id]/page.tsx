"use client";

import { use } from "react";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { ArrowLeft, MapPin, Pencil, Package } from "lucide-react";
import { Button } from "@/components/ui";
import { useListing } from "@/lib/hooks/useListings";

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

const STATUS_STYLES: Record<string, string> = {
  available: "bg-success/10 text-success",
  sold: "bg-accent/10 text-accent",
  claimed: "bg-primary/10 text-primary",
  donated: "bg-purple-100 text-purple-600",
};

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

export default function ListingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = useListing(id);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-pulse">
          <div className="aspect-4/3 md:aspect-2/1 bg-border" />
          <div className="p-6 space-y-3">
            <div className="h-6 bg-border rounded w-2/3" />
            <div className="h-4 bg-border rounded w-1/3" />
            <div className="h-20 bg-border rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!data?.listing) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <p className="text-error mb-4">Listing not found.</p>
        <Link
          href="/dashboard/listings"
          className="text-sm text-primary hover:underline"
        >
          ← Back to listings
        </Link>
      </div>
    );
  }

  const { listing } = data;
  const mapQuery = `${listing.area}, Nigeria`;
  const areaMapSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/listings"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={15} /> Back to listings
        </Link>

        <Button
          href={`/dashboard/listings/${listing.id}/edit`}
          size="sm"
          className="gap-1.5"
        >
          <Pencil size={14} strokeWidth={2} /> Edit listing
        </Button>
      </div>

      <article className="bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="relative aspect-4/3 md:aspect-2/1 bg-surface">
          {listing.images[0] ? (
            <CldImage
              src={listing.images[0]}
              fill
              sizes="(max-width: 768px) 100vw, 896px"
              alt={listing.title}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-text-muted">
              <Package size={34} strokeWidth={1.5} />
              <span className="text-sm">No photo uploaded</span>
            </div>
          )}

          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-2.5 py-1 rounded-full bg-black/55 text-white text-xs font-semibold backdrop-blur-sm">
              {TYPE_LABELS[listing.listing_type] ?? listing.listing_type}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[listing.status] ?? "bg-border text-text"}`}
            >
              {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
            </span>
          </div>
        </div>

        <div className="p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-text leading-tight">
                {listing.title}
              </h1>
              <p className="text-sm text-text-muted mt-1 inline-flex items-center gap-1.5">
                <MapPin size={14} /> {listing.area}
              </p>
            </div>

            {listing.listing_type === "for_sale" && listing.price != null && (
              <p className="text-2xl font-bold text-primary">
                ₦{listing.price.toLocaleString()}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <div className="rounded-xl bg-surface px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">
                Category
              </p>
              <p className="text-sm font-medium text-text mt-1">
                {listing.category}
              </p>
            </div>
            <div className="rounded-xl bg-surface px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">
                Condition
              </p>
              <p className="text-sm font-medium text-text mt-1">
                {CONDITION_LABELS[listing.condition] ?? listing.condition}
              </p>
            </div>
            <div className="rounded-xl bg-surface px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">
                Posted
              </p>
              <p className="text-sm font-medium text-text mt-1">
                {formatDate(listing.created_at)}
              </p>
            </div>
          </div>

          <section className="mt-6">
            <h2 className="text-sm font-semibold text-text mb-2">
              Description
            </h2>
            <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
              {listing.description?.trim() || "No description provided."}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-semibold text-text mb-2">Area map</h2>
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <iframe
                title={`Map for ${listing.area}`}
                src={areaMapSrc}
                className="w-full h-64"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
