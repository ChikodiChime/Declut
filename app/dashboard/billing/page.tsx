// app/dashboard/billing/page.tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import {
  Package,
  TrendingUp,
  Wallet,
  Calendar,
  DollarSign,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
} from 'lucide-react'
import {
  useSellerEarnings,
  type EarningsOrder,
  type EarningsSummary,
} from '@/lib/hooks/useSellerEarnings'
import { StatCard } from '@/components/dashboard/StatCard'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}

function formatNairaWhole(naira: number) {
  return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Transfer badge ───────────────────────────────────────────────────────────

const BADGE_CONFIG = {
  transferred: {
    label: 'Paid out',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  processing: {
    label: 'Processing',
    className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-400',
  },
  pending: {
    label: 'Pending',
    className: 'bg-gray-100 text-text-muted ring-1 ring-border',
    dot: 'bg-gray-300',
  },
} as const

function TransferBadge({ status }: { status: EarningsOrder['transfer_status'] }) {
  const cfg = BADGE_CONFIG[status] ?? BADGE_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function OrderRow({ order, index }: { order: EarningsOrder; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.04 * index }}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-border-strong transition-colors duration-150"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-surface border border-border flex items-center justify-center">
        {order.listing_image ? (
          <CldImage
            src={order.listing_image}
            fill
            sizes="44px"
            className="object-cover"
            alt={order.listing_title}
          />
        ) : (
          <Package size={14} strokeWidth={1.5} className="text-text-subtle" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate leading-tight">{order.listing_title}</p>
        <p className="text-[11px] text-text-subtle mt-0.5">{formatDate(order.created_at)}</p>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 text-right">
        <p className="text-[11px] text-text-subtle">
          {formatNairaWhole(order.item_price)}
          <span className="mx-1.5 text-border-strong">−</span>
          <span className="text-error/80">{formatNairaWhole(order.fee)} fee</span>
        </p>
        <p className="text-sm font-bold text-text">{formatNairaWhole(order.net)}</p>
      </div>

      <div className="shrink-0">
        <TransferBadge status={order.transfer_status} />
      </div>
    </motion.div>
  )
}

function RowSkeleton({ index }: { index: number }) {
  return (
    <div
      className="relative overflow-hidden flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5"
    >
      <div className="skeleton-shimmer" style={{ animationDelay: `${index * 0.1}s` }} />
      <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: '#ede9e3' }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3 w-2/5 rounded" style={{ background: '#ede9e3' }} />
        <div className="h-2.5 w-1/4 rounded" style={{ background: '#e8e4dc' }} />
      </div>
      <div className="hidden sm:block h-3 w-24 rounded" style={{ background: '#ede9e3' }} />
      <div className="h-5 w-16 rounded-full" style={{ background: '#ede9e3' }} />
    </div>
  )
}

// ─── Stat card skeletons ──────────────────────────────────────────────────────

function StatCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-card p-6"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="skeleton-shimmer" style={{ animationDelay: `${index * 0.1}s` }} />
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: '#ede9e3' }} />
      <div className="w-12 h-12 rounded-xl mb-4" style={{ background: '#ede9e3' }} />
      <div className="h-8 w-20 rounded mb-2" style={{ background: '#ede9e3' }} />
      <div className="h-3.5 w-28 rounded" style={{ background: '#e8e4dc' }} />
    </div>
  )
}

// ─── Earnings section ─────────────────────────────────────────────────────────

function EarningsSection() {
  const { data, isLoading, isError } = useSellerEarnings()

  const summary: EarningsSummary = data?.summary ?? {
    total_gross: 0,
    total_fee: 0,
    total_net: 0,
    stripe_available: 0,
    stripe_pending: 0,
    next_payout_date: null,
  }

  const nextPayout = summary.next_payout_date
    ? formatDate(summary.next_payout_date)
    : '—'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {isError && (
        <div className="rounded-xl border border-error/20 bg-error-bg px-4 py-3 text-sm text-error flex items-center gap-2">
          <AlertCircle size={14} strokeWidth={2} />
          Could not load earnings data. Please refresh.
        </div>
      )}

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} index={i} />)}
        </div>
      ) : !isError && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Available balance"
            value={formatNaira(summary.stripe_available)}
            icon={TrendingUp}
            color="text-green-600"
            bgColor="bg-green-500/10"
            lineColor="bg-green-500"
          />
          <StatCard
            label="Total gross"
            value={formatNairaWhole(summary.total_gross)}
            icon={DollarSign}
            color="text-blue-600"
            bgColor="bg-blue-500/10"
            lineColor="bg-blue-500"
          />
          <StatCard
            label="Total net"
            value={formatNairaWhole(summary.total_net)}
            icon={Wallet}
            color="text-primary"
            bgColor="bg-primary/10"
            lineColor="bg-primary"
          />
          <StatCard
            label="Next payout"
            value={nextPayout}
            icon={Calendar}
            color="text-amber-600"
            bgColor="bg-amber-500/10"
            lineColor="bg-amber-500"
          />
        </div>
      )}

      {/* Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">Transactions</h3>
            {!isLoading && data && data.orders.length > 0 && (
              <p className="text-[11px] text-text-subtle mt-0.5">
                {data.orders.length} completed sale{data.orders.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <a
            href="https://dashboard.stripe.com/express"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors"
          >
            <Zap size={11} strokeWidth={2.5} className="text-amber-500" />
            Stripe dashboard
            <ArrowUpRight size={11} strokeWidth={2} className="opacity-50" />
          </a>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => <RowSkeleton key={i} index={i} />)}
          </div>
        )}

        {!isLoading && data && data.orders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-strong bg-card p-12 text-center">
            <div className="inline-flex rounded-2xl bg-surface p-3 mb-4 border border-border">
              <Package size={22} strokeWidth={1.5} className="text-text-subtle" />
            </div>
            <p className="text-sm font-semibold text-text mb-1.5">No completed sales yet</p>
            <p className="text-xs text-text-subtle max-w-xs mx-auto leading-relaxed">
              Earnings appear here after a buyer confirms delivery.
            </p>
          </div>
        )}

        {!isLoading && data && data.orders.length > 0 && (
          <div className="flex flex-col gap-2">
            {data.orders.map((order, i) => (
              <OrderRow key={order.id} order={order} index={i} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Not connected state ──────────────────────────────────────────────────────

function NotConnectedState({ onConnect, connecting, error }: {
  onConnect: () => void
  connecting: boolean
  error: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center text-center py-16"
    >
      <div className="relative mb-6 w-56 h-56">
        <div
          aria-hidden
          className="absolute"
          style={{
            inset: '-12px',
            background: '#ffffff',
            borderRadius: '62% 38% 46% 54% / 60% 44% 56% 40%',
            boxShadow: '0 8px 40px rgba(55,48,163,0.08)',
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/empty-listings.svg" alt="" aria-hidden className="relative w-full h-full select-none" draggable={false} />
      </div>
      <h2 className="text-xl font-bold text-text mb-2">Set up payouts</h2>
      <p className="text-sm text-text-muted max-w-xs leading-relaxed mb-8">
        Connect a Stripe account to receive money directly to your bank after every sale. Takes about 2 minutes.
      </p>
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onConnect}
          disabled={connecting}
          className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover active:scale-95 disabled:opacity-60 transition-all duration-150"
        >
          {connecting ? 'Opening Stripe…' : 'Connect with Stripe'}
          {!connecting && <ArrowUpRight size={14} strokeWidth={2.5} />}
        </button>
        {error && <p className="text-xs text-error">{error}</p>}
        <p className="text-[11px] text-text-subtle">10% platform fee · Automatic weekly payouts</p>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type StripeStatus = 'connected' | 'pending' | 'not_connected'

function BillingContent() {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')

  const [user, setUser] = useState<{ stripe_onboarding_complete: boolean } | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((res) => setUser(res.data))
      .finally(() => setUserLoading(false))
  }, [])

  const queryClient = useQueryClient()
  useEffect(() => {
    if (statusParam === 'connected') {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    }
  }, [statusParam, queryClient])

  const hasUrlStatus = statusParam === 'connected' || statusParam === 'pending'

  const stripeStatus: StripeStatus =
    statusParam === 'connected' || user?.stripe_onboarding_complete
      ? 'connected'
      : statusParam === 'pending'
      ? 'pending'
      : 'not_connected'

  async function handleConnect() {
    setConnecting(true)
    setError('')
    const res = await fetch('/api/stripe/connect', { method: 'POST' })
    const data = await res.json()
    setConnecting(false)
    if (!res.ok) {
      setError(data.error?.message ?? 'Failed to start Stripe onboarding')
      return
    }
    window.location.href = data.data.url
  }

  return (
    <div className="space-y-8">
      {/* Redirect notice */}
      {searchParams.get('from') === 'new-listing' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <AlertCircle size={14} strokeWidth={2} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            You need to connect your payout account before creating a listing.
          </p>
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-text">Payouts</h1>
          <p className="text-text-muted mt-1">Track your earnings and manage your Stripe account.</p>
        </div>

        {/* Connection status badge */}
        {userLoading && !hasUrlStatus ? (
          <div className="relative overflow-hidden h-9 w-44 rounded-xl border border-border bg-card shrink-0">
            <div className="skeleton-shimmer" />
          </div>
        ) : stripeStatus === 'connected' ? (
          <a
            href="https://dashboard.stripe.com/express"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <CheckCircle2 size={13} strokeWidth={2.5} className="text-emerald-500" />
            Stripe connected
            <ArrowUpRight size={11} strokeWidth={2.5} className="opacity-60" />
          </a>
        ) : stripeStatus === 'pending' ? (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition-colors"
          >
            <Clock size={13} strokeWidth={2.5} className="text-amber-500" />
            {connecting ? 'Opening…' : 'Finish onboarding'}
          </button>
        ) : null}
      </motion.div>

      {/* Body */}
      {userLoading && !hasUrlStatus ? null : stripeStatus === 'connected' ? (
        <EarningsSection />
      ) : (
        <NotConnectedState
          onConnect={handleConnect}
          connecting={connecting}
          error={error}
        />
      )}

      {/* Footer */}
      {stripeStatus === 'connected' && (
        <p className="text-[11px] text-text-subtle pb-4">
          The platform deducts a 10% fee from each sale.{' '}
          <Link
            href="https://stripe.com/pricing"
            className="underline underline-offset-2 text-primary hover:text-primary-hover transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Stripe pricing
          </Link>
        </p>
      )}
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  )
}
