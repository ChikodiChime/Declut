'use client'

import { useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListingImage } from '@/components/ui'
import { Button } from '@/components/ui'
import {
  Package,
  ArrowRight,
  CheckCircle2,
  X,
  Building2,
  Clock,
  XCircle,
  Wallet,
  ArrowDownToLine,
  TrendingUp,
  Truck,
} from 'lucide-react'
import {
  useCompletedDeliveries,
  type CompletedDelivery,
} from '@/lib/hooks/useDispatch'
import {
  useDispatchWallet,
  useDispatchWithdrawals,
  useRequestWithdrawal,
  type DispatchWithdrawal,
} from '@/lib/hooks/useDispatchWallet'
import { DispatchHeader } from '@/app/dispatch/(portal)/DispatchHeader'

function groupByMonth(deliveries: CompletedDelivery[]) {
  const groups: Record<string, CompletedDelivery[]> = {}
  for (const d of deliveries) {
    const key = d.created_at.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(d)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, orders]) => ({ key, orders }))
}

function monthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-')
  return new Date(+y, +m - 1).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  })
}

// ─── Withdrawal status badge ──────────────────────────────────────────────────

const WITHDRAWAL_CFG = {
  processed: {
    label: 'Processed',
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
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-400',
    icon: Clock,
    iconStyle: 'bg-amber-50 text-amber-600',
  },
} as const

function WithdrawalStatusBadge({ status }: { status: DispatchWithdrawal['status'] }) {
  const cfg = WITHDRAWAL_CFG[status] ?? WITHDRAWAL_CFG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Withdraw drawer ──────────────────────────────────────────────────────────

function WithdrawDrawer({
  balance,
  bankName,
  accountName,
  onClose,
}: {
  balance: number
  bankName: string
  accountName: string
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const { mutate: requestWithdrawal, isPending } = useRequestWithdrawal()
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed = parseInt(amount, 10)
  const isValid = !isNaN(parsed) && parsed > 0 && parsed <= balance

  function handleSubmit() {
    if (!isValid) return
    requestWithdrawal(parsed, {
      onSuccess: () => onClose(),
    })
  }

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[56] bg-card rounded-t-2xl max-w-xl mx-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: 'var(--shadow-elevated)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-strong" />
        </div>

        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold text-text">Request withdrawal</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-surface text-text-muted hover:text-text transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-0.5">Available balance</p>
            <p className="text-xl font-bold text-text">₦{balance.toLocaleString()}</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted block mb-2">
              Amount (₦)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted">₦</span>
              <input
                ref={inputRef}
                type="number"
                min={1}
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-card pl-8 pr-3 py-3 text-base font-semibold text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount(String(balance))}
              className="mt-1.5 text-[11px] text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              Withdraw all (₦{balance.toLocaleString()})
            </button>
          </div>

          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-0.5">Paying to</p>
            <p className="text-sm font-semibold text-text">{accountName}</p>
            <p className="text-xs text-text-muted">{bankName}</p>
          </div>

          <Button
            size="md"
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            loading={isPending}
            className="w-full"
          >
            Submit request
          </Button>
        </div>
      </motion.div>
    </>
  )
}

// ─── Wallet card ──────────────────────────────────────────────────────────────

function WalletCard() {
  const { data: wallet, isLoading } = useDispatchWallet()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl p-6 animate-pulse"
        style={{ background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)' }}>
        <div className="h-3 w-28 rounded bg-white/20 mb-3" />
        <div className="h-10 w-36 rounded bg-white/20 mb-5" />
        <div className="h-9 w-36 rounded-xl bg-white/20" />
      </div>
    )
  }

  if (!wallet) return null

  const hasBank = wallet.paystack_onboarding_complete

  return (
    <>
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
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Wallet balance</p>
          </div>
          <p className="text-4xl font-bold text-white mb-5">₦{wallet.wallet_balance.toLocaleString()}</p>

          {hasBank ? (
            <button
              onClick={() => setDrawerOpen(true)}
              disabled={wallet.wallet_balance === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 transition-colors"
            >
              <ArrowDownToLine size={14} strokeWidth={2.5} />
              {wallet.wallet_balance === 0 ? 'No balance to withdraw' : 'Request withdrawal'}
            </button>
          ) : (
            <a
              href="/dispatch/profile"
              className="inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
            >
              <Building2 size={14} strokeWidth={2} />
              Add bank account
            </a>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {drawerOpen && hasBank && (
          <WithdrawDrawer
            balance={wallet.wallet_balance}
            bankName={wallet.paystack_bank_name ?? ''}
            accountName={wallet.paystack_account_name ?? ''}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Withdrawal history ───────────────────────────────────────────────────────

function WithdrawalHistory() {
  const { data: withdrawals, isLoading } = useDispatchWithdrawals()

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-5 py-3.5 border-b border-border">
          <div className="h-3 w-36 rounded bg-border animate-pulse" />
        </div>
        <div className="p-3 space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-border shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-border" />
                <div className="h-2.5 w-16 rounded bg-border" />
              </div>
              <div className="h-5 w-16 rounded-full bg-border self-center" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const list = withdrawals ?? []
  if (list.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Withdrawal requests</h2>
        <span className="text-[11px] font-semibold text-text-subtle bg-surface rounded-full px-2 py-0.5 border border-border">
          {list.length}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {list.map((w, i) => {
          const cfg = WITHDRAWAL_CFG[w.status] ?? WITHDRAWAL_CFG.pending
          const Icon = cfg.icon
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04 * i }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconStyle}`}>
                <Icon size={15} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text">₦{w.amount.toLocaleString()}</p>
                <p className="text-[11px] text-text-subtle mt-0.5">
                  {new Date(w.requested_at).toLocaleDateString('en-NG', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
                {w.admin_note && (
                  <p className="text-[11px] text-error mt-1 italic truncate">{w.admin_note}</p>
                )}
              </div>
              <WithdrawalStatusBadge status={w.status} />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Delivery card ────────────────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card px-5 py-4 flex gap-4">
      <div className="w-14 h-14 rounded-xl shrink-0 bg-border" />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3 w-2/3 rounded bg-border" />
        <div className="h-2.5 w-1/2 rounded bg-border" />
      </div>
      <div className="h-5 w-16 rounded bg-border self-center" />
    </div>
  )
}

function CompletedCard({ order, index }: { order: CompletedDelivery; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.03 * index }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-4 flex gap-4 hover:border-border-strong hover:shadow-card transition-all duration-150"
    >
      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-emerald-400" />

      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface border border-border">
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
        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-text-muted">
          <span className="truncate max-w-[80px]">{order.listing.area ?? 'Unknown'}</span>
          <ArrowRight size={10} strokeWidth={2} className="shrink-0 opacity-50" />
          <span className="truncate max-w-[80px]">{order.buyer_area}</span>
        </div>
        <p className="text-[11px] mt-1 text-text-subtle">
          {new Date(order.created_at).toLocaleDateString('en-NG', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
      </div>

      <div className="shrink-0 text-right self-center">
        <p className="text-sm font-bold text-success">+₦{order.delivery_fee.toLocaleString()}</p>
        <p className="text-[10px] mt-0.5 text-text-subtle">earned</p>
      </div>
    </motion.div>
  )
}

// ─── Stat mini-card ───────────────────────────────────────────────────────────

function MiniStat({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bgColor,
  lineColor,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
  bgColor: string
  lineColor: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${lineColor}`} />
      <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center mb-3`}>
        <Icon size={16} className={color} strokeWidth={1.75} />
      </div>
      <p className="text-2xl font-bold text-text leading-none">{value}</p>
      {sub && <p className="text-[11px] text-text-subtle mt-0.5">{sub}</p>}
      <p className="text-xs font-medium text-text-muted mt-1">{label}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EarningsPage() {
  const { data: completed, isLoading } = useCompletedDeliveries()

  const now = new Date()
  const nowKey = now.toISOString().slice(0, 7)
  const allCompleted = completed ?? []

  const thisMonth = allCompleted.filter((d) => d.created_at.slice(0, 7) === nowKey)

  const monthlyEarnings = thisMonth.reduce((sum, d) => sum + d.delivery_fee, 0)
  const allTimeEarnings = allCompleted.reduce((sum, d) => sum + d.delivery_fee, 0)

  const monthGroups = useMemo(() => groupByMonth(allCompleted), [allCompleted])

  const currentMonthLabel = now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })

  return (
    <main className="min-h-screen bg-surface">
      <DispatchHeader />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <WalletCard />

        {/* Monthly snapshot */}
        <section className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-subtle px-0.5">
            {currentMonthLabel}
          </p>

          {/* Earnings this month + Deliveries */}
          <div className="grid grid-cols-2 gap-3">
            <MiniStat
              label="Earnings"
              value={`₦${monthlyEarnings.toLocaleString()}`}
              sub="this month"
              icon={TrendingUp}
              color="text-primary"
              bgColor="bg-primary/10"
              lineColor="bg-primary"
            />
            <MiniStat
              label="Deliveries"
              value={thisMonth.length}
              sub="this month"
              icon={Truck}
              color="text-blue-600"
              bgColor="bg-blue-500/10"
              lineColor="bg-blue-500"
            />
          </div>

          {/* All-time summary */}
          <div className="rounded-2xl bg-primary/5 border border-primary/10 px-5 py-4 flex items-center justify-around">
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/60 mb-1">All time</p>
              <p className="text-sm font-bold text-text">{allCompleted.length} deliveries</p>
            </div>
            <div className="w-px h-8 bg-primary/15" />
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/60 mb-1">Total earned</p>
              <p className="text-sm font-bold text-success">₦{allTimeEarnings.toLocaleString()}</p>
            </div>
          </div>
        </section>

        <WithdrawalHistory />

        {/* Delivery history */}
        <section className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-subtle px-0.5">
            Completed deliveries
          </h2>

          {isLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <HistorySkeleton key={i} />)}
            </div>
          )}

          {!isLoading && allCompleted.length === 0 && (
            <div className="py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} className="text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-text mb-1">No completed deliveries yet</p>
              <p className="text-xs text-text-subtle max-w-xs mx-auto">
                Claim a job to get started and start earning.
              </p>
            </div>
          )}

          {monthGroups.map(({ key, orders }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <p className="text-xs font-semibold text-text-muted">{monthLabel(key)}</p>
                <p className="text-xs font-bold text-success">
                  ₦{orders.reduce((s, d) => s + d.delivery_fee, 0).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {orders.map((order, i) => <CompletedCard key={order.id} order={order} index={i} />)}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
