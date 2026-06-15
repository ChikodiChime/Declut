'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package, AlertTriangle, Tag, Ruler, MapPin, User,
  Store, Calendar, DollarSign, Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Pagination } from '@/components/admin/Pagination'
import { AdminDrawer } from '@/components/admin/AdminDrawer'
import { Modal } from '@/components/ui'
import { SearchInput } from '@/components/admin/SearchInput'
import { FilterSelect } from '@/components/admin/FilterSelect'
import { ListingImage } from '@/components/ui/ListingImage'
import { useDebounce } from '@/lib/hooks/useDebounce'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminListing {
  id: string
  title: string
  listing_type: string
  status: string
  area: string
  created_at: string
  users: { name: string | null; email: string } | null
}

interface ListingDetail {
  id: string
  title: string
  description: string | null
  price: number | null
  category: string
  condition: string
  listing_type: string
  area: string
  images: string[]
  status: string
  size_category: string | null
  pickup_address: string | null
  created_at: string
  seller: {
    id: string
    name: string | null
    email: string
    account_type: string
    suspended: boolean
  } | null
}

interface ListingsResponse {
  listings: AdminListing[]
  total: number
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { value: '',        label: 'All types' },
  { value: 'for_sale', label: 'For Sale' },
  { value: 'free',    label: 'Free' },
  { value: 'donate',  label: 'Donate' },
] as const

const STATUS_FILTERS = [
  { value: '',          label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'sold',      label: 'Sold' },
  { value: 'claimed',   label: 'Claimed' },
  { value: 'donated',   label: 'Donated' },
] as const

type TypeFilter   = typeof TYPE_FILTERS[number]['value']
type StatusFilter = typeof STATUS_FILTERS[number]['value']

// ─── API ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

async function fetchListings(page: number, q: string, type: string, status: string): Promise<ListingsResponse> {
  const p = new URLSearchParams({ page: String(page) })
  if (q)      p.set('q', q)
  if (type)   p.set('type', type)
  if (status) p.set('status', status)
  const res = await fetch(`/api/admin/listings?${p}`)
  if (!res.ok) throw new Error('Failed to load listings')
  const json = await res.json()
  return json.data
}

async function fetchListingDetail(id: string): Promise<ListingDetail> {
  const res = await fetch(`/api/admin/listings/${id}`)
  if (!res.ok) throw new Error('Failed to load listing')
  const json = await res.json()
  return json.data.listing
}

async function removeListing(id: string) {
  const res = await fetch(`/api/admin/listings/${id}`, { method: 'DELETE' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to remove listing')
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const LISTING_TYPE_LABEL: Record<string, string> = {
  for_sale: 'For Sale',
  free:     'Free',
  donate:   'Donate',
}

const LISTING_TYPE_STYLE: Record<string, string> = {
  for_sale: 'bg-primary/15 text-primary',
  free:     'bg-green-100 text-green-700',
  donate:   'bg-purple-100 text-purple-700',
}

const LISTING_STATUS_STYLE: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  sold:      'bg-blue-100 text-blue-700',
  claimed:   'bg-violet-100 text-violet-700',
  donated:   'bg-purple-100 text-purple-700',
}

const LISTING_STATUS_DOT: Record<string, string> = {
  available: 'bg-green-500',
  sold:      'bg-blue-500',
  claimed:   'bg-violet-500',
  donated:   'bg-purple-500',
}

const CONDITION_LABEL: Record<string, string> = {
  new:      'New',
  like_new: 'Like new',
  good:     'Good',
  fair:     'Fair',
  poor:     'Poor',
}

const SIZE_LABEL: Record<string, string> = {
  small:       'Small',
  medium:      'Medium',
  large:       'Large',
  extra_large: 'Extra large',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatNaira(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border animate-pulse">
          <td className="px-6 py-[18px]"><div className="h-4 rounded bg-border w-3/5" /><div className="h-3 rounded bg-border mt-1.5 w-2/5" /></td>
          <td className="px-6 py-[18px]"><div className="h-5 rounded-full bg-border w-16" /></td>
          <td className="px-6 py-[18px]"><div className="h-4 rounded bg-border w-28" /></td>
          <td className="px-6 py-[18px]"><div className="h-4 rounded bg-border w-20" /></td>
          <td className="px-6 py-[18px]"><div className="h-5 rounded-full bg-border w-20" /></td>
          <td className="px-6 py-[18px]"><div className="h-7 rounded-lg bg-border w-16 ml-auto" /></td>
        </tr>
      ))}
    </>
  )
}

function CardSkeleton() {
  return (
    <div className="px-4 py-4 animate-pulse border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="h-4 rounded bg-border w-2/3" />
        <div className="h-5 rounded-full bg-border w-16 shrink-0" />
      </div>
      <div className="h-3 rounded bg-border mt-2 w-1/2" />
      <div className="flex items-center justify-between mt-3">
        <div className="h-5 rounded-full bg-border w-20" />
        <div className="h-7 rounded-lg bg-border w-16" />
      </div>
    </div>
  )
}

// ─── Listing Drawer ───────────────────────────────────────────────────────────

function ListingDrawer({
  listingId,
  onClose,
  onRemove,
  isRemoving,
}: {
  listingId: string | null
  onClose: () => void
  onRemove: (id: string) => void
  isRemoving: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const [imageIdx, setImageIdx] = useState(0)

  const { data: listing, isLoading } = useQuery({
    queryKey: ['admin', 'listings', listingId, 'detail'],
    queryFn: () => fetchListingDetail(listingId!),
    enabled: !!listingId,
  })

  function handleClose() {
    setConfirming(false)
    setImageIdx(0)
    onClose()
  }

  function handleRemove() {
    if (!listing) return
    onRemove(listing.id)
    setConfirming(false)
  }

  const statusCls = listing ? LISTING_STATUS_STYLE[listing.status] ?? 'bg-border text-text-muted' : ''
  const statusDot = listing ? LISTING_STATUS_DOT[listing.status] ?? 'bg-text-subtle' : ''
  const canRemove = listing && listing.status !== 'removed'

  const heroContent = listing ? (
    <>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
        >
          {LISTING_TYPE_LABEL[listing.listing_type] ?? listing.listing_type}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full`}
          style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
        </span>
      </div>

      <p className="text-xl font-bold text-white leading-snug mb-2">{listing.title}</p>

      {listing.price != null && (
        <p className="text-3xl font-bold text-white tracking-tight">
          {formatNaira(listing.price)}
        </p>
      )}
    </>
  ) : undefined

  const footerContent = canRemove ? (
    !confirming ? (
      <button
        onClick={() => setConfirming(true)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold py-3 hover:bg-red-100 transition-colors"
      >
        <AlertTriangle size={14} strokeWidth={2.5} />
        Remove listing
      </button>
    ) : (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700">
            This listing will be hidden from the marketplace. The seller can still see it in their dashboard.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 rounded-xl border border-border text-sm font-semibold text-text-muted py-3 hover:bg-surface transition-colors"
          >
            Keep listing
          </button>
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="flex-1 rounded-xl text-white text-sm font-bold py-3 disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
          >
            {isRemoving ? 'Removing…' : 'Confirm remove'}
          </button>
        </div>
      </div>
    )
  ) : undefined

  return (
    <AdminDrawer
      open={!!listingId}
      onClose={handleClose}
      label="Listing details"
      hero={heroContent}
      footer={footerContent}
      maxWidth={480}
    >
      {isLoading && (
        <div className="px-6 py-8 space-y-4 animate-pulse">
          <div className="w-full aspect-video rounded-2xl bg-border" />
          <div className="h-4 rounded bg-border w-3/4" />
          <div className="h-4 rounded bg-border w-1/2" />
          <div className="h-24 rounded-2xl bg-border" />
        </div>
      )}

      {listing && (
        <div className="px-6 py-5 space-y-5">

          {/* Images */}
          {listing.images.length > 0 && (
            <div>
              {/* Main image */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-border">
                <ListingImage
                  src={listing.images[imageIdx]}
                  fill
                  sizes="480px"
                  className="object-cover"
                  alt={listing.title}
                />
              </div>

              {/* Thumbnails */}
              {listing.images.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                  {listing.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImageIdx(i)}
                      className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors"
                      style={{ borderColor: i === imageIdx ? '#3730a3' : 'transparent' }}
                    >
                      <ListingImage
                        src={img}
                        fill
                        sizes="64px"
                        className="object-cover"
                        alt=""
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {listing.images.length === 0 && (
            <div className="w-full aspect-video rounded-2xl bg-surface border border-border flex items-center justify-center">
              <ImageIcon size={32} strokeWidth={1.25} className="text-text-subtle" />
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-subtle mb-2">Description</p>
              <p className="text-sm text-text-muted leading-relaxed">{listing.description}</p>
            </div>
          )}

          {/* Details */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-subtle mb-2.5">Details</p>
            <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">

              {listing.price != null && (
                <div className="px-4 py-3 flex items-center gap-3">
                  <DollarSign size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-xs text-text-muted">Price</span>
                    <span className="text-sm font-semibold text-text">{formatNaira(listing.price)}</span>
                  </div>
                </div>
              )}

              <div className="px-4 py-3 flex items-center gap-3">
                <Tag size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                <div className="flex items-center justify-between flex-1">
                  <span className="text-xs text-text-muted">Category</span>
                  <span className="text-sm text-text capitalize">{listing.category}</span>
                </div>
              </div>

              <div className="px-4 py-3 flex items-center gap-3">
                <Package size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                <div className="flex items-center justify-between flex-1">
                  <span className="text-xs text-text-muted">Condition</span>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusCls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                    {CONDITION_LABEL[listing.condition] ?? listing.condition}
                  </span>
                </div>
              </div>

              {listing.size_category && (
                <div className="px-4 py-3 flex items-center gap-3">
                  <Ruler size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-xs text-text-muted">Size</span>
                    <span className="text-sm text-text">{SIZE_LABEL[listing.size_category] ?? listing.size_category}</span>
                  </div>
                </div>
              )}

              <div className="px-4 py-3 flex items-center gap-3">
                <MapPin size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                <div className="flex items-center justify-between flex-1">
                  <span className="text-xs text-text-muted">Area</span>
                  <span className="text-sm text-text">{listing.area}</span>
                </div>
              </div>

              <div className="px-4 py-3 flex items-center gap-3">
                <Calendar size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                <div className="flex items-center justify-between flex-1">
                  <span className="text-xs text-text-muted">Listed</span>
                  <span className="text-sm text-text">{formatDate(listing.created_at)}</span>
                </div>
              </div>

              {listing.pickup_address && (
                <div className="px-4 py-3 flex items-start gap-3">
                  <Store size={13} strokeWidth={2} className="text-text-subtle shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-text-muted mb-0.5">Pickup address</p>
                    <p className="text-sm text-text">{listing.pickup_address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seller */}
          {listing.seller && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-subtle mb-2.5">Seller</p>
              <div className="rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #3730a3, #6366f1)' }}
                >
                  {getInitials(listing.seller.name, listing.seller.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text">{listing.seller.name ?? '—'}</p>
                  <p className="text-xs text-text-muted truncate">{listing.seller.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">
                    {listing.seller.account_type}
                  </span>
                  {listing.seller.suspended && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                      Suspended
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {!listing.seller && (
            <div className="rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shrink-0">
                <User size={16} strokeWidth={1.5} className="text-text-subtle" />
              </div>
              <p className="text-sm text-text-subtle">Seller account not found</p>
            </div>
          )}

          <div className="h-2" />
        </div>
      )}
    </AdminDrawer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminListingsContent() {
  const queryClient  = useQueryClient()
  const searchParams = useSearchParams()
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState(() => searchParams.get('q') ?? '')
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<AdminListing | null>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearch(searchParams.get('q') ?? '') }, [searchParams])

  const q = useDebounce(search)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'listings', page, q, typeFilter, statusFilter],
    queryFn: () => fetchListings(page, q, typeFilter, statusFilter),
  })

  const listings = data?.listings ?? []
  const total    = data?.total ?? 0

  function handleSearch(v: string) { setSearch(v); setPage(1) }
  function handleType(v: TypeFilter) { setTypeFilter(v); setPage(1) }
  function handleStatus(v: StatusFilter) { setStatusFilter(v); setPage(1) }

  const mutation = useMutation({
    mutationFn: removeListing,
    onSuccess: () => {
      setSelectedId(null)
      setRemoveTarget(null)
      toast.success('Listing removed from marketplace')
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] })
    },
    onError: (e: Error) => {
      setRemoveTarget(null)
      toast.error(e.message)
    },
  })

  const DARK_HEADER = { background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)' }
  const TH = 'text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap'
  const TH_COLOR = { color: 'rgba(255,255,255,0.55)' }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
          <Package size={19} strokeWidth={1.75} className="text-violet-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text">Listings</h1>
            {total > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600">
                {total.toLocaleString('en-NG')}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">Click any listing to review details</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={handleSearch} placeholder="Search by listing title…" />
        </div>
        <FilterSelect value={typeFilter} onChange={(v) => handleType(v as TypeFilter)} options={TYPE_FILTERS} />
        <FilterSelect value={statusFilter} onChange={(v) => handleStatus(v as StatusFilter)} options={STATUS_FILTERS} />
      </div>

      <div className="rounded-2xl overflow-hidden shadow-elevated">

        {/* ── Desktop table ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={DARK_HEADER}>
                <th className={TH} style={TH_COLOR}>Listing</th>
                <th className={TH} style={TH_COLOR}>Type</th>
                <th className={TH} style={TH_COLOR}>Seller</th>
                <th className={TH} style={TH_COLOR}>Area</th>
                <th className={TH} style={TH_COLOR}>Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {isLoading ? (
                <TableSkeleton />
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center bg-card">
                    <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
                      <Package size={22} strokeWidth={1.25} className="text-text-subtle" />
                    </div>
                    <p className="text-sm font-medium text-text-muted">No listings found</p>
                  </td>
                </tr>
              ) : (
                listings.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className="cursor-pointer transition-all hover:bg-primary/[0.035] hover:[box-shadow:inset_4px_0_0_#3730a3]"
                  >
                    <td className="px-6 py-[18px] max-w-xs">
                      <p className="font-semibold text-text truncate">{l.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{formatDate(l.created_at)}</p>
                    </td>
                    <td className="px-6 py-[18px]">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${LISTING_TYPE_STYLE[l.listing_type] ?? 'bg-border text-text-muted'}`}>
                        {LISTING_TYPE_LABEL[l.listing_type] ?? l.listing_type}
                      </span>
                    </td>
                    <td className="px-6 py-[18px] text-sm text-text-muted">{l.users?.name ?? l.users?.email ?? '—'}</td>
                    <td className="px-6 py-[18px] text-sm text-text-muted whitespace-nowrap">{l.area}</td>
                    <td className="px-6 py-[18px]">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${LISTING_STATUS_STYLE[l.status] ?? 'bg-border text-text-muted'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${LISTING_STATUS_DOT[l.status] ?? 'bg-text-subtle'}`} />
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-[18px] text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setRemoveTarget(l) }}
                        className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ── */}
        <div className="md:hidden">
          <div className="px-4 py-3" style={DARK_HEADER}>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={TH_COLOR}>Listings</p>
          </div>
          <div className="bg-card divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            ) : listings.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
                  <Package size={22} strokeWidth={1.25} className="text-text-subtle" />
                </div>
                <p className="text-sm font-medium text-text-muted">No listings found</p>
              </div>
            ) : (
              listings.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className="cursor-pointer px-4 py-4 transition-colors hover:bg-primary/[0.035] active:bg-primary/[0.06]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-text text-sm leading-snug">{l.title}</p>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${LISTING_TYPE_STYLE[l.listing_type] ?? 'bg-border text-text-muted'}`}>
                      {LISTING_TYPE_LABEL[l.listing_type] ?? l.listing_type}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1 truncate">
                    {l.users?.name ?? l.users?.email ?? '—'} · {l.area}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${LISTING_STATUS_STYLE[l.status] ?? 'bg-border text-text-muted'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${LISTING_STATUS_DOT[l.status] ?? 'bg-text-subtle'}`} />
                        {l.status}
                      </span>
                      <span className="text-[11px] text-text-subtle">{formatDate(l.created_at)}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRemoveTarget(l) }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border-t border-border">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </div>
      </div>

      <ListingDrawer
        listingId={selectedId}
        onClose={() => setSelectedId(null)}
        onRemove={mutation.mutate}
        isRemoving={mutation.isPending}
      />

      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove listing">
        <div className="flex flex-col gap-5">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={17} strokeWidth={2} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-text mb-1">
                Remove &ldquo;{removeTarget?.title}&rdquo;?
              </p>
              <p className="text-sm text-text-muted">
                This listing will no longer appear on the marketplace. The seller will still see it in their dashboard as removed.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setRemoveTarget(null)} className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-text-muted hover:bg-surface transition-colors">
              Cancel
            </button>
            <button
              onClick={() => removeTarget && mutation.mutate(removeTarget.id)}
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Removing…' : 'Remove listing'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function AdminListingsPage() {
  return (
    <Suspense>
      <AdminListingsContent />
    </Suspense>
  )
}
