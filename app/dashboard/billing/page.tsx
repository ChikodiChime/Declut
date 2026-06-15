'use client'

import { Suspense, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import {
  Package,
  TrendingUp,
  Wallet,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowDownToLine,
  Clock,
  XCircle,
  X,
} from 'lucide-react'
import {
  useSellerEarnings,
  type EarningsOrder,
  type EarningsSummary,
} from '@/lib/hooks/useSellerEarnings'
import { StatCard } from '@/components/dashboard/StatCard'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNaira(naira: number) {
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
    accent: 'bg-emerald-500',
  },
  in_wallet: {
    label: 'In wallet',
    className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    dot: 'bg-violet-500',
    accent: 'bg-violet-500',
  },
  processing: {
    label: 'Processing',
    className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-400',
    accent: 'bg-amber-400',
  },
  pending: {
    label: 'Pending',
    className: 'bg-gray-100 text-text-muted ring-1 ring-border',
    dot: 'bg-gray-300',
    accent: 'bg-gray-300',
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
  const accent = (BADGE_CONFIG[order.transfer_status] ?? BADGE_CONFIG.pending).accent
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.04 * index }}
      className="group relative flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:border-border-strong hover:shadow-card transition-all duration-150 overflow-hidden"
    >
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${accent}`} />

      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface border border-border flex items-center justify-center">
        {order.listing_image ? (
          <CldImage
            src={order.listing_image}
            fill
            sizes="56px"
            className="object-cover"
            alt={order.listing_title}
          />
        ) : (
          <Package size={16} strokeWidth={1.5} className="text-text-subtle" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate leading-tight">{order.listing_title}</p>
        <p className="text-[11px] text-text-subtle mt-0.5">{formatDate(order.created_at)}</p>
        <p className="sm:hidden text-sm font-bold text-text mt-1.5">{formatNaira(order.net)}</p>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-right">
        <p className="text-sm font-bold text-text">{formatNaira(order.net)}</p>
        <p className="text-[11px] text-text-subtle">
          {formatNaira(order.item_price)}
          <span className="mx-1 opacity-40">−</span>
          <span className="text-error/70">{formatNaira(order.fee)} fee</span>
        </p>
      </div>

      <div className="shrink-0">
        <TransferBadge status={order.transfer_status} />
      </div>
    </motion.div>
  )
}

function RowSkeleton({ index }: { index: number }) {
  return (
    <div className="relative overflow-hidden flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
      <div className="skeleton-shimmer" style={{ animationDelay: `${index * 0.1}s` }} />
      <div className="w-14 h-14 rounded-xl shrink-0" style={{ background: '#ede9e3' }} />
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

// ─── Wallet card ──────────────────────────────────────────────────────────────

function WalletCard({
  balance,
  bankConnected,
  onWithdraw,
}: {
  balance: number
  bankConnected: boolean
  onWithdraw: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)',
        boxShadow: '0 8px 32px rgba(46,43,133,0.25)',
      }}
    >
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)',
      }} />

      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={14} strokeWidth={2} className="text-white/60" />
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Available balance</p>
        </div>
        <p className="text-4xl font-bold text-white mb-5">{formatNaira(balance)}</p>

        <button
          onClick={onWithdraw}
          disabled={balance === 0 || !bankConnected}
          className="inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 transition-colors"
        >
          <ArrowDownToLine size={14} strokeWidth={2.5} />
          {!bankConnected ? 'Add bank account to withdraw' : balance === 0 ? 'No balance to withdraw' : 'Request withdrawal'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Withdrawal modal ─────────────────────────────────────────────────────────

function WithdrawalModal({
  open,
  onClose,
  walletBalance,
  bankName,
  accountNumber,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  walletBalance: number
  bankName: string | null
  accountNumber: string | null
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(amount, 10)
    if (isNaN(parsed) || parsed <= 0) { setError('Enter a valid amount'); return }
    if (parsed > walletBalance) { setError(`Max withdrawal is ${formatNaira(walletBalance)}`); return }

    setSubmitting(true)
    setError('')
    const res = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parsed }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error?.message ?? 'Failed to submit request'); return }
    onSuccess()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6"
            style={{ boxShadow: 'var(--shadow-elevated)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-text">Request withdrawal</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface transition-colors">
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="rounded-xl border border-border bg-surface px-4 py-3 mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-0.5">Destination</p>
              <p className="text-sm font-semibold text-text">{bankName ?? '—'} ···{accountNumber?.slice(-4)}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-widest mb-1.5">
                  Amount (Naira)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted">₦</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={walletBalance}
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError('') }}
                    placeholder="0"
                    required
                    className="w-full rounded-xl border border-border bg-card pl-8 pr-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAmount(String(walletBalance))}
                  className="mt-1.5 text-[11px] text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  Withdraw all ({formatNaira(walletBalance)})
                </button>
              </div>

              {error && <p className="text-xs text-error">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-primary text-white py-2.5 text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Submitting…</span> : 'Submit withdrawal request'}
              </button>
            </form>

            <p className="mt-3 text-[11px] text-text-subtle text-center leading-relaxed">
              Withdrawals are processed manually by the team. You&apos;ll be notified when your transfer is sent.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Withdrawal history ───────────────────────────────────────────────────────

type WithdrawalRequest = {
  id: string
  amount: number
  status: 'pending' | 'processed' | 'rejected'
  admin_note: string | null
  requested_at: string
  processed_at: string | null
  bank_snapshot: {
    bank_name: string | null
    account_number: string | null
  }
}

const WITHDRAWAL_BADGE = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-400',
    icon: Clock,
    iconStyle: 'bg-amber-50 text-amber-600',
  },
  processed: {
    label: 'Sent',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
    iconStyle: 'bg-emerald-50 text-emerald-600',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    dot: 'bg-red-500',
    icon: XCircle,
    iconStyle: 'bg-red-50 text-red-600',
  },
} as const

function WithdrawalRow({ req, index }: { req: WithdrawalRequest; index: number }) {
  const cfg = WITHDRAWAL_BADGE[req.status]
  const Icon = cfg.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.04 * index }}
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconStyle}`}>
        <Icon size={15} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text">{formatNaira(req.amount)}</p>
        <p className="text-[11px] text-text-subtle mt-0.5">{formatDate(req.requested_at)}</p>
        {req.admin_note && (
          <p className="text-[11px] text-error mt-1 italic">{req.admin_note}</p>
        )}
      </div>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${cfg.className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    </motion.div>
  )
}

// ─── Earnings section ─────────────────────────────────────────────────────────

function EarningsSection() {
  const { data, isLoading, isError } = useSellerEarnings()

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
      className="space-y-6"
    >
      {isError && (
        <div className="rounded-xl border border-error/20 bg-error-bg px-4 py-3 text-sm text-error flex items-center gap-2">
          <AlertCircle size={14} strokeWidth={2} />
          Could not load earnings data. Please refresh.
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle mb-4">All-time earnings</p>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <StatCardSkeleton key={i} index={i} />)}
          </div>
        ) : !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { label: 'Total gross', value: formatNaira(summary.total_gross), icon: DollarSign, color: 'text-blue-600', bgColor: 'bg-blue-500/10', lineColor: 'bg-blue-500' },
              { label: 'Total net', value: formatNaira(summary.total_net), icon: Wallet, color: 'text-primary', bgColor: 'bg-primary/10', lineColor: 'bg-primary' },
              { label: 'Platform fee', value: formatNaira(summary.total_fee), icon: TrendingUp, color: 'text-amber-600', bgColor: 'bg-amber-500/10', lineColor: 'bg-amber-500' },
            ] as const).map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Sales history</h3>
          {!isLoading && data && data.orders.length > 0 && (
            <p className="text-[11px] text-text-subtle">
              {data.orders.length} sale{data.orders.length !== 1 ? 's' : ''}
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
    <form onSubmit={handleSubmit} className="space-y-4">
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

type UserProfile = {
  wallet_balance: number
  paystack_onboarding_complete: boolean
  paystack_bank_name: string | null
  paystack_account_name: string | null
  paystack_account_number: string | null
}

function BillingContent() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [user, setUser] = useState<UserProfile | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showWithdrawal, setShowWithdrawal] = useState(false)
  const [withdrawalKey, setWithdrawalKey] = useState(0)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((res) => setUser(res.data))
      .finally(() => setUserLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/withdrawals')
      .then((r) => r.json())
      .then((res) => setWithdrawals(res.data ?? []))
      .finally(() => setWithdrawalsLoading(false))
  }, [])

  function refreshUser() {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((res) => setUser(res.data))
  }

  function refreshWithdrawals() {
    fetch('/api/withdrawals')
      .then((r) => r.json())
      .then((res) => setWithdrawals(res.data ?? []))
  }

  function handleBankSaved() {
    queryClient.invalidateQueries({ queryKey: ['me'] })
    refreshUser()
    setShowEditForm(false)
  }

  function handleWithdrawalSuccess() {
    setShowWithdrawal(false)
    refreshUser()
    refreshWithdrawals()
  }

  const isConnected = user?.paystack_onboarding_complete ?? false

  return (
    <div className="space-y-6">
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
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-text">Payouts</h1>
        <p className="text-text-muted mt-1 text-sm">
          {isConnected
            ? 'Track your wallet balance and request withdrawals.'
            : 'Add your bank account to receive earnings from your sales.'}
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left column: wallet + payout account + withdrawal history */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-4">
          {!userLoading && (
            <WalletCard
              balance={user?.wallet_balance ?? 0}
              bankConnected={isConnected}
              onWithdraw={() => { setWithdrawalKey((k) => k + 1); setShowWithdrawal(true) }}
            />
          )}

          {!userLoading && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Payout account</h2>
                {isConnected && !showEditForm && (
                  <button
                    onClick={() => setShowEditForm(true)}
                    className="text-[11px] text-primary underline underline-offset-2 hover:text-primary-hover"
                  >
                    Change
                  </button>
                )}
              </div>
              <div className="p-5">
                {!isConnected || showEditForm ? (
                  <>
                    {!isConnected && (
                      <p className="text-xs text-text-muted mb-4 leading-relaxed">
                        Enter your Nigerian bank account. We&apos;ll transfer earnings here when you request a withdrawal.
                      </p>
                    )}
                    <BankAccountForm onSuccess={handleBankSaved} />
                    {showEditForm && (
                      <button onClick={() => setShowEditForm(false)} className="mt-3 text-xs text-text-muted underline underline-offset-2">
                        Cancel
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={15} strokeWidth={2.5} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text">{user?.paystack_bank_name}</p>
                      <p className="text-[11px] text-text-subtle mt-0.5">···{user?.paystack_account_number?.slice(-4)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {withdrawals.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Withdrawal requests</h2>
                <span className="text-[11px] font-semibold text-text-subtle bg-surface rounded-full px-2 py-0.5 border border-border">
                  {withdrawals.length}
                </span>
              </div>
              <div className="p-3">
                {withdrawalsLoading ? (
                  <div className="flex flex-col gap-2">
                    {[0, 1].map((i) => <RowSkeleton key={i} index={i} />)}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {withdrawals.map((req, i) => (
                      <WithdrawalRow key={req.id} req={req} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {isConnected && !showEditForm && (
            <p className="text-[11px] text-text-subtle leading-relaxed px-0.5">
              The platform deducts a 10% fee from each sale. Withdrawals are processed manually within 1–2 business days.
            </p>
          )}
        </div>

        {/* Right column: earnings */}
        {isConnected && !showEditForm && (
          <div className="flex-1 min-w-0">
            <EarningsSection />
          </div>
        )}
      </div>

      <WithdrawalModal
        key={withdrawalKey}
        open={showWithdrawal}
        onClose={() => setShowWithdrawal(false)}
        walletBalance={user?.wallet_balance ?? 0}
        bankName={user?.paystack_bank_name ?? null}
        accountNumber={user?.paystack_account_number ?? null}
        onSuccess={handleWithdrawalSuccess}
      />
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
