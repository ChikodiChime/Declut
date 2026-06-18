'use client'

import Link from 'next/link'
import { CldImage } from 'next-cloudinary'
import { Tag } from 'lucide-react'

export interface ChatListing {
  id: string
  title: string
  price: number | null
  listing_type: 'for_sale' | 'free' | 'donate'
  condition?: string
  area?: string
  images?: string[]
}

const TYPE_LABELS: Record<ChatListing['listing_type'], string> = {
  for_sale: 'For Sale',
  free: 'Free',
  donate: 'Donate',
}

const TYPE_COLORS: Record<ChatListing['listing_type'], string> = {
  for_sale: 'bg-blue-100 text-blue-700',
  free: 'bg-green-100 text-green-700',
  donate: 'bg-purple-100 text-purple-700',
}

export function ListingCard({ listing }: { listing: ChatListing }) {
  const imageId = listing.images?.[0]
  const priceLabel =
    listing.listing_type === 'for_sale' && listing.price != null
      ? `₦${listing.price.toLocaleString('en-NG')}`
      : listing.listing_type === 'free'
      ? 'Free'
      : 'Donated'

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex gap-3 rounded-xl border border-border bg-card p-3 hover:bg-accent transition-colors min-w-[220px] max-w-[260px]"
    >
      <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
        {imageId ? (
          <CldImage
            src={imageId}
            width={64}
            height={64}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Tag size={20} />
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2">{listing.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold">{priceLabel}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[listing.listing_type]}`}
          >
            {TYPE_LABELS[listing.listing_type]}
          </span>
        </div>
        {listing.area && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{listing.area}</p>
        )}
      </div>
    </Link>
  )
}
