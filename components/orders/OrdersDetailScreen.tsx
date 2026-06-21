'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Mail } from 'lucide-react'
import { CldImage } from 'next-cloudinary'
import { toast } from 'sonner'
import { ListingImage } from '@/components/ui'
import { useBuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'
import { useOrdersModal } from '@/lib/context/orders-modal-context'
import { OrderProgressHero } from '@/components/orders/OrderProgressHero'
import { DeliveryCode } from '@/components/orders/DeliveryCode'
import { ReviewForm, ReviewThankYou } from '@/components/orders/ReviewForm'

const CANCELLABLE = new Set(['paid', 'confirmed'])

export function OrdersDetailScreen() {
  const { activeOrderId, referenceOrders } = useOrdersModal()
  const [cancelling, setCancelling] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  const referenceOrder = referenceOrders?.find(o => o.id === activeOrderId) ?? null

  // Pass empty string when using reference data so the query is disabled (enabled: !!id)
  const { data: fetchedOrder, isLoading, error, refetch } = useBuyerOrderDetail(
    referenceOrder ? '' : (activeOrderId ?? '')
  )

  const order = referenceOrder ?? fetchedOrder

  async function handleCancel() {
    if (!window.confirm('Cancel this order? You will receive a full refund.')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${activeOrderId}/cancel`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error?.message ?? 'Could not cancel order'); return }
      await refetch()
      toast.success('Order cancelled. Your refund is on the way.')
    } finally {
      setCancelling(false)
    }
  }

  if (!referenceOrder && isLoading) {
    return (
      <div className="space-y-4">
        {[96, 160, 120].map((h, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl"
            style={{ height: h, background: 'var(--color-surface)' }}
          >
            <div className="skeleton-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
          </div>
        ))}
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-muted">Order not found.</p>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
    >
      <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
        <OrderProgressHero
          status={order.status}
          orderId={order.id}
          deliveryType={order.delivery_type}
          timestamps={{
            created_at:   order.created_at,
            confirmed_at: order.confirmed_at,
            shipped_at:   order.shipped_at,
            delivered_at: order.delivered_at,
          }}
        />
      </motion.div>

      {order.delivery_code && (
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
          <DeliveryCode code={order.delivery_code} deliveryType={order.delivery_type} />
        </motion.div>
      )}

      {reviewSubmitted && (
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
          <ReviewThankYou />
        </motion.div>
      )}
      {!reviewSubmitted && ['delivered', 'completed'].includes(order.status) && !order.has_review && (
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
          <ReviewForm
            orderId={order.id}
            sellerName={order.seller?.name ?? null}
            onReviewed={() => setReviewSubmitted(true)}
          />
        </motion.div>
      )}

      {/* Items + pricing */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        {(order.order_items ?? []).map((item, i) => (
          <div
            key={item.id}
            className="flex gap-4 p-5"
            style={i > 0 ? { borderTop: '1px solid var(--color-border)' } : undefined}
          >
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface border border-border">
              {item.listing.images?.[0]
                ? <ListingImage src={item.listing.images[0]} fill sizes="48px" className="object-cover" alt={item.listing.title} />
                : <div className="w-full h-full flex items-center justify-center"><Package size={22} strokeWidth={1.5} className="text-text-subtle" /></div>
              }
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-text leading-snug">{item.listing.title}</p>
              <p className="text-sm font-bold text-primary shrink-0">₦{item.item_price.toLocaleString()}</p>
            </div>
          </div>
        ))}
        <div className="px-5 pb-5 pt-1 border-t border-border">
          <div className="space-y-2 pt-4">
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Delivery fee</span>
                <span className="font-medium text-text">₦{order.delivery_fee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm font-semibold text-text">Total paid</span>
              <span className="text-lg font-bold" style={{ color: '#3730a3' }}>
                ₦{order.total_price.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Cancel — only available for logged-in users (reference orders have no auth) */}
      {!referenceOrder && CANCELLABLE.has(order.status) && (
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full rounded-2xl border border-red-200 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 hover:border-red-300 disabled:opacity-50 active:scale-[0.98]"
          >
            {cancelling ? 'Cancelling…' : 'Cancel order'}
          </button>
        </motion.div>
      )}

      {/* Seller card */}
      {order.seller && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-3">Seller</p>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{
                background: order.seller.avatar_url ? '#ffffff' : 'linear-gradient(135deg, #3730a3, #6366f1)',
                border: order.seller.avatar_url ? '2px solid #e5e7eb' : 'none',
              }}
            >
              {order.seller.avatar_url ? (
                <CldImage
                  src={order.seller.avatar_url}
                  width={40}
                  height={40}
                  alt={order.seller.name ?? 'Seller'}
                  className="w-full h-full object-cover"
                />
              ) : (
                (order.seller.name ?? 'S')[0].toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">{order.seller.name ?? 'Declutter seller'}</p>
              <p className="text-xs text-text-muted truncate">{order.seller.email}</p>
            </div>
          </div>
          <a
            href={`mailto:${order.seller.email}?subject=${encodeURIComponent(`My order — ${order.id.slice(0, 8)}`)}`}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-border text-sm text-text-muted font-medium hover:bg-surface hover:text-text transition-colors"
          >
            <Mail size={13} strokeWidth={2} />
            Contact seller
          </a>
        </motion.div>
      )}
    </motion.div>
  )
}
