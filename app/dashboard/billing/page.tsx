// app/dashboard/billing/page.tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import { Package, TrendingUp, Wallet, Calendar, ArrowUpRight } from 'lucide-react'
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
  transferred: { label: 'Paid out', bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  processing:  { label: 'Processing', bg: 'rgba(251,191,36,0.12)', color: '#d97706' },
  pending:     { label: 'Pending', bg: 'rgba(168,160,154,0.15)', color: '#78726c' },
} as const

function TransferBadge({ status }: { status: EarningsOrder['transfer_status'] }) {
  const { label, bg, color } = BADGE_CONFIG[status]
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}

// ─── Earnings section ─────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof TrendingUp
  label: string
  value: string
  sub?: string
}) {
  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-2"
      style={{ borderColor: '#e8e4dc', background: '#faf9f7' }}
    >
      <div className="flex items-center gap-2">
        <div className="rounded-lg p-1.5" style={{ background: 'rgba(79,70,229,0.08)' }}>
          <Icon size={14} strokeWidth={2} style={{ color: '#4f46e5' }} />
        </div>
        <span className="text-xs font-medium" style={{ color: '#78726c' }}>{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color: '#16130f' }}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: '#a8a09a' }}>{sub}</p>}
    </div>
  )
}

function OrderRow({ order }: { order: EarningsOrder }) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl border p-4"
      style={{ borderColor: '#e8e4dc' }}
    >
      <div
        className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: '#f0ece5' }}
      >
        {order.listing_image ? (
          <CldImage
            src={order.listing_image}
            fill
            sizes="48px"
            className="object-cover"
            alt={order.listing_title}
          />
        ) : (
          <Package size={16} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#16130f' }}>
          {order.listing_title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#a8a09a' }}>
          {formatDate(order.created_at)}
        </p>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 text-right">
        <p className="text-xs" style={{ color: '#78726c' }}>
          {formatNairaWhole(order.item_price)}
        </p>
        <p className="text-xs" style={{ color: '#ef4444' }}>
          −{formatNairaWhole(order.fee)}
        </p>
        <p className="text-sm font-semibold" style={{ color: '#16130f' }}>
          {formatNairaWhole(order.net)}
        </p>
      </div>

      <div className="shrink-0">
        <TransferBadge status={order.transfer_status} />
      </div>
    </div>
  )
}

function RowSkeleton() {
  return (
    <div
      className="animate-pulse flex items-center gap-4 rounded-2xl border p-4"
      style={{ borderColor: '#e8e4dc' }}
    >
      <div className="w-12 h-12 rounded-xl shrink-0" style={{ background: '#f0ece5' }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3 w-1/2 rounded" style={{ background: '#f0ece5' }} />
        <div className="h-2.5 w-1/4 rounded" style={{ background: '#f0ece5' }} />
      </div>
      <div className="w-16 h-6 rounded-full" style={{ background: '#f0ece5' }} />
    </div>
  )
}

function EarningsSection() {
  const { data, isLoading } = useSellerEarnings()

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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <h2 className="text-base font-semibold" style={{ color: '#16130f' }}>Earnings</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={TrendingUp}
          label="Total earned"
          value={isLoading ? '—' : formatNairaWhole(summary.total_net)}
          sub={isLoading ? undefined : `${formatNairaWhole(summary.total_fee)} platform fee`}
        />
        <SummaryCard
          icon={Wallet}
          label="Available balance"
          value={isLoading ? '—' : formatNaira(summary.stripe_available)}
          sub={
            isLoading
              ? undefined
              : summary.stripe_pending > 0
              ? `${formatNaira(summary.stripe_pending)} pending`
              : 'No pending balance'
          }
        />
        <SummaryCard
          icon={Calendar}
          label="Next payout"
          value={isLoading ? '—' : nextPayout}
        />
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium" style={{ color: '#78726c' }}>Transactions</h3>
          {!isLoading && data && data.orders.length > 0 && (
            <span className="text-xs" style={{ color: '#a8a09a' }}>
              {data.orders.length} sale{data.orders.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => <RowSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && data && data.orders.length === 0 && (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{ borderColor: '#e8e4dc' }}
          >
            <Package
              size={28}
              strokeWidth={1.5}
              className="mx-auto mb-3"
              style={{ color: '#c8c2bb' }}
            />
            <p className="text-sm font-medium mb-1" style={{ color: '#16130f' }}>
              No completed sales yet
            </p>
            <p className="text-xs" style={{ color: '#a8a09a' }}>
              Orders appear here after delivery is confirmed.
            </p>
          </div>
        )}

        {!isLoading && data && data.orders.length > 0 && (
          <div className="flex flex-col gap-2">
            {data.orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>

      {/* Stripe Express dashboard link */}
      <p className="text-xs" style={{ color: '#a8a09a' }}>
        View full payout history and manage bank details in your{' '}
        <a
          href="https://dashboard.stripe.com/express"
          target="_blank"
          rel="noopener noreferrer"
          className="underline inline-flex items-center gap-0.5"
          style={{ color: '#4f46e5' }}
        >
          Stripe Express dashboard
          <ArrowUpRight size={10} strokeWidth={2} />
        </a>
        .
      </p>
    </motion.div>
  )
}

// ─── Connect status (preserved from original) ─────────────────────────────────

type StripeStatus = 'connected' | 'pending' | 'not_connected'

function BillingContent() {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')

  const [user, setUser] = useState<{
    stripe_onboarding_complete: boolean
  } | null>(null)
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
    <div className="max-w-2xl space-y-6 py-10 px-4">
      {searchParams.get('from') === 'new-listing' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Connect your payout account before creating a listing.
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#16130f' }}>Payments</h1>
        <p className="text-sm" style={{ color: '#78726c' }}>
          Connect your Stripe account to list items for sale and receive payouts.
        </p>
      </div>

      {/* Connect status card */}
      <div className="rounded-2xl border p-6" style={{ borderColor: '#e8e4dc' }}>
        {stripeStatus === 'connected' && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="font-medium text-sm" style={{ color: '#16130f' }}>Stripe account connected</span>
            </div>
            <p className="text-sm" style={{ color: '#78726c' }}>
              You can list items for sale. Payouts are managed via your Stripe Express dashboard.
            </p>
          </>
        )}

        {stripeStatus === 'pending' && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="font-medium text-sm" style={{ color: '#16130f' }}>Onboarding incomplete</span>
            </div>
            <p className="text-sm mb-4" style={{ color: '#78726c' }}>
              You started Stripe onboarding but didn&apos;t finish. Click below to complete it.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#16130f' }}
            >
              {connecting ? 'Loading…' : 'Complete Stripe onboarding'}
            </button>
          </>
        )}

        {stripeStatus === 'not_connected' && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="font-medium text-sm" style={{ color: '#16130f' }}>Not connected</span>
            </div>
            <p className="text-sm mb-4" style={{ color: '#78726c' }}>
              Connect a Stripe account to start selling. Stripe handles payouts securely.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#16130f' }}
            >
              {connecting ? 'Loading…' : 'Connect Stripe'}
            </button>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      {/* Earnings section — only when connected */}
      {stripeStatus === 'connected' && <EarningsSection />}

      <p className="text-xs" style={{ color: '#a8a09a' }}>
        The platform takes a 10% fee on each sale.{' '}
        <Link
          href="https://stripe.com/pricing"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Stripe pricing
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
