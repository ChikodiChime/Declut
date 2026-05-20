"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ListingForm } from "@/components/listings";
import { useCreateListing } from "@/lib/hooks/useListings";
import { useMe } from "@/lib/hooks/useAuth";
import type { ListingFormData } from "@/types";

export default function NewListingPage() {
  const router = useRouter();
  const { data: user, isLoading } = useMe();
  const { mutateAsync: createListing, isPending } = useCreateListing();

  useEffect(() => {
    if (!isLoading && !user?.stripe_onboarding_complete) {
      router.replace("/dashboard/billing?from=new-listing");
    }
  }, [isLoading, user, router]);

  async function handleSubmit(data: ListingFormData) {
    await createListing(data);
  }

  if (isLoading || !user?.stripe_onboarding_complete) {
    return null;
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
