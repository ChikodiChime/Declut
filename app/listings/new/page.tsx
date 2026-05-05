"use client";

import { useRouter } from "next/navigation";
import { ListingForm } from "@/components/listings";
import { useCreateListing } from "@/lib/hooks/useListings";
import type { ListingFormData } from "@/types";

export default function NewListingPage() {
  const router = useRouter();
  const { mutateAsync: createListing, isPending } = useCreateListing();

  async function handleSubmit(data: ListingFormData) {
    await createListing(data);
  }

  function handleCancel() {
    router.back();
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-12">
      <h1 className="text-2xl font-bold text-text text-center mb-8">
        Create a Listing
      </h1>
      <ListingForm
        onSubmit={handleSubmit}
        isPending={isPending}
        onCancel={handleCancel}
      />
    </main>
  );
}
