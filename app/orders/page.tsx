// app/orders/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import { Package, Truck, MapPin, ChevronRight } from 'lucide-react'
import { useBuyerOrders, type BuyerOrder } from '@/lib/hooks/useBuyerOrders'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  paid: 'Confirmed',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_STYLE: Record<string, { background: string; color: string }> = {
  pending:   { background: 'rgba(251,191,36,0.12)',  color: '#d97706' },
  paid:      { background: 'rgba(79,70,229,0.08)',   color: '#4f46e5' },
  confirmed: { background: 'rgba(79,70,229,0.08)',   color: '#4f46e5' },
  shipped:   { background: 'rgba(16,185,129,0.08)',  color: '#10b981' },
  delivered: { background: 'rgba(16,185,129,0.08)',  color: '#10b981' },
  completed: { background: 'rgba(16,185,129,0.08)',  color: '#10b981' },
  cancelled: { background: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
}

function OrderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border p-4 flex gap-4" style={{ borderColor: '#e8e4dc' }}>
      <div className="w-16 h-16 rounded-xl shrink-0" style={{ background: '#f0ece5' }} />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3 w-2/3 rounded" style={{ background: '#f0ece5' }} />
        <div className="h-3 w-1/3 rounded" style={{ background: '#f0ece5' }} />
      </div>
    </div>
  )
}

function OrderRow({ order }: { order: BuyerOrder }) {
  const statusStyle = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={`/orders/${order.id}`}
        className="flex items-center gap-4 rounded-2xl border p-4 transition-colors hover:bg-[#faf9f7]"
        style={{ borderColor: '#e8e4dc' }}
      >
        <div
          className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: '#f0ece5' }}
        >
          {order.listing.images?.[0] ? (
            <CldImage
              src={order.listing.images[0]}
              fill
              sizes="64px"
              className="object-cover"
              alt={order.listing.title}
            />
          ) : (
            <Package size={18} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>
            {order.listing.title}
          </p>
          <p className="text-xs mt-0.5 font-medium" style={{ color: '#4f46e5' }}>
            ₦{order.total_price.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={statusStyle}
            >
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: '#a8a09a' }}>
              {order.delivery_type === 'delivery' ? (
                <><Truck size={9} strokeWidth={2} /> Delivery</>
              ) : (
                <><MapPin size={9} strokeWidth={2} /> Pickup</>
              )}
            </span>
          </div>
        </div>

        <ChevronRight size={16} strokeWidth={1.5} style={{ color: '#c8c2bb' }} />
      </Link>
    </motion.div>
  )
}

export default function BuyerOrdersPage() {
  const { data: orders, isLoading } = useBuyerOrders()

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold" style={{ color: '#16130f' }}>Your orders</h1>
          <p className="text-sm mt-1" style={{ color: '#78726c' }}>
            Track everything you&apos;ve bought on Declutter.
          </p>
        </motion.div>

        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && (!orders || orders.length === 0) && (
          <div className="flex flex-col items-center py-24 text-center">
            <div
              className="h-20 w-20 rounded-3xl flex items-center justify-center mb-6"
              style={{
                background: 'linear-gradient(135deg, #f5f1eb 0%, #ede8e0 100%)',
                boxShadow: '0 2px 12px rgba(22,19,15,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
            >
              <span className="text-3xl">🛍️</span>
            </div>
            <p className="text-base font-semibold mb-2" style={{ color: '#16130f' }}>
              No orders yet
            </p>
            <p className="text-sm max-w-xs leading-relaxed mb-6" style={{ color: '#a8a09a' }}>
              When you buy something on Declutter, your orders will appear here.
            </p>
            <Link
              href="/listings"
              className="rounded-xl border px-5 py-2 text-sm font-medium transition-colors hover:bg-card"
              style={{ borderColor: '#e8e4dc', color: '#78726c' }}
            >
              Browse listings
            </Link>
          </div>
        )}

        {!isLoading && orders && orders.length > 0 && (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
