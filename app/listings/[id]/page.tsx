"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ListingImage } from "@/components/ui";
import {
  ArrowLeft,
  MapPin,
  Tag,
  Package,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useListing } from "@/lib/hooks/useListings";
import { useCart } from "@/lib/hooks/useCart";
import { addToSessionCart } from "@/lib/session-cart";
import { Button } from "@/components/ui";
import type { ListingWithSeller } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  for_sale: "For Sale",
  free: "Free",
  donate: "Donate",
};

const TYPE_STYLES: Record<string, string> = {
  for_sale: "bg-primary/10 text-primary",
  free: "bg-success/10 text-success",
  donate: "bg-accent/10 text-accent",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  function prev() {
    setActive((i) => (i === 0 ? images.length - 1 : i - 1));
  }
  function next() {
    setActive((i) => (i === images.length - 1 ? 0 : i + 1));
  }

  if (images.length === 0) {
    return (
      <div className="aspect-4/3 bg-surface rounded-xl flex items-center justify-center text-text-muted">
        <div className="flex flex-col items-center gap-2">
          <Package size={40} strokeWidth={1.25} />
          <span className="text-sm">No photos</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-4/3 bg-surface rounded-xl overflow-hidden">
        <ListingImage
          src={images[active]}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          alt={`${title} — photo ${active + 1}`}
        />
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === active ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                i === active ? "border-primary" : "border-transparent"
              }`}
            >
              <ListingImage
                src={img}
                fill
                sizes="64px"
                className="object-cover"
                alt={`Thumbnail ${i + 1}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useListing(id);
  const { isInCart, addToCartOptimistic } = useCart();
  const [addingToCart, setAddingToCart] = useState(false);
  const inCart = isInCart(id);

  async function handleAddToCart() {
    if (inCart || addingToCart) return;

    addToCartOptimistic(id);
    setAddingToCart(true);

    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: id }),
    });
    setAddingToCart(false);

    if (res.status === 401) {
      addToSessionCart(id);
      window.dispatchEvent(new Event("cart-updated"));
      return;
    }

    if (res.ok) {
      window.dispatchEvent(new Event("cart-updated"));
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface px-4 py-8">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-5 w-24 bg-border rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-4/3 bg-border rounded-xl" />
            <div className="flex flex-col gap-4">
              <div className="h-7 bg-border rounded w-3/4" />
              <div className="h-10 bg-border rounded w-1/3" />
              <div className="h-4 bg-border rounded w-full" />
              <div className="h-4 bg-border rounded w-5/6" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data?.listing) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-text font-medium mb-2">Listing not found</p>
          <p className="text-text-muted text-sm mb-6">
            It may have been removed or is no longer available.
          </p>
          <Link href="/listings">
            <Button variant="outline" size="sm">
              Browse listings
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const listing = data.listing as ListingWithSeller;
  const seller = listing.seller;

  return (
    <main className="min-h-screen bg-surface px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-muted hover:text-text text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: images */}
          <ImageGallery images={listing.images} title={listing.title} />

          {/* Right: details */}
          <div className="flex flex-col gap-5">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${TYPE_STYLES[listing.listing_type]}`}
              >
                {TYPE_LABELS[listing.listing_type]}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface text-text-muted border border-border">
                {CONDITION_LABELS[listing.condition]}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-text leading-snug">
              {listing.title}
            </h1>

            {/* Price */}
            {listing.listing_type === "for_sale" && listing.price != null ? (
              <p className="text-3xl font-extrabold text-primary">
                ₦{listing.price.toLocaleString()}
              </p>
            ) : (
              <p className="text-2xl font-bold text-success">
                {TYPE_LABELS[listing.listing_type]}
              </p>
            )}

            {/* Description */}
            {listing.description && (
              <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Tag size={14} strokeWidth={1.75} />
                <span>{listing.category}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <MapPin size={14} strokeWidth={1.75} />
                <span>{listing.area}</span>
              </div>
            </div>

            {/* Seller info */}
            {seller && (
              <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {seller.account_type === "business" ? (
                    <Building2
                      size={18}
                      className="text-primary"
                      strokeWidth={1.75}
                    />
                  ) : (
                    <User
                      size={18}
                      className="text-primary"
                      strokeWidth={1.75}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text truncate">
                    {seller.name ?? "Seller"}
                  </p>
                  <p className="text-xs text-text-muted capitalize">
                    {seller.account_type} seller
                  </p>
                </div>
              </div>
            )}

            {/* CTA */}
            {listing.listing_type === "for_sale" &&
              listing.status === "available" && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={inCart}
                >
                  {inCart ? "In Cart" : "Add to Cart"}
                </Button>
              )}
            {listing.status === "sold" && (
              <Button className="w-full" size="lg" disabled>
                Sold
              </Button>
            )}
            {listing.listing_type !== "for_sale" && (
              <Button className="w-full" size="lg" disabled>
                Contact Seller — Coming Soon
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
