// app/orders/[id]/page.tsx
'use client'

import Link from 'next/link'
import { use } from 'react'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import { Package, Truck, MapPin, ArrowLeft, Mail } from 'lucide-react'
import { useBuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'

const STATUS_STEPS = ['paid', 'confirmed', 'delivered'] as const
const STATUS_LABEL: Record<string, string> = {
  paid: 'Order placed',
  confirmed: 'Seller confirmed',
  delivered: 'Delivered',
}

// Map statuses not in STATUS_STEPS to their nearest equivalent for timeline rendering
const STATUS_STEP_ALIAS: Record<string, typeof STATUS_STEPS[number]> = {
  shipped: 'confirmed',
  completed: 'delivered',
}

function StatusTimeline({ status }: { status: string }) {
  const resolvedStatus = STATUS_STEP_ALIAS[status] ?? status
  const currentIndex = STATUS_STEPS.indexOf(resolvedStatus as typeof STATUS_STEPS[number])
  return (
    <div className="flex items-start gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done = currentIndex >= i
        const isLast = i === STATUS_STEPS.length - 1
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{
                  background: done ? '#4f46e5' : '#e8e4dc',
                  color: done ? 'white' : '#a8a09a',
                }}
              >
                {i + 1}
              </div>
              <p className="text-[10px] mt-1 text-center leading-tight" style={{ color: done ? '#4f46e5' : '#a8a09a' }}>
                {STATUS_LABEL[step]}
              </p>
            </div>
            {!isLast && (
              <div
                className="h-0.5 flex-1 -mt-4 mx-1"
                style={{ background: currentIndex > i ? '#4f46e5' : '#e8e4dc' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function BuyerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: order, isLoading, error } = useBuyerOrderDetail(id)

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-24 rounded" style={{ background: '#f0ece5' }} />
            <div className="h-40 rounded-2xl" style={{ background: '#f0ece5' }} />
          </div>
        </div>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-surface">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-sm" style={{ color: '#78726c' }}>Order not found.</p>
          <Link href="/orders" className="text-sm underline mt-4 inline-block" style={{ color: '#4f46e5' }}>
            Back to orders
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: '#78726c' }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          All orders
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* Item card */}
          <div
            className="rounded-2xl border p-5 flex gap-4 bg-card"
            style={{ borderColor: '#e8e4dc' }}
          >
            <div
              className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
              style={{ background: '#f0ece5' }}
            >
              {order.listing.images?.[0] ? (
                <CldImage
                  src={order.listing.images[0]}
                  fill
                  sizes="80px"
                  className="object-cover"
                  alt={order.listing.title}
                />
              ) : (
                <Package size={22} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold" style={{ color: '#16130f' }}>
                {order.listing.title}
              </h1>
              <p className="text-base font-medium mt-0.5" style={{ color: '#4f46e5' }}>
                ₦{order.total_price.toLocaleString()}
              </p>
              <span
                className="inline-flex items-center gap-1 mt-2 text-[10px] rounded-full px-2 py-0.5"
                style={
                  order.delivery_type === 'delivery'
                    ? { background: 'rgba(79,70,229,0.08)', color: '#4f46e5' }
                    : { background: 'rgba(16,185,129,0.08)', color: '#10b981' }
                }
              >
                {order.delivery_type === 'delivery'
                  ? <><Truck size={9} strokeWidth={2} /> Delivery</>
                  : <><MapPin size={9} strokeWidth={2} /> Pickup</>}
              </span>
            </div>
          </div>

          {/* Status timeline */}
          <div className="rounded-2xl border p-5 bg-card" style={{ borderColor: '#e8e4dc' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: '#a8a09a' }}>
              Order status
            </p>
            <StatusTimeline status={order.status} />
          </div>

          {/* Price breakdown */}
          <div className="rounded-2xl border p-5 bg-card" style={{ borderColor: '#e8e4dc' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#a8a09a' }}>
              Payment
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm" style={{ color: '#78726c' }}>
                <span>Item</span>
                <span>₦{order.item_price.toLocaleString()}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-sm" style={{ color: '#78726c' }}>
                  <span>Delivery</span>
                  <span>₦{order.delivery_fee.toLocaleString()}</span>
                </div>
              )}
              <div
                className="flex justify-between text-sm font-semibold pt-2 border-t"
                style={{ color: '#16130f', borderColor: '#e8e4dc' }}
              >
                <span>Total</span>
                <span>₦{order.total_price.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Seller contact */}
          {order.seller && (
            <div className="rounded-2xl border p-5 bg-card" style={{ borderColor: '#e8e4dc' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#a8a09a' }}>
                Seller
              </p>
              <p className="text-sm font-medium mb-2" style={{ color: '#16130f' }}>
                {order.seller.name ?? 'Declutter seller'}
              </p>
              <a
                href={`mailto:${order.seller.email}?subject=${encodeURIComponent(`My order — ${order.listing.title}`)}`}
                className="inline-flex items-center gap-1.5 text-xs rounded-xl border px-3 py-2 transition-colors hover:bg-[#f5f1eb]"
                style={{ borderColor: '#e8e4dc', color: '#78726c' }}
              >
                <Mail size={12} strokeWidth={2} />
                Contact seller
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  )
}
