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

const TYPE_STYLES: Record<ChatListing['listing_type'], string> = {
  for_sale: 'bg-[rgba(55,48,163,0.08)] text-primary',
  free: 'bg-success-bg text-success',
  donate: 'bg-[rgba(124,58,237,0.08)] text-[#7c3aed]',
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
      className="flex gap-3 rounded-xl border border-border bg-card p-3 hover:border-border-strong hover:shadow-sm transition-all min-w-[220px] max-w-[260px]"
    >
      <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-background border border-border">
        {imageId ? (
          <CldImage
            src={imageId}
            width={56}
            height={56}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-subtle">
            <Tag size={18} />
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between min-w-0 py-0.5">
        <p className="text-sm font-medium text-text leading-snug line-clamp-2">{listing.title}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm font-semibold text-text">{priceLabel}</span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${TYPE_STYLES[listing.listing_type]}`}>
            {TYPE_LABELS[listing.listing_type]}
          </span>
        </div>
        {listing.area && (
          <p className="text-xs text-text-muted truncate mt-0.5">{listing.area}</p>
        )}
      </div>
    </Link>
  )
}
