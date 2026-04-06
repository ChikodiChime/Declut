'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CldImage } from 'next-cloudinary'
import { Button } from '@/components/ui'
import { useDeleteListing, useUpdateListing } from '@/lib/hooks/useListings'
import type { Listing, ListingStatus } from '@/types'

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'donated', label: 'Donated' },
]

const TYPE_LABELS: Record<string, string> = {
  for_sale: 'For Sale',
  free: 'Free',
  donate: 'Donate',
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  sold: 'bg-gray-100 text-gray-600',
  claimed: 'bg-blue-100 text-blue-700',
  donated: 'bg-purple-100 text-purple-700',
}

interface ListingCardProps {
  listing: Listing
}

export function ListingCard({ listing }: ListingCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { mutate: deleteListing, isPending: isDeleting } = useDeleteListing()
  const { mutate: updateListing, isPending: isUpdating } = useUpdateListing(listing.id)

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      <div className="relative aspect-[4/3]">
        {listing.images[0] ? (
          <CldImage
            src={listing.images[0]}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            alt={listing.title}
          />
        ) : (
          <div className="w-full h-full bg-border flex items-center justify-center text-text-muted text-sm">
            No photo
          </div>
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-medium">
          {TYPE_LABELS[listing.listing_type]}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-text truncate">{listing.title}</h3>
          <p className="text-sm text-text-muted">{listing.area}</p>
        </div>

        <div className="flex items-center justify-between">
          {listing.listing_type === 'for_sale' && listing.price != null && (
            <span className="font-bold text-primary">
              ₦{listing.price.toLocaleString()}
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ml-auto ${STATUS_COLORS[listing.status]}`}
          >
            {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
          </span>
        </div>

        <div className="space-y-2">
          <select
            value={listing.status}
            disabled={isUpdating}
            onChange={(e) => updateListing({ status: e.target.value as ListingStatus })}
            className="block w-full px-3 py-2 text-sm text-text bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Link href={`/listings/${listing.id}/edit`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Edit
              </Button>
            </Link>

            {confirmDelete ? (
              <div className="flex gap-1 flex-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-error text-error hover:bg-error/5"
                  loading={isDeleting}
                  onClick={() => deleteListing(listing.id)}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-error border-error hover:bg-error/5"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
