'use client'

import { useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListingImage } from '@/components/ui'
import { Button } from '@/components/ui'
import { Package, ArrowRight, CheckCircle2, X, Building2, Clock, XCircle } from 'lucide-react'
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

function WithdrawalStatusBadge({ status }: { status: DispatchWithdrawal['status'] }) {
  if (status === 'processed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
        <CheckCircle2 size={10} strokeWidth={2.5} />
        Processed
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
        <XCircle size={10} strokeWidth={2.5} />
        Rejected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
      <Clock size={10} strokeWidth={2.5} />
      Pending
    </span>
  )
}

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
        className="fixed inset-0 z-[55] bg-black/40"
      />
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[56] bg-card rounded-t-2xl max-w-xl mx-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
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
          <p className="text-sm text-text-muted">
            Available balance:{' '}
            <span className="font-semibold text-text">₦{balance.toLocaleString()}</span>
          </p>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted block mb-2">
              Amount (₦)
            </label>
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base font-semibold text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <p className="text-xs text-text-muted mb-0.5">Paying to</p>
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

function WalletCard() {
  const { data: wallet, isLoading } = useDispatchWallet()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="h-3 w-28 rounded bg-border mb-3" />
        <div className="h-8 w-36 rounded bg-border mb-4" />
        <div className="h-9 w-32 rounded-lg bg-border" />
      </div>
    )
  }

  if (!wallet) return null

  const hasBank = wallet.paystack_onboarding_complete

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">
          Wallet balance
        </p>
        <p className="text-4xl font-extrabold text-text mb-4">
          ₦{wallet.wallet_balance.toLocaleString()}
        </p>
        {hasBank ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDrawerOpen(true)}
            disabled={wallet.wallet_balance === 0}
          >
            Withdraw
          </Button>
        ) : (
          <a
            href="/dispatch/profile"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <Building2 size={14} strokeWidth={2} />
            Add bank account
          </a>
        )}
      </div>

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

function WithdrawalHistory() {
  const { data: withdrawals, isLoading } = useDispatchWithdrawals()

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 flex gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-border" />
              <div className="h-3 w-16 rounded bg-border" />
            </div>
            <div className="h-5 w-16 rounded bg-border self-center" />
          </div>
        ))}
      </div>
    )
  }

  const list = withdrawals ?? []

  if (list.length === 0) return null

  return (
    <section>
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-subtle mb-4">
        Withdrawal requests
      </h2>
      <div className="flex flex-col gap-2">
        {list.map((w) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text">₦{w.amount.toLocaleString()}</p>
              <p className="text-xs text-text-muted">
                {new Date(w.requested_at).toLocaleDateString('en-NG', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
              {w.admin_note && (
                <p className="text-xs text-text-subtle mt-0.5 truncate">{w.admin_note}</p>
              )}
            </div>
            <WithdrawalStatusBadge status={w.status} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function HistorySkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-4 flex gap-3">
      <div className="w-14 h-14 rounded-xl shrink-0 bg-border" />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3 w-2/3 rounded bg-border" />
        <div className="h-3 w-1/2 rounded bg-border" />
      </div>
      <div className="h-5 w-16 rounded bg-border self-center" />
    </div>
  )
}

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
          <span className="truncate max-w-[70px]">{order.listing.area ?? 'Unknown'}</span>
          <ArrowRight size={10} strokeWidth={2} className="shrink-0" />
          <span className="truncate max-w-[70px]">{order.buyer_area}</span>
        </div>
        <p className="text-xs mt-1 text-text-subtle">
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

export default function EarningsPage() {
  const { data: completed, isLoading } = useCompletedDeliveries()

  const now = new Date()
  const nowKey = now.toISOString().slice(0, 7)
  const allCompleted = completed ?? []

  const thisMonth = allCompleted.filter((d) => d.created_at.slice(0, 7) === nowKey)

  const monthlyEarnings = thisMonth.reduce((sum, d) => sum + d.delivery_fee, 0)
  const avgPerJob = thisMonth.length > 0 ? Math.round(monthlyEarnings / thisMonth.length) : 0
  const allTimeEarnings = allCompleted.reduce((sum, d) => sum + d.delivery_fee, 0)

  const monthGroups = useMemo(() => groupByMonth(allCompleted), [allCompleted])

  return (
    <main className="min-h-screen bg-surface">
      <DispatchHeader />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
        <WalletCard />

        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-subtle mb-4">
            {now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
          </p>

          <div className="rounded-2xl border border-border bg-card p-5 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">
              Earnings this month
            </p>
            <p className="text-4xl font-extrabold text-text">
              ₦{monthlyEarnings.toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">
                Deliveries
              </p>
              <p className="text-2xl font-extrabold text-text">{thisMonth.length}</p>
              <p className="text-xs text-text-subtle mt-0.5">this month</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">
                Avg / job
              </p>
              <p className="text-2xl font-extrabold text-text">
                {avgPerJob > 0 ? `₦${avgPerJob.toLocaleString()}` : '—'}
              </p>
              <p className="text-xs text-text-subtle mt-0.5">this month</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-around">
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-subtle mb-0.5">
                All time
              </p>
              <p className="text-sm font-bold text-text">{allCompleted.length} deliveries</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-subtle mb-0.5">
                Total earned
              </p>
              <p className="text-sm font-bold text-success">₦{allTimeEarnings.toLocaleString()}</p>
            </div>
          </div>
        </section>

        <WithdrawalHistory />

        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-subtle mb-4">
            Completed Deliveries
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
            <div key={key} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-text-muted">{monthLabel(key)}</p>
                <p className="text-xs font-bold text-success">
                  ₦{orders.reduce((s, d) => s + d.delivery_fee, 0).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {orders.map((order) => <CompletedCard key={order.id} order={order} />)}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
