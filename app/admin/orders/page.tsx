'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShoppingBag, Truck, MapPin, AlertTriangle, User,
  Store, Hash, Calendar, CreditCard, Package,
} from 'lucide-react'
import { toast } from 'sonner'
import { Pagination } from '@/components/admin/Pagination'
import { AdminDrawer } from '@/components/admin/AdminDrawer'
import { SearchInput } from '@/components/admin/SearchInput'
import { FilterSelect } from '@/components/admin/FilterSelect'
import { useDebounce } from '@/lib/hooks/useDebounce'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderUser {
  name: string | null
  email: string
  phone: string | null
  account_type?: string
}

interface OrderItem {
  listing: { id: string; title: string } | null
}

interface AdminOrder {
  id: string
  status: string
  total_price: number
  item_price: number
  delivery_fee: number
  platform_fee: number
  delivery_type: string
  pickup_address: string | null
  buyer_address: string | null
  paystack_reference: string | null
  auto_cancel_at: string | null
  created_at: string
  buyer: OrderUser | null
  seller: OrderUser | null
  dispatcher: OrderUser | null
  items: OrderItem[]
}

interface OrdersResponse {
  orders: AdminOrder[]
  total: number
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '',          label: 'All' },
  { value: 'pending',   label: 'Pending' },
  { value: 'paid',      label: 'Paid' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped',   label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

const DELIVERY_FILTERS = [
  { value: '',         label: 'All delivery' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'pickup',   label: 'Pickup' },
] as const

type StatusFilter   = typeof STATUS_FILTERS[number]['value']
type DeliveryFilter = typeof DELIVERY_FILTERS[number]['value']

// ─── API ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

async function fetchOrders(page: number, q: string, status: string, delivery: string): Promise<OrdersResponse> {
  const p = new URLSearchParams({ page: String(page) })
  if (q)        p.set('q', q)
  if (status)   p.set('status', status)
  if (delivery) p.set('delivery', delivery)
  const res = await fetch(`/api/admin/orders?${p}`)
  if (!res.ok) throw new Error('Failed to load orders')
  const json = await res.json()
  return json.data
}

async function cancelOrder(id: string) {
  const res = await fetch(`/api/admin/orders/${id}/cancel`, { method: 'POST' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to cancel order')
}

// ─── Style maps ───────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatNaira(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

const canCancel = (status: string) => ['pending', 'paid'].includes(status)

// ─── Skeletons ────────────────────────────────────────────────────────────────

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
        </tr>
      ))}
    </>
  )
}

function CardSkeleton() {
  return (
    <div className="px-4 py-4 animate-pulse border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="h-5 rounded bg-border w-20" />
        <div className="h-5 rounded-full bg-border w-20" />
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="h-5 rounded bg-border w-20" />
        <div className="h-5 rounded-full bg-border w-16" />
      </div>
      <div className="h-3 rounded bg-border mt-2 w-40" />
    </div>
  )
}

// ─── Order Drawer ─────────────────────────────────────────────────────────────

function OrderDrawer({
  order,
  open,
  onClose,
  onCancel,
  isCancelling,
}: {
  order: AdminOrder | null
  open: boolean
  onClose: () => void
  onCancel: (id: string) => void
  isCancelling: boolean
}) {
  const [confirming, setConfirming] = useState(false)

  function handleClose() {
    setConfirming(false)
    onClose()
  }

  function handleCancel() {
    if (!order) return
    onCancel(order.id)
    setConfirming(false)
  }

  const statusCls = order ? STATUS_STYLE[order.status] ?? 'bg-border text-text-muted' : ''
  const statusDot = order ? STATUS_DOT[order.status] ?? 'bg-text-subtle' : ''

  const heroContent = order ? (
    <>
      {/* Order ID + date */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="font-mono text-xs font-bold px-2 py-1 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
        >
          #{order.id.slice(0, 8)}
        </span>
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {formatDate(order.created_at)}
        </span>
      </div>

      {/* Item name */}
      {order.items.length > 0 && (
        <p className="text-sm font-semibold mb-3 truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {order.items.length === 1
            ? (order.items[0].listing?.title ?? '—')
            : `${order.items.length} items`}
        </p>
      )}

      {/* Total amount */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Order total
        </p>
        <p className="text-4xl font-bold text-white leading-none tracking-tight">
          {formatNaira(order.total_price)}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full`}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
        >
          {order.delivery_type === 'delivery'
            ? <><Truck size={10} strokeWidth={2} /> Delivery</>
            : <><MapPin size={10} strokeWidth={2} /> Pickup</>
          }
        </span>
      </div>
    </>
  ) : undefined

  const footerContent = order && canCancel(order.status) ? (
    !confirming ? (
      <button
        onClick={() => setConfirming(true)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold py-3 hover:bg-red-100 transition-colors"
      >
        <AlertTriangle size={14} strokeWidth={2.5} />
        Force cancel order
      </button>
    ) : (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700">
            {order.status === 'paid'
              ? 'This order has been paid. A full refund will be issued to the buyer.'
              : 'This will cancel the order and relist the item.'}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 rounded-xl border border-border text-sm font-semibold text-text-muted py-3 hover:bg-surface transition-colors"
          >
            Keep order
          </button>
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="flex-1 rounded-xl text-white text-sm font-bold py-3 disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
          >
            {isCancelling
              ? 'Cancelling…'
              : order.status === 'paid' ? 'Cancel & refund' : 'Confirm cancel'
            }
          </button>
        </div>
      </div>
    )
  ) : undefined

  return (
    <AdminDrawer
      open={open}
      onClose={handleClose}
      label="Order details"
      hero={heroContent}
      footer={footerContent}
    >
      {order && (
        <div className="px-6 py-5 space-y-4">

          {/* Parties */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-subtle mb-2.5">People</p>
            <div className="rounded-2xl overflow-hidden border border-border bg-card divide-y divide-border">
              {/* Buyer */}
              <div className="px-4 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <User size={14} strokeWidth={1.75} className="text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-text-subtle font-semibold uppercase tracking-widest">Buyer</p>
                  {order.buyer ? (
                    <>
                      <p className="text-sm font-semibold text-text mt-0.5">{order.buyer.name ?? '—'}</p>
                      <p className="text-xs text-text-muted truncate">{order.buyer.email}</p>
                    </>
                  ) : (
                    <p className="text-sm text-text-subtle mt-0.5">Guest / unknown</p>
                  )}
                </div>
                {order.buyer?.account_type && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
                    {order.buyer.account_type}
                  </span>
                )}
              </div>

              {/* Seller */}
              <div className="px-4 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <Store size={14} strokeWidth={1.75} className="text-violet-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-text-subtle font-semibold uppercase tracking-widest">Seller</p>
                  {order.seller ? (
                    <>
                      <p className="text-sm font-semibold text-text mt-0.5">{order.seller.name ?? '—'}</p>
                      <p className="text-xs text-text-muted truncate">{order.seller.email}</p>
                    </>
                  ) : (
                    <p className="text-sm text-text-subtle mt-0.5">—</p>
                  )}
                </div>
                {order.seller?.account_type && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
                    {order.seller.account_type}
                  </span>
                )}
              </div>

              {/* Dispatcher */}
              {order.dispatcher && (
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Truck size={14} strokeWidth={1.75} className="text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-text-subtle font-semibold uppercase tracking-widest">Dispatcher</p>
                    <p className="text-sm font-semibold text-text mt-0.5">{order.dispatcher.name ?? '—'}</p>
                    <p className="text-xs text-text-muted truncate">{order.dispatcher.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price breakdown */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-subtle mb-2.5">Breakdown</p>
            <div
              className="rounded-2xl p-4 space-y-2"
              style={{ background: 'linear-gradient(135deg, #f0f0ff 0%, #e8e6ff 100%)', border: '1px solid #c7c5f5' }}
            >
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#7b72e0' }}>Item price</span>
                <span className="font-semibold" style={{ color: '#2e2790' }}>{formatNaira(order.item_price)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#7b72e0' }}>Delivery fee</span>
                <span className="font-semibold" style={{ color: '#2e2790' }}>{formatNaira(order.delivery_fee)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#7b72e0' }}>Platform fee (10%)</span>
                <span className="font-semibold" style={{ color: '#2e2790' }}>−{formatNaira(order.platform_fee)}</span>
              </div>
              <div className="border-t pt-2" style={{ borderColor: '#c7c5f5' }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm" style={{ color: '#2e2790' }}>Total charged</span>
                  <span className="text-lg font-bold" style={{ color: '#2e2790' }}>{formatNaira(order.total_price)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order metadata */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-subtle mb-2.5">Details</p>
            <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
              <div className="px-4 py-3 flex items-center gap-3">
                <Hash size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                <div className="flex items-center justify-between flex-1">
                  <span className="text-xs text-text-muted">Order ID</span>
                  <span className="font-mono text-xs font-semibold text-text">{order.id.slice(0, 8)}</span>
                </div>
              </div>
              {order.paystack_reference && (
                <div className="px-4 py-3 flex items-center gap-3">
                  <CreditCard size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="text-xs text-text-muted shrink-0">Payment ref</span>
                    <span className="font-mono text-xs text-text truncate ml-4">{order.paystack_reference}</span>
                  </div>
                </div>
              )}
              <div className="px-4 py-3 flex items-center gap-3">
                <Calendar size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                <div className="flex items-center justify-between flex-1">
                  <span className="text-xs text-text-muted">Placed</span>
                  <span className="text-sm text-text">{formatDate(order.created_at)}</span>
                </div>
              </div>
              {order.auto_cancel_at && order.status === 'pending' && (
                <div className="px-4 py-3 flex items-center gap-3">
                  <AlertTriangle size={13} strokeWidth={2} className="text-amber-500 shrink-0" />
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-xs text-text-muted">Auto-cancel</span>
                    <span className="text-sm text-amber-600 font-medium">{formatDate(order.auto_cancel_at)}</span>
                  </div>
                </div>
              )}
              {order.delivery_type === 'pickup' ? (
                order.pickup_address ? (
                  <div className="px-4 py-3 flex items-start gap-3">
                    <MapPin size={13} strokeWidth={2} className="text-green-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-text-muted mb-0.5">Pickup address</p>
                      <p className="text-sm text-text">{order.pickup_address}</p>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3 flex items-center gap-3">
                    <MapPin size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                    <div className="flex items-center justify-between flex-1">
                      <span className="text-xs text-text-muted">Pickup address</span>
                      <span className="text-xs text-text-subtle italic">Not yet revealed</span>
                    </div>
                  </div>
                )
              ) : (
                order.buyer_address ? (
                  <div className="px-4 py-3 flex items-start gap-3">
                    <MapPin size={13} strokeWidth={2} className="text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-text-muted mb-0.5">Delivery address</p>
                      <p className="text-sm text-text">{order.buyer_address}</p>
                    </div>
                  </div>
                ) : null
              )}
              <div className="px-4 py-3 flex items-center gap-3">
                <Package size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                <div className="flex items-center justify-between flex-1">
                  <span className="text-xs text-text-muted">Status</span>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${statusCls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-2" />
        </div>
      )}
    </AdminDrawer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminOrdersContent() {
  const queryClient  = useQueryClient()
  const searchParams = useSearchParams()
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState(() => searchParams.get('q') ?? '')
  const [statusFilter, setStatusFilter]     = useState<StatusFilter>('')
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('')
  const [selected, setSelected] = useState<AdminOrder | null>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearch(searchParams.get('q') ?? '') }, [searchParams])

  const q = useDebounce(search)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', page, q, statusFilter, deliveryFilter],
    queryFn: () => fetchOrders(page, q, statusFilter, deliveryFilter),
  })

  function handleSearch(v: string) { setSearch(v); setPage(1) }
  function handleStatus(v: StatusFilter) { setStatusFilter(v); setPage(1) }
  function handleDelivery(v: DeliveryFilter) { setDeliveryFilter(v); setPage(1) }

  const orders = data?.orders ?? []
  const total = data?.total ?? 0

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      const wasPaid = selected?.status === 'paid'
      setSelected(null)
      toast.success(wasPaid ? 'Order cancelled and refund issued' : 'Order cancelled')
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', page] })
    },
    onError: (e: Error) => {
      toast.error(e.message)
    },
  })

  const DARK_HEADER = { background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)' }
  const TH = 'text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap'
  const TH_COLOR = { color: 'rgba(255,255,255,0.55)' }

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
          <p className="text-xs text-text-muted mt-0.5">Click any order to review details</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={handleSearch} placeholder="Search by buyer, seller, item or order ID…" />
        </div>
        <FilterSelect value={statusFilter} onChange={(v) => handleStatus(v as StatusFilter)} options={STATUS_FILTERS} />
        <FilterSelect value={deliveryFilter} onChange={(v) => handleDelivery(v as DeliveryFilter)} options={DELIVERY_FILTERS} />
      </div>

      <div className="rounded-2xl overflow-hidden shadow-elevated">

        {/* ── Desktop table ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={DARK_HEADER}>
                <th className={TH} style={TH_COLOR}>Order</th>
                <th className={TH} style={TH_COLOR}>Buyer</th>
                <th className={TH} style={TH_COLOR}>Amount</th>
                <th className={TH} style={TH_COLOR}>Status</th>
                <th className={TH} style={TH_COLOR}>Via</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {isLoading ? (
                <TableSkeleton />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center bg-card">
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
                    onClick={() => setSelected(o)}
                    className="cursor-pointer transition-all hover:bg-primary/[0.035] hover:[box-shadow:inset_4px_0_0_#3730a3]"
                  >
                    <td className="px-6 py-[18px] max-w-[200px]">
                      <p className="font-mono text-xs font-semibold text-text bg-surface border border-border inline-block px-1.5 py-0.5 rounded">
                        {o.id.slice(0, 8)}
                      </p>
                      {o.items.length > 0 && (
                        <p className="text-xs font-medium text-text mt-1 truncate">
                          {o.items.length === 1
                            ? (o.items[0].listing?.title ?? '—')
                            : `${o.items.length} items`}
                        </p>
                      )}
                      <p className="text-xs text-text-muted mt-0.5">{formatDate(o.created_at)}</p>
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
                      {formatNaira(o.total_price)}
                    </td>
                    <td className="px-6 py-[18px]">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[o.status] ?? 'bg-border text-text-muted'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[o.status] ?? 'bg-text-subtle'}`} />
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-[18px]">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${o.delivery_type === 'delivery' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-700'}`}>
                        {o.delivery_type === 'delivery'
                          ? <><Truck size={10} strokeWidth={2} /> Delivery</>
                          : <><MapPin size={10} strokeWidth={2} /> Pickup</>
                        }
                      </span>
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
            <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={TH_COLOR}>Orders</p>
          </div>
          <div className="bg-card divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            ) : orders.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag size={22} strokeWidth={1.25} className="text-text-subtle" />
                </div>
                <p className="text-sm font-medium text-text-muted">No orders yet</p>
              </div>
            ) : (
              orders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="cursor-pointer px-4 py-4 transition-colors hover:bg-primary/[0.035] active:bg-primary/[0.06]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold text-text bg-surface border border-border inline-block px-1.5 py-0.5 rounded">
                      {o.id.slice(0, 8)}
                    </p>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[o.status] ?? 'bg-border text-text-muted'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[o.status] ?? 'bg-text-subtle'}`} />
                      {o.status}
                    </span>
                  </div>

                  {o.items.length > 0 && (
                    <p className="text-xs font-medium text-text mt-1.5 truncate">
                      {o.items.length === 1
                        ? (o.items[0].listing?.title ?? '—')
                        : `${o.items.length} items`}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-sm font-bold text-text">{formatNaira(o.total_price)}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${o.delivery_type === 'delivery' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-700'}`}>
                      {o.delivery_type === 'delivery'
                        ? <><Truck size={9} strokeWidth={2} /> Delivery</>
                        : <><MapPin size={9} strokeWidth={2} /> Pickup</>
                      }
                    </span>
                  </div>

                  <p className="text-xs text-text-muted mt-1">
                    {o.buyer?.name ?? o.buyer?.email ?? '—'} · {formatDate(o.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border-t border-border">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </div>
      </div>

      <OrderDrawer
        order={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onCancel={cancelMutation.mutate}
        isCancelling={cancelMutation.isPending}
      />
    </div>
  )
}

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <AdminOrdersContent />
    </Suspense>
  )
}
