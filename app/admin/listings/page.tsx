'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Pagination } from '@/components/admin/Pagination'
import { Modal } from '@/components/ui'

interface AdminListing {
  id: string
  title: string
  listing_type: string
  status: string
  area: string
  created_at: string
  users: { name: string | null; email: string } | null
}

interface ListingsResponse {
  listings: AdminListing[]
  total: number
}

const PAGE_SIZE = 25

async function fetchListings(page: number): Promise<ListingsResponse> {
  const res = await fetch(`/api/admin/listings?page=${page}`)
  if (!res.ok) throw new Error('Failed to load listings')
  const json = await res.json()
  return json.data
}

async function removeListing(id: string) {
  const res = await fetch(`/api/admin/listings/${id}`, { method: 'DELETE' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to remove listing')
}

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

export default function AdminListingsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [removeTarget, setRemoveTarget] = useState<AdminListing | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'listings', page],
    queryFn: () => fetchListings(page),
  })

  const listings = data?.listings ?? []
  const total = data?.total ?? 0

  const mutation = useMutation({
    mutationFn: removeListing,
    onSuccess: () => {
      setRemoveTarget(null)
      toast.success('Listing removed from marketplace')
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings', page] })
    },
    onError: (e: Error) => {
      setRemoveTarget(null)
      toast.error(e.message)
    },
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
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
          <p className="text-xs text-text-muted mt-0.5">Moderate marketplace items</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)' }}>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Listing</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Type</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Seller</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Area</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Status</th>
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
                    className="transition-all hover:bg-primary/[0.035] hover:[box-shadow:inset_4px_0_0_#3730a3]"
                  >
                    <td className="px-6 py-[18px] max-w-xs">
                      <p className="font-semibold text-text truncate">{l.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {new Date(l.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-6 py-[18px]">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${LISTING_TYPE_STYLE[l.listing_type] ?? 'bg-border text-text-muted'}`}>
                        {LISTING_TYPE_LABEL[l.listing_type] ?? l.listing_type}
                      </span>
                    </td>
                    <td className="px-6 py-[18px] text-sm text-text-muted">
                      {l.users?.name ?? l.users?.email ?? '—'}
                    </td>
                    <td className="px-6 py-[18px] text-sm text-text-muted whitespace-nowrap">{l.area}</td>
                    <td className="px-6 py-[18px]">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${LISTING_STATUS_STYLE[l.status] ?? 'bg-border text-text-muted'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${LISTING_STATUS_DOT[l.status] ?? 'bg-text-subtle'}`} />
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-[18px] text-right">
                      <button
                        onClick={() => setRemoveTarget(l)}
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
        <div className="bg-card border-t border-border">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </div>
      </div>

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
