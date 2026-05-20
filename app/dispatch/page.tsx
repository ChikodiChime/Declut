'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import { Package, MapPin, KeyRound } from 'lucide-react'
import {
  useAvailableOrders,
  useMyDeliveries,
  useClaimOrder,
  useVerifyDelivery,
  type DispatchOrder,
} from '@/lib/hooks/useDispatch'

function OrderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border p-4 flex gap-4" style={{ borderColor: '#e8e4dc' }}>
      <div className="w-16 h-16 rounded-xl shrink-0" style={{ background: '#f0ece5' }} />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3 w-2/3 rounded" style={{ background: '#f0ece5' }} />
        <div className="h-3 w-1/2 rounded" style={{ background: '#f0ece5' }} />
      </div>
    </div>
  )
}

function AvailableOrderCard({ order }: { order: DispatchOrder }) {
  const { mutate: claim, isPending } = useClaimOrder()
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border bg-card p-4 flex gap-4"
      style={{ borderColor: '#e8e4dc' }}
    >
      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: '#f0ece5' }}>
        {order.listing.images?.[0] ? (
          <CldImage src={order.listing.images[0]} fill sizes="64px" className="object-cover" alt={order.listing.title} />
        ) : (
          <Package size={18} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>{order.listing.title}</p>
        <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#78726c' }}>
          <MapPin size={10} strokeWidth={2} />
          <span className="truncate">{order.listing.area ?? 'Lagos'}</span>
        </div>
        <p className="text-xs mt-1 font-medium" style={{ color: '#4f46e5' }}>Delivery fee: ₦{order.delivery_fee.toLocaleString()}</p>
      </div>
      <button
        onClick={() => claim(order.id)}
        disabled={isPending}
        className="self-center shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: '#4f46e5' }}
      >
        {isPending ? '…' : 'Claim'}
      </button>
    </motion.div>
  )
}

function DeliveryCard({ order }: { order: DispatchOrder }) {
  const [code, setCode] = useState('')
  const { mutate: verify, isPending } = useVerifyDelivery()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border bg-card p-4"
      style={{ borderColor: '#e8e4dc' }}
    >
      <div className="flex gap-4 mb-4">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: '#f0ece5' }}>
          {order.listing.images?.[0] ? (
            <CldImage src={order.listing.images[0]} fill sizes="64px" className="object-cover" alt={order.listing.title} />
          ) : (
            <Package size={18} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>{order.listing.title}</p>
          {order.buyer_name && <p className="text-xs mt-0.5" style={{ color: '#78726c' }}>{order.buyer_name}</p>}
          <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#78726c' }}>
            <MapPin size={10} strokeWidth={2} />
            <span className="truncate">{order.buyer_address}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#f5f1eb' }}>
        <p className="text-xs flex-1" style={{ color: '#78726c' }}>Ask the buyer for their 4-digit code and enter it below to confirm delivery.</p>
      </div>

      <div className="flex gap-2 mt-3">
        <div className="relative flex-1">
          <KeyRound size={12} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#a8a09a' }} />
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="0000"
            className="w-full rounded-xl border pl-7 pr-3 py-2.5 text-sm font-mono tracking-widest outline-none focus:ring-2"
            style={{ borderColor: '#e8e4dc', background: 'white', color: '#16130f' }}
          />
        </div>
        <button
          onClick={() => verify({ id: order.id, code })}
          disabled={isPending || code.length !== 4}
          className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#10b981' }}
        >
          {isPending ? '…' : 'Confirm'}
        </button>
      </div>
    </motion.div>
  )
}

export default function DispatchPortalPage() {
  const [tab, setTab] = useState<'available' | 'mine'>('available')
  const { data: available, isLoading: loadingAvailable } = useAvailableOrders()
  const { data: mine, isLoading: loadingMine } = useMyDeliveries()

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#16130f' }}>Dispatch portal</h1>
          <p className="text-sm mt-1" style={{ color: '#78726c' }}>Claim deliveries and confirm handoffs.</p>
        </motion.div>

        <div className="inline-flex gap-0.5 rounded-full p-0.5 mb-6" style={{ background: '#f0ece5' }}>
          {(['available', 'mine'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200"
              style={{
                background: tab === t ? '#4f46e5' : 'transparent',
                color: tab === t ? 'white' : '#78726c',
                boxShadow: tab === t ? '0 1px 4px rgba(79,70,229,0.35)' : 'none',
              }}
            >
              {t === 'available' ? 'Available' : 'My deliveries'}
            </button>
          ))}
        </div>

        {tab === 'available' && (
          <div className="flex flex-col gap-3">
            {loadingAvailable && [1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
            {!loadingAvailable && (!available || available.length === 0) && (
              <div className="py-20 text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: '#16130f' }}>No deliveries available</p>
                <p className="text-xs" style={{ color: '#a8a09a' }}>Check back soon — new orders appear when sellers confirm them.</p>
              </div>
            )}
            {available?.map((order) => <AvailableOrderCard key={order.id} order={order} />)}
          </div>
        )}

        {tab === 'mine' && (
          <div className="flex flex-col gap-3">
            {loadingMine && [1, 2].map((i) => <OrderSkeleton key={i} />)}
            {!loadingMine && (!mine || mine.length === 0) && (
              <div className="py-20 text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: '#16130f' }}>No active deliveries</p>
                <p className="text-xs" style={{ color: '#a8a09a' }}>Orders you claim will appear here.</p>
              </div>
            )}
            {mine?.map((order) => <DeliveryCard key={order.id} order={order} />)}
          </div>
        )}
      </div>
    </main>
  )
}
