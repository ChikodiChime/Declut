'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, Truck, MapPin, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Pagination } from '@/components/admin/Pagination'
import { Modal } from '@/components/ui'

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

interface OrdersResponse {
  orders: AdminOrder[]
  total: number
}

const PAGE_SIZE = 25

async function fetchOrders(page: number): Promise<OrdersResponse> {
  const res = await fetch(`/api/admin/orders?page=${page}`)
  if (!res.ok) throw new Error('Failed to load orders')
  const json = await res.json()
  return json.data
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
  cancelled: 'bg-red-100 text-red-600',
}

const STATUS_DOT: Record<string, string> = {
  pending:   'bg-amber-400',
  paid:      'bg-blue-500',
  confirmed: 'bg-blue-500',
  shipped:   'bg-violet-500',
  delivered: 'bg-teal-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
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

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border animate-pulse">
          <td className="px-6 py-[18px]"><div className="h-4 rounded bg-border w-20" /><div className="h-3 rounded bg-border mt-1.5 w-14" /></td>
          <td className="px-6 py-[18px]"><div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-full bg-border shrink-0" /><div className="space-y-1.5"><div className="h-4 rounded bg-border w-28" /><div className="h-3 rounded bg-border w-20" /></div></div></td>
          <td className="px-6 py-[18px]"><div className="h-4 rounded bg-border w-24" /></td>
          <td className="px-6 py-[18px]"><div className="h-5 rounded-full bg-border w-20" /></td>
          <td className="px-6 py-[18px]"><div className="h-5 rounded-full bg-border w-16" /></td>
          <td className="px-6 py-[18px]"><div className="h-7 rounded-lg bg-border w-24 ml-auto" /></td>
        </tr>
      ))}
    </>
  )
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [cancelTarget, setCancelTarget] = useState<AdminOrder | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', page],
    queryFn: () => fetchOrders(page),
  })

  const orders = data?.orders ?? []
  const total = data?.total ?? 0

  const mutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      const wasPaid = cancelTarget?.status === 'paid'
      setCancelTarget(null)
      toast.success(wasPaid ? 'Order cancelled and refund issued' : 'Order cancelled')
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', page] })
    },
    onError: (e: Error) => {
      setCancelTarget(null)
      toast.error(e.message)
    },
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <ShoppingBag size={19} strokeWidth={1.75} className="text-amber-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text">Orders</h1>
            {total > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                {total.toLocaleString('en-NG')}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">Oversee & force-cancel orders</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)' }}>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Order</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Buyer</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Amount</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Status</th>
                <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>Via</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {isLoading ? (
                <TableSkeleton />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center bg-card">
                    <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag size={22} strokeWidth={1.25} className="text-text-subtle" />
                    </div>
                    <p className="text-sm font-medium text-text-muted">No orders yet</p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="transition-all hover:bg-primary/[0.035] hover:[box-shadow:inset_4px_0_0_#3730a3]"
                  >
                    <td className="px-6 py-[18px]">
                      <p className="font-mono text-xs font-semibold text-text bg-surface border border-border inline-block px-1.5 py-0.5 rounded">
                        {o.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-text-muted mt-1.5">
                        {new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-6 py-[18px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-slate-600">
                          {o.buyer ? getInitials(o.buyer.name, o.buyer.email) : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text truncate">{o.buyer?.name ?? '—'}</p>
                          <p className="text-xs text-text-muted truncate">{o.buyer?.email ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-[18px] font-semibold text-text whitespace-nowrap">
                      ₦{o.total_price.toLocaleString('en-NG')}
                    </td>
                    <td className="px-6 py-[18px]">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[o.status] ?? 'bg-border text-text-muted'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[o.status] ?? 'bg-text-subtle'}`} />
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-[18px]">
                      <span className={[
                        'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full',
                        o.delivery_type === 'delivery' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-700',
                      ].join(' ')}>
                        {o.delivery_type === 'delivery'
                          ? <><Truck size={10} strokeWidth={2} /> Delivery</>
                          : <><MapPin size={10} strokeWidth={2} /> Pickup</>
                        }
                      </span>
                    </td>
                    <td className="px-6 py-[18px] text-right">
                      {['pending', 'paid'].includes(o.status) && (
                        <button
                          onClick={() => setCancelTarget(o)}
                          className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Force cancel
                        </button>
                      )}
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

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Force cancel order">
        <div className="flex flex-col gap-5">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={17} strokeWidth={2} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-text mb-1">
                Cancel order <span className="font-mono">{cancelTarget?.id.slice(0, 8)}</span>?
              </p>
              <p className="text-sm text-text-muted">
                {cancelTarget?.status === 'paid'
                  ? 'This order has been paid. A full refund will be issued to the buyer via Paystack.'
                  : 'This order will be cancelled and the listing will become available again.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCancelTarget(null)} className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-text-muted hover:bg-surface transition-colors">
              Keep order
            </button>
            <button
              onClick={() => cancelTarget && mutation.mutate(cancelTarget.id)}
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Cancelling…' : cancelTarget?.status === 'paid' ? 'Cancel & refund' : 'Cancel order'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
