# Dispatch Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the dispatch portal into 3 bottom-nav tabs (Deliveries · Stats · Profile), with available orders and active deliveries on one scrollable page, and earnings + history on a dedicated Stats page.

**Architecture:** The Deliveries tab (`/dispatch`) becomes a single scrollable page: active delivery as a bold hero card at top, available orders below. A new Stats page (`/dispatch/stats`) shows monthly earnings summary and all completed deliveries grouped by month. `DispatchHeader` is extracted to a shared file so both pages can use it.

**Tech Stack:** Next.js App Router, React Query (`useAvailableOrders`, `useMyDeliveries`, `useCompletedDeliveries`), Tailwind CSS 4, Framer Motion, Lucide React

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `app/dispatch/(portal)/DispatchHeader.tsx` | Shared sticky header (logo, greeting, sign-out) |
| Modify | `app/dispatch/(portal)/page.tsx` | Deliveries tab — active hero + available orders |
| Modify | `app/dispatch/(portal)/DispatchNav.tsx` | Add Stats tab, rename Orders → Deliveries |
| Create | `app/dispatch/(portal)/stats/page.tsx` | Stats tab — earnings summary + delivery history |
| No change | `app/dispatch/(portal)/profile/page.tsx` | Kept as-is |

---

## Task 1: Extract DispatchHeader to shared file

**Files:**
- Create: `app/dispatch/(portal)/DispatchHeader.tsx`
- Modify: `app/dispatch/(portal)/page.tsx` (remove the component, add import)

- [ ] **Step 1: Create the shared header file**

Create `app/dispatch/(portal)/DispatchHeader.tsx`:

```tsx
'use client'

import { Truck, LogOut } from 'lucide-react'
import { useMe, useSignOut } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'

export function DispatchHeader() {
  const { data: user } = useMe()
  const { mutate: signOut } = useSignOut()
  const router = useRouter()
  const firstName = user?.name?.split(' ')[0] || 'Hi'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="declut" className="h-7" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text hidden sm:inline">{greeting}, {firstName}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            <Truck size={10} strokeWidth={2.5} />
            Dispatcher
          </span>
          <button
            onClick={() => signOut(undefined, { onSuccess: () => router.push('/dispatch/login') })}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-subtle hover:text-text hover:bg-card transition-colors"
          >
            <LogOut size={13} strokeWidth={2} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Remove DispatchHeader from page.tsx and import from shared file**

In `app/dispatch/(portal)/page.tsx`:

Remove the entire `DispatchHeader` function (lines 37–68) and the `LogOut` import from the lucide imports line.

Add this import near the top of the file (after the existing imports):

```tsx
import { DispatchHeader } from '@/app/dispatch/(portal)/DispatchHeader'
```

The rest of `page.tsx` is unchanged in this task.

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`

Expected: No TypeScript errors. The `/dispatch` route still renders the same header.

- [ ] **Step 4: Commit**

```bash
git add app/dispatch/\(portal\)/DispatchHeader.tsx app/dispatch/\(portal\)/page.tsx
git commit -m "refactor: extract DispatchHeader to shared file"
```

---

## Task 2: Update DispatchNav to 3 tabs

**Files:**
- Modify: `app/dispatch/(portal)/DispatchNav.tsx`

- [ ] **Step 1: Add Stats tab and rename Orders → Deliveries**

Replace the entire contents of `app/dispatch/(portal)/DispatchNav.tsx` with:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Truck, BarChart2, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dispatch', label: 'Deliveries', icon: Truck },
  { href: '/dispatch/stats', label: 'Stats', icon: BarChart2 },
  { href: '/dispatch/profile', label: 'Profile', icon: User },
]

export function DispatchNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/90 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-xl mx-auto flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-3 relative"
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
              <Icon
                size={20}
                strokeWidth={isActive ? 2 : 1.75}
                className={isActive ? 'text-primary' : 'text-text-subtle'}
              />
              <span className={`text-[11px] font-semibold ${isActive ? 'text-primary' : 'text-text-subtle'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: No errors. The nav now shows 3 tabs.

- [ ] **Step 3: Commit**

```bash
git add app/dispatch/\(portal\)/DispatchNav.tsx
git commit -m "feat: update dispatch nav to 3 tabs (Deliveries, Stats, Profile)"
```

---

## Task 3: Rewrite the Deliveries page

**Files:**
- Modify: `app/dispatch/(portal)/page.tsx`

The page loses: `EarningsHero`, `StatsRow`, `MonthSummaryRow`, `CompletedCard`, the 3-tab UI, and all `completed` data fetching.

It gains: `ActiveHeroCard` (bold hero for active deliveries), and a redesigned `AvailableOrderCard` with a large fee number.

- [ ] **Step 1: Replace page.tsx with the new Deliveries page**

Replace the entire contents of `app/dispatch/(portal)/page.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ListingImage } from '@/components/ui'
import {
  Package, MapPin, KeyRound, ArrowRight,
  Truck, Phone, Copy, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useAvailableOrders,
  useMyDeliveries,
  useClaimOrder,
  useVerifyDelivery,
  type DispatchOrder,
} from '@/lib/hooks/useDispatch'
import { Button } from '@/components/ui'
import { DispatchHeader } from '@/app/dispatch/(portal)/DispatchHeader'

// ─── Skeleton ────────────────────────────────────────────────────────────────

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

// ─── Active delivery hero card ────────────────────────────────────────────────

function ActiveHeroCard({ order }: { order: DispatchOrder }) {
  const [code, setCode] = useState('')
  const { mutate: verify, isPending } = useVerifyDelivery()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border-2 border-primary/25 bg-card overflow-hidden"
    >
      <div className="h-1 bg-primary w-full" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
            <Clock size={10} strokeWidth={3} />
            Active Delivery
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
            In transit
          </span>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface">
            {order.listing.images?.[0] ? (
              <ListingImage
                src={order.listing.images[0]}
                fill
                sizes="64px"
                className="object-cover"
                alt={order.listing.title}
              />
            ) : (
              <Package size={18} strokeWidth={1.5} className="text-text-subtle" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-text truncate">{order.listing.title}</p>
            {order.buyer_name && (
              <p className="text-sm text-text-muted mt-0.5">{order.buyer_name}</p>
            )}
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
              <span className="text-sm font-semibold text-primary">Call buyer</span>
              <span className="ml-auto text-xs font-mono text-text-muted">{order.buyer_phone}</span>
            </a>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(order.buyer_phone!).then(
                  () => toast.success('Phone number copied'),
                  () => toast.error('Could not copy — tap the number to copy manually'),
                )
              }
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
      </div>
    </motion.div>
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
      <div className="flex gap-3 items-center mb-4">
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
            <span className="truncate max-w-[80px]">{order.listing.area ?? 'Unknown'}</span>
            <ArrowRight size={10} strokeWidth={2} className="shrink-0" />
            <span className="truncate max-w-[80px]">{order.buyer_area ?? 'Unknown'}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-extrabold text-primary leading-none">
            ₦{order.delivery_fee.toLocaleString()}
          </p>
          <p className="text-[10px] mt-1 text-text-subtle font-medium">delivery fee</p>
        </div>
      </div>

      <Button
        size="sm"
        loading={isPending}
        disabled={isPending}
        onClick={() => claim(order.id)}
        className="w-full"
      >
        Claim delivery
      </Button>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DispatchPortalPage() {
  const { data: available, isLoading: loadingAvailable } = useAvailableOrders()
  const { data: mine, isLoading: loadingMine } = useMyDeliveries()

  const activeCount = mine?.length ?? 0
  const availableCount = available?.length ?? 0

  return (
    <main className="min-h-screen bg-surface">
      <DispatchHeader />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Active delivery hero */}
        {loadingMine && <OrderSkeleton />}
        {!loadingMine && activeCount > 0 && (
          <div className="flex flex-col gap-3">
            {mine!.map((order) => <ActiveHeroCard key={order.id} order={order} />)}
          </div>
        )}
        {!loadingMine && activeCount === 0 && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-2">
            <Truck size={14} strokeWidth={1.75} className="text-text-subtle shrink-0" />
            <p className="text-sm text-text-subtle">Ready for your next job?</p>
          </div>
        )}

        {/* Available orders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-subtle">
              Available Deliveries
            </h2>
            {availableCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success text-white text-[10px] font-bold">
                {availableCount}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {loadingAvailable && [1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
            {!loadingAvailable && (!available || available.length === 0) && (
              <div className="py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
                  <Truck size={24} className="text-primary" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-semibold text-text mb-1">No deliveries available</p>
                <p className="text-xs text-text-subtle max-w-xs mx-auto">
                  Check back soon — new orders appear when sellers confirm shipment.
                </p>
              </div>
            )}
            {available?.map((order) => <AvailableOrderCard key={order.id} order={order} />)}
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: No TypeScript errors. The `/dispatch` route compiles cleanly.

- [ ] **Step 3: Commit**

```bash
git add app/dispatch/\(portal\)/page.tsx
git commit -m "feat: redesign deliveries tab — active hero card + available orders"
```

---

## Task 4: Create the Stats page

**Files:**
- Create: `app/dispatch/(portal)/stats/page.tsx`

- [ ] **Step 1: Create the stats page**

Create `app/dispatch/(portal)/stats/page.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import { ListingImage } from '@/components/ui'
import { Package, ArrowRight, CheckCircle2 } from 'lucide-react'
import {
  useCompletedDeliveries,
  type CompletedDelivery,
} from '@/lib/hooks/useDispatch'
import { DispatchHeader } from '@/app/dispatch/(portal)/DispatchHeader'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return new Date(yearMonth + '-01').toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  })
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { data: completed, isLoading } = useCompletedDeliveries()

  const now = new Date()
  const allCompleted = completed ?? []

  const thisMonth = allCompleted.filter((d) => {
    const date = new Date(d.created_at)
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    )
  })

  const monthlyEarnings = thisMonth.reduce((sum, d) => sum + d.delivery_fee, 0)
  const avgPerJob = thisMonth.length > 0 ? Math.round(monthlyEarnings / thisMonth.length) : 0
  const allTimeEarnings = allCompleted.reduce((sum, d) => sum + d.delivery_fee, 0)

  const monthGroups = groupByMonth(allCompleted)

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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: No TypeScript errors. The `/dispatch/stats` route compiles.

- [ ] **Step 3: Commit**

```bash
git add "app/dispatch/(portal)/stats/page.tsx"
git commit -m "feat: add Stats page with earnings summary and delivery history"
```

---

## Self-Review

**Spec coverage:**
- ✅ 3-tab bottom nav (Deliveries · Stats · Profile) — Task 2
- ✅ Deliveries tab is the default login landing page (it's `/dispatch`, unchanged route)
- ✅ Active delivery hero card at top of Deliveries tab — Task 3 `ActiveHeroCard`
- ✅ Available orders below with large fee text — Task 3 `AvailableOrderCard`
- ✅ Stats tab: monthly earnings headline, deliveries count, avg/job, all-time totals — Task 4
- ✅ Stats tab: history grouped by month, newest first, monthly subtotals — Task 4 `groupByMonth`
- ✅ Profile tab unchanged — no task needed
- ✅ Light background, no dark backgrounds — no dark gradients used in new pages
- ✅ Bold fee text (text-2xl font-extrabold) on available order cards
- ✅ Active hero card has primary accent stripe (h-1 bg-primary at top) and border

**Placeholder scan:** None found.

**Type consistency:**
- `DispatchOrder` used in Tasks 3 — imported from `@/lib/hooks/useDispatch` ✅
- `CompletedDelivery` used in Task 4 — imported from `@/lib/hooks/useDispatch` ✅
- `useClaimOrder`, `useVerifyDelivery`, `useAvailableOrders`, `useMyDeliveries`, `useCompletedDeliveries` — all from same hook file ✅
- `DispatchHeader` — created in Task 1, imported in Tasks 3 and 4 ✅
