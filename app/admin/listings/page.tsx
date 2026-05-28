'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package } from 'lucide-react'

interface AdminListing {
  id: string
  title: string
  listing_type: string
  status: string
  area: string
  created_at: string
  users: { name: string | null; email: string } | null
}

async function fetchListings(): Promise<AdminListing[]> {
  const res = await fetch('/api/admin/listings')
  if (!res.ok) throw new Error('Failed to load listings')
  const json = await res.json()
  return json.data.listings
}

async function removeListing(id: string) {
  const res = await fetch(`/api/admin/listings/${id}`, { method: 'DELETE' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to remove listing')
}

const LISTING_TYPE_LABEL: Record<string, string> = {
  for_sale: 'For Sale',
  free: 'Free',
  donate: 'Donate',
}

export default function AdminListingsPage() {
  const queryClient = useQueryClient()
  const { data: listings = [], isLoading } = useQuery({ queryKey: ['admin', 'listings'], queryFn: fetchListings })
  const [actionError, setActionError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: removeListing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] }),
    onError: (e: Error) => setActionError(e.message),
  })

  function handleRemove(id: string) {
    if (!confirm('Remove this listing? It will no longer appear on the marketplace.')) return
    setActionError(null)
    mutation.mutate(id)
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Package size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-text">Listings</h1>
        <span className="text-sm text-text-muted">({listings.length})</span>
      </div>

      {actionError && <p className="text-sm text-red-600 mb-4">{actionError}</p>}

      <div className="bg-card rounded-2xl shadow-card overflow-x-auto">
        {isLoading ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">Loading…</p>
        ) : listings.length === 0 ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">No listings.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Title</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Area</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium text-text truncate max-w-48">{l.title}</p>
                    <p className="text-xs text-text-muted">{l.users?.name ?? l.users?.email ?? '—'}</p>
                  </td>
                  <td className="px-6 py-3 text-text-muted">{LISTING_TYPE_LABEL[l.listing_type] ?? l.listing_type}</td>
                  <td className="px-6 py-3 text-text-muted">{l.area}</td>
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleRemove(l.id)}
                      disabled={mutation.isPending}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
