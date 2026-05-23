# Unified Orders Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Purchases" tab to the dashboard orders page so any user can track both their sales and their buys in one place, fix the checkout success CTA, and add a recent-purchases preview to the dashboard overview.

**Architecture:** The existing `/dashboard/orders` page gets a top-level Sales/Purchases toggle driven by the `?tab=` URL search param. The Purchases tab renders the buyer orders list (same data as the old `/orders` standalone page). The old `/orders` and `/orders/[id]` routes become server-side redirects. A new `/dashboard/orders/[id]` page replaces the old standalone order detail page so everything lives inside the dashboard shell.

**Tech Stack:** Next.js App Router, React Query (`@tanstack/react-query`), `framer-motion`, `next-cloudinary`, existing hooks (`useBuyerOrders`, `useSellerOrders`)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `app/dashboard/orders/page.tsx` | Modify | Add Sales/Purchases top-level tab toggle |
| `app/dashboard/orders/[id]/page.tsx` | Create | Purchase order detail inside dashboard shell |
| `app/orders/page.tsx` | Replace | Server redirect → `/dashboard/orders?tab=purchases` |
| `app/orders/[id]/page.tsx` | Replace | Server redirect → `/dashboard/orders/[id]` |
| `app/dashboard/page.tsx` | Modify | Add "Recent purchases" section |
| `app/checkout/success/page.tsx` | Modify | Smart CTA based on auth state |

---

## Task 1: Add Sales/Purchases toggle to `/dashboard/orders`

**Files:**
- Modify: `app/dashboard/orders/page.tsx`

The page already has an inner "New / Confirmed / Shipped / Delivered" tab row for sales. We add an outer toggle above it — "Sales" and "Purchases" — driven by the `tab` URL search param so links like `/dashboard/orders?tab=purchases` work directly.

- [ ] **Step 1: Replace `app/dashboard/orders/page.tsx` with the new tabbed version**

```tsx
// app/dashboard/orders/page.tsx
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { CldImage } from "next-cloudinary";
import {
  Package,
  MapPin,
  Phone,
  User,
  Mail,
  Truck,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  useSellerOrders,
  useConfirmOrder,
  useVerifyPickup,
  type SellerOrder,
} from "@/lib/hooks/useSellerOrders";
import { useBuyerOrders, type BuyerOrder } from "@/lib/hooks/useBuyerOrders";

// ─── Shared ───────────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-5 flex gap-4">
      <div className="w-20 h-20 rounded-xl shrink-0" style={{ background: "#f0ece5" }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-4 w-2/3 rounded" style={{ background: "#f0ece5" }} />
        <div className="h-3 w-1/3 rounded" style={{ background: "#f0ece5" }} />
        <div className="h-3 w-1/2 rounded" style={{ background: "#f0ece5" }} />
      </div>
    </div>
  );
}

// ─── Sales tab ────────────────────────────────────────────────────────────────

type SalesTab = { label: string; status: "paid" | "confirmed" | "shipped" | "delivered" };

const SALES_TABS: SalesTab[] = [
  { label: "New", status: "paid" },
  { label: "Confirmed", status: "confirmed" },
  { label: "Shipped", status: "shipped" },
  { label: "Delivered", status: "delivered" },
];

const SALES_EMPTY_STATE: Record<string, { emoji: string; heading: string; body: string }> = {
  New: {
    emoji: "🛍️",
    heading: "No new orders yet",
    body: "When a buyer completes payment, their order will land here for you to confirm.",
  },
  Confirmed: {
    emoji: "✅",
    heading: "Nothing confirmed yet",
    body: "Orders you confirm will move here. Delivery orders await a dispatcher; pickup orders await the buyer.",
  },
  Shipped: {
    emoji: "🚚",
    heading: "No deliveries in transit",
    body: "Orders picked up by a dispatcher will appear here while in transit.",
  },
  Delivered: {
    emoji: "📦",
    heading: "No deliveries yet",
    body: "Orders confirmed as received will be recorded here.",
  },
};

function SalesEmptyState({ tab }: { tab: string }) {
  const config = SALES_EMPTY_STATE[tab] ?? SALES_EMPTY_STATE.New;
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="relative mb-6">
        <div
          className="h-20 w-20 rounded-3xl"
          style={{
            background: "linear-gradient(135deg, #f5f1eb 0%, #ede8e0 100%)",
            boxShadow: "0 2px 12px rgba(22,19,15,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl leading-none">{config.emoji}</span>
        </div>
      </div>
      <p className="text-base font-semibold mb-2" style={{ color: "#16130f" }}>{config.heading}</p>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: "#a8a09a" }}>{config.body}</p>
    </div>
  );
}

function PickupCodeEntry({ orderId }: { orderId: string }) {
  const [code, setCode] = useState("");
  const { mutate: verify, isPending } = useVerifyPickup();
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <KeyRound size={12} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#a8a09a" }} />
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="0000"
          className="w-24 rounded-xl border pl-7 pr-2 py-2 text-xs font-mono tracking-widest outline-none focus:ring-2"
          style={{ borderColor: "#e8e4dc", background: "#faf9f7", color: "#16130f" }}
        />
      </div>
      <button
        onClick={() => verify({ id: orderId, code })}
        disabled={isPending || code.length !== 4}
        className="rounded-xl px-3 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: "#10b981" }}
      >
        {isPending ? "Verifying…" : "Confirm pickup"}
      </button>
    </div>
  );
}

function SellerOrderCard({ order, tab }: { order: SellerOrder; tab: SalesTab }) {
  const { mutate: confirm, isPending: confirming } = useConfirmOrder();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border bg-card p-5 flex flex-col sm:flex-row gap-4"
      style={{ borderColor: "#e8e4dc" }}
    >
      <div
        className="relative w-full sm:w-20 h-40 sm:h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: "#f0ece5" }}
      >
        {order.listing.images?.[0] ? (
          <CldImage src={order.listing.images[0]} fill sizes="80px" className="object-cover" alt={order.listing.title} />
        ) : (
          <Package size={22} strokeWidth={1.5} style={{ color: "#a8a09a" }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold leading-snug" style={{ color: "#16130f" }}>{order.listing.title}</h3>
            <p className="text-base mt-0.5" style={{ color: "#4f46e5" }}>₦{order.total_price.toLocaleString()}</p>
          </div>
          <span
            className="self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium shrink-0"
            style={
              order.delivery_type === "delivery"
                ? { background: "rgba(79,70,229,0.08)", color: "#4f46e5" }
                : { background: "rgba(16,185,129,0.08)", color: "#10b981" }
            }
          >
            {order.delivery_type === "delivery" ? <Truck size={11} strokeWidth={2} /> : <MapPin size={11} strokeWidth={2} />}
            {order.delivery_type === "delivery" ? "Delivery" : "Pickup"}
          </span>
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <User size={11} strokeWidth={2} className="shrink-0" /><span>{order.buyer_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <Mail size={11} strokeWidth={2} className="shrink-0" /><span>{order.buyer_email}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <Phone size={11} strokeWidth={2} className="shrink-0" /><span>{order.buyer_phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <MapPin size={11} strokeWidth={2} className="shrink-0" /><span className="line-clamp-1">{order.buyer_address}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tab.status === "paid" && (
            <button
              onClick={() => confirm(order.id)}
              disabled={confirming}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "#4f46e5" }}
            >
              {confirming ? "Confirming…" : "Confirm order"}
            </button>
          )}
          {tab.status === "confirmed" && order.delivery_type === "pickup" && (
            <PickupCodeEntry orderId={order.id} />
          )}
          {tab.status === "confirmed" && order.delivery_type === "delivery" && (
            <span className="text-xs rounded-full px-3 py-1.5 font-medium" style={{ background: "rgba(79,70,229,0.08)", color: "#4f46e5" }}>
              Awaiting dispatcher
            </span>
          )}
          <a
            href={`mailto:${order.buyer_email}?subject=${encodeURIComponent(`Your Declutter order — ${order.listing.title}`)}&body=${encodeURIComponent(`Hi ${order.buyer_name},\n\nThank you for your order.\n\n`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors hover:bg-[#f5f1eb]"
            style={{ borderColor: "#e8e4dc", color: "#78726c" }}
          >
            <Mail size={12} strokeWidth={2} />
            Contact buyer
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function SalesTabContent({ tab }: { tab: SalesTab }) {
  const { data: orders, isLoading } = useSellerOrders(tab.status);
  if (isLoading) return <div className="flex flex-col gap-4">{[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}</div>;
  if (!orders || orders.length === 0) return <SalesEmptyState tab={tab.label} />;
  return <div className="flex flex-col gap-4">{orders.map((o) => <SellerOrderCard key={o.id} order={o} tab={tab} />)}</div>;
}

function SalesPanel() {
  const [activeTab, setActiveTab] = useState<SalesTab>(SALES_TABS[0]);
  return (
    <div className="space-y-6">
      <div className="inline-flex gap-0.5 rounded-full p-0.5" style={{ background: "#f0ece5" }}>
        {SALES_TABS.map((tab) => {
          const isActive = activeTab.status === tab.status;
          return (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200"
              style={{
                background: isActive ? "#4f46e5" : "transparent",
                color: isActive ? "white" : "#78726c",
                boxShadow: isActive ? "0 1px 4px rgba(79,70,229,0.35)" : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <SalesTabContent tab={activeTab} />
    </div>
  );
}

// ─── Purchases tab ────────────────────────────────────────────────────────────

const PURCHASE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Confirmed",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PURCHASE_STATUS_STYLE: Record<string, { background: string; color: string }> = {
  pending:   { background: "rgba(251,191,36,0.12)",  color: "#d97706" },
  paid:      { background: "rgba(79,70,229,0.08)",   color: "#4f46e5" },
  confirmed: { background: "rgba(79,70,229,0.08)",   color: "#4f46e5" },
  shipped:   { background: "rgba(16,185,129,0.08)",  color: "#10b981" },
  delivered: { background: "rgba(16,185,129,0.08)",  color: "#10b981" },
  completed: { background: "rgba(16,185,129,0.08)",  color: "#10b981" },
  cancelled: { background: "rgba(239,68,68,0.08)",   color: "#ef4444" },
};

function PurchaseRow({ order }: { order: BuyerOrder }) {
  const statusStyle = PURCHASE_STATUS_STYLE[order.status] ?? PURCHASE_STATUS_STYLE.pending;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Link
        href={`/dashboard/orders/${order.id}`}
        className="flex items-center gap-4 rounded-2xl border p-4 transition-colors hover:bg-[#faf9f7]"
        style={{ borderColor: "#e8e4dc" }}
      >
        <div
          className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: "#f0ece5" }}
        >
          {order.listing.images?.[0] ? (
            <CldImage src={order.listing.images[0]} fill sizes="64px" className="object-cover" alt={order.listing.title} />
          ) : (
            <Package size={18} strokeWidth={1.5} style={{ color: "#a8a09a" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "#16130f" }}>{order.listing.title}</p>
          <p className="text-xs mt-0.5 font-medium" style={{ color: "#4f46e5" }}>₦{order.total_price.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={statusStyle}
            >
              {PURCHASE_STATUS_LABEL[order.status] ?? order.status}
            </span>
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "#a8a09a" }}>
              {order.delivery_type === "delivery" ? <><Truck size={9} strokeWidth={2} /> Delivery</> : <><MapPin size={9} strokeWidth={2} /> Pickup</>}
            </span>
          </div>
        </div>
        <ChevronRight size={16} strokeWidth={1.5} style={{ color: "#c8c2bb" }} />
      </Link>
    </motion.div>
  );
}

function PurchasesPanel() {
  const { data: orders, isLoading } = useBuyerOrders();

  if (isLoading) {
    return <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}</div>;
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <div
          className="h-20 w-20 rounded-3xl flex items-center justify-center mb-6"
          style={{
            background: "linear-gradient(135deg, #f5f1eb 0%, #ede8e0 100%)",
            boxShadow: "0 2px 12px rgba(22,19,15,0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        >
          <span className="text-3xl">🛍️</span>
        </div>
        <p className="text-base font-semibold mb-2" style={{ color: "#16130f" }}>No purchases yet</p>
        <p className="text-sm max-w-xs leading-relaxed mb-6" style={{ color: "#a8a09a" }}>
          When you buy something on Declutter, your orders will appear here.
        </p>
        <Link
          href="/listings"
          className="rounded-xl border px-5 py-2 text-sm font-medium transition-colors hover:bg-card"
          style={{ borderColor: "#e8e4dc", color: "#78726c" }}
        >
          Browse listings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => <PurchaseRow key={order.id} order={order} />)}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TopTab = "sales" | "purchases";

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topTab: TopTab = searchParams.get("tab") === "purchases" ? "purchases" : "sales";

  function setTopTab(tab: TopTab) {
    router.replace(`/dashboard/orders?tab=${tab}`);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold" style={{ color: "#16130f" }}>Orders</h1>
        <p className="mt-1 text-sm" style={{ color: "#78726c" }}>
          {topTab === "sales" ? "Manage orders from buyers." : "Track everything you've bought on Declutter."}
        </p>
      </motion.div>

      {/* Top toggle */}
      <div className="inline-flex gap-0.5 rounded-full p-0.5" style={{ background: "#e8e4dc" }}>
        {(["sales", "purchases"] as TopTab[]).map((tab) => {
          const isActive = topTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setTopTab(tab)}
              className="rounded-full px-5 py-2 text-xs font-semibold capitalize transition-all duration-200"
              style={{
                background: isActive ? "white" : "transparent",
                color: isActive ? "#16130f" : "#78726c",
                boxShadow: isActive ? "0 1px 4px rgba(22,19,15,0.10)" : "none",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {topTab === "sales" ? <SalesPanel /> : <PurchasesPanel />}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify the page compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Start dev server and open `/dashboard/orders` — confirm Sales tab shows seller orders with New/Confirmed/Shipped/Delivered inner tabs**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard/orders` — Sales tab should be active by default.

- [ ] **Step 4: Open `/dashboard/orders?tab=purchases` — confirm Purchases tab shows buyer orders list**

Open `http://localhost:3000/dashboard/orders?tab=purchases` — should show purchase history or empty state.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/orders/page.tsx
git commit -m "feat: add Sales/Purchases toggle to dashboard orders page"
```

---

## Task 2: Purchase order detail inside dashboard

**Files:**
- Create: `app/dashboard/orders/[id]/page.tsx`

This moves the order detail view (previously at `app/orders/[id]/page.tsx`) inside the dashboard shell. The back link goes to `/dashboard/orders?tab=purchases`. The content is identical to the original — just the back link and the surrounding layout context change (the dashboard layout with sidebar wraps it automatically).

- [ ] **Step 1: Create `app/dashboard/orders/[id]/page.tsx`**

```tsx
// app/dashboard/orders/[id]/page.tsx
'use client'

import Link from 'next/link'
import { use, useState } from 'react'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import { Package, Truck, MapPin, ArrowLeft, Mail, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useBuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'

const DELIVERY_STEPS = ['paid', 'confirmed', 'shipped', 'delivered'] as const
const PICKUP_STEPS = ['paid', 'confirmed', 'delivered'] as const

const STATUS_LABEL: Record<string, string> = {
  paid: 'Order placed',
  confirmed: 'Seller confirmed',
  shipped: 'On the way',
  delivered: 'Delivered',
}

const STATUS_ALIAS: Record<string, string> = {
  completed: 'delivered',
}

function StatusTimeline({ status, deliveryType }: { status: string; deliveryType: string }) {
  const steps = deliveryType === 'delivery' ? DELIVERY_STEPS : PICKUP_STEPS
  const resolvedStatus = STATUS_ALIAS[status] ?? status
  const currentIndex = (steps as unknown as string[]).indexOf(resolvedStatus)

  return (
    <div className="flex items-start gap-0">
      {steps.map((step, i) => {
        const done = currentIndex >= i
        const isLast = i === steps.length - 1
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: done ? '#4f46e5' : '#e8e4dc', color: done ? 'white' : '#a8a09a' }}
              >
                {i + 1}
              </div>
              <p className="text-[10px] mt-1 text-center leading-tight" style={{ color: done ? '#4f46e5' : '#a8a09a' }}>
                {STATUS_LABEL[step]}
              </p>
            </div>
            {!isLast && (
              <div
                className="h-0.5 flex-1 -mt-4 mx-1"
                style={{ background: currentIndex > i ? '#4f46e5' : '#e8e4dc' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

const CANCELLABLE_STATUSES = new Set(['paid', 'confirmed'])

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: order, isLoading, error, refetch } = useBuyerOrderDetail(id)
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    if (!window.confirm('Cancel this order? You will receive a full refund.')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Could not cancel order')
        return
      }
      await refetch()
    } finally {
      setCancelling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-24 rounded" style={{ background: '#f0ece5' }} />
          <div className="h-40 rounded-2xl" style={{ background: '#f0ece5' }} />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl text-center py-12">
        <p className="text-sm" style={{ color: '#78726c' }}>Order not found.</p>
        <Link href="/dashboard/orders?tab=purchases" className="text-sm underline mt-4 inline-block" style={{ color: '#4f46e5' }}>
          Back to purchases
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/orders?tab=purchases"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: '#78726c' }}
      >
        <ArrowLeft size={14} strokeWidth={2} />
        All purchases
      </Link>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
        {/* Item card */}
        <div className="rounded-2xl border p-5 flex gap-4 bg-card" style={{ borderColor: '#e8e4dc' }}>
          <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: '#f0ece5' }}>
            {order.listing.images?.[0] ? (
              <CldImage src={order.listing.images[0]} fill sizes="80px" className="object-cover" alt={order.listing.title} />
            ) : (
              <Package size={22} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold" style={{ color: '#16130f' }}>{order.listing.title}</h1>
            <p className="text-base font-medium mt-0.5" style={{ color: '#4f46e5' }}>₦{order.total_price.toLocaleString()}</p>
            <span
              className="inline-flex items-center gap-1 mt-2 text-[10px] rounded-full px-2 py-0.5"
              style={order.delivery_type === 'delivery' ? { background: 'rgba(79,70,229,0.08)', color: '#4f46e5' } : { background: 'rgba(16,185,129,0.08)', color: '#10b981' }}
            >
              {order.delivery_type === 'delivery' ? <><Truck size={9} strokeWidth={2} /> Delivery</> : <><MapPin size={9} strokeWidth={2} /> Pickup</>}
            </span>
          </div>
        </div>

        {/* Delivery code */}
        {order.delivery_code && (
          <div className="rounded-2xl border p-5 bg-card" style={{ borderColor: '#e8e4dc' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#a8a09a' }}>
              {order.delivery_type === 'delivery' ? 'Your delivery code' : 'Your pickup code'}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#f5f1eb' }}>
                <KeyRound size={16} strokeWidth={1.8} style={{ color: '#78726c' }} />
                <span className="text-2xl font-mono font-bold tracking-[0.3em]" style={{ color: '#16130f' }}>
                  {order.delivery_code}
                </span>
              </div>
              <p className="text-xs leading-snug" style={{ color: '#78726c' }}>
                {order.delivery_type === 'delivery'
                  ? 'Share this with the dispatcher when your item arrives.'
                  : 'Show this to the seller when you come to collect your item.'}
              </p>
            </div>
          </div>
        )}

        {/* Status timeline */}
        <div className="rounded-2xl border p-5 bg-card" style={{ borderColor: '#e8e4dc' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: '#a8a09a' }}>Order status</p>
          <StatusTimeline status={order.status} deliveryType={order.delivery_type} />
        </div>

        {/* Cancel order */}
        {CANCELLABLE_STATUSES.has(order.status) && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full rounded-2xl border py-3 text-sm font-medium transition-colors hover:bg-red-50 disabled:opacity-50"
            style={{ borderColor: '#fca5a5', color: '#dc2626' }}
          >
            {cancelling ? 'Cancelling…' : 'Cancel order'}
          </button>
        )}

        {/* Price breakdown */}
        <div className="rounded-2xl border p-5 bg-card" style={{ borderColor: '#e8e4dc' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#a8a09a' }}>Payment</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm" style={{ color: '#78726c' }}>
              <span>Item</span><span>₦{order.item_price.toLocaleString()}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm" style={{ color: '#78726c' }}>
                <span>Delivery</span><span>₦{order.delivery_fee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold pt-2 border-t" style={{ color: '#16130f', borderColor: '#e8e4dc' }}>
              <span>Total</span><span>₦{order.total_price.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Seller contact */}
        {order.seller && (
          <div className="rounded-2xl border p-5 bg-card" style={{ borderColor: '#e8e4dc' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#a8a09a' }}>Seller</p>
            <p className="text-sm font-medium mb-2" style={{ color: '#16130f' }}>{order.seller.name ?? 'Declutter seller'}</p>
            <a
              href={`mailto:${order.seller.email}?subject=${encodeURIComponent(`My order — ${order.listing.title}`)}`}
              className="inline-flex items-center gap-1.5 text-xs rounded-xl border px-3 py-2 transition-colors hover:bg-[#f5f1eb]"
              style={{ borderColor: '#e8e4dc', color: '#78726c' }}
            >
              <Mail size={12} strokeWidth={2} />
              Contact seller
            </a>
          </div>
        )}
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Open a purchase order detail**

With the dev server running, click a purchase in the Purchases tab — should navigate to `/dashboard/orders/<id>` and show the detail view inside the dashboard shell (with sidebar).

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/orders/[id]/page.tsx
git commit -m "feat: add purchase order detail page inside dashboard"
```

---

## Task 3: Redirect old `/orders` routes

**Files:**
- Modify: `app/orders/page.tsx`
- Modify: `app/orders/[id]/page.tsx`

Turn both into server-component redirects so old links and bookmarks still work.

- [ ] **Step 1: Replace `app/orders/page.tsx`**

```tsx
// app/orders/page.tsx
import { redirect } from 'next/navigation'

export default function OrdersPage() {
  redirect('/dashboard/orders?tab=purchases')
}
```

- [ ] **Step 2: Replace `app/orders/[id]/page.tsx`**

```tsx
// app/orders/[id]/page.tsx
import { redirect } from 'next/navigation'

export default async function OrderDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard/orders/${id}`)
}
```

- [ ] **Step 3: Verify redirects work**

Open `http://localhost:3000/orders` — should land on `/dashboard/orders?tab=purchases`.
Open `http://localhost:3000/orders/<any-uuid>` — should land on `/dashboard/orders/<uuid>`.

- [ ] **Step 4: Commit**

```bash
git add app/orders/page.tsx app/orders/[id]/page.tsx
git commit -m "feat: redirect /orders to /dashboard/orders purchases tab"
```

---

## Task 4: Add "Recent purchases" to dashboard overview

**Files:**
- Modify: `app/dashboard/page.tsx`

Add a compact list of the user's 3 most recent purchases below the existing "Recent listings" section. Reuse the same card style. If the user has no purchases, show nothing (don't show an empty state — only sellers with no listings get the big empty state).

- [ ] **Step 1: Update `app/dashboard/page.tsx`**

Add the `useBuyerOrders` import and a new "Recent purchases" section. The full updated file:

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  PlusCircle,
  TrendingUp,
  Eye,
  ShoppingBag,
  ArrowRight,
  Tag,
  Truck,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui";
import { StatCard } from "@/components/dashboard/StatCard";
import { useMyListings } from "@/lib/hooks/useListings";
import { useMe } from "@/lib/hooks/useAuth";
import { useBuyerOrders } from "@/lib/hooks/useBuyerOrders";
import { CldImage } from "next-cloudinary";

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35 },
  };
}

const PURCHASE_STATUS_STYLE: Record<string, { background: string; color: string }> = {
  pending:   { background: "rgba(251,191,36,0.12)",  color: "#d97706" },
  paid:      { background: "rgba(79,70,229,0.08)",   color: "#4f46e5" },
  confirmed: { background: "rgba(79,70,229,0.08)",   color: "#4f46e5" },
  shipped:   { background: "rgba(16,185,129,0.08)",  color: "#10b981" },
  delivered: { background: "rgba(16,185,129,0.08)",  color: "#10b981" },
  completed: { background: "rgba(16,185,129,0.08)",  color: "#10b981" },
  cancelled: { background: "rgba(239,68,68,0.08)",   color: "#ef4444" },
};

const PURCHASE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending", paid: "Confirmed", confirmed: "Confirmed",
  shipped: "Shipped", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled",
};

export default function DashboardPage() {
  const { data: me } = useMe();
  const { data, isLoading } = useMyListings();
  const { data: purchases } = useBuyerOrders();
  const listings = data?.listings ?? [];
  const recentPurchases = (purchases ?? []).slice(0, 3);

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === "available").length,
    sold: listings.filter((l) => l.status === "sold").length,
    donated: listings.filter((l) => l.status === "donated").length,
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-text">
          {greeting}
          {me?.name ? `, ${me.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-text-muted mt-1">
          Here&apos;s what&apos;s happening with your listings.
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div {...fadeUp(0)}>
          <StatCard label="Total listings" value={isLoading ? "—" : stats.total} icon={Package} color="text-primary" bgColor="bg-primary/10" lineColor="bg-primary" />
        </motion.div>
        <motion.div {...fadeUp(0.07)}>
          <StatCard label="Available" value={isLoading ? "—" : stats.active} icon={TrendingUp} color="text-green-600" bgColor="bg-green-500/10" lineColor="bg-green-500" />
        </motion.div>
        <motion.div {...fadeUp(0.14)}>
          <StatCard label="Sold" value={isLoading ? "—" : stats.sold} icon={ShoppingBag} color="text-blue-600" bgColor="bg-blue-500/10" lineColor="bg-blue-500" />
        </motion.div>
        <motion.div {...fadeUp(0.21)}>
          <StatCard label="Donated" value={isLoading ? "—" : stats.donated} icon={Eye} color="text-purple-600" bgColor="bg-purple-500/10" lineColor="bg-purple-500" />
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div {...fadeUp(0.28)} className="bg-card rounded-xl shadow-card p-6">
        <h2 className="text-sm font-semibold text-text mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/dashboard/listings/new">
            <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/4 transition-colors cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <PlusCircle size={18} className="text-primary" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">New listing</p>
                <p className="text-xs text-text-muted">List an item for sale, free or donate</p>
              </div>
            </motion.div>
          </Link>
          <Link href="/dashboard/listings">
            <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/4 transition-colors cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
                <Package size={18} className="text-text-muted" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">My listings</p>
                <p className="text-xs text-text-muted">Manage and update your items</p>
              </div>
            </motion.div>
          </Link>
          <Link href="/dashboard/profile">
            <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/4 transition-colors cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
                <Tag size={18} className="text-text-muted" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">Your profile</p>
                <p className="text-xs text-text-muted">Update your account details</p>
              </div>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Recent listings */}
      {listings.length > 0 && (
        <motion.div {...fadeUp(0.35)} className="bg-card rounded-xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text">Recent listings</h2>
            <Link href="/dashboard/listings" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-2">
            {listings.slice(0, 4).map((listing) => (
              <Link key={listing.id} href={`/dashboard/listings/${listing.id}/edit`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-border overflow-hidden shrink-0">
                  {listing.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_80,h_80,c_fill/${listing.images[0]}`}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={16} className="text-text-muted" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate group-hover:text-primary transition-colors">{listing.title}</p>
                  <p className="text-xs text-text-muted">{listing.area}</p>
                </div>
                <span className={["text-xs font-medium px-2 py-0.5 rounded-full", listing.status === "available" ? "bg-success/10 text-success" : listing.status === "sold" ? "bg-accent/10 text-accent" : "bg-border text-text-muted"].join(" ")}>
                  {listing.status}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent purchases */}
      {recentPurchases.length > 0 && (
        <motion.div {...fadeUp(0.42)} className="bg-card rounded-xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text">Recent purchases</h2>
            <Link href="/dashboard/orders?tab=purchases" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentPurchases.map((order) => {
              const statusStyle = PURCHASE_STATUS_STYLE[order.status] ?? PURCHASE_STATUS_STYLE.pending;
              return (
                <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors group">
                  <div className="relative w-10 h-10 rounded-lg bg-border overflow-hidden shrink-0">
                    {order.listing.images?.[0] ? (
                      <CldImage src={order.listing.images[0]} fill sizes="40px" className="object-cover" alt={order.listing.title} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={16} className="text-text-muted" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate group-hover:text-primary transition-colors">{order.listing.title}</p>
                    <p className="text-xs text-text-muted">₦{order.total_price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={statusStyle}>
                      {PURCHASE_STATUS_LABEL[order.status] ?? order.status}
                    </span>
                    <span className="text-text-muted" style={{ color: "#c8c2bb" }}>
                      {order.delivery_type === "delivery" ? <Truck size={12} strokeWidth={1.5} /> : <MapPin size={12} strokeWidth={1.5} />}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty state — only shown when no listings */}
      {!isLoading && listings.length === 0 && (
        <motion.div {...fadeUp(0.28)} className="bg-card rounded-xl shadow-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-primary" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-text mb-1">No listings yet</h3>
          <p className="text-sm text-text-muted mb-6">Start by creating your first listing — it only takes a minute.</p>
          <Button href="/dashboard/listings/new" size="md">Create your first listing</Button>
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Check the overview page**

Open `http://localhost:3000/dashboard` — if the user has purchases, a "Recent purchases" section should appear below "Recent listings".

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add recent purchases section to dashboard overview"
```

---

## Task 5: Fix checkout success CTA

**Files:**
- Modify: `app/checkout/success/page.tsx`

The "Track your order" button currently links to `/login?next=/orders` (broken). Replace with a `useMe()`-aware CTA: logged-in users go straight to `/dashboard/orders?tab=purchases`; anonymous users go to `/auth/login?next=/dashboard/orders%3Ftab%3Dpurchases`.

- [ ] **Step 1: Replace `app/checkout/success/page.tsx`**

```tsx
// app/checkout/success/page.tsx
"use client";

import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { clearSessionCart } from '@/lib/session-cart'
import { useMe } from '@/lib/hooks/useAuth'

export default function CheckoutSuccessPage() {
  const { data: me, isLoading } = useMe()

  useEffect(() => {
    clearSessionCart()
    window.dispatchEvent(new Event('cart-updated'))
  }, [])

  const trackHref = me
    ? '/dashboard/orders?tab=purchases'
    : '/auth/login?next=/dashboard/orders%3Ftab%3Dpurchases'

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success-bg mb-6">
            <CheckCircle size={32} className="text-success" strokeWidth={1.5} />
          </div>

          <h1 className="font-display text-3xl font-bold text-text mb-2">
            Payment successful
          </h1>
          <p className="text-text-muted text-sm max-w-sm mb-2">
            Your order has been placed. The seller will be in touch within 12 hours
            to arrange delivery or pickup.
          </p>
          <p className="text-text-subtle text-xs mb-10">
            A confirmation has been sent to your email.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {!isLoading && (
              <Link
                href={trackHref}
                className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity"
                style={{ background: '#4f46e5' }}
              >
                Track your order
              </Link>
            )}
            <Link
              href="/listings"
              className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-card transition-colors"
            >
              Continue browsing
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Test the success page as a logged-in user**

Complete a checkout flow (or navigate directly to `/checkout/success`). The "Track your order" button should go to `/dashboard/orders?tab=purchases`.

- [ ] **Step 4: Test the success page as an anonymous user**

Sign out, navigate to `/checkout/success`. The "Track your order" button should go to `/auth/login?next=/dashboard/orders%3Ftab%3Dpurchases`. After logging in, the `next` redirect should land on the purchases tab.

- [ ] **Step 5: Final TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add app/checkout/success/page.tsx
git commit -m "fix: checkout success CTA points to purchases tab, auth-aware"
```
