'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag } from 'lucide-react'

interface AdminOrder {
  id: string
  status: string
  total_price: number
  delivery_type: string
  created_at: string
  buyer: { name: string | null; email: string } | null
  seller: { name: string | null; email: string } | null
  dispatcher: { name: string | null; email: string } | null
}

async function fetchOrders(): Promise<AdminOrder[]> {
  const res = await fetch('/api/admin/orders')
  if (!res.ok) throw new Error('Failed to load orders')
  const json = await res.json()
  return json.data.orders
}

async function cancelOrder(id: string) {
  const res = await fetch(`/api/admin/orders/${id}/cancel`, { method: 'POST' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to cancel order')
}

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-blue-100 text-blue-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-violet-100 text-violet-700',
  delivered: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient()
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['admin', 'orders'], queryFn: fetchOrders })
  const [actionError, setActionError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
    onError: (e: Error) => setActionError(e.message),
  })

  function handleCancel(id: string) {
    if (!confirm('Force-cancel this order? A refund will be issued if the order is paid.')) return
    setActionError(null)
    mutation.mutate(id)
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBag size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-text">Orders</h1>
        <span className="text-sm text-text-muted">({orders.length})</span>
      </div>

      {actionError && <p className="text-sm text-red-600 mb-4">{actionError}</p>}

      <div className="bg-card rounded-2xl shadow-card overflow-x-auto">
        {isLoading ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">No orders.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Order</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Buyer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Total</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-mono text-xs text-text">{o.id.slice(0, 8)}…</p>
                    <p className="text-xs text-text-muted">
                      {new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-text">{o.buyer?.name ?? '—'}</p>
                    <p className="text-xs text-text-muted">{o.buyer?.email ?? ''}</p>
                  </td>
                  <td className="px-6 py-3 text-text">₦{o.total_price.toLocaleString('en-NG')}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status] ?? 'bg-border text-text-muted'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {['pending', 'paid'].includes(o.status) && (
                      <button
                        onClick={() => handleCancel(o.id)}
                        disabled={mutation.isPending}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Force cancel
                      </button>
                    )}
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
