'use client'

import Link from 'next/link'
import { use, useState } from 'react'
import { motion } from 'framer-motion'
import { ListingImage } from '@/components/ui'
import {
  Package, Truck, MapPin, ArrowLeft, Mail, KeyRound, Check,
  ShoppingBag, Clock, CircleAlert, Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import { useBuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'

// ─── Constants ────────────────────────────────────────────────────────────────

const DELIVERY_STEPS = ['paid', 'confirmed', 'shipped', 'delivered'] as const
const PICKUP_STEPS   = ['paid', 'confirmed', 'delivered']            as const

const STEP_LABEL: Record<string, string> = {
  paid:      'Order placed',
  confirmed: 'Confirmed',
  shipped:   'On the way',
  delivered: 'Delivered',
}

const STEP_ICON: Record<string, React.ElementType> = {
  paid:      ShoppingBag,
  confirmed: Clock,
  shipped:   Truck,
  delivered: Check,
}

const STATUS_ALIAS: Record<string, string> = { completed: 'delivered' }

const GRID_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M36 0H0V36' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1'/%3E%3C/svg%3E\")"

const CANCELLABLE = new Set(['paid', 'confirmed'])

// ─── OrderProgressHero ───────────────────────────────────────────────────────
// The banner IS the timeline. No redundant status label.

const STEP_TIMESTAMP: Record<string, keyof Pick<import('@/lib/hooks/useBuyerOrders').BuyerOrderDetail, 'created_at' | 'confirmed_at' | 'shipped_at' | 'delivered_at'>> = {
  paid:      'created_at',
  confirmed: 'confirmed_at',
  shipped:   'shipped_at',
  delivered: 'delivered_at',
}

function formatStepTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function OrderProgressHero({
  status, orderId, deliveryType, timestamps,
}: {
  status: string; orderId: string; deliveryType: string
  timestamps: Pick<import('@/lib/hooks/useBuyerOrders').BuyerOrderDetail, 'created_at' | 'confirmed_at' | 'shipped_at' | 'delivered_at'>
}) {
  const resolved    = STATUS_ALIAS[status] ?? status
  const isCancelled = resolved === 'cancelled'
  const isDelivered = resolved === 'delivered'

  const bg    = isCancelled ? '#dc2626' : isDelivered ? '#059669' : '#3730a3'
  const bgEnd = isCancelled ? '#ef4444' : isDelivered ? '#10b981' : '#4338ca'

  const steps        = deliveryType === 'delivery' ? DELIVERY_STEPS : PICKUP_STEPS
  const currentIndex = (steps as unknown as string[]).indexOf(resolved)
  const progressPct  = steps.length > 1 ? Math.max(0, (currentIndex / (steps.length - 1)) * 100) : 0

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${bg} 0%, ${bgEnd} 100%)`,
        boxShadow: `0 6px 24px ${bg}35`,
      }}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: GRID_SVG, backgroundSize: '36px 36px' }} />
      <div aria-hidden className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />

      <div className="relative z-10 px-6 pt-5 pb-7 sm:px-8 sm:pt-6 sm:pb-8">
        {/* Top row: order id + delivery type */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-white/55 text-xs font-medium tracking-widest uppercase">
            Order #{orderId.slice(0, 8).toUpperCase()}
          </p>
          {!isCancelled && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              {deliveryType === 'delivery'
                ? <><Truck size={10} strokeWidth={2} /> Delivery</>
                : <><MapPin size={10} strokeWidth={2} /> Pickup</>}
            </span>
          )}
          {isCancelled && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <CircleAlert size={10} strokeWidth={2} /> Cancelled
            </span>
          )}
        </div>

        {/* Timeline */}
        {!isCancelled ? (
          <div>
            {/* Row 1: step timestamps */}
            <div className="flex justify-between mb-2">
              {steps.map((step) => {
                const tsKey = STEP_TIMESTAMP[step]
                const time  = formatStepTime(timestamps[tsKey])
                return (
                  <div key={step} className="flex justify-center" style={{ width: 48 }}>
                    {time && (
                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-[9px] text-center leading-tight whitespace-nowrap"
                        style={{ color: 'rgba(255,255,255,0.65)' }}
                      >
                        {time}
                      </motion.span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Row 2: track + nodes */}
            {/* justify-between pins first node left and last node right, matching track edges */}
            <div className="relative flex justify-between items-center" style={{ height: 48 }}>
              {/* Base track — from center of first node to center of last node */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: 24, right: 24,
                  top: '50%', transform: 'translateY(-50%)',
                  height: 6,
                  background: 'rgba(255,255,255,0.18)',
                  zIndex: 0,
                }}
              />
              {/* Filled track */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: 24,
                  top: '50%', transform: 'translateY(-50%)',
                  height: 6,
                  background: 'rgba(255,255,255,0.92)',
                  boxShadow: '0 0 10px rgba(255,255,255,0.35)',
                  right: 'auto',
                  zIndex: 1,
                }}
                initial={{ width: 0 }}
                animate={{ width: progressPct > 0 ? `calc(${progressPct}% - 48px)` : 0 }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />

              {/* Nodes */}
              {steps.map((step, i) => {
                const done   = currentIndex >= i
                const active = currentIndex === i
                const Icon   = STEP_ICON[step] ?? Package

                return (
                  <motion.div
                    key={step}
                    className="relative flex items-center justify-center rounded-full shrink-0"
                    style={{
                      width: 48, height: 48,
                      zIndex: 2,
                      // Solid background always — done nodes are white, others use the banner color to mask the track
                      background: done ? 'rgba(255,255,255,0.97)' : bg,
                      border: active
                        ? '2.5px solid rgba(255,255,255,0.9)'
                        : done ? 'none'
                        : '2px solid rgba(255,255,255,0.35)',
                      boxShadow: done
                        ? '0 4px 16px rgba(0,0,0,0.2), 0 0 0 4px rgba(255,255,255,0.12)'
                        : active
                        ? '0 0 0 4px rgba(255,255,255,0.15)'
                        : undefined,
                    }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 300, damping: 22 }}
                  >
                    {done
                      ? <Icon size={18} strokeWidth={2.25} style={{ color: bg }} />
                      : <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>{i + 1}</span>
                    }
                    {active && (
                      <motion.span
                        className="absolute inset-0 rounded-full"
                        style={{ border: '2px solid rgba(255,255,255,0.5)' }}
                        animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                      />
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Row 3: labels — mirror justify-between so they align under nodes */}
            <div className="flex justify-between mt-3">
              {steps.map((step, i) => {
                const done   = currentIndex >= i
                const active = currentIndex === i
                return (
                  <div key={step} className="flex justify-center" style={{ width: 48 }}>
                    <span
                      className="text-[10px] text-center leading-tight"
                      style={{
                        fontWeight: active ? 700 : done ? 500 : 400,
                        color: active ? '#fff' : done ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
                        width: 64,
                      }}
                    >
                      {STEP_LABEL[step]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-white/70 text-sm">This order has been cancelled and refunded.</p>
        )}
      </div>
    </div>
  )
}

// ─── DeliveryCode ─────────────────────────────────────────────────────────────

function DeliveryCode({ code, deliveryType }: { code: string; deliveryType: string }) {
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="rounded-2xl bg-card border border-border overflow-hidden"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Indigo accent bar */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #3730a3, #6366f1)' }} />

      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={13} strokeWidth={2} style={{ color: '#3730a3' }} />
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#3730a3' }}>
            {deliveryType === 'delivery' ? 'Delivery code' : 'Pickup code'}
          </p>
        </div>

        {/* Code tiles */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {code.split('').map((char, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className="flex items-center justify-center rounded-xl font-mono font-bold"
              style={{
                width: 48, height: 56,
                fontSize: 26,
                background: 'rgba(55,48,163,0.06)',
                border: '1.5px solid rgba(55,48,163,0.15)',
                color: '#3730a3',
              }}
            >
              {char}
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-text-muted leading-relaxed flex-1 min-w-[140px]">
            {deliveryType === 'delivery'
              ? 'Share with the dispatcher on arrival.'
              : 'Show to the seller when collecting.'}
          </p>
          <motion.button
            onClick={copyCode}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all"
            style={{
              background: copied ? 'rgba(5,150,105,0.08)' : 'rgba(55,48,163,0.08)',
              border: `1px solid ${copied ? 'rgba(5,150,105,0.2)' : 'rgba(55,48,163,0.2)'}`,
              color: copied ? '#059669' : '#3730a3',
            }}
          >
            {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
            {copied ? 'Copied!' : 'Copy'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: order, isLoading, error, refetch } = useBuyerOrderDetail(id)
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    if (!window.confirm('Cancel this order? You will receive a full refund.')) return
    setCancelling(true)
    try {
      const res  = await fetch(`/api/orders/${id}/cancel`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error?.message ?? 'Could not cancel order'); return }
      await refetch()
      toast.success('Order cancelled. Your refund is on the way.')
    } finally { setCancelling(false) }
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        {[96, 160, 120].map((h, i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl"
            style={{ height: h, background: 'var(--color-surface)' }}>
            <div className="skeleton-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
          </div>
        ))}
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="w-full text-center py-16">
        <p className="text-sm text-text-muted mb-4">Order not found.</p>
        <Link href="/dashboard/orders?tab=purchases" className="text-sm text-primary underline">
          Back to purchases
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Link
        href="/dashboard/orders?tab=purchases"
        className="inline-flex items-center gap-1.5 text-sm mb-5 text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        All purchases
      </Link>

      <motion.div
        className="space-y-4"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
      >
        {/* Progress hero */}
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

        {/* Two-column body: left = content, right = sticky seller */}
        <motion.div
          className="grid lg:grid-cols-[1fr_260px] gap-4 items-start"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          {/* ── Left ── */}
          <div className="space-y-4">

            {/* Delivery code */}
            {order.delivery_code && (
              <DeliveryCode code={order.delivery_code} deliveryType={order.delivery_type} />
            )}

            {/* Items + payment breakdown */}
            <div
              className="rounded-2xl border border-border bg-card overflow-hidden"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              {(order.order_items ?? []).map((item, i) => (
                <div key={item.id} className="flex gap-4 p-5"
                  style={i > 0 ? { borderTop: '1px solid var(--color-border)' } : undefined}>
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface border border-border">
                    {item.listing.images?.[0]
                      ? <ListingImage src={item.listing.images[0]} fill sizes="80px" className="object-cover" alt={item.listing.title} />
                      : <div className="w-full h-full flex items-center justify-center"><Package size={22} strokeWidth={1.5} className="text-text-subtle" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-text leading-snug">{item.listing.title}</p>
                    <p className="text-sm font-bold text-primary shrink-0">₦{item.item_price.toLocaleString()}</p>
                  </div>
                </div>
              ))}

              {/* Price breakdown */}
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
            </div>

            {/* Cancel */}
            {CANCELLABLE.has(order.status) && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full rounded-2xl border border-red-200 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 hover:border-red-300 disabled:opacity-50 active:scale-[0.98]"
              >
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </button>
            )}
          </div>

          {/* ── Right: sticky seller card ── */}
          {order.seller && (
            <div className="lg:sticky lg:top-6">
              <div
                className="rounded-2xl border border-border bg-card p-5"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-3">
                  Seller
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #3730a3, #6366f1)' }}
                  >
                    {(order.seller.name ?? 'S')[0].toUpperCase()}
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
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
