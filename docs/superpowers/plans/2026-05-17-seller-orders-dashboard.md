# Seller Orders Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/dashboard/orders` page where sellers can view paid orders, confirm them, and mark them as delivered.

**Architecture:** Four new files (two API routes, one hook, one page) plus two small modifications to `proxy.ts` and `Sidebar.tsx`. API routes enforce seller ownership. The hook uses React Query for data fetching and cache invalidation after mutations.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (supabaseAdmin), TanStack Query, Sonner toasts, Framer Motion, next-cloudinary, Tailwind CSS 4, Lucide icons.

---

## File Map

| File | Action |
|---|---|
| `app/api/orders/mine/route.ts` | Create — GET seller's orders filtered by status |
| `app/api/orders/[id]/route.ts` | Create — PATCH order status with ownership + transition guards |
| `lib/hooks/useSellerOrders.ts` | Create — useQuery + useMutation wrappers |
| `app/dashboard/orders/page.tsx` | Create — tabbed orders page with cards, skeletons, empty states |
| `proxy.ts` | Modify — narrow the `/api/orders` public bypass so sub-routes go through auth |
| `components/dashboard/Sidebar.tsx` | Modify — enable the Orders nav item (remove disabled + "Soon" badge) |

---

## Task 1: Narrow proxy bypass for /api/orders

**Files:**
- Modify: `proxy.ts`

The current proxy bypasses all of `/api/orders/*` for anonymous buyer checkout. Sub-routes like `/api/orders/mine` and `/api/orders/[id]` need auth headers injected so `getAuthUser()` works for sellers.

- [ ] **Step 1: Update the bypass condition**

In `proxy.ts`, find this block:

```ts
// Public cart and checkout pages for anonymous buyers
if (pathname.startsWith('/api/cart') || pathname.startsWith('/api/orders')) {
  return NextResponse.next()
}
```

Replace with:

```ts
// Public cart and checkout pages for anonymous buyers
// Only the base /api/orders POST (buyer checkout) is public — sub-routes need seller auth
if (pathname.startsWith('/api/cart') || pathname === '/api/orders') {
  return NextResponse.next()
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint 2>&1 | grep proxy
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "fix: narrow /api/orders proxy bypass so seller sub-routes get auth headers"
```

---

## Task 2: GET /api/orders/mine

**Files:**
- Create: `app/api/orders/mine/route.ts`

Returns the authenticated seller's orders, filtered by status. Joins listing title and images.

- [ ] **Step 1: Create the route**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const VALID_STATUSES = ['paid', 'confirmed', 'delivered'] as const
type OrderStatus = (typeof VALID_STATUSES)[number]

export async function GET(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as OrderStatus | null

  if (!status || !VALID_STATUSES.includes(status)) {
    return err('status must be paid, confirmed, or delivered', 'VALIDATION_ERROR', 400)
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id, listing_id, status, delivery_type, item_price, delivery_fee, total_price, buyer_name, buyer_email, buyer_phone, buyer_address, created_at, listing:listings(id, title, images)'
    )
    .eq('seller_id', authUser.id)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch seller orders error:', error)
    return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  }

  return ok(orders ?? [])
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | grep "orders/mine"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/api/orders/mine/route.ts
git commit -m "feat: add GET /api/orders/mine for seller order list"
```

---

## Task 3: PATCH /api/orders/[id]

**Files:**
- Create: `app/api/orders/[id]/route.ts`

Updates order status. Guards: seller ownership + valid transition only.

- [ ] **Step 1: Create the route**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const VALID_TRANSITIONS: Record<string, string> = {
  paid: 'confirmed',
  confirmed: 'delivered',
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const body = await req.json()
  const { status: nextStatus } = body

  if (!nextStatus || !Object.values(VALID_TRANSITIONS).includes(nextStatus)) {
    return err('status must be confirmed or delivered', 'VALIDATION_ERROR', 400)
  }

  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !order) return err('Order not found', 'NOT_FOUND', 404)

  if (order.seller_id !== authUser.id) {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  if (VALID_TRANSITIONS[order.status] !== nextStatus) {
    return err(
      `Cannot transition from ${order.status} to ${nextStatus}`,
      'INVALID_TRANSITION',
      409
    )
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ status: nextStatus })
    .eq('id', id)
    .select('id, status')
    .single()

  if (updateError || !updated) {
    return err('Failed to update order', 'SERVER_ERROR', 500)
  }

  return ok(updated)
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | grep "orders/\[id\]"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/api/orders/[id]/route.ts"
git commit -m "feat: add PATCH /api/orders/[id] for seller order status updates"
```

---

## Task 4: useSellerOrders hook

**Files:**
- Create: `lib/hooks/useSellerOrders.ts`

Data fetching and mutation wrappers using TanStack Query, matching the pattern in `lib/hooks/useListings.ts`.

- [ ] **Step 1: Create the hook file**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type SellerOrder = {
  id: string
  listing_id: string
  status: 'paid' | 'confirmed' | 'delivered'
  delivery_type: 'delivery' | 'pickup'
  item_price: number
  delivery_fee: number
  total_price: number
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  buyer_address: string
  created_at: string
  listing: {
    id: string
    title: string
    images: string[]
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

export function useSellerOrders(status: 'paid' | 'confirmed' | 'delivered') {
  return useQuery<SellerOrder[]>({
    queryKey: ['orders', 'mine', status],
    queryFn: async () => {
      const json = await apiRequest('GET', `/api/orders/mine?status=${status}`)
      return json.data
    },
  })
}

export function useConfirmOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest('PATCH', `/api/orders/${id}`, { status: 'confirmed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', 'paid'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', 'confirmed'] })
      toast.success('Order confirmed')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeliverOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest('PATCH', `/api/orders/${id}`, { status: 'delivered' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', 'confirmed'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', 'delivered'] })
      toast.success('Marked as delivered')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | grep "useSellerOrders"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useSellerOrders.ts
git commit -m "feat: add useSellerOrders hook with confirm and deliver mutations"
```

---

## Task 5: Orders page

**Files:**
- Create: `app/dashboard/orders/page.tsx`

Tabbed page with order cards, skeleton loading, and empty states per tab.

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CldImage } from "next-cloudinary";
import {
  Package,
  MapPin,
  Phone,
  User,
  Truck,
  ShoppingBag,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  useSellerOrders,
  useConfirmOrder,
  useDeliverOrder,
  type SellerOrder,
} from "@/lib/hooks/useSellerOrders";

type Tab = { label: string; status: "paid" | "confirmed" | "delivered" };

const TABS: Tab[] = [
  { label: "New", status: "paid" },
  { label: "Confirmed", status: "confirmed" },
  { label: "Delivered", status: "delivered" },
];

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

function EmptyState({ tab }: { tab: string }) {
  const icons: Record<string, React.ElementType> = {
    New: Clock,
    Confirmed: CheckCircle2,
    Delivered: ShoppingBag,
  };
  const Icon = icons[tab] ?? Clock;
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
        style={{ background: "#f5f1eb", borderColor: "#e8e4dc" }}
      >
        <Icon size={24} strokeWidth={1.5} style={{ color: "#a8a09a" }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: "#16130f" }}>
        No {tab.toLowerCase()} orders
      </p>
      <p className="mt-1 text-xs" style={{ color: "#a8a09a" }}>
        {tab === "New"
          ? "New paid orders from buyers will appear here."
          : tab === "Confirmed"
          ? "Orders you have confirmed will appear here."
          : "Orders you have marked as delivered will appear here."}
      </p>
    </div>
  );
}

function OrderCard({ order, tab }: { order: SellerOrder; tab: Tab }) {
  const { mutate: confirm, isPending: confirming } = useConfirmOrder();
  const { mutate: deliver, isPending: delivering } = useDeliverOrder();

  const isPending = confirming || delivering;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border bg-card p-5 flex flex-col sm:flex-row gap-4"
      style={{ borderColor: "#e8e4dc" }}
    >
      {/* Thumbnail */}
      <div
        className="relative w-full sm:w-20 h-40 sm:h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: "#f0ece5" }}
      >
        {order.listing.images[0] ? (
          <CldImage
            src={order.listing.images[0]}
            fill
            sizes="80px"
            className="object-cover"
            alt={order.listing.title}
          />
        ) : (
          <Package size={22} strokeWidth={1.5} style={{ color: "#a8a09a" }} />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold leading-snug" style={{ color: "#16130f" }}>
              {order.listing.title}
            </h3>
            <p className="font-display text-base mt-0.5" style={{ color: "#4f46e5" }}>
              ₦{order.total_price.toLocaleString()}
            </p>
          </div>
          <span
            className="self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium shrink-0"
            style={
              order.delivery_type === "delivery"
                ? { background: "rgba(79,70,229,0.08)", color: "#4f46e5" }
                : { background: "rgba(16,185,129,0.08)", color: "#10b981" }
            }
          >
            {order.delivery_type === "delivery" ? (
              <Truck size={11} strokeWidth={2} />
            ) : (
              <MapPin size={11} strokeWidth={2} />
            )}
            {order.delivery_type === "delivery" ? "Delivery" : "Pickup"}
          </span>
        </div>

        {/* Buyer info */}
        <div className="flex flex-col gap-1 mb-4">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <User size={11} strokeWidth={2} className="shrink-0" />
            <span>{order.buyer_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <Phone size={11} strokeWidth={2} className="shrink-0" />
            <span>{order.buyer_phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#78726c" }}>
            <MapPin size={11} strokeWidth={2} className="shrink-0" />
            <span className="line-clamp-1">{order.buyer_address}</span>
          </div>
        </div>

        {/* Action */}
        {tab.status === "paid" && (
          <button
            onClick={() => confirm(order.id)}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "#4f46e5" }}
          >
            {confirming ? "Confirming…" : "Confirm order"}
          </button>
        )}
        {tab.status === "confirmed" && (
          <button
            onClick={() => deliver(order.id)}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "#10b981" }}
          >
            {delivering ? "Updating…" : "Mark as delivered"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  const { data: orders, isLoading } = useSellerOrders(tab.status);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return <EmptyState tab={tab.label} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} tab={tab} />
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<Tab>(TABS[0]);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold" style={{ color: "#16130f" }}>
          Orders
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#78726c" }}>
          Manage orders from buyers.
        </p>
      </motion.div>

      {/* Tabs */}
      <div
        className="inline-flex gap-0.5 rounded-full p-0.5"
        style={{ background: "#f0ece5" }}
      >
        {TABS.map((tab) => {
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

      {/* Tab content */}
      <TabContent tab={activeTab} />
    </div>
  );
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | grep "dashboard/orders"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/orders/page.tsx
git commit -m "feat: add seller orders dashboard page with tabbed New/Confirmed/Delivered views"
```

---

## Task 6: Enable Orders in Sidebar

**Files:**
- Modify: `components/dashboard/Sidebar.tsx`

The Orders nav item is currently `disabled: true` with a "Soon" badge. Enable it.

- [ ] **Step 1: Update NAV_ITEMS**

In `components/dashboard/Sidebar.tsx`, find:

```ts
  {
    href: "/dashboard/orders",
    label: "Orders",
    icon: ShoppingCart,
    badge: "Soon",
    disabled: true,
  },
```

Replace with:

```ts
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint 2>&1 | grep "Sidebar"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/Sidebar.tsx
git commit -m "feat: enable Orders nav item in dashboard sidebar"
```

---

## Task 7: Visual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Visit `/dashboard/orders`**

Confirm:
- Sidebar shows "Orders" as an active, clickable link (no "Soon" badge)
- Three tabs render: New, Confirmed, Delivered
- New tab is active by default
- Empty state shows with icon and message when no orders
- If test orders exist (status = `paid`): order cards render with thumbnail, title, price, delivery pill, buyer name/phone/address, and "Confirm order" button
- Clicking "Confirm order" shows "Confirming…", then card disappears from New tab and appears in Confirmed tab
- Confirmed tab shows "Mark as delivered" button; clicking it moves order to Delivered tab
- Delivered tab shows orders with no action button
- Loading skeletons show briefly on tab switch
