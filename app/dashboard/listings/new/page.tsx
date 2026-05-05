"use client";

import { ListingForm } from "@/components/listings";
import { useCreateListing } from "@/lib/hooks/useListings";
import type { ListingFormData } from "@/types";

export default function NewListingPage() {
  const { mutateAsync: createListing, isPending } = useCreateListing();

  async function handleSubmit(data: ListingFormData) {
    await createListing(data);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">New Listing</h1>
        <p className="text-sm text-text-muted mt-1">
          Fill out the steps below to publish your item.
        </p>
      </div>
      <ListingForm onSubmit={handleSubmit} isPending={isPending} />
    </div>
  );
}
