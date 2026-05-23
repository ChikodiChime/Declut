// app/dashboard/billing/page.tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import {
  Package,
  TrendingUp,
  Wallet,
  Calendar,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Zap,
} from 'lucide-react'
import {
  useSellerEarnings,
  type EarningsOrder,
  type EarningsSummary,
} from '@/lib/hooks/useSellerEarnings'

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

// ─── Stat cards ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  delay = 0,
}: {
  icon: typeof TrendingUp
  label: string
  value: string
  sub?: string
  accent?: boolean
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`relative rounded-2xl border p-5 overflow-hidden ${
        accent
          ? 'border-primary/20 bg-primary/[0.03]'
          : 'border-border bg-card'
      }`}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {accent && (
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at top left, #4f46e5 0%, transparent 70%)',
          }}
        />
      )}
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-widest uppercase text-text-subtle">{label}</span>
          <div className={`rounded-lg p-1.5 ${accent ? 'bg-primary/10' : 'bg-surface'}`}>
            <Icon size={13} strokeWidth={2.5} className={accent ? 'text-primary' : 'text-text-subtle'} />
          </div>
        </div>
        <p className="text-2xl font-bold text-text tracking-tight">{value}</p>
        {sub && (
          <p className="text-[11px] text-text-subtle leading-snug">{sub}</p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function OrderRow({ order, index }: { order: EarningsOrder; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.05 * index }}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-border-strong hover:shadow-sm transition-all duration-150"
    >
      {/* Thumbnail */}
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

      {/* Title + date */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate leading-tight">{order.listing_title}</p>
        <p className="text-[11px] text-text-subtle mt-0.5">{formatDate(order.created_at)}</p>
      </div>

      {/* Price breakdown */}
      <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 text-right">
        <p className="text-[11px] text-text-subtle">
          {formatNairaWhole(order.item_price)}
          <span className="mx-1.5 text-border-strong">−</span>
          <span className="text-error/80">{formatNairaWhole(order.fee)} fee</span>
        </p>
        <p className="text-sm font-bold text-text">{formatNairaWhole(order.net)}</p>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <TransferBadge status={order.transfer_status} />
      </div>
    </motion.div>
  )
}

function RowSkeleton({ index }: { index: number }) {
  return (
    <div
      className="animate-pulse flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="w-11 h-11 rounded-xl shrink-0 bg-border/60" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3 w-2/5 rounded-full bg-border/60" />
        <div className="h-2 w-1/4 rounded-full bg-border/60" />
      </div>
      <div className="hidden sm:block w-20 h-4 rounded-full bg-border/60" />
      <div className="w-16 h-5 rounded-full bg-border/60" />
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
    : 'No pending payout'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="space-y-6"
    >
      {/* Earnings hero */}
      <div
        className="relative rounded-2xl border border-primary/15 overflow-hidden p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(245,158,11,0.03) 50%, rgba(250,250,248,0) 100%)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        {/* Decorative mesh */}
        <div
          className="absolute top-0 right-0 w-64 h-64 opacity-[0.07] pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, #4f46e5 0%, transparent 65%)',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-widest uppercase text-text-subtle mb-2">
              Total net earnings
            </p>
            <p className="text-4xl sm:text-5xl font-bold text-text tracking-tighter leading-none">
              {isLoading ? (
                <span className="inline-block w-40 h-10 rounded-lg bg-border/60 animate-pulse" />
              ) : (
                formatNairaWhole(summary.total_net)
              )}
            </p>
            {!isLoading && (
              <p className="text-xs text-text-subtle mt-2">
                After {formatNairaWhole(summary.total_fee)} platform fee deducted
              </p>
            )}
          </div>

          <a
            href="https://dashboard.stripe.com/express"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-text hover:border-border-strong hover:shadow-sm transition-all"
          >
            <Zap size={11} strokeWidth={2.5} className="text-amber-500" />
            Stripe dashboard
            <ArrowUpRight size={11} strokeWidth={2.5} className="text-text-subtle" />
          </a>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-error/20 bg-error-bg px-4 py-3 text-sm text-error flex items-center gap-2">
          <AlertCircle size={14} strokeWidth={2} />
          Could not load earnings data. Please refresh.
        </div>
      )}

      {/* Stat cards */}
      {!isError && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={TrendingUp}
            label="Available balance"
            value={isLoading ? '—' : formatNaira(summary.stripe_available)}
            sub={
              !isLoading && summary.stripe_pending > 0
                ? `${formatNaira(summary.stripe_pending)} pending clearance`
                : !isLoading ? 'No pending balance' : undefined
            }
            accent
            delay={0.15}
          />
          <StatCard
            icon={Wallet}
            label="Total gross"
            value={isLoading ? '—' : formatNairaWhole(summary.total_gross)}
            sub={isLoading ? undefined : 'Before platform fee'}
            delay={0.2}
          />
          <StatCard
            icon={Calendar}
            label="Next payout"
            value={isLoading ? '—' : nextPayout}
            delay={0.25}
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
              Earnings appear here after a buyer confirms delivery. Start listing items to make your first sale.
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

// ─── Connect status card ──────────────────────────────────────────────────────

type StripeStatus = 'connected' | 'pending' | 'not_connected'

function ConnectCard({
  status,
  connecting,
  error,
  onConnect,
}: {
  status: StripeStatus
  connecting: boolean
  error: string
  onConnect: () => void
}) {
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle2 size={16} strokeWidth={2} className="text-emerald-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800 leading-tight">Stripe account connected</p>
          <p className="text-xs text-emerald-700/70 mt-0.5">
            Payouts are processed automatically via Stripe Express.
          </p>
        </div>
        <a
          href="https://dashboard.stripe.com/express"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
        >
          Manage
          <ChevronRight size={11} strokeWidth={2.5} />
        </a>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 rounded-lg bg-amber-100 p-1.5">
            <Clock size={14} strokeWidth={2} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">Onboarding incomplete</p>
            <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
              You started Stripe onboarding but did not finish. Complete it to start receiving payouts.
            </p>
          </div>
        </div>
        <button
          onClick={onConnect}
          disabled={connecting}
          className="w-full sm:w-auto rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60 transition-colors"
        >
          {connecting ? 'Opening Stripe…' : 'Complete onboarding →'}
        </button>
        {error && <p className="mt-3 text-xs text-error">{error}</p>}
      </div>
    )
  }

  // not_connected
  return (
    <div
      className="relative rounded-2xl border border-border bg-card overflow-hidden p-6 sm:p-8"
      style={{ boxShadow: 'var(--shadow-elevated)' }}
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at bottom right, #4f46e5 0%, transparent 70%)' }}
      />
      <div className="relative max-w-sm">
        <div className="inline-flex rounded-xl bg-primary/10 p-2.5 mb-4">
          <Wallet size={18} strokeWidth={1.5} className="text-primary" />
        </div>
        <h3 className="text-base font-bold text-text mb-1">Connect your payout account</h3>
        <p className="text-sm text-text-muted leading-relaxed mb-5">
          Link a Stripe account to start selling. Stripe securely handles all payments and transfers funds directly to your bank.
        </p>

        <div className="space-y-2 mb-5">
          {[
            'Funds deposited directly to your bank',
            'Automatic weekly or monthly payouts',
            '10% platform fee deducted per sale',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-text-muted">
              <CheckCircle2 size={12} strokeWidth={2.5} className="text-success shrink-0" />
              {item}
            </div>
          ))}
        </div>

        <button
          onClick={onConnect}
          disabled={connecting}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-60 transition-colors shadow-sm"
        >
          {connecting ? 'Opening Stripe…' : 'Connect with Stripe'}
          {!connecting && <ArrowUpRight size={14} strokeWidth={2.5} />}
        </button>
        {error && <p className="mt-3 text-xs text-error">{error}</p>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function BillingContent() {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')

  const [user, setUser] = useState<{ stripe_onboarding_complete: boolean } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((res) => setUser(res.data))
  }, [])

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
    <div className="max-w-2xl space-y-6">
      {/* New-listing redirect notice */}
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
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-2xl font-bold text-text tracking-tight">Payouts</h1>
        <p className="text-sm text-text-muted mt-1">
          Manage your Stripe account and track earnings from completed sales.
        </p>
      </motion.div>

      {/* Connect status */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        <ConnectCard
          status={stripeStatus}
          connecting={connecting}
          error={error}
          onConnect={handleConnect}
        />
      </motion.div>

      {/* Earnings — only when connected */}
      {stripeStatus === 'connected' && <EarningsSection />}

      {/* Footer note */}
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
