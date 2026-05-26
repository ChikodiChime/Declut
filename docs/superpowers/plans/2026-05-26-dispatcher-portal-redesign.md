# Dispatcher Portal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the dispatcher portal from a bare two-tab list into a proper gig-worker companion app — with earnings visibility, route context on job cards, seller pickup zone on active delivery cards, and a completed deliveries history tab.

**Architecture:** Three API changes (two extensions, one new endpoint) expose the data the UI needs. The hook layer gains a new `useCompletedDeliveries` hook and a `CompletedDelivery` type. The portal page is replaced wholesale — same routes, new components.

**Tech Stack:** Next.js 16 App Router, Supabase (supabaseAdmin), TanStack Query, Framer Motion, Lucide, Tailwind CSS 4, `ListingImage` from `@/components/ui`.

---

## File Map

**Modify:**
- `app/api/dispatch/orders/route.ts` — add `buyer_address` to select, derive and return `buyer_area`, strip raw address from response
- `app/api/dispatch/orders/mine/route.ts` — add `area` to the listings sub-select
- `lib/hooks/useDispatch.ts` — add `buyer_area?: string` to `DispatchOrder`, add `CompletedDelivery` type, add `useCompletedDeliveries`, invalidate `completed` on verify

**Create:**
- `app/api/dispatch/orders/completed/route.ts` — GET delivered orders for the dispatcher with `buyer_area`

**Replace:**
- `app/dispatch/page.tsx` — new header, earnings hero, upgraded cards, three-tab layout

---

## Task 1: Extend available orders API with `buyer_area`

**Files:**
- Modify: `app/api/dispatch/orders/route.ts`

Available orders currently don't include `buyer_address` so there's no zone to show. We fetch it, derive a zone label from the second comma-segment (neighbourhood-level, matches `listing.area` granularity), and return `buyer_area` in place of the raw address.

- [ ] **Step 1: Replace `app/api/dispatch/orders/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

function deriveBuyerArea(address: string | null): string {
  if (!address) return 'Lagos'
  const parts = address.split(',')
  return parts.length > 1 ? parts[1].trim() : parts[0].trim()
}

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, total_price, delivery_fee, buyer_address, created_at,
      listing:listings(id, title, images, area)
    `)
    .eq('status', 'confirmed')
    .eq('delivery_type', 'delivery')
    .is('dispatcher_id', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetch available orders error:', error)
    return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  }

  const mapped = (orders ?? []).map(({ buyer_address, ...order }) => ({
    ...order,
    buyer_area: deriveBuyerArea(buyer_address),
  }))

  return ok(mapped)
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | grep "dispatch/orders/route"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/api/dispatch/orders/route.ts
git commit -m "feat: add buyer_area to available dispatch orders response"
```

---

## Task 2: Extend my deliveries API with `listing.area`

**Files:**
- Modify: `app/api/dispatch/orders/mine/route.ts`

Active deliveries need `listing.area` so the card can show "Collect from: [seller zone]".

- [ ] **Step 1: Replace `app/api/dispatch/orders/mine/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, total_price, delivery_fee, buyer_name, buyer_phone, buyer_address, created_at,
      listing:listings(id, title, images, area)
    `)
    .eq('dispatcher_id', authUser.id)
    .eq('status', 'shipped')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetch my deliveries error:', error)
    return err('Failed to fetch deliveries', 'SERVER_ERROR', 500)
  }

  return ok(orders ?? [])
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | grep "dispatch/orders/mine"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/api/dispatch/orders/mine/route.ts
git commit -m "feat: add listing.area to my deliveries response"
```

---

## Task 3: Create completed orders API

**Files:**
- Create: `app/api/dispatch/orders/completed/route.ts`

New read-only endpoint: the dispatcher's delivered orders, most recent first, with `buyer_area` derived server-side.

- [ ] **Step 1: Create `app/api/dispatch/orders/completed/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

function deriveBuyerArea(address: string | null): string {
  if (!address) return 'Lagos'
  const parts = address.split(',')
  return parts.length > 1 ? parts[1].trim() : parts[0].trim()
}

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, delivery_fee, buyer_address, created_at,
      listing:listings(title, images, area)
    `)
    .eq('dispatcher_id', authUser.id)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch completed deliveries error:', error)
    return err('Failed to fetch completed deliveries', 'SERVER_ERROR', 500)
  }

  const mapped = (orders ?? []).map(({ buyer_address, ...order }) => ({
    ...order,
    buyer_area: deriveBuyerArea(buyer_address),
  }))

  return ok(mapped)
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | grep "dispatch/orders/completed"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/api/dispatch/orders/completed/route.ts"
git commit -m "feat: add GET /api/dispatch/orders/completed endpoint"
```

---

## Task 4: Update dispatch hooks

**Files:**
- Modify: `lib/hooks/useDispatch.ts`

Add `buyer_area?: string` to `DispatchOrder`, add `CompletedDelivery` type, add `useCompletedDeliveries` hook, and invalidate `['dispatch', 'completed']` when a delivery is verified.

- [ ] **Step 1: Replace `lib/hooks/useDispatch.ts`**

```typescript
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type DispatchOrder = {
  id: string
  status: string
  delivery_type: 'delivery'
  total_price: number
  delivery_fee: number
  buyer_address: string
  buyer_area?: string
  buyer_name?: string
  buyer_phone?: string
  created_at: string
  listing: {
    id: string
    title: string
    images: string[]
    area?: string
  }
}

export type CompletedDelivery = {
  id: string
  delivery_fee: number
  buyer_area: string
  created_at: string
  listing: {
    title: string
    images: string[]
    area?: string
  }
}

async function apiRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Something went wrong')
  return json
}

export function useAvailableOrders() {
  return useQuery<DispatchOrder[]>({
    queryKey: ['dispatch', 'available'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/dispatch/orders')
      return json.data
    },
    refetchInterval: 30_000,
  })
}

export function useMyDeliveries() {
  return useQuery<DispatchOrder[]>({
    queryKey: ['dispatch', 'mine'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/dispatch/orders/mine')
      return json.data
    },
  })
}

export function useCompletedDeliveries() {
  return useQuery<CompletedDelivery[]>({
    queryKey: ['dispatch', 'completed'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/dispatch/orders/completed')
      return json.data
    },
  })
}

export function useClaimOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/dispatch/orders/${id}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'available'] })
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'mine'] })
      toast.success('Order claimed — go collect it from the seller')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useVerifyDelivery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) =>
      apiRequest('POST', `/api/dispatch/orders/${id}/verify`, { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'completed'] })
      toast.success('Delivery confirmed!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | grep "useDispatch"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useDispatch.ts
git commit -m "feat: add CompletedDelivery type, useCompletedDeliveries hook, invalidate on verify"
```

---

## Task 5: Overhaul dispatch portal page

**Files:**
- Modify: `app/dispatch/page.tsx`

Full replacement. The new page has: a header showing the dispatcher's first name and sign-out (no "My purchases"); an earnings hero above the tabs; three tabs (Available / My deliveries / Completed); upgraded available card with route row and prominent delivery fee; upgraded active delivery card with collect-from + deliver-to block; completed tab with monthly summary row and per-delivery earnings cards.

- [ ] **Step 1: Replace `app/dispatch/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ListingImage } from '@/components/ui'
import { Package, MapPin, KeyRound, ArrowRight, LogOut } from 'lucide-react'
import {
  useAvailableOrders,
  useMyDeliveries,
  useCompletedDeliveries,
  useClaimOrder,
  useVerifyDelivery,
  type DispatchOrder,
  type CompletedDelivery,
} from '@/lib/hooks/useDispatch'
import { useSignOut, useMe } from '@/lib/hooks/useAuth'

// ─── Header ──────────────────────────────────────────────────────────────────

function DispatchHeader() {
  const { mutate: signOut } = useSignOut()
  const { data: user } = useMe()
  const firstName = user?.name?.split(' ')[0] ?? 'Hi'

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ background: 'rgba(250,250,248,0.93)', backdropFilter: 'blur(14px)', borderColor: '#e8e4dc' }}
    >
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="declut" className="h-7" />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: '#16130f' }}>{firstName}</span>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors hover:bg-card"
            style={{ color: '#a8a09a' }}
          >
            <LogOut size={13} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Earnings hero ────────────────────────────────────────────────────────────

function EarningsHero() {
  const { data: completed } = useCompletedDeliveries()

  const now = new Date()
  const thisMonth = (completed ?? []).filter((d) => {
    const date = new Date(d.created_at)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })

  const earnings = thisMonth.reduce((sum, d) => sum + d.delivery_fee, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl p-4 mb-6 flex gap-6"
      style={{ background: '#f5f1eb' }}
    >
      <div className="flex-1">
        <p className="text-xs font-medium mb-0.5" style={{ color: '#78726c' }}>This month</p>
        <p className="text-xl font-bold" style={{ color: '#16130f' }}>₦{earnings.toLocaleString()}</p>
      </div>
      <div className="w-px self-stretch" style={{ background: '#e8e4dc' }} />
      <div className="flex-1">
        <p className="text-xs font-medium mb-0.5" style={{ color: '#78726c' }}>Deliveries</p>
        <p className="text-xl font-bold" style={{ color: '#16130f' }}>{thisMonth.length}</p>
      </div>
    </motion.div>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border p-4" style={{ borderColor: '#e8e4dc' }}>
      <div className="flex gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl shrink-0" style={{ background: '#f0ece5' }} />
        <div className="flex-1 flex flex-col gap-2 justify-center">
          <div className="h-3 w-2/3 rounded" style={{ background: '#f0ece5' }} />
          <div className="h-3 w-1/2 rounded" style={{ background: '#f0ece5' }} />
        </div>
      </div>
      <div className="h-8 rounded-xl" style={{ background: '#f0ece5' }} />
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
      className="rounded-2xl border bg-card p-4"
      style={{ borderColor: '#e8e4dc' }}
    >
      <div className="flex gap-3 mb-3">
        <div
          className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: '#f0ece5' }}
        >
          {order.listing.images?.[0] ? (
            <ListingImage
              src={order.listing.images[0]}
              fill
              sizes="56px"
              className="object-cover"
              alt={order.listing.title}
            />
          ) : (
            <Package size={16} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>
            {order.listing.title}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#78726c' }}>
            <span className="truncate max-w-[80px]">{order.listing.area ?? 'Lagos'}</span>
            <ArrowRight size={10} strokeWidth={2} className="shrink-0" />
            <span className="truncate max-w-[80px]">{order.buyer_area ?? 'Lagos'}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-bold leading-tight" style={{ color: '#4f46e5' }}>
            ₦{order.delivery_fee.toLocaleString()}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: '#a8a09a' }}>delivery fee</p>
        </div>
      </div>

      <button
        onClick={() => claim(order.id)}
        disabled={isPending}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: '#4f46e5' }}
      >
        {isPending ? 'Claiming…' : 'Claim this delivery'}
      </button>
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
      className="rounded-2xl border bg-card p-4"
      style={{ borderColor: '#e8e4dc' }}
    >
      <div className="flex gap-3 mb-4">
        <div
          className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: '#f0ece5' }}
        >
          {order.listing.images?.[0] ? (
            <ListingImage
              src={order.listing.images[0]}
              fill
              sizes="56px"
              className="object-cover"
              alt={order.listing.title}
            />
          ) : (
            <Package size={16} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>
            {order.listing.title}
          </p>
          {order.buyer_name && (
            <p className="text-xs mt-0.5" style={{ color: '#78726c' }}>{order.buyer_name}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl p-3 flex flex-col gap-2.5 mb-3" style={{ background: '#f5f1eb' }}>
        <div className="flex items-start gap-2 text-xs">
          <Package size={12} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: '#a8a09a' }} />
          <div>
            <p className="font-semibold mb-0.5" style={{ color: '#16130f' }}>Collect from</p>
            <p style={{ color: '#78726c' }}>{order.listing.area ?? 'Lagos'}</p>
          </div>
        </div>
        <div className="h-px" style={{ background: '#e8e4dc' }} />
        <div className="flex items-start gap-2 text-xs">
          <MapPin size={12} strokeWidth={2} className="shrink-0 mt-0.5" style={{ color: '#a8a09a' }} />
          <div>
            <p className="font-semibold mb-0.5" style={{ color: '#16130f' }}>Deliver to</p>
            <p style={{ color: '#78726c' }}>{order.buyer_address}</p>
          </div>
        </div>
      </div>

      <p className="text-xs mb-3" style={{ color: '#a8a09a' }}>
        Ask the buyer for their 4-digit code when you arrive.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <KeyRound
            size={12}
            strokeWidth={2}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: '#a8a09a' }}
          />
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="0000"
            className="w-full rounded-xl border pl-7 pr-3 py-2.5 text-sm font-mono tracking-widest outline-none focus:ring-2"
            style={{ borderColor: '#e8e4dc', background: 'white', color: '#16130f' }}
          />
        </div>
        <button
          onClick={() => verify({ id: order.id, code })}
          disabled={isPending || code.length !== 4}
          className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#10b981' }}
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
      className="rounded-2xl border bg-card p-4 flex gap-3"
      style={{ borderColor: '#e8e4dc' }}
    >
      <div
        className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: '#f0ece5' }}
      >
        {order.listing.images?.[0] ? (
          <ListingImage
            src={order.listing.images[0]}
            fill
            sizes="56px"
            className="object-cover"
            alt={order.listing.title}
          />
        ) : (
          <Package size={16} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>
          {order.listing.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#78726c' }}>
          <span className="truncate max-w-[70px]">{order.listing.area ?? 'Lagos'}</span>
          <ArrowRight size={10} strokeWidth={2} className="shrink-0" />
          <span className="truncate max-w-[70px]">{order.buyer_area}</span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#a8a09a' }}>
          {new Date(order.created_at).toLocaleDateString('en-NG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-bold" style={{ color: '#10b981' }}>
          +₦{order.delivery_fee.toLocaleString()}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: '#a8a09a' }}>earned</p>
      </div>
    </motion.div>
  )
}

// ─── Monthly summary row ──────────────────────────────────────────────────────

function MonthSummaryRow({ orders }: { orders: CompletedDelivery[] }) {
  const now = new Date()
  const thisMonth = orders.filter((d) => {
    const date = new Date(d.created_at)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })

  if (thisMonth.length === 0) return null

  const earnings = thisMonth.reduce((sum, d) => sum + d.delivery_fee, 0)
  const monthName = now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })

  return (
    <div
      className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
      style={{ background: '#f5f1eb' }}
    >
      <p className="text-xs font-medium" style={{ color: '#78726c' }}>{monthName}</p>
      <p className="text-sm font-bold" style={{ color: '#10b981' }}>
        ₦{earnings.toLocaleString()} · {thisMonth.length} {thisMonth.length === 1 ? 'delivery' : 'deliveries'}
      </p>
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

  return (
    <main className="min-h-screen bg-surface">
      <DispatchHeader />

      <div className="max-w-xl mx-auto px-4 py-6">
        <EarningsHero />

        <div className="inline-flex gap-0.5 rounded-full p-0.5 mb-6" style={{ background: '#f0ece5' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200"
              style={{
                background: tab === t.id ? '#4f46e5' : 'transparent',
                color: tab === t.id ? 'white' : '#78726c',
                boxShadow: tab === t.id ? '0 1px 4px rgba(79,70,229,0.35)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'available' && (
          <div className="flex flex-col gap-3">
            {loadingAvailable && [1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
            {!loadingAvailable && (!available || available.length === 0) && (
              <div className="py-20 text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: '#16130f' }}>No deliveries available</p>
                <p className="text-xs" style={{ color: '#a8a09a' }}>
                  Check back soon — new orders appear when sellers confirm them.
                </p>
              </div>
            )}
            {available?.map((order) => <AvailableOrderCard key={order.id} order={order} />)}
          </div>
        )}

        {tab === 'mine' && (
          <div className="flex flex-col gap-3">
            {loadingMine && [1, 2].map((i) => <OrderSkeleton key={i} />)}
            {!loadingMine && (!mine || mine.length === 0) && (
              <div className="py-20 text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: '#16130f' }}>No active deliveries</p>
                <p className="text-xs" style={{ color: '#a8a09a' }}>Orders you claim will appear here.</p>
              </div>
            )}
            {mine?.map((order) => <DeliveryCard key={order.id} order={order} />)}
          </div>
        )}

        {tab === 'completed' && (
          <div className="flex flex-col gap-3">
            {loadingCompleted && [1, 2].map((i) => <OrderSkeleton key={i} />)}
            {!loadingCompleted && (!completed || completed.length === 0) && (
              <div className="py-20 text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: '#16130f' }}>No completed deliveries yet</p>
                <p className="text-xs" style={{ color: '#a8a09a' }}>
                  Claim a job from Available to get started.
                </p>
              </div>
            )}
            {completed && completed.length > 0 && (
              <>
                <MonthSummaryRow orders={completed} />
                {completed.map((order) => <CompletedCard key={order.id} order={order} />)}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | grep "dispatch"
```

Expected: no output.

- [ ] **Step 3: Test in browser**

Start the dev server (`npm run dev`). Log in as a dispatcher at `http://localhost:3000/dispatch`.

Verify:
- Header shows dispatcher's first name and a sign-out button (no "My purchases" link)
- Earnings hero shows ₦0 / 0 for a fresh account
- Three pill tabs: Available, My deliveries, Completed
- Available tab: each card shows item image, route row (`[zone] → [zone]`), delivery fee large and bold, full-width "Claim this delivery" button
- My deliveries tab: each card shows "Collect from" and "Deliver to" address blocks above the code entry
- Completed tab: empty state shows correctly; after completing a delivery it shows the monthly summary row and per-delivery earnings card

- [ ] **Step 4: Commit**

```bash
git add app/dispatch/page.tsx
git commit -m "feat: overhaul dispatcher portal — earnings hero, route cards, completed tab"
```

---

## Self-Review

**Spec coverage:**
- ✅ Header: shows dispatcher name, removes "My purchases" — Task 5
- ✅ Earnings hero with monthly earnings + delivery count — Task 5 (data from Task 3 via Task 4)
- ✅ Available card: pickup zone → drop-off zone route row — Tasks 1 + 5
- ✅ Available card: delivery fee large and prominent — Task 5
- ✅ Active delivery card: "Collect from" seller zone — Tasks 2 + 5
- ✅ Active delivery card: "Deliver to" full buyer address — Task 5
- ✅ Completed tab with monthly summary row — Task 5
- ✅ Per-delivery cards with fee earned (green, right-aligned) — Task 5
- ✅ Completed tab empty state — Task 5
- ✅ `buyer_area` server-derived, no DB change — Tasks 1 + 3
- ✅ `useCompletedDeliveries` hook — Task 4
- ✅ Verify delivery invalidates completed query — Task 4

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `CompletedDelivery` defined in Task 4 (`useDispatch.ts`), used in Task 5 (`dispatch/page.tsx`) ✅
- `DispatchOrder.buyer_area` added in Task 4, populated by API in Task 1 ✅
- `DispatchOrder.listing.area` already typed as `area?: string` in Task 4; API in Task 2 now returns it ✅
- `useCompletedDeliveries` defined in Task 4, imported in Task 5 ✅
- `deriveBuyerArea` defined locally in Tasks 1 and 3 (two separate files, not shared — YAGNI) ✅
