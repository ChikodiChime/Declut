'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Package, Truck, MapPin, Star, ChevronRight } from 'lucide-react'
import { ListingImage } from '@/components/ui'
import { useBuyerOrders, type BuyerOrder, type BuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'
import { useOrdersModal } from '@/lib/context/orders-modal-context'
import { groupByCheckout } from '@/lib/utils/orders'
import { PURCHASE_STATUS_STYLE, PURCHASE_STATUS_LABEL } from '@/lib/constants/orderStatus'

function OrderSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 flex gap-3">
      <div className="skeleton-shimmer" />
      <div className="w-12 h-12 rounded-lg shrink-0" style={{ background: '#ede9e3' }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3 w-2/3 rounded" style={{ background: '#ede9e3' }} />
        <div className="h-3 w-1/3 rounded" style={{ background: '#e8e4dc' }} />
      </div>
    </div>
  )
}

function OrderRow({ order }: { order: BuyerOrder | BuyerOrderDetail }) {
  const { openDetail } = useOrdersModal()
  const statusStyle = PURCHASE_STATUS_STYLE[order.status] ?? PURCHASE_STATUS_STYLE.pending
  const firstItem = order.order_items?.[0]
  const extraCount = (order.order_items?.length ?? 1) - 1

  return (
    <button
      onClick={() => openDetail(order.id)}
      className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-surface text-left"
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-surface border border-border">
        {firstItem?.listing?.images?.[0] ? (
          <ListingImage src={firstItem.listing.images[0]} fill sizes="48px" className="object-cover" alt={firstItem.listing.title} />
        ) : (
          <Package size={16} strokeWidth={1.5} className="text-text-subtle" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">
          {firstItem?.listing?.title ?? 'Order'}
          {extraCount > 0 && <span className="text-text-subtle"> +{extraCount} more</span>}
        </p>
        <p className="text-xs text-primary mt-0.5 font-semibold">₦{order.total_price.toLocaleString()}</p>
        {order.seller?.name && (
          <p className="text-[10px] text-text-subtle mt-0.5">from {order.seller.name}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={statusStyle}>
          {PURCHASE_STATUS_LABEL[order.status] ?? order.status}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-text-subtle">
          {order.delivery_type === 'delivery'
            ? <><Truck size={9} strokeWidth={2} /> Delivery</>
            : <><MapPin size={9} strokeWidth={2} /> Pickup</>}
        </span>
        {['delivered', 'completed'].includes(order.status) && !('has_review' in order && order.has_review) && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: '#f59e0b' }}>
            <Star size={9} strokeWidth={0} fill="#f59e0b" /> Rate seller
          </span>
        )}
      </div>
      <ChevronRight size={14} strokeWidth={1.5} className="text-border-strong" />
    </button>
  )
}

function ReferenceOrdersList({ orders }: { orders: BuyerOrderDetail[] }) {
  const date = new Date(orders[0].created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  const multiVendor = orders.length > 1

  return (
    <div className="flex flex-col gap-3">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        {multiVendor && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle">
              {orders.length} vendors · {date}
            </span>
            <span className="text-xs font-semibold text-text">
              ₦{orders.reduce((s, o) => s + o.total_price, 0).toLocaleString()}
            </span>
          </div>
        )}
        <div className={multiVendor ? 'divide-y divide-border' : ''}>
          {orders.map(order => <OrderRow key={order.id} order={order} />)}
        </div>
      </motion.div>
    </div>
  )
}

function LoggedInOrdersList() {
  const { data: orders, isLoading } = useBuyerOrders()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map(i => <OrderSkeleton key={i} />)}
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <p className="text-sm font-semibold text-text mb-2">No purchases yet</p>
        <p className="text-sm text-text-muted max-w-xs mb-6">
          When you buy something on Declutter, your orders will appear here.
        </p>
        <Link
          href="/"
          className="rounded-xl border border-border px-5 py-2 text-sm font-medium text-text-muted hover:bg-surface transition-colors"
        >
          Browse listings
        </Link>
      </div>
    )
  }

  const groups = groupByCheckout(orders)
  return (
    <div className="flex flex-col gap-3">
      {groups.map(group => (
        <motion.div
          key={group.paystackReference ?? group.orders[0].id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          {group.orders.length > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle">
                {group.orders.length} vendors · {new Date(group.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="text-xs font-semibold text-text">
                ₦{group.orders.reduce((s, o) => s + o.total_price, 0).toLocaleString()}
              </span>
            </div>
          )}
          <div className={group.orders.length > 1 ? 'divide-y divide-border' : ''}>
            {group.orders.map(order => <OrderRow key={order.id} order={order} />)}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function OrdersListScreen() {
  const { referenceOrders } = useOrdersModal()

  if (referenceOrders) {
    return <ReferenceOrdersList orders={referenceOrders} />
  }

  return <LoggedInOrdersList />
}
