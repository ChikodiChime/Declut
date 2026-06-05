"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ListingForm } from "@/components/listings";
import { useListing, useUpdateListing } from "@/lib/hooks/useListings";
import type { ListingFormData } from "@/types";

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { data, isLoading } = useListing(id);
  const { mutateAsync: updateListing, isPending } = useUpdateListing(id);

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="relative overflow-hidden bg-card rounded-2xl shadow-card px-6 py-8">
          <div className="skeleton-shimmer" />
          <div className="h-6 rounded w-1/3 mb-6" style={{ background: '#ede9e3' }} />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg" style={{ background: '#ede9e3' }} />
            ))}
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

  const initialValues: Partial<ListingFormData> = {
    listing_type: listing.listing_type,
    title: listing.title,
    description: listing.description ?? "",
    category: listing.category,
    condition: listing.condition,
    price: listing.price,
    area: listing.area,
    size_category: listing.size_category ?? undefined,
    pickup_address: listing.pickup_address ?? "",
    images: listing.images,
  };

  return (
    <main className="min-h-screen  px-4 ">
      <div className="max-w-6xl mx-auto mb-8">
        <Link
          href="/dashboard/listings"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors mb-3"
        >
          <ArrowLeft size={15} /> Back to listings
        </Link>
        <h1 className="text-2xl font-bold text-text">Edit Listing</h1>
        <p className="text-sm text-text-muted mt-1 truncate">{listing.title}</p>
      </div>
      <ListingForm
        initialValues={initialValues}
        onSubmit={(formData) => updateListing(formData)}
        isPending={isPending}
        onCancel={() => router.push("/dashboard/listings")}
      />
    </main>
  );
}
