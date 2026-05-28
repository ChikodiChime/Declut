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
  for_sale: 'bg-primary/8 text-primary',
  free:     'bg-green-50 text-green-700',
  donate:   'bg-purple-50 text-purple-700',
}

const LISTING_STATUS_STYLE: Record<string, string> = {
  available: 'bg-green-50 text-green-700',
  sold:      'bg-blue-50 text-blue-700',
  claimed:   'bg-violet-50 text-violet-700',
  donated:   'bg-purple-50 text-purple-700',
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
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border animate-pulse">
          <td className="px-6 py-4"><div className="h-4 rounded-md bg-border w-3/5" /><div className="h-3 rounded-md bg-border mt-1.5 w-2/5" /></td>
          <td className="px-6 py-4"><div className="h-5 rounded-full bg-border w-16" /></td>
          <td className="px-6 py-4"><div className="h-4 rounded-md bg-border w-24" /></td>
          <td className="px-6 py-4"><div className="h-5 rounded-full bg-border w-20" /></td>
          <td className="px-6 py-4"><div className="h-7 rounded-lg bg-border w-16 ml-auto" /></td>
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
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
          <Package size={18} strokeWidth={1.75} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text leading-tight">Listings</h1>
          {total > 0 && <p className="text-xs text-text-muted">{total.toLocaleString('en-NG')} active listings</p>}
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">Listing</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">Type</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">Area</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton />
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Package size={32} strokeWidth={1.25} className="mx-auto mb-3 text-border" />
                    <p className="text-sm text-text-muted">No listings found.</p>
                  </td>
                </tr>
              ) : (
                listings.map((l) => (
                  <tr key={l.id} className="hover:bg-surface/60 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-text truncate max-w-52">{l.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{l.users?.name ?? l.users?.email ?? '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${LISTING_TYPE_STYLE[l.listing_type] ?? 'bg-border text-text-muted'}`}>
                        {LISTING_TYPE_LABEL[l.listing_type] ?? l.listing_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted whitespace-nowrap">{l.area}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${LISTING_STATUS_STYLE[l.status] ?? 'bg-border text-text-muted'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${LISTING_STATUS_DOT[l.status] ?? 'bg-text-subtle'}`} />
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setRemoveTarget(l)}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
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
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
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
            <button
              onClick={() => setRemoveTarget(null)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-text-muted hover:bg-surface transition-colors"
            >
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
