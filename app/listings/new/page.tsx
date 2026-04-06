'use client'

import { ListingForm } from '@/components/listings'
import { useCreateListing } from '@/lib/hooks/useListings'
import type { ListingFormData } from '@/types'

export default function NewListingPage() {
  const { mutateAsync: createListing, isPending } = useCreateListing()

  async function handleSubmit(data: ListingFormData) {
    await createListing(data)
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-12">
      <h1 className="text-2xl font-bold text-text text-center mb-8">Create a Listing</h1>
      <ListingForm onSubmit={handleSubmit} isPending={isPending} />
    </main>
  )
}
