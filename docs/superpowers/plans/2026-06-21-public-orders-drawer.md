# Public Orders Drawer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A right-side drawer that lets buyers track and manage orders without visiting the dashboard — auto-opens on the checkout success page (works for guests via Paystack reference) and accessible from the nav profile menu for logged-in users.

**Architecture:** A global `OrdersModalContext` holds drawer state and pre-fetched reference orders. The drawer has two animated screens — list and detail — both using existing React Query hooks for logged-in users and context-stored data for guests. A new public `/api/orders/by-reference` endpoint handles reference-based lookups without auth.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query v5, Framer Motion, Tailwind 4, Supabase (supabaseAdmin), next-cloudinary, sonner (toasts), lucide-react

## Global Constraints

- Path alias `@/` maps to project root — use it for all imports
- Tailwind 4: no config file, tokens in `globals.css` via `@theme inline`; use CSS variables like `var(--color-border)`, `var(--shadow-card)` for custom styles
- Next.js 16: middleware is called Proxy (`proxy.ts`); read `node_modules/next/dist/docs/` before writing Next.js-specific code
- All new components are `'use client'` unless they are pure RSC (no hooks, no browser APIs)
- Follow existing naming: PascalCase components, kebab-case utilities
- No comments unless the WHY is non-obvious

---

### Task 1: Extract `groupByCheckout` to shared util

**Files:**
- Create: `lib/utils/orders.ts`
- Modify: `app/dashboard/orders/page.tsx` (import from new location, remove local definition)

**Interfaces:**
- Produces: `groupByCheckout(orders: BuyerOrder[]): CheckoutGroup[]` and `type CheckoutGroup`

- [ ] **Step 1: Create `lib/utils/orders.ts`**

```ts
// lib/utils/orders.ts
import type { BuyerOrder } from '@/lib/hooks/useBuyerOrders'

export type CheckoutGroup = {
  paystackReference: string | null
  orders: BuyerOrder[]
  createdAt: string
}

export function groupByCheckout(orders: BuyerOrder[]): CheckoutGroup[] {
  const map = new Map<string, BuyerOrder[]>()
  for (const order of orders) {
    const key = order.paystack_reference ?? order.id
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(order)
  }
  return Array.from(map.entries()).map(([, group]) => ({
    paystackReference: group[0].paystack_reference,
    orders: group,
    createdAt: group[0].created_at,
  }))
}
```

- [ ] **Step 2: Update `app/dashboard/orders/page.tsx`**

At the top of the file, add the import:
```ts
import { groupByCheckout, type CheckoutGroup } from '@/lib/utils/orders'
```

Remove the local `CheckoutGroup` type definition (around line 459) and the local `groupByCheckout` function (around lines 465-477).

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/utils/orders.ts app/dashboard/orders/page.tsx
git commit -m "refactor: extract groupByCheckout to lib/utils/orders"
```

---

### Task 2: Extract shared order display components

**Files:**
- Create: `components/orders/OrderProgressHero.tsx`
- Create: `components/orders/DeliveryCode.tsx`
- Create: `components/orders/ReviewForm.tsx`
- Modify: `app/dashboard/orders/[id]/page.tsx` (remove local definitions, import from new files)

**Interfaces:**
- Produces:
  - `OrderProgressHero({ status, orderId, deliveryType, timestamps })` — the animated indigo/red timeline banner
  - `DeliveryCode({ code, deliveryType })` — the code tile display with copy button
  - `ReviewForm({ orderId, sellerName, onReviewed })` — star rating + comment form
  - `ReviewThankYou()` — success state after review

- [ ] **Step 1: Create `components/orders/OrderProgressHero.tsx`**

Copy the following constants and functions verbatim from `app/dashboard/orders/[id]/page.tsx`:
- `DELIVERY_STEPS`, `PICKUP_STEPS`, `STEP_LABEL`, `STEP_ICON`, `STATUS_ALIAS`, `GRID_SVG`, `STEP_TIMESTAMP`, `formatStepTime`, `OrderProgressHero` component

Then wrap in a new file:

```tsx
'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, Clock, Truck, Check, CircleAlert, MapPin } from 'lucide-react'
import type { BuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'

const DELIVERY_STEPS = ['paid', 'confirmed', 'shipped', 'delivered'] as const
const PICKUP_STEPS   = ['paid', 'confirmed', 'delivered']            as const

const STEP_LABEL: Record<string, string> = {
  paid:      'Order placed',
  confirmed: 'Confirmed',
  shipped:   'On the way',
  delivered: 'Delivered',
}

const STEP_ICON: Record<string, React.ElementType> = {
  paid:      ShoppingBag,
  confirmed: Clock,
  shipped:   Truck,
  delivered: Check,
}

const STATUS_ALIAS: Record<string, string> = { completed: 'delivered' }

const GRID_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M36 0H0V36' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1'/%3E%3C/svg%3E\")"

const STEP_TIMESTAMP: Record<string, keyof Pick<BuyerOrderDetail, 'created_at' | 'confirmed_at' | 'shipped_at' | 'delivered_at'>> = {
  paid:      'created_at',
  confirmed: 'confirmed_at',
  shipped:   'shipped_at',
  delivered: 'delivered_at',
}

function formatStepTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function OrderProgressHero({
  status, orderId, deliveryType, timestamps,
}: {
  status: string
  orderId: string
  deliveryType: string
  timestamps: Pick<BuyerOrderDetail, 'created_at' | 'confirmed_at' | 'shipped_at' | 'delivered_at'>
}) {
  const resolved    = STATUS_ALIAS[status] ?? status
  const isCancelled = resolved === 'cancelled'
  const bg          = isCancelled ? '#dc2626' : '#3730a3'
  const bgEnd       = isCancelled ? '#ef4444' : '#4338ca'
  const steps       = deliveryType === 'delivery' ? DELIVERY_STEPS : PICKUP_STEPS
  const currentIndex = (steps as unknown as string[]).indexOf(resolved)
  const progressPct  = steps.length > 1 ? Math.max(0, (currentIndex / (steps.length - 1)) * 100) : 0

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${bg} 0%, ${bgEnd} 100%)`, boxShadow: `0 6px 24px ${bg}35` }}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: GRID_SVG, backgroundSize: '36px 36px' }} />
      <div aria-hidden className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />

      <div className="relative z-10 px-6 pt-5 pb-7 sm:px-8 sm:pt-6 sm:pb-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-white/55 text-xs font-medium tracking-widest uppercase">
            Order #{orderId.slice(0, 8).toUpperCase()}
          </p>
          {!isCancelled && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              {deliveryType === 'delivery'
                ? <><Truck size={10} strokeWidth={2} /> Delivery</>
                : <><MapPin size={10} strokeWidth={2} /> Pickup</>}
            </span>
          )}
          {isCancelled && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <CircleAlert size={10} strokeWidth={2} /> Cancelled
            </span>
          )}
        </div>

        {!isCancelled ? (
          <div>
            <div className="flex justify-between mb-2">
              {steps.map((step) => {
                const tsKey = STEP_TIMESTAMP[step]
                const time  = formatStepTime(timestamps[tsKey])
                return (
                  <div key={step} className="flex justify-center" style={{ width: 48 }}>
                    {time && (
                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-[9px] text-center leading-tight whitespace-nowrap"
                        style={{ color: 'rgba(255,255,255,0.65)' }}
                      >
                        {time}
                      </motion.span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="relative flex justify-between items-center" style={{ height: 48 }}>
              <div className="absolute rounded-full pointer-events-none"
                style={{ left: 24, right: 24, top: '50%', transform: 'translateY(-50%)', height: 6, background: 'rgba(255,255,255,0.18)', zIndex: 0 }} />
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ left: 24, top: '50%', transform: 'translateY(-50%)', height: 6, background: 'rgba(255,255,255,0.92)', boxShadow: '0 0 10px rgba(255,255,255,0.35)', right: 'auto', zIndex: 1 }}
                initial={{ width: 0 }}
                animate={{ width: progressPct > 0 ? `calc(${progressPct}% - 48px)` : 0 }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
              {steps.map((step, i) => {
                const done   = currentIndex >= i
                const active = currentIndex === i
                const Icon   = STEP_ICON[step]
                return (
                  <motion.div key={step}
                    className="relative flex items-center justify-center rounded-full shrink-0"
                    style={{ width: 48, height: 48, zIndex: 2, background: done ? 'rgba(255,255,255,0.97)' : bg, border: active ? '2.5px solid rgba(255,255,255,0.9)' : done ? 'none' : '2px solid rgba(255,255,255,0.35)', boxShadow: done ? '0 4px 16px rgba(0,0,0,0.2), 0 0 0 4px rgba(255,255,255,0.12)' : active ? '0 0 0 4px rgba(255,255,255,0.15)' : undefined }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 300, damping: 22 }}
                  >
                    {done
                      ? <Icon size={18} strokeWidth={2.25} style={{ color: bg }} />
                      : <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>{i + 1}</span>
                    }
                    {active && (
                      <motion.span
                        className="absolute inset-0 rounded-full"
                        style={{ border: '2px solid rgba(255,255,255,0.5)' }}
                        animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                      />
                    )}
                  </motion.div>
                )
              })}
            </div>

            <div className="flex justify-between mt-3">
              {steps.map((step, i) => {
                const done   = currentIndex >= i
                const active = currentIndex === i
                return (
                  <div key={step} className="flex justify-center" style={{ width: 48 }}>
                    <span className="text-[10px] text-center leading-tight"
                      style={{ fontWeight: active ? 700 : done ? 500 : 400, color: active ? '#fff' : done ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)', width: 64 }}>
                      {STEP_LABEL[step]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-white/70 text-sm">This order has been cancelled and refunded.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/orders/DeliveryCode.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Check, Copy } from 'lucide-react'

export function DeliveryCode({ code, deliveryType }: { code: string; deliveryType: string }) {
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #3730a3, #6366f1)' }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={13} strokeWidth={2} style={{ color: '#3730a3' }} />
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#3730a3' }}>
            {deliveryType === 'delivery' ? 'Delivery code' : 'Pickup code'}
          </p>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {code.split('').map((char, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className="flex items-center justify-center rounded-xl font-mono font-bold"
              style={{ width: 48, height: 56, fontSize: 26, background: 'rgba(55,48,163,0.06)', border: '1.5px solid rgba(55,48,163,0.15)', color: '#3730a3' }}
            >
              {char}
            </motion.div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-text-muted leading-relaxed flex-1 min-w-[140px]">
            {deliveryType === 'delivery' ? 'Share with the dispatcher on arrival.' : 'Show to the seller when collecting.'}
          </p>
          <motion.button
            onClick={copyCode}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all"
            style={{
              background: copied ? 'rgba(5,150,105,0.08)' : 'rgba(55,48,163,0.08)',
              border: `1px solid ${copied ? 'rgba(5,150,105,0.2)' : 'rgba(55,48,163,0.2)'}`,
              color: copied ? '#059669' : '#3730a3',
            }}
          >
            {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
            {copied ? 'Copied!' : 'Copy'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/orders/ReviewForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useSubmitReview } from '@/lib/hooks/useBuyerOrders'

export function ReviewThankYou() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #059669, #34d399)' }} />
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(5,150,105,0.1)' }}>
          <Check size={16} strokeWidth={2.5} style={{ color: '#059669' }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-text">Thanks for the feedback!</p>
          <p className="text-xs text-text-muted mt-0.5">Your review helps buyers trust great sellers.</p>
        </div>
      </div>
    </motion.div>
  )
}

export function ReviewForm({ orderId, sellerName, onReviewed }: {
  orderId: string
  sellerName: string | null
  onReviewed: () => void
}) {
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(0)
  const [comment, setComment] = useState('')
  const { mutate: submit, isPending } = useSubmitReview()

  function handleSubmit() {
    if (selected === 0) return
    submit(
      { order_id: orderId, rating: selected, comment: comment.trim() || undefined },
      { onSuccess: onReviewed, onError: (e) => toast.error(e.message) }
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star size={13} strokeWidth={2} style={{ color: '#d97706' }} />
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#d97706' }}>
            Rate your experience
          </p>
        </div>
        <p className="text-sm text-text-muted mb-4">How was {sellerName ?? 'the seller'}?</p>
        <div className="flex gap-2 mb-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setSelected(n)}
              className="transition-transform duration-100 active:scale-90"
              style={{ lineHeight: 1 }}
            >
              <Star
                size={32}
                strokeWidth={1.5}
                style={{
                  color: n <= (hovered || selected) ? '#f59e0b' : '#e5e7eb',
                  fill: n <= (hovered || selected) ? '#f59e0b' : 'transparent',
                  transition: 'color 0.1s, fill 0.1s',
                }}
              />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything else? (optional)"
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ '--tw-ring-color': 'rgba(55,48,163,0.3)' } as React.CSSProperties}
        />
        <button
          onClick={handleSubmit}
          disabled={selected === 0 || isPending}
          className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-40"
          style={{ background: '#3730a3' }}
          onMouseEnter={(e) => { if (selected > 0) (e.currentTarget as HTMLElement).style.background = '#312e81' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#3730a3' }}
        >
          {isPending ? 'Submitting…' : 'Submit review'}
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Update `app/dashboard/orders/[id]/page.tsx` to import from new files**

Add these imports at the top:
```tsx
import { OrderProgressHero } from '@/components/orders/OrderProgressHero'
import { DeliveryCode } from '@/components/orders/DeliveryCode'
import { ReviewForm, ReviewThankYou } from '@/components/orders/ReviewForm'
```

Remove the local `OrderProgressHero`, `DeliveryCode`, `ReviewForm`, `ReviewThankYou` function definitions and their helper constants (`DELIVERY_STEPS`, `PICKUP_STEPS`, `STEP_LABEL`, `STEP_ICON`, `STATUS_ALIAS`, `GRID_SVG`, `STEP_TIMESTAMP`, `formatStepTime`).

Also remove the now-unused imports that only existed for those components:
- `ShoppingBag`, `Clock`, `CircleAlert` from lucide-react (keep `Check`, `Copy`, `Star`, `KeyRound`, `ArrowLeft`, `Mail`, `Package`, `Truck`, `MapPin`)

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Verify dashboard still works**

Run `npm run dev`, navigate to `/dashboard/orders`, click into a purchase. Confirm the progress hero, delivery code (if applicable), and review form still render correctly.

- [ ] **Step 7: Commit**

```bash
git add components/orders/OrderProgressHero.tsx components/orders/DeliveryCode.tsx components/orders/ReviewForm.tsx app/dashboard/orders/[id]/page.tsx
git commit -m "refactor: extract order display components to components/orders/"
```

---

### Task 3: `OrdersModalContext`

**Files:**
- Create: `lib/context/orders-modal-context.tsx`

**Interfaces:**
- Consumes: `BuyerOrderDetail` from `@/lib/hooks/useBuyerOrders`
- Produces:
  - `OrdersModalProvider` — wrap in `app/providers.tsx`
  - `useOrdersModal()` — returns `{ isOpen, screen, activeOrderId, referenceOrders, openList, openDetail, openByReference, close }`

- [ ] **Step 1: Create `lib/context/orders-modal-context.tsx`**

```tsx
'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { BuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'

type Screen = 'list' | 'detail'

type OrdersModalState = {
  isOpen: boolean
  screen: Screen
  activeOrderId: string | null
  referenceOrders: BuyerOrderDetail[] | null
}

type OrdersModalContextValue = OrdersModalState & {
  openList: () => void
  openDetail: (orderId: string) => void
  openByReference: (orders: BuyerOrderDetail[]) => void
  close: () => void
}

const OrdersModalContext = createContext<OrdersModalContextValue | null>(null)

export function OrdersModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OrdersModalState>({
    isOpen: false,
    screen: 'list',
    activeOrderId: null,
    referenceOrders: null,
  })

  const openList = useCallback(() =>
    setState(s => ({ ...s, isOpen: true, screen: 'list', activeOrderId: null })), [])

  const openDetail = useCallback((orderId: string) =>
    setState(s => ({ ...s, isOpen: true, screen: 'detail', activeOrderId: orderId })), [])

  const openByReference = useCallback((orders: BuyerOrderDetail[]) =>
    setState({ isOpen: true, screen: 'list', activeOrderId: null, referenceOrders: orders }), [])

  const close = useCallback(() =>
    setState(s => ({ ...s, isOpen: false })), [])

  return (
    <OrdersModalContext.Provider value={{ ...state, openList, openDetail, openByReference, close }}>
      {children}
    </OrdersModalContext.Provider>
  )
}

export function useOrdersModal() {
  const ctx = useContext(OrdersModalContext)
  if (!ctx) throw new Error('useOrdersModal must be used within OrdersModalProvider')
  return ctx
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/context/orders-modal-context.tsx
git commit -m "feat: add OrdersModalContext with list/detail/reference state"
```

---

### Task 4: `/api/orders/by-reference` API route

**Files:**
- Create: `app/api/orders/by-reference/route.ts`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `GET /api/orders/by-reference?ref=<string>` → `{ data: BuyerOrderDetail[] }` (same shape as the hook type, plus `delivery_code` and `has_review`)

- [ ] **Step 1: Create `app/api/orders/by-reference/route.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { computeDeliveryCode } from '@/lib/delivery-code'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ref = searchParams.get('ref')

  if (!ref) return err('ref is required', 'VALIDATION_ERROR', 400)

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, item_price, delivery_fee, total_price,
      buyer_name, buyer_address, created_at, confirmed_at, shipped_at, delivered_at,
      seller:users!orders_seller_id_fkey(id, name, email, avatar_url),
      order_items(id, item_price, listing:listings(id, title, images, price))
    `)
    .eq('paystack_reference', ref)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('by-reference fetch error:', error)
    return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  }

  if (!orders || orders.length === 0) return ok([])

  const orderIds = orders.map(o => o.id)
  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('order_id')
    .in('order_id', orderIds)

  const reviewedSet = new Set((reviews ?? []).map(r => r.order_id))

  const result = orders.map(order => {
    const showCode = !['delivered', 'completed', 'cancelled'].includes(order.status)
    return {
      ...order,
      delivery_code: showCode ? computeDeliveryCode(order.id) : null,
      has_review: reviewedSet.has(order.id),
    }
  })

  return ok(result)
}
```

- [ ] **Step 2: Add route to proxy matcher**

Open `proxy.ts` at the project root. In the `config.matcher` array, add `/api/orders/by-reference` — it must NOT be behind auth since guests call it. Check what routes are currently excluded from auth middleware and follow the same pattern.

- [ ] **Step 3: Verify the endpoint manually**

Run `npm run dev`. After a test checkout (or using an existing `paystack_reference` from your DB), hit:
```
http://localhost:3000/api/orders/by-reference?ref=<your_reference>
```
Expected: `{ "data": [...] }` with order objects including `delivery_code` and `has_review`.

Hit with a missing ref:
```
http://localhost:3000/api/orders/by-reference
```
Expected: `{ "error": { "message": "ref is required", "code": "VALIDATION_ERROR" }, "status": 400 }`.

- [ ] **Step 4: Commit**

```bash
git add app/api/orders/by-reference/route.ts proxy.ts
git commit -m "feat: add public GET /api/orders/by-reference endpoint"
```

---

### Task 5: `OrdersListScreen`

**Files:**
- Create: `components/orders/OrdersListScreen.tsx`

**Interfaces:**
- Consumes:
  - `useBuyerOrders()` from `@/lib/hooks/useBuyerOrders`
  - `useOrdersModal()` from `@/lib/context/orders-modal-context`
  - `groupByCheckout`, `CheckoutGroup` from `@/lib/utils/orders`
  - `PURCHASE_STATUS_STYLE`, `PURCHASE_STATUS_LABEL` from `@/lib/constants/orderStatus`
  - `BuyerOrder`, `BuyerOrderDetail` from `@/lib/hooks/useBuyerOrders`
- Produces: `OrdersListScreen` component (no props)

- [ ] **Step 1: Create `components/orders/OrdersListScreen.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Package, Truck, MapPin, Star, ChevronRight } from 'lucide-react'
import { ListingImage } from '@/components/ui'
import { useBuyerOrders, type BuyerOrder, type BuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'
import { useOrdersModal } from '@/lib/context/orders-modal-context'
import { groupByCheckout, type CheckoutGroup } from '@/lib/utils/orders'
import { PURCHASE_STATUS_STYLE, PURCHASE_STATUS_LABEL } from '@/lib/constants/orderStatus'

function OrderSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 flex gap-3">
      <div className="skeleton-shimmer" />
      <div className="w-12 h-12 rounded-lg shrink-0" style={{ background: '#ede9e3' }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3 w-2/3 rounded" style={{ background: '#ede9e3' }} />
        <div className="h-3 w-1/3 rounded" style={{ background: '#e8e4dc' }} />
      </div>
    </div>
  )
}

function OrderRow({ order }: { order: BuyerOrder | BuyerOrderDetail }) {
  const { openDetail } = useOrdersModal()
  const statusStyle = PURCHASE_STATUS_STYLE[order.status] ?? PURCHASE_STATUS_STYLE.pending
  const firstItem = order.order_items?.[0]
  const extraCount = (order.order_items?.length ?? 1) - 1

  return (
    <button
      onClick={() => openDetail(order.id)}
      className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-surface text-left"
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-surface border border-border">
        {firstItem?.listing.images?.[0] ? (
          <ListingImage src={firstItem.listing.images[0]} fill sizes="48px" className="object-cover" alt={firstItem.listing.title} />
        ) : (
          <Package size={16} strokeWidth={1.5} className="text-text-subtle" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">
          {firstItem?.listing.title ?? 'Order'}
          {extraCount > 0 && <span className="text-text-subtle"> +{extraCount} more</span>}
        </p>
        <p className="text-xs text-primary mt-0.5 font-semibold">₦{order.total_price.toLocaleString()}</p>
        {order.seller?.name && (
          <p className="text-[10px] text-text-subtle mt-0.5">from {order.seller.name}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={statusStyle}>
          {PURCHASE_STATUS_LABEL[order.status] ?? order.status}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-text-subtle">
          {order.delivery_type === 'delivery'
            ? <><Truck size={9} strokeWidth={2} /> Delivery</>
            : <><MapPin size={9} strokeWidth={2} /> Pickup</>}
        </span>
        {['delivered', 'completed'].includes(order.status) && !('has_review' in order && order.has_review) && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: '#f59e0b' }}>
            <Star size={9} strokeWidth={0} fill="#f59e0b" /> Rate seller
          </span>
        )}
      </div>
      <ChevronRight size={14} strokeWidth={1.5} className="text-border-strong" />
    </button>
  )
}

function ReferenceOrdersList({ orders }: { orders: BuyerOrderDetail[] }) {
  const date = new Date(orders[0].created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  const multiVendor = orders.length > 1

  return (
    <div className="flex flex-col gap-3">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        {multiVendor && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle">
              {orders.length} vendors · {date}
            </span>
            <span className="text-xs font-semibold text-text">
              ₦{orders.reduce((s, o) => s + o.total_price, 0).toLocaleString()}
            </span>
          </div>
        )}
        <div className={multiVendor ? 'divide-y divide-border' : ''}>
          {orders.map(order => <OrderRow key={order.id} order={order} />)}
        </div>
      </motion.div>
    </div>
  )
}

function LoggedInOrdersList() {
  const { data: orders, isLoading } = useBuyerOrders()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map(i => <OrderSkeleton key={i} />)}
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <p className="text-sm font-semibold text-text mb-2">No purchases yet</p>
        <p className="text-sm text-text-muted max-w-xs mb-6">
          When you buy something on Declutter, your orders will appear here.
        </p>
        <Link
          href="/"
          className="rounded-xl border border-border px-5 py-2 text-sm font-medium text-text-muted hover:bg-surface transition-colors"
        >
          Browse listings
        </Link>
      </div>
    )
  }

  const groups = groupByCheckout(orders)
  return (
    <div className="flex flex-col gap-3">
      {groups.map(group => (
        <motion.div
          key={group.paystackReference ?? group.orders[0].id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          {group.orders.length > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle">
                {group.orders.length} vendors · {new Date(group.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="text-xs font-semibold text-text">
                ₦{group.orders.reduce((s, o) => s + o.total_price, 0).toLocaleString()}
              </span>
            </div>
          )}
          <div className={group.orders.length > 1 ? 'divide-y divide-border' : ''}>
            {group.orders.map(order => <OrderRow key={order.id} order={order} />)}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function OrdersListScreen() {
  const { referenceOrders } = useOrdersModal()

  if (referenceOrders) {
    return <ReferenceOrdersList orders={referenceOrders} />
  }

  return <LoggedInOrdersList />
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/orders/OrdersListScreen.tsx
git commit -m "feat: add OrdersListScreen for orders drawer"
```

---

### Task 6: `OrdersDetailScreen`

**Files:**
- Create: `components/orders/OrdersDetailScreen.tsx`

**Interfaces:**
- Consumes:
  - `useBuyerOrderDetail(id)` from `@/lib/hooks/useBuyerOrders`
  - `useOrdersModal()` from `@/lib/context/orders-modal-context`
  - `OrderProgressHero` from `@/components/orders/OrderProgressHero`
  - `DeliveryCode` from `@/components/orders/DeliveryCode`
  - `ReviewForm`, `ReviewThankYou` from `@/components/orders/ReviewForm`
  - `ListingImage` from `@/components/ui`
  - `CldImage` from `next-cloudinary`
- Produces: `OrdersDetailScreen` component (no props)

- [ ] **Step 1: Create `components/orders/OrdersDetailScreen.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Mail } from 'lucide-react'
import { CldImage } from 'next-cloudinary'
import { toast } from 'sonner'
import { ListingImage } from '@/components/ui'
import { useBuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'
import { useOrdersModal } from '@/lib/context/orders-modal-context'
import { OrderProgressHero } from '@/components/orders/OrderProgressHero'
import { DeliveryCode } from '@/components/orders/DeliveryCode'
import { ReviewForm, ReviewThankYou } from '@/components/orders/ReviewForm'

const CANCELLABLE = new Set(['paid', 'confirmed'])

export function OrdersDetailScreen() {
  const { activeOrderId, referenceOrders } = useOrdersModal()
  const [cancelling, setCancelling] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  const referenceOrder = referenceOrders?.find(o => o.id === activeOrderId) ?? null

  // Pass empty string when using reference data so the query is disabled (enabled: !!id)
  const { data: fetchedOrder, isLoading, error, refetch } = useBuyerOrderDetail(
    referenceOrder ? '' : (activeOrderId ?? '')
  )

  const order = referenceOrder ?? fetchedOrder

  async function handleCancel() {
    if (!window.confirm('Cancel this order? You will receive a full refund.')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${activeOrderId}/cancel`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error?.message ?? 'Could not cancel order'); return }
      await refetch()
      toast.success('Order cancelled. Your refund is on the way.')
    } finally {
      setCancelling(false)
    }
  }

  if (!referenceOrder && isLoading) {
    return (
      <div className="space-y-4">
        {[96, 160, 120].map((h, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl"
            style={{ height: h, background: 'var(--color-surface)' }}
          >
            <div className="skeleton-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
          </div>
        ))}
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-muted">Order not found.</p>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
    >
      <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
        <OrderProgressHero
          status={order.status}
          orderId={order.id}
          deliveryType={order.delivery_type}
          timestamps={{
            created_at:   order.created_at,
            confirmed_at: order.confirmed_at,
            shipped_at:   order.shipped_at,
            delivered_at: order.delivered_at,
          }}
        />
      </motion.div>

      {order.delivery_code && (
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
          <DeliveryCode code={order.delivery_code} deliveryType={order.delivery_type} />
        </motion.div>
      )}

      {reviewSubmitted && (
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
          <ReviewThankYou />
        </motion.div>
      )}
      {!reviewSubmitted && ['delivered', 'completed'].includes(order.status) && !order.has_review && (
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
          <ReviewForm
            orderId={order.id}
            sellerName={order.seller?.name ?? null}
            onReviewed={() => setReviewSubmitted(true)}
          />
        </motion.div>
      )}

      {/* Items + pricing */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        {(order.order_items ?? []).map((item, i) => (
          <div
            key={item.id}
            className="flex gap-4 p-5"
            style={i > 0 ? { borderTop: '1px solid var(--color-border)' } : undefined}
          >
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface border border-border">
              {item.listing.images?.[0]
                ? <ListingImage src={item.listing.images[0]} fill sizes="48px" className="object-cover" alt={item.listing.title} />
                : <div className="w-full h-full flex items-center justify-center"><Package size={22} strokeWidth={1.5} className="text-text-subtle" /></div>
              }
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-text leading-snug">{item.listing.title}</p>
              <p className="text-sm font-bold text-primary shrink-0">₦{item.item_price.toLocaleString()}</p>
            </div>
          </div>
        ))}
        <div className="px-5 pb-5 pt-1 border-t border-border">
          <div className="space-y-2 pt-4">
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Delivery fee</span>
                <span className="font-medium text-text">₦{order.delivery_fee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm font-semibold text-text">Total paid</span>
              <span className="text-lg font-bold" style={{ color: '#3730a3' }}>
                ₦{order.total_price.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Cancel — only available for logged-in users (reference orders have no auth) */}
      {!referenceOrder && CANCELLABLE.has(order.status) && (
        <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full rounded-2xl border border-red-200 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 hover:border-red-300 disabled:opacity-50 active:scale-[0.98]"
          >
            {cancelling ? 'Cancelling…' : 'Cancel order'}
          </button>
        </motion.div>
      )}

      {/* Seller card */}
      {order.seller && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-3">Seller</p>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{
                background: order.seller.avatar_url ? '#ffffff' : 'linear-gradient(135deg, #3730a3, #6366f1)',
                border: order.seller.avatar_url ? '2px solid #e5e7eb' : 'none',
              }}
            >
              {order.seller.avatar_url ? (
                <CldImage
                  src={order.seller.avatar_url}
                  width={40}
                  height={40}
                  alt={order.seller.name ?? 'Seller'}
                  className="w-full h-full object-cover"
                />
              ) : (
                (order.seller.name ?? 'S')[0].toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">{order.seller.name ?? 'Declutter seller'}</p>
              <p className="text-xs text-text-muted truncate">{order.seller.email}</p>
            </div>
          </div>
          <a
            href={`mailto:${order.seller.email}?subject=${encodeURIComponent(`My order — ${order.id.slice(0, 8)}`)}`}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-border text-sm text-text-muted font-medium hover:bg-surface hover:text-text transition-colors"
          >
            <Mail size={13} strokeWidth={2} />
            Contact seller
          </a>
        </motion.div>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/orders/OrdersDetailScreen.tsx
git commit -m "feat: add OrdersDetailScreen for orders drawer"
```

---

### Task 7: `OrdersDrawer` shell

**Files:**
- Create: `components/orders/OrdersDrawer.tsx`

**Interfaces:**
- Consumes:
  - `useOrdersModal()` from `@/lib/context/orders-modal-context`
  - `OrdersListScreen` from `@/components/orders/OrdersListScreen`
  - `OrdersDetailScreen` from `@/components/orders/OrdersDetailScreen`
- Produces: `OrdersDrawer` component (no props) — mount once in `app/layout.tsx`

- [ ] **Step 1: Create `components/orders/OrdersDrawer.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft } from 'lucide-react'
import { useOrdersModal } from '@/lib/context/orders-modal-context'
import { OrdersListScreen } from '@/components/orders/OrdersListScreen'
import { OrdersDetailScreen } from '@/components/orders/OrdersDetailScreen'

export function OrdersDrawer() {
  const { isOpen, screen, close, openList } = useOrdersModal()

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[520px] bg-card flex flex-col"
            style={{ boxShadow: '-4px 0 32px rgba(0,0,0,0.12)' }}
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
              {screen === 'detail' && (
                <button
                  onClick={openList}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-text"
                  aria-label="Back to orders"
                >
                  <ArrowLeft size={16} strokeWidth={2} />
                </button>
              )}
              <h2 className="text-base font-semibold text-text flex-1">
                {screen === 'detail' ? 'Order detail' : 'My orders'}
              </h2>
              <button
                onClick={close}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-text"
                aria-label="Close"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <AnimatePresence mode="wait">
                {screen === 'list' ? (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <OrdersListScreen />
                  </motion.div>
                ) : (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <OrdersDetailScreen />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/orders/OrdersDrawer.tsx
git commit -m "feat: add OrdersDrawer shell with list/detail screen animation"
```

---

### Task 8: Wire into providers and layout

**Files:**
- Modify: `app/providers.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `OrdersModalProvider` from `@/lib/context/orders-modal-context`, `OrdersDrawer` from `@/components/orders/OrdersDrawer`

- [ ] **Step 1: Add `OrdersModalProvider` to `app/providers.tsx`**

Add the import:
```tsx
import { OrdersModalProvider } from '@/lib/context/orders-modal-context'
```

Wrap the existing provider tree so `OrdersModalProvider` is inside `QueryClientProvider` (it uses no React Query itself, but the screens it renders do):

```tsx
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { networkMode: 'always' },
          queries: { networkMode: 'always' },
        },
      }),
  )

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <QueryClientProvider client={client}>
        <CartSyncProvider>
          <OrdersModalProvider>
            <LenisProvider>{children}</LenisProvider>
          </OrdersModalProvider>
        </CartSyncProvider>
      </QueryClientProvider>
    </APIProvider>
  )
}
```

- [ ] **Step 2: Mount `OrdersDrawer` in `app/layout.tsx`**

Add the import:
```tsx
import { OrdersDrawer } from '@/components/orders/OrdersDrawer'
```

Add `<OrdersDrawer />` alongside `<ChatBubble />`:
```tsx
<Providers>
  <NavbarWrapper />
  {children}
  <FooterWrapper />
  <ChatBubble />
  <OrdersDrawer />
</Providers>
```

- [ ] **Step 3: Smoke test**

Run `npm run dev`. Open the browser console. In the browser console, verify no errors. The drawer won't open yet (no triggers wired) — just confirm the app loads without crashes.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/providers.tsx app/layout.tsx
git commit -m "feat: wire OrdersModalProvider and OrdersDrawer into root layout"
```

---

### Task 9: Nav trigger

**Files:**
- Modify: `components/layout/NavbarWrapper.tsx`

**Interfaces:**
- Consumes: `useOrdersModal()` from `@/lib/context/orders-modal-context`

- [ ] **Step 1: Add import to `NavbarWrapper.tsx`**

```tsx
import { useOrdersModal } from '@/lib/context/orders-modal-context'
```

- [ ] **Step 2: Wire up `openList` in `ProfileMenu`**

Inside `ProfileMenu`, add `useOrdersModal`:
```tsx
function ProfileMenu({ name, avatarUrl, transparent }: { name: string | null; avatarUrl?: string | null; transparent: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { mutate: signOut } = useSignOut()
  const { openList } = useOrdersModal()   // ← add this

  // ...rest of the component unchanged until the dropdown menu...
```

Replace the "My purchases" `<MenuLink>` with a button:
```tsx
<button
  onClick={() => { setOpen(false); openList() }}
  className="flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-colors w-full text-left"
  style={{ color: '#16130f' }}
  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f5f0')}
  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
>
  <ShoppingBag size={14} strokeWidth={1.8} style={{ color: '#a8a09a' }} />
  My purchases
</button>
```

- [ ] **Step 3: Wire up `openList` in the mobile menu panel**

Inside `NavbarContent`, add `useOrdersModal`:
```tsx
function NavbarContent({ ... }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const { openList } = useOrdersModal()   // ← add this
```

Replace the "My purchases" `<Link>` in the mobile nav panel (around line 748):
```tsx
<button
  onClick={() => { setMobileOpen(false); openList() }}
  className="flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-colors w-full text-left"
  style={{ color: '#16130f' }}
>
  <ShoppingBag size={15} strokeWidth={1.8} style={{ color: '#a8a09a' }} />
  My purchases
</button>
```

- [ ] **Step 4: Verify in browser**

Run `npm run dev`. Sign in as a logged-in user. Click the profile avatar (desktop) → "My purchases" — the drawer should slide in from the right showing your order list. Open mobile menu → "My purchases" — same behavior. Click an order row to navigate to detail. Use the back arrow to return to list. Press Escape to close.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/layout/NavbarWrapper.tsx
git commit -m "feat: wire orders drawer trigger into nav profile menu and mobile menu"
```

---

### Task 10: Success page integration

**Files:**
- Modify: `app/checkout/success/page.tsx`

**Interfaces:**
- Consumes:
  - `useOrdersModal()` from `@/lib/context/orders-modal-context`
  - `GET /api/orders/by-reference?ref=<string>` (Task 4)
  - `BuyerOrderDetail` type from `@/lib/hooks/useBuyerOrders`

- [ ] **Step 1: Update `app/checkout/success/page.tsx`**

Replace the full file content with:

```tsx
'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Package } from 'lucide-react'
import { clearSessionCart } from '@/lib/session-cart'
import { useMe } from '@/lib/hooks/useAuth'
import { useOrdersModal } from '@/lib/context/orders-modal-context'
import type { BuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'

const ORDERS_URL = '/dashboard/orders?tab=purchases'
const LOGIN_THEN_ORDERS_URL = '/auth/login?next=/dashboard/orders%3Ftab%3Dpurchases'

function SuccessContent() {
  const { data: me, isLoading } = useMe()
  const searchParams = useSearchParams()
  const { openByReference, openList, referenceOrders } = useOrdersModal()
  const didFetch = useRef(false)

  useEffect(() => {
    clearSessionCart()

    const reference =
      searchParams.get('reference') ??
      searchParams.get('trxref') ??
      sessionStorage.getItem('checkout_reference')

    if (reference) {
      sessionStorage.removeItem('checkout_reference')
    }

    Promise.allSettled([
      reference
        ? fetch('/api/orders/settle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference }),
          })
        : Promise.resolve(),
      fetch('/api/cart', { method: 'DELETE' }),
    ]).finally(() => {
      window.dispatchEvent(new Event('cart-updated'))
    })

    // Fetch orders by reference and auto-open the drawer
    if (reference && !didFetch.current) {
      didFetch.current = true
      fetch(`/api/orders/by-reference?ref=${encodeURIComponent(reference)}`)
        .then(r => r.json())
        .then((json: { data?: BuyerOrderDetail[] }) => {
          if (json.data && json.data.length > 0) {
            openByReference(json.data)
          }
        })
        .catch(() => {
          // Silently fail — fallback link still works
        })
    }
  }, [searchParams, openByReference])

  const fallbackHref = isLoading || me ? ORDERS_URL : LOGIN_THEN_ORDERS_URL

  function handleTrackClick() {
    if (referenceOrders && referenceOrders.length > 0) {
      openList()
    }
    // If no reference orders loaded, the link below handles navigation
  }

  const hasReferenceOrders = referenceOrders && referenceOrders.length > 0

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success-bg mb-6">
        <CheckCircle size={32} className="text-success" strokeWidth={1.5} />
      </div>

      <h1 className="font-display text-3xl font-bold text-text mb-2">
        Payment successful
      </h1>
      <p className="text-text-muted text-sm max-w-sm mb-2">
        Your order has been placed. The seller will be in touch within 12
        hours to arrange delivery or pickup.
      </p>
      <p className="text-text-subtle text-xs mb-10">
        A confirmation has been sent to your email.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {hasReferenceOrders ? (
          <button
            onClick={handleTrackClick}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#4f46e5' }}
          >
            <Package size={15} strokeWidth={2} />
            Track your order
          </button>
        ) : (
          <Link
            href={fallbackHref}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#4f46e5' }}
          >
            Track your order
          </Link>
        )}
        <Link
          href="/"
          className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-card transition-colors"
        >
          Continue browsing
        </Link>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <Suspense>
          <SuccessContent />
        </Suspense>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify the end-to-end flow**

Run `npm run dev`. Complete a test checkout (or navigate directly to `/checkout/success?reference=<existing_reference>`).

Expected behavior:
1. Page loads, clears cart, runs settle
2. Fetches orders by reference — drawer auto-opens showing the orders
3. Click an order row → detail screen with progress hero, delivery code (if applicable)
4. Back arrow → list screen
5. If reference fetch fails or returns empty, "Track your order" falls back to a link to the dashboard

- [ ] **Step 4: Verify guest flow**

Open a private/incognito window. Navigate to `/checkout/success?reference=<existing_reference>`. Confirm the drawer auto-opens without requiring login. Confirm the delivery code is visible.

- [ ] **Step 5: Commit**

```bash
git add app/checkout/success/page.tsx
git commit -m "feat: auto-open orders drawer on checkout success page"
```
