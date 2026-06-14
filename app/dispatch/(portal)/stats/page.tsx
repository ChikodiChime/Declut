'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ListingImage } from '@/components/ui'
import { Package, ArrowRight, CheckCircle2 } from 'lucide-react'
import {
  useCompletedDeliveries,
  type CompletedDelivery,
} from '@/lib/hooks/useDispatch'
import { DispatchHeader } from '@/app/dispatch/(portal)/DispatchHeader'

function groupByMonth(deliveries: CompletedDelivery[]) {
  const groups: Record<string, CompletedDelivery[]> = {}
  for (const d of deliveries) {
    const key = d.created_at.slice(0, 7) // "YYYY-MM"
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

export default function StatsPage() {
  const { data: completed, isLoading } = useCompletedDeliveries()

  const now = new Date()
  const nowKey = now.toISOString().slice(0, 7) // "YYYY-MM" in UTC
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
        {/* Earnings summary */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-subtle mb-4">
            {now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
          </p>

          {/* Headline */}
          <div className="rounded-2xl border border-border bg-card p-5 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">
              Earnings this month
            </p>
            <p className="text-4xl font-extrabold text-text">
              ₦{monthlyEarnings.toLocaleString()}
            </p>
          </div>

          {/* Supporting stats */}
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

          {/* All-time */}
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

        {/* Delivery history */}
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
