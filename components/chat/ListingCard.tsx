'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CldImage } from 'next-cloudinary'
import { MapPin, Package, Loader2, Check, ShoppingCart, Gift } from 'lucide-react'
import { toast } from 'sonner'
import { addToSessionCart } from '@/lib/session-cart'

export interface ChatListing {
  id: string
  title: string
  price: number | null
  listing_type: 'for_sale' | 'free' | 'donate'
  condition?: string
  area?: string
  images?: string[]
}

const TYPE_CONFIG: Record<
  ChatListing['listing_type'],
  { label: string; color: string; bg: string; border: string; borderHover: string }
> = {
  for_sale: {
    label: 'For Sale',
    color: '#4f46e5',
    bg: 'rgba(79,70,229,0.1)',
    border: '#ddd8fc',
    borderHover: '#a5b4fc',
  },
  free: {
    label: 'Free',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: '#c6f0e2',
    borderHover: '#6ee7b7',
  },
  donate: {
    label: 'Donate',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: '#fde8a0',
    borderHover: '#fbbf24',
  },
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

type ActionState = 'idle' | 'loading' | 'done'

export function ListingCard({ listing }: { listing: ChatListing }) {
  const [cartState, setCartState] = useState<ActionState>('idle')
  const [claimState, setClaimState] = useState<ActionState>('idle')

  const type = TYPE_CONFIG[listing.listing_type]
  const imageId = listing.images?.[0]
  const priceLabel =
    listing.listing_type === 'for_sale' && listing.price != null
      ? `₦${listing.price.toLocaleString('en-NG')}`
      : listing.listing_type === 'free'
      ? 'Free'
      : 'Donated'

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    if (cartState !== 'idle') return
    setCartState('loading')
    const [res] = await Promise.all([
      fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.id }),
      }),
      new Promise<void>((r) => setTimeout(r, 600)),
    ])
    if (res.ok || res.status === 401) {
      if (res.status === 401) addToSessionCart(listing.id)
      window.dispatchEvent(new Event('cart-updated'))
      setCartState('done')
      toast.success(`${listing.title} added to cart`, {
        action: { label: 'View cart', onClick: () => window.dispatchEvent(new Event('cart-drawer-open')) },
      })
      setTimeout(() => setCartState('idle'), 2500)
    } else {
      setCartState('idle')
      toast.error('Could not add to cart — please try again.')
    }
  }

  async function handleClaim(e: React.MouseEvent) {
    e.preventDefault()
    if (claimState !== 'idle') return
    setClaimState('loading')
    const [res] = await Promise.all([
      fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.id }),
      }),
      new Promise<void>((r) => setTimeout(r, 600)),
    ])
    if (res.ok) {
      setClaimState('done')
      toast.success('Claim sent! Waiting for the seller to respond.')
      setTimeout(() => setClaimState('idle'), 3000)
    } else if (res.status === 401) {
      setClaimState('idle')
      toast.error('Sign in to claim this item.')
    } else {
      setClaimState('idle')
      toast.error("Couldn't claim — please try again.")
    }
  }

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-row rounded-2xl overflow-hidden bg-white w-full transition-all duration-200"
      style={{
        border: `1px solid ${type.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = type.borderHover
        el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = type.border
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'
      }}
    >
      {/* Image */}
      <div className="relative shrink-0 w-28 overflow-hidden" style={{ background: type.bg }}>
        {imageId ? (
          <CldImage
            src={imageId}
            fill
            sizes="112px"
            alt={listing.title}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ color: type.color, opacity: 0.4 }}>
            <Package size={22} strokeWidth={1.5} />
          </div>
        )}

        {/* Type badge */}
        <div className="absolute left-1.5 top-1.5">
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: 'rgba(255,255,255,0.92)', color: type.color }}
          >
            {type.label}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col flex-1 min-w-0 px-3 py-2.5 gap-1">
        <p className="text-sm font-bold leading-none" style={{ color: type.color }}>
          {priceLabel}
        </p>
        <p className="text-xs font-medium text-text leading-snug line-clamp-2">{listing.title}</p>

        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {listing.condition && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
              style={{ background: type.bg, color: type.color }}
            >
              {CONDITION_LABELS[listing.condition] ?? listing.condition}
            </span>
          )}
          {listing.area && (
            <div className="flex min-w-0 items-center gap-0.5">
              <MapPin size={9} strokeWidth={2} className="shrink-0" style={{ color: '#b8b0a8' }} />
              <span className="truncate text-[10px]" style={{ color: '#a8a09a' }}>
                {listing.area}
              </span>
            </div>
          )}
        </div>

        {/* Action button */}
        {listing.listing_type === 'for_sale' && (
          <button
            onClick={handleAddToCart}
            disabled={cartState === 'loading'}
            className="mt-auto pt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold transition-all disabled:opacity-60"
            style={{
              background: cartState === 'done' ? 'rgba(79,70,229,0.12)' : type.bg,
              color: type.color,
            }}
          >
            {cartState === 'loading' ? (
              <Loader2 size={11} className="animate-spin" />
            ) : cartState === 'done' ? (
              <Check size={11} strokeWidth={2.5} />
            ) : (
              <ShoppingCart size={11} strokeWidth={2} />
            )}
            {cartState === 'done' ? 'Added' : 'Add to Cart'}
          </button>
        )}

        {listing.listing_type === 'free' && (
          <button
            onClick={handleClaim}
            disabled={claimState === 'loading'}
            className="mt-auto pt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold transition-all disabled:opacity-60"
            style={{
              background: claimState === 'done' ? 'rgba(16,185,129,0.18)' : type.bg,
              color: type.color,
            }}
          >
            {claimState === 'loading' ? (
              <Loader2 size={11} className="animate-spin" />
            ) : claimState === 'done' ? (
              <Check size={11} strokeWidth={2.5} />
            ) : (
              <Gift size={11} strokeWidth={2} />
            )}
            {claimState === 'done' ? 'Claimed!' : 'Claim'}
          </button>
        )}
      </div>
    </Link>
  )
}
