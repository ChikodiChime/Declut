// app/dispatch/(portal)/page.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ListingImage } from '@/components/ui'
import {
  Package, MapPin, KeyRound, ArrowRight,
  Truck, CheckCircle2, Clock, TrendingUp,
  Phone, Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useAvailableOrders,
  useMyDeliveries,
  useCompletedDeliveries,
  useClaimOrder,
  useVerifyDelivery,
  type DispatchOrder,
  type CompletedDelivery,
} from '@/lib/hooks/useDispatch'
import { useMe } from '@/lib/hooks/useAuth'
import { StatCard } from '@/components/dashboard/StatCard'
import { Button } from '@/components/ui'

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35 },
  }
}

// ─── Header ──────────────────────────────────────────────────────────────────

function DispatchHeader() {
  const { data: user } = useMe()
  const firstName = user?.name?.split(' ')[0] || 'Hi'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="declut" className="h-7" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">{greeting}, {firstName}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            <Truck size={10} strokeWidth={2.5} />
            Dispatcher
          </span>
        </div>
      </div>
    </header>
  )
}

// ─── Earnings hero ────────────────────────────────────────────────────────────

interface EarningsHeroProps {
  monthlyEarnings: number
  deliveryCount: number
  activeCount: number
  availableCount: number
}

function EarningsHero({ monthlyEarnings, deliveryCount, activeCount, availableCount }: EarningsHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-6 grid grid-cols-2 gap-6"
      style={{
        background: 'linear-gradient(135deg, #16130f 0%, #1e1a15 60%, #252019 100%)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.08), 0 20px 48px rgba(0,0,0,0.22)',
      }}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
          This month
        </p>
        <p className="text-3xl font-bold text-white">₦{monthlyEarnings.toLocaleString()}</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>delivery earnings</p>
      </div>
      <div className="pl-6" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Deliveries
        </p>
        <p className="text-3xl font-bold" style={{ color: '#a78bfa' }}>{deliveryCount}</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>completed this month</p>
      </div>

      {availableCount > 0 && (
        <div className="col-span-2 mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
          <p className="text-xs font-semibold" style={{ color: '#6ee7b7' }}>
            {availableCount} {availableCount === 1 ? 'order' : 'orders'} available for pickup
          </p>
        </div>
      )}

      {activeCount > 0 && availableCount === 0 && (
        <div className="col-span-2 mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Clock size={13} style={{ color: '#fcd34d' }} strokeWidth={2} />
          <p className="text-xs font-semibold" style={{ color: '#fcd34d' }}>
            {activeCount} active {activeCount === 1 ? 'delivery' : 'deliveries'} in progress
          </p>
        </div>
      )}
    </motion.div>
  )
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function StatsRow({ activeCount, deliveryCount, monthlyEarnings }: {
  activeCount: number
  deliveryCount: number
  monthlyEarnings: number
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <motion.div {...fadeUp(0.1)}>
        <StatCard
          label="Active"
          value={activeCount}
          icon={Truck}
          color="text-primary"
          bgColor="bg-primary/10"
          lineColor="bg-primary"
        />
      </motion.div>
      <motion.div {...fadeUp(0.17)}>
        <StatCard
          label="Completed"
          value={deliveryCount}
          icon={CheckCircle2}
          color="text-green-600"
          bgColor="bg-green-500/10"
          lineColor="bg-green-500"
        />
      </motion.div>
      <motion.div {...fadeUp(0.24)}>
        <StatCard
          label="Earned"
          value={`₦${monthlyEarnings >= 1000 ? `${(monthlyEarnings / 1000).toFixed(1)}k` : monthlyEarnings}`}
          icon={TrendingUp}
          color="text-violet-600"
          bgColor="bg-violet-500/10"
          lineColor="bg-violet-500"
        />
      </motion.div>
    </div>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-4">
      <div className="flex gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl shrink-0 bg-border" />
        <div className="flex-1 flex flex-col gap-2 justify-center">
          <div className="h-3 w-2/3 rounded bg-border" />
          <div className="h-3 w-1/2 rounded bg-border" />
        </div>
      </div>
      <div className="h-9 rounded-xl bg-border" />
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
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex gap-3 mb-3">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface">
          {order.listing.images?.[0] ? (
            <ListingImage
              src={order.listing.images[0]}
              fill
              sizes="56px"
              className="object-cover"
              alt={order.listing.title}
            />
          ) : (
            <Package size={16} strokeWidth={1.5} className="text-text-subtle" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">{order.listing.title}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-text-muted">
            <span className="truncate max-w-[80px]">{order.listing.area ?? 'Unknown area'}</span>
            <ArrowRight size={10} strokeWidth={2} className="shrink-0" />
            <span className="truncate max-w-[80px]">{order.buyer_area ?? 'Unknown area'}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-primary leading-tight">
            ₦{order.delivery_fee.toLocaleString()}
          </p>
          <p className="text-[10px] mt-0.5 text-text-subtle">delivery fee</p>
        </div>
      </div>

      <Button
        size="sm"
        loading={isPending}
        disabled={isPending}
        onClick={() => claim(order.id)}
        className="w-full"
      >
        Claim this delivery
      </Button>
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
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex gap-3 mb-4">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface">
          {order.listing.images?.[0] ? (
            <ListingImage
              src={order.listing.images[0]}
              fill
              sizes="56px"
              className="object-cover"
              alt={order.listing.title}
            />
          ) : (
            <Package size={16} strokeWidth={1.5} className="text-text-subtle" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">{order.listing.title}</p>
          {order.buyer_name && (
            <p className="text-xs mt-0.5 text-text-muted">{order.buyer_name}</p>
          )}
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
            <Clock size={9} strokeWidth={2.5} />
            In transit
          </span>
        </div>
      </div>

      <div className="rounded-xl bg-surface border border-border p-3 flex flex-col gap-2.5 mb-3">
        <div className="flex items-start gap-2 text-xs">
          <Package size={12} strokeWidth={2} className="shrink-0 mt-0.5 text-text-subtle" />
          <div>
            <p className="font-semibold text-text mb-0.5">Collect from</p>
            <p className="text-text-muted">{order.listing.area ?? 'Lagos'}</p>
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-start gap-2 text-xs">
          <MapPin size={12} strokeWidth={2} className="shrink-0 mt-0.5 text-text-subtle" />
          <div>
            <p className="font-semibold text-text mb-0.5">Deliver to</p>
            <p className="text-text-muted">{order.buyer_address ?? 'Address unavailable'}</p>
          </div>
        </div>
      </div>

      {order.buyer_phone && (
        <div className="flex items-center gap-2 mb-3">
          <a
            href={`tel:${order.buyer_phone}`}
            className="flex-1 flex items-center gap-2 rounded-xl bg-primary/8 px-3 py-2.5 hover:bg-primary/12 transition-colors"
          >
            <Phone size={14} strokeWidth={2} className="text-primary shrink-0" />
            <span className="text-sm font-medium text-primary">Call buyer</span>
            <span className="ml-auto text-xs font-mono text-text-muted">{order.buyer_phone}</span>
          </a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(order.buyer_phone!)
              toast.success('Phone number copied')
            }}
            className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center shrink-0 hover:bg-surface transition-colors"
          >
            <Copy size={14} strokeWidth={1.75} className="text-text-muted" />
          </button>
        </div>
      )}

      <p className="text-xs text-text-subtle mb-3">
        Ask the buyer for their 4-digit confirmation code when you arrive.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <KeyRound size={12} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-subtle" />
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="0000"
            className="w-full rounded-xl border border-border bg-card pl-7 pr-3 py-2.5 text-sm font-mono tracking-widest text-text outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>
        <button
          onClick={() => verify({ id: order.id, code })}
          disabled={isPending || code.length !== 4}
          className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-success hover:bg-success/90 transition-opacity disabled:opacity-50"
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
      className="rounded-2xl border border-border bg-card p-4 flex gap-3"
    >
      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface">
        {order.listing.images?.[0] ? (
          <ListingImage
            src={order.listing.images[0]}
            fill
            sizes="56px"
            className="object-cover"
            alt={order.listing.title}
          />
        ) : (
          <Package size={16} strokeWidth={1.5} className="text-text-subtle" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{order.listing.title}</p>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-text-muted">
          <span className="truncate max-w-[70px]">{order.listing.area ?? 'Unknown area'}</span>
          <ArrowRight size={10} strokeWidth={2} className="shrink-0" />
          <span className="truncate max-w-[70px]">{order.buyer_area}</span>
        </div>
        <p className="text-xs mt-1 text-text-subtle">
          {new Date(order.created_at).toLocaleDateString('en-NG', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-success">+₦{order.delivery_fee.toLocaleString()}</p>
        <p className="text-[10px] mt-0.5 text-text-subtle">earned</p>
      </div>
    </motion.div>
  )
}

// ─── Monthly summary row ──────────────────────────────────────────────────────

function MonthSummaryRow({ thisMonth }: { thisMonth: CompletedDelivery[] }) {
  if (thisMonth.length === 0) return null

  const earnings = thisMonth.reduce((sum, d) => sum + d.delivery_fee, 0)
  const monthName = new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-xl bg-success-bg border border-success/20 px-4 py-3 flex items-center justify-between">
      <p className="text-xs font-medium text-text-muted">{monthName}</p>
      <p className="text-sm font-bold text-success">
        ₦{earnings.toLocaleString()} · {thisMonth.length} {thisMonth.length === 1 ? 'delivery' : 'deliveries'}
      </p>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
        <Icon size={24} className="text-primary" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-text mb-1">{title}</p>
      <p className="text-xs text-text-subtle max-w-xs mx-auto">{desc}</p>
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

  const now = new Date()
  const thisMonthCompleted = (completed ?? []).filter((d) => {
    const date = new Date(d.created_at)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })

  const monthlyEarnings = thisMonthCompleted.reduce((sum, d) => sum + d.delivery_fee, 0)
  const activeCount = mine?.length ?? 0
  const availableCount = available?.length ?? 0

  return (
    <main className="min-h-screen bg-surface">
      <DispatchHeader />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <EarningsHero
          monthlyEarnings={monthlyEarnings}
          deliveryCount={thisMonthCompleted.length}
          activeCount={activeCount}
          availableCount={availableCount}
        />

        <StatsRow
          activeCount={activeCount}
          deliveryCount={thisMonthCompleted.length}
          monthlyEarnings={monthlyEarnings}
        />

        <div>
          <div className="flex gap-0.5 rounded-full p-0.5 mb-5 bg-border w-fit">
            {TABS.map((t) => {
              const count = t.id === 'available' ? availableCount : t.id === 'mine' ? activeCount : (completed?.length ?? 0)
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    tab === t.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {t.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${
                      tab === t.id ? 'bg-white/20 text-white' : 'bg-border text-text-muted'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {tab === 'available' && (
            <div className="flex flex-col gap-3">
              {loadingAvailable && [1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
              {!loadingAvailable && (!available || available.length === 0) && (
                <EmptyState
                  icon={Truck}
                  title="No deliveries available"
                  desc="Check back soon — new orders appear when sellers confirm shipment."
                />
              )}
              {available?.map((order) => <AvailableOrderCard key={order.id} order={order} />)}
            </div>
          )}

          {tab === 'mine' && (
            <div className="flex flex-col gap-3">
              {loadingMine && [1, 2].map((i) => <OrderSkeleton key={i} />)}
              {!loadingMine && (!mine || mine.length === 0) && (
                <EmptyState
                  icon={Package}
                  title="No active deliveries"
                  desc="Orders you claim from Available will appear here."
                />
              )}
              {mine?.map((order) => <DeliveryCard key={order.id} order={order} />)}
            </div>
          )}

          {tab === 'completed' && (
            <div className="flex flex-col gap-3">
              {loadingCompleted && [1, 2].map((i) => <OrderSkeleton key={i} />)}
              {!loadingCompleted && (!completed || completed.length === 0) && (
                <EmptyState
                  icon={CheckCircle2}
                  title="No completed deliveries yet"
                  desc="Claim a job from Available to get started and start earning."
                />
              )}
              {completed && completed.length > 0 && (
                <>
                  <MonthSummaryRow thisMonth={thisMonthCompleted} />
                  {completed.map((order) => <CompletedCard key={order.id} order={order} />)}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
