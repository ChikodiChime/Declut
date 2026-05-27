'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ListingImage } from '@/components/ui'
import { Package, MapPin, KeyRound, ArrowRight, LogOut } from 'lucide-react'
import {
  useAvailableOrders,
  useMyDeliveries,
  useCompletedDeliveries,
  useClaimOrder,
  useVerifyDelivery,
  type DispatchOrder,
  type CompletedDelivery,
} from '@/lib/hooks/useDispatch'
import { useSignOut, useMe } from '@/lib/hooks/useAuth'

// ─── Header ──────────────────────────────────────────────────────────────────

function DispatchHeader() {
  const { mutate: signOut } = useSignOut()
  const { data: user } = useMe()
  const firstName = user?.name?.split(' ')[0] ?? 'Hi'

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ background: 'rgba(250,250,248,0.93)', backdropFilter: 'blur(14px)', borderColor: '#e8e4dc' }}
    >
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="declut" className="h-7" />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: '#16130f' }}>{firstName}</span>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors hover:bg-card"
            style={{ color: '#a8a09a' }}
          >
            <LogOut size={13} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Earnings hero ────────────────────────────────────────────────────────────

function EarningsHero() {
  const { data: completed } = useCompletedDeliveries()

  const now = new Date()
  const thisMonth = (completed ?? []).filter((d) => {
    const date = new Date(d.created_at)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })

  const earnings = thisMonth.reduce((sum, d) => sum + d.delivery_fee, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl p-4 mb-6 flex gap-6"
      style={{ background: '#f5f1eb' }}
    >
      <div className="flex-1">
        <p className="text-xs font-medium mb-0.5" style={{ color: '#78726c' }}>This month</p>
        <p className="text-xl font-bold" style={{ color: '#16130f' }}>₦{earnings.toLocaleString()}</p>
      </div>
      <div className="w-px self-stretch" style={{ background: '#e8e4dc' }} />
      <div className="flex-1">
        <p className="text-xs font-medium mb-0.5" style={{ color: '#78726c' }}>Deliveries</p>
        <p className="text-xl font-bold" style={{ color: '#16130f' }}>{thisMonth.length}</p>
      </div>
    </motion.div>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border p-4" style={{ borderColor: '#e8e4dc' }}>
      <div className="flex gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl shrink-0" style={{ background: '#f0ece5' }} />
        <div className="flex-1 flex flex-col gap-2 justify-center">
          <div className="h-3 w-2/3 rounded" style={{ background: '#f0ece5' }} />
          <div className="h-3 w-1/2 rounded" style={{ background: '#f0ece5' }} />
        </div>
      </div>
      <div className="h-8 rounded-xl" style={{ background: '#f0ece5' }} />
    </div>
  )
}

// ─── Available order card ─────────────────────────────────────────────────────

function AvailableOrderCard({ order }: { order: DispatchOrder }) {
  const { mutate: claim, isPending } = useClaimOrder()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border bg-card p-4"
      style={{ borderColor: '#e8e4dc' }}
    >
      <div className="flex gap-3 mb-3">
        <div
          className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: '#f0ece5' }}
        >
          {order.listing.images?.[0] ? (
            <ListingImage
              src={order.listing.images[0]}
              fill
              sizes="56px"
              className="object-cover"
              alt={order.listing.title}
            />
          ) : (
            <Package size={16} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>
            {order.listing.title}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#78726c' }}>
            <span className="truncate max-w-[80px]">{order.listing.area ?? 'Lagos'}</span>
            <ArrowRight size={10} strokeWidth={2} className="shrink-0" />
            <span className="truncate max-w-[80px]">{order.buyer_area ?? 'Lagos'}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-bold leading-tight" style={{ color: '#4f46e5' }}>
            ₦{order.delivery_fee.toLocaleString()}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: '#a8a09a' }}>delivery fee</p>
        </div>
      </div>

      <button
        onClick={() => claim(order.id)}
        disabled={isPending}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: '#4f46e5' }}
      >
        {isPending ? 'Claiming…' : 'Claim this delivery'}
      </button>
    </motion.div>
  )
}

// ─── Active delivery card ─────────────────────────────────────────────────────

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
      <div className="flex gap-3 mb-4">
        <div
          className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: '#f0ece5' }}
        >
          {order.listing.images?.[0] ? (
            <ListingImage
              src={order.listing.images[0]}
              fill
              sizes="56px"
              className="object-cover"
              alt={order.listing.title}
            />
          ) : (
            <Package size={16} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>
            {order.listing.title}
          </p>
          {order.buyer_name && (
            <p className="text-xs mt-0.5" style={{ color: '#78726c' }}>{order.buyer_name}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl p-3 flex flex-col gap-2.5 mb-3" style={{ background: '#f5f1eb' }}>
        <div className="flex items-start gap-2 text-xs">
          <Package size={12} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: '#a8a09a' }} />
          <div>
            <p className="font-semibold mb-0.5" style={{ color: '#16130f' }}>Collect from</p>
            <p style={{ color: '#78726c' }}>{order.listing.area ?? 'Lagos'}</p>
          </div>
        </div>
        <div className="h-px" style={{ background: '#e8e4dc' }} />
        <div className="flex items-start gap-2 text-xs">
          <MapPin size={12} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: '#a8a09a' }} />
          <div>
            <p className="font-semibold mb-0.5" style={{ color: '#16130f' }}>Deliver to</p>
            <p style={{ color: '#78726c' }}>{order.buyer_address}</p>
          </div>
        </div>
      </div>

      <p className="text-xs mb-3" style={{ color: '#a8a09a' }}>
        Ask the buyer for their 4-digit code when you arrive.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <KeyRound
            size={12}
            strokeWidth={2}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: '#a8a09a' }}
          />
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

// ─── Completed delivery card ──────────────────────────────────────────────────

function CompletedCard({ order }: { order: CompletedDelivery }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border bg-card p-4 flex gap-3"
      style={{ borderColor: '#e8e4dc' }}
    >
      <div
        className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: '#f0ece5' }}
      >
        {order.listing.images?.[0] ? (
          <ListingImage
            src={order.listing.images[0]}
            fill
            sizes="56px"
            className="object-cover"
            alt={order.listing.title}
          />
        ) : (
          <Package size={16} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>
          {order.listing.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#78726c' }}>
          <span className="truncate max-w-[70px]">{order.listing.area ?? 'Lagos'}</span>
          <ArrowRight size={10} strokeWidth={2} className="shrink-0" />
          <span className="truncate max-w-[70px]">{order.buyer_area}</span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#a8a09a' }}>
          {new Date(order.created_at).toLocaleDateString('en-NG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-bold" style={{ color: '#10b981' }}>
          +₦{order.delivery_fee.toLocaleString()}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: '#a8a09a' }}>earned</p>
      </div>
    </motion.div>
  )
}

// ─── Monthly summary row ──────────────────────────────────────────────────────

function MonthSummaryRow({ orders }: { orders: CompletedDelivery[] }) {
  const now = new Date()
  const thisMonth = orders.filter((d) => {
    const date = new Date(d.created_at)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })

  if (thisMonth.length === 0) return null

  const earnings = thisMonth.reduce((sum, d) => sum + d.delivery_fee, 0)
  const monthName = now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })

  return (
    <div
      className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
      style={{ background: '#f5f1eb' }}
    >
      <p className="text-xs font-medium" style={{ color: '#78726c' }}>{monthName}</p>
      <p className="text-sm font-bold" style={{ color: '#10b981' }}>
        ₦{earnings.toLocaleString()} · {thisMonth.length} {thisMonth.length === 1 ? 'delivery' : 'deliveries'}
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'available' | 'mine' | 'completed'

const TABS: { id: Tab; label: string }[] = [
  { id: 'available', label: 'Available' },
  { id: 'mine', label: 'My deliveries' },
  { id: 'completed', label: 'Completed' },
]

export default function DispatchPortalPage() {
  const [tab, setTab] = useState<Tab>('available')
  const { data: available, isLoading: loadingAvailable } = useAvailableOrders()
  const { data: mine, isLoading: loadingMine } = useMyDeliveries()
  const { data: completed, isLoading: loadingCompleted } = useCompletedDeliveries()

  return (
    <main className="min-h-screen bg-surface">
      <DispatchHeader />

      <div className="max-w-xl mx-auto px-4 py-6">
        <EarningsHero />

        <div className="inline-flex gap-0.5 rounded-full p-0.5 mb-6" style={{ background: '#f0ece5' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200"
              style={{
                background: tab === t.id ? '#4f46e5' : 'transparent',
                color: tab === t.id ? 'white' : '#78726c',
                boxShadow: tab === t.id ? '0 1px 4px rgba(79,70,229,0.35)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'available' && (
          <div className="flex flex-col gap-3">
            {loadingAvailable && [1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
            {!loadingAvailable && (!available || available.length === 0) && (
              <div className="py-20 text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: '#16130f' }}>No deliveries available</p>
                <p className="text-xs" style={{ color: '#a8a09a' }}>
                  Check back soon — new orders appear when sellers confirm them.
                </p>
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

        {tab === 'completed' && (
          <div className="flex flex-col gap-3">
            {loadingCompleted && [1, 2].map((i) => <OrderSkeleton key={i} />)}
            {!loadingCompleted && (!completed || completed.length === 0) && (
              <div className="py-20 text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: '#16130f' }}>No completed deliveries yet</p>
                <p className="text-xs" style={{ color: '#a8a09a' }}>
                  Claim a job from Available to get started.
                </p>
              </div>
            )}
            {completed && completed.length > 0 && (
              <>
                <MonthSummaryRow orders={completed} />
                {completed.map((order) => <CompletedCard key={order.id} order={order} />)}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
