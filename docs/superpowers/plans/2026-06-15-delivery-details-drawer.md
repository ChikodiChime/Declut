# Delivery Details Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bottom-sheet drawer to `ActiveHeroCard` that slides up when the dispatcher taps the card, showing the full pickup and drop-off addresses and buyer phone contact.

**Architecture:** `ActiveHeroCard` gains an `isOpen` boolean state. Tapping the card body (a `<button>` wrapping the top section) sets `isOpen = true`. The code input + Confirm button sit below this button and are not part of the tap target. A new `DeliveryDetailsDrawer` component renders as a sibling of the card — outside the card's `overflow-hidden` — using a fixed overlay + Framer Motion slide-up sheet.

**Tech Stack:** Next.js App Router, React `useState`, Framer Motion (`motion`, `AnimatePresence`), Lucide React, Tailwind CSS 4

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `app/dispatch/(portal)/page.tsx` | Add `DeliveryDetailsDrawer`; rewrite `ActiveHeroCard` to make card body tappable with compact location row |

---

## Task 1: Add delivery details drawer

**Files:**
- Modify: `app/dispatch/(portal)/page.tsx`

- [ ] **Step 1: Add `AnimatePresence` and `ChevronRight` to imports**

In `app/dispatch/(portal)/page.tsx`, update the two import lines at the top:

```tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
```

```tsx
import {
  Package, MapPin, KeyRound, ArrowRight,
  Truck, Phone, Copy, Clock, ChevronRight,
} from 'lucide-react'
```

- [ ] **Step 2: Add the `DeliveryDetailsDrawer` component**

Insert this component between `OrderSkeleton` and `ActiveHeroCard` (after line 34, before line 38 in the current file):

```tsx
function DeliveryDetailsDrawer({ order, onClose }: { order: DispatchOrder; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40"
      />
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl max-w-xl mx-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-4 pb-3 border-b border-border">
          <p className="text-base font-bold text-text">{order.listing.title}</p>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Package size={16} strokeWidth={1.75} className="shrink-0 mt-0.5 text-text-subtle" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-subtle mb-1">Collect from</p>
              <p className="text-sm text-text leading-relaxed">
                {order.listing.pickup_address ?? order.listing.area ?? 'Address unavailable'}
              </p>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-start gap-3">
            <MapPin size={16} strokeWidth={1.75} className="shrink-0 mt-0.5 text-text-subtle" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-subtle mb-1">Deliver to</p>
              <p className="text-sm text-text leading-relaxed">
                {order.buyer_address ?? 'Address unavailable'}
              </p>
            </div>
          </div>

          {order.buyer_phone && (
            <>
              <div className="h-px bg-border" />
              <div className="flex items-center gap-2">
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
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Rewrite `ActiveHeroCard`**

Replace the entire `ActiveHeroCard` function (lines 38–155 in the current file) with:

```tsx
function ActiveHeroCard({ order }: { order: DispatchOrder }) {
  const [code, setCode] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const { mutate: verify, isPending } = useVerifyDelivery()

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border-2 border-primary/25 bg-card overflow-hidden"
      >
        <div className="h-1 bg-primary w-full" />

        {/* Tappable card body — opens drawer */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full text-left p-4 pb-3"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Clock size={10} strokeWidth={3} />
              Active Delivery
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
              In transit
            </span>
          </div>

          <div className="flex gap-3 mb-3">
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

          {/* Compact location summary row */}
          <div className="flex items-center gap-2 rounded-xl bg-surface border border-border px-3 py-2">
            <Package size={11} strokeWidth={2} className="shrink-0 text-text-subtle" />
            <span className="text-xs text-text-muted truncate">{order.listing.area ?? 'Pickup'}</span>
            <ArrowRight size={10} strokeWidth={2} className="shrink-0 text-text-subtle" />
            <span className="text-xs text-text-muted truncate flex-1">{order.buyer_area ?? 'Dropoff'}</span>
            <ChevronRight size={13} strokeWidth={2} className="shrink-0 text-text-subtle ml-1" />
          </div>
        </button>

        {/* Code input — separate from tap target */}
        <div className="px-4 pb-4">
          <p className="text-xs text-text-subtle mb-3 mt-1">
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
              type="button"
              onClick={() => verify({ id: order.id, code })}
              disabled={isPending || code.length !== 4}
              className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-success hover:bg-success/90 transition-opacity disabled:opacity-50"
            >
              {isPending ? '…' : 'Confirm'}
            </button>
          </div>
        </div>
      </motion.div>

      {isOpen && <DeliveryDetailsDrawer order={order} onClose={() => setIsOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`

Expected: Clean compile, no TypeScript errors. Route `/dispatch` still renders.

- [ ] **Step 5: Commit**

```bash
git add "app/dispatch/(portal)/page.tsx"
git commit -m "feat: add delivery details drawer with full addresses and buyer contact"
```

---

## Self-Review

**Spec coverage:**
- ✅ Tapping the card opens the drawer — card body is a `<button>` with `onClick={() => setIsOpen(true)}`
- ✅ Full pickup address in drawer — `order.listing.pickup_address ?? order.listing.area ?? 'Address unavailable'`, wraps freely
- ✅ Full drop-off address in drawer — `order.buyer_address ?? 'Address unavailable'`, wraps freely
- ✅ Buyer phone with call + copy in drawer — conditional on `order.buyer_phone`
- ✅ Code input + Confirm NOT part of tap target — sits in a separate `<div>` below the `<button>`
- ✅ Compact location summary on card — areas + ArrowRight + ChevronRight signals tappability
- ✅ Drawer uses Framer Motion slide-up + backdrop fade — `AnimatePresence` with spring transition
- ✅ Tap backdrop to close — `onClick={onClose}` on the backdrop `motion.div`
- ✅ Drag handle rendered — `w-10 h-1 rounded-full bg-border`
- ✅ No external library — self-contained with Framer Motion (already in project)

**Placeholder scan:** None found.

**Type consistency:** `DispatchOrder` used in both `ActiveHeroCard` and `DeliveryDetailsDrawer` — same type from `@/lib/hooks/useDispatch`. `order.listing.pickup_address` exists on the type (added in the previous session). All field accesses match the type definition.
