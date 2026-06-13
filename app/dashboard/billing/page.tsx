'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import {
  Package,
  TrendingUp,
  Wallet,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import {
  useSellerEarnings,
  type EarningsOrder,
  type EarningsSummary,
} from '@/lib/hooks/useSellerEarnings'
import { StatCard } from '@/components/dashboard/StatCard'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
        <p className="sm:hidden text-xs font-bold text-text mt-1">{formatNairaWhole(order.net)}</p>
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
    <div className="relative overflow-hidden flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5">
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

function StatCardSkeleton({ index }: { index: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
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
  const sliderRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  useEffect(() => {
    const el = sliderRef.current
    if (!el) return
    const check = () => setHasOverflow(el.scrollWidth > el.clientWidth)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])

  function scrollSlider(dir: 'left' | 'right') {
    sliderRef.current?.scrollBy({ left: dir === 'right' ? 240 : -240, behavior: 'smooth' })
  }

  const summary: EarningsSummary = data?.summary ?? {
    total_gross: 0,
    total_fee: 0,
    total_net: 0,
  }

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

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Overview</p>
          {hasOverflow && (
            <div className="flex gap-1">
              <button onClick={() => scrollSlider('left')} className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-border-strong transition-colors">
                <ChevronLeft size={14} strokeWidth={2} />
              </button>
              <button onClick={() => scrollSlider('right')} className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-border-strong transition-colors">
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shrink-0 pb-1" style={{ width: 'calc((100% - 32px) / 3)', minWidth: 200 }}>
                <StatCardSkeleton index={i} />
              </div>
            ))}
          </div>
        ) : !isError && (
          <div ref={sliderRef} className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
            {([
              { label: 'Total gross', value: formatNairaWhole(summary.total_gross), icon: DollarSign, color: 'text-blue-600', bgColor: 'bg-blue-500/10', lineColor: 'bg-blue-500' },
              { label: 'Total net', value: formatNairaWhole(summary.total_net), icon: Wallet, color: 'text-primary', bgColor: 'bg-primary/10', lineColor: 'bg-primary' },
              { label: 'Platform fee', value: formatNairaWhole(summary.total_fee), icon: TrendingUp, color: 'text-amber-600', bgColor: 'bg-amber-500/10', lineColor: 'bg-amber-500' },
            ] as const).map((card) => (
              <div key={card.label} className="shrink-0 snap-start" style={{ width: 'calc((100% - 32px) / 3)', minWidth: 200 }}>
                <StatCard {...card} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Transactions</h3>
          {!isLoading && data && data.orders.length > 0 && (
            <p className="text-[11px] text-text-subtle mt-0.5">
              {data.orders.length} completed sale{data.orders.length !== 1 ? 's' : ''}
            </p>
          )}
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

// ─── Bank account form ────────────────────────────────────────────────────────

type Bank = { name: string; code: string }

function BankAccountForm({ onSuccess }: { onSuccess: () => void }) {
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankCode, setBankCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    fetch('/api/paystack/banks')
      .then((r) => r.json())
      .then((res) => setBanks(res.data ?? []))
      .catch(() => {})
  }, [])

  async function handleAccountNumberBlur() {
    if (!bankCode || accountNumber.length < 10) return
    setResolving(true)
    setResolveError('')
    setAccountName('')
    const res = await fetch(`/api/paystack/resolve-account?account_number=${accountNumber}&bank_code=${bankCode}`)
    const data = await res.json()
    setResolving(false)
    if (!res.ok) {
      setResolveError(data.error?.message ?? 'Could not verify account number')
      return
    }
    setAccountName(data.data.account_name)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountName) {
      setSubmitError('Please verify your account number first')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    const res = await fetch('/api/paystack/recipient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank_code: bankCode, bank_name: bankName, account_number: accountNumber, account_name: accountName }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setSubmitError(data.error?.message ?? 'Failed to save payout account')
      return
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-xs font-semibold text-text-muted uppercase tracking-widest mb-1.5">Bank</label>
        <select
          value={bankCode}
          onChange={(e) => {
            const selected = banks.find((b) => b.code === e.target.value)
            setBankCode(e.target.value)
            setBankName(selected?.name ?? '')
            setAccountName('')
          }}
          required
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Select your bank</option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted uppercase tracking-widest mb-1.5">Account Number</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={10}
          value={accountNumber}
          onChange={(e) => { setAccountNumber(e.target.value); setAccountName(''); setResolveError('') }}
          onBlur={handleAccountNumberBlur}
          required
          placeholder="0123456789"
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {resolving && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted">
            <Loader2 size={11} className="animate-spin" /> Verifying…
          </p>
        )}
        {resolveError && <p className="mt-1.5 text-xs text-error">{resolveError}</p>}
        {accountName && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 size={11} /> {accountName}
          </p>
        )}
      </div>

      {submitError && <p className="text-xs text-error">{submitError}</p>}

      <button
        type="submit"
        disabled={submitting || !accountName}
        className="w-full rounded-xl bg-primary text-white py-2.5 text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Saving…' : 'Save payout account'}
      </button>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function BillingContent() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [user, setUser] = useState<{
    paystack_onboarding_complete: boolean
    paystack_bank_name: string | null
    paystack_account_name: string | null
    paystack_account_number: string | null
  } | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((res) => setUser(res.data))
      .finally(() => setUserLoading(false))
  }, [])

  function handleBankSaved() {
    queryClient.invalidateQueries({ queryKey: ['me'] })
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((res) => setUser(res.data))
    setShowEditForm(false)
  }

  const isConnected = user?.paystack_onboarding_complete ?? false

  return (
    <div className="space-y-8">
      {searchParams.get('from') === 'new-listing' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <AlertCircle size={14} strokeWidth={2} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            Add your bank account to receive payouts before publishing your listing.
          </p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">Payouts</h1>
          <p className="text-text-muted mt-1 text-sm">
            {isConnected
              ? 'Track your earnings and manage your payout account.'
              : 'Add your bank account to receive earnings from your sales.'}
          </p>
        </div>

        {!userLoading && isConnected && !showEditForm && (
          <div className="shrink-0 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2">
            <CheckCircle2 size={13} strokeWidth={2.5} className="text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">
              {user?.paystack_bank_name} ···{user?.paystack_account_number?.slice(-4)}
            </span>
            <button
              onClick={() => setShowEditForm(true)}
              className="ml-1 text-[11px] text-emerald-600 underline underline-offset-2 hover:text-emerald-800"
            >
              Change
            </button>
          </div>
        )}
      </motion.div>

      {userLoading ? null : !isConnected || showEditForm ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-text mb-1">
            {showEditForm ? 'Update payout account' : 'Add payout account'}
          </h2>
          <p className="text-xs text-text-muted mb-5">
            Enter your Nigerian bank account. We&apos;ll send your earnings here after each sale is delivered.
          </p>
          <BankAccountForm onSuccess={handleBankSaved} />
          {showEditForm && (
            <button onClick={() => setShowEditForm(false)} className="mt-3 text-xs text-text-muted underline underline-offset-2">
              Cancel
            </button>
          )}
        </div>
      ) : null}

      {isConnected && !showEditForm && <EarningsSection />}

      {isConnected && !showEditForm && (
        <p className="text-[11px] text-text-subtle pb-4">
          The platform deducts a 10% fee from each sale.
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
