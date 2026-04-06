'use client'

import Link from 'next/link'
import { ListingCard } from '@/components/listings'
import { useMyListings } from '@/lib/hooks/useListings'
import { Button } from '@/components/ui'

export default function MyListingsPage() {
  const { data, isLoading, error } = useMyListings()
  const listings = data?.listings ?? []

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-text-muted">Loading your listings…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-error">Failed to load listings. Please refresh.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text">My Listings</h1>
          <Link href="/listings/new">
            <Button size="sm">+ New Listing</Button>
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted mb-4">You haven't listed anything yet.</p>
            <Link href="/listings/new">
              <Button>Create your first listing →</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
