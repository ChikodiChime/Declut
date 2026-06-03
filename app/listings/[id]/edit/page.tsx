"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-text-muted">Loading…</p>
      </main>
    );
  }

  if (!data?.listing) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-error">
          Listing not found.{" "}
          <Link href="/listings/mine" className="underline text-primary">
            Back to My Listings
          </Link>
        </p>
      </main>
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

  async function handleSubmit(formData: ListingFormData) {
    await updateListing(formData);
  }

  function handleCancel() {
    router.back();
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-12">
      <h1 className="text-2xl font-bold text-text text-center mb-8">
        Edit Listing
      </h1>
      <ListingForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        isPending={isPending}
        onCancel={handleCancel}
      />
    </main>
  );
}
