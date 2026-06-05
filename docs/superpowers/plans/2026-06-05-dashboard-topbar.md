# Dashboard TopBar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unwired TopBar with a search-forward top bar featuring global dashboard search (Ctrl+K), a notification bell with dropdown, and the existing avatar dropdown.

**Architecture:** A `notifications` table in Supabase stores events inserted by existing server-side handlers (webhook, claims, order routes). Three new API routes serve notifications. A new search route queries listings/orders/claims in parallel via Postgres `ilike`. The TopBar component is rewritten to own search state, notification state, and the avatar dropdown. A `useNotifications` React Query hook fetches from the API.

**Tech Stack:** Next.js App Router, Supabase (supabaseAdmin), React Query (tanstack/react-query), Tailwind CSS 4, lucide-react, framer-motion (already installed)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/notifications.ts` | Create | `createNotification()` helper used by server routes |
| `app/api/notifications/route.ts` | Create | `GET /api/notifications` — list + unread count |
| `app/api/notifications/[id]/read/route.ts` | Create | `PATCH` — mark one notification read |
| `app/api/notifications/read-all/route.ts` | Create | `PATCH` — mark all read |
| `app/api/search/route.ts` | Create | `GET /api/search?q=` — search listings/orders/claims |
| `lib/hooks/useNotifications.ts` | Create | React Query hook for notifications |
| `components/dashboard/TopBar.tsx` | Rewrite | Search input + Ctrl+K + bell dropdown + avatar dropdown |
| `app/dashboard/layout.tsx` | Modify | Import and render TopBar |
| `app/api/webhooks/stripe/route.ts` | Modify | Insert notifications in payment/payout handlers |
| `app/api/claims/route.ts` | Modify | Insert notification for seller on new claim |

---

### Task 1: Create the notifications table

**Files:**
- No file to create — run SQL directly in Supabase dashboard or migration tool

- [ ] **Step 1: Run this SQL in the Supabase SQL editor**

```sql
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  type        text not null check (type in ('order_update', 'claim_request', 'payout_update')),
  title       text not null,
  body        text not null,
  link        text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_user_unread_idx on notifications(user_id, read) where read = false;
```

- [ ] **Step 2: Verify the table exists**

In Supabase Table Editor, confirm `notifications` appears with the correct columns.

- [ ] **Step 3: Commit a note in git**

```bash
git commit --allow-empty -m "feat: notifications table created in Supabase (manual migration)"
```

---

### Task 2: Create the notification helper

**Files:**
- Create: `lib/notifications.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/notifications.ts
import { supabaseAdmin } from '@/lib/supabase'

type NotificationType = 'order_update' | 'claim_request' | 'payout_update'

interface NotificationInput {
  user_id: string
  type: NotificationType
  title: string
  body: string
  link: string
}

export async function createNotification(input: NotificationInput): Promise<void> {
  const { error } = await supabaseAdmin.from('notifications').insert(input)
  if (error) console.error('Failed to insert notification:', error)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no type errors relating to `lib/notifications.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/notifications.ts
git commit -m "feat: add createNotification helper"
```

---

### Task 3: Notifications API — list

**Files:**
- Create: `app/api/notifications/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/notifications/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('id, type, title, body, link, read, created_at')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return err('Failed to fetch notifications', 'DB_ERROR', 500)

  const unreadCount = (data ?? []).filter((n) => !n.read).length

  return ok({ notifications: data ?? [], unreadCount })
}
```

- [ ] **Step 2: Smoke test with curl (requires dev server running)**

```bash
# start dev server first: npm run dev
curl -s http://localhost:3000/api/notifications \
  -H "Cookie: <paste your session cookie here>" | jq .
```

Expected: `{ "data": { "notifications": [], "unreadCount": 0 } }` for a fresh account.

- [ ] **Step 3: Commit**

```bash
git add app/api/notifications/route.ts
git commit -m "feat: GET /api/notifications"
```

---

### Task 4: Notifications API — mark one read

**Files:**
- Create: `app/api/notifications/[id]/read/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/notifications/[id]/read/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', authUser.id)

  if (error) return err('Failed to mark notification read', 'DB_ERROR', 500)

  return ok({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/notifications/[id]/read/route.ts
git commit -m "feat: PATCH /api/notifications/[id]/read"
```

---

### Task 5: Notifications API — mark all read

**Files:**
- Create: `app/api/notifications/read-all/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/notifications/read-all/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function PATCH() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('user_id', authUser.id)
    .eq('read', false)

  if (error) return err('Failed to mark notifications read', 'DB_ERROR', 500)

  return ok({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/notifications/read-all/route.ts
git commit -m "feat: PATCH /api/notifications/read-all"
```

---

### Task 6: Search API

**Files:**
- Create: `app/api/search/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/search/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return ok({ listings: [], orders: [], claims: [] })

  const pattern = `%${q}%`

  const [listingsRes, ordersRes, claimsRes] = await Promise.all([
    supabaseAdmin
      .from('listings')
      .select('id, title, status, listing_type, images')
      .eq('seller_id', authUser.id)
      .ilike('title', pattern)
      .limit(5),

    supabaseAdmin
      .from('orders')
      .select('id, status, total_price, created_at')
      .or(`buyer_id.eq.${authUser.id},seller_id.eq.${authUser.id}`)
      .ilike('id', pattern)
      .limit(5),

    supabaseAdmin
      .from('claims')
      .select('id, status, listing:listings(id, title)')
      .eq('buyer_id', authUser.id)
      .limit(5),
  ])

  // Filter claims client-side since we can't ilike on a joined column
  const allClaims = (claimsRes.data ?? [])
  const filteredClaims = allClaims.filter((c) => {
    const listing = Array.isArray(c.listing) ? c.listing[0] : c.listing
    return listing?.title?.toLowerCase().includes(q.toLowerCase())
  })

  return ok({
    listings: listingsRes.data ?? [],
    orders: ordersRes.data ?? [],
    claims: filteredClaims,
  })
}
```

- [ ] **Step 2: Smoke test (dev server running)**

```bash
curl -s "http://localhost:3000/api/search?q=shoe" \
  -H "Cookie: <paste your session cookie>" | jq .
```

Expected: `{ "data": { "listings": [...], "orders": [...], "claims": [...] } }`

- [ ] **Step 3: Commit**

```bash
git add app/api/search/route.ts
git commit -m "feat: GET /api/search — dashboard search across listings, orders, claims"
```

---

### Task 7: Wire notification inserts into existing handlers

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts`
- Modify: `app/api/claims/route.ts`

- [ ] **Step 1: Add import to webhook file**

At the top of `app/api/webhooks/stripe/route.ts`, add the import after the existing imports:

```ts
import { createNotification } from '@/lib/notifications'
```

- [ ] **Step 2: Insert order_update notification in handlePaymentIntentSucceeded**

Inside `handlePaymentIntentSucceeded`, after the `Promise.all` that marks orders paid, add:

```ts
  // Notify buyer that their orders are confirmed/paid
  const buyerIdForNotif = paymentIntent.metadata?.buyer_id
  if (buyerIdForNotif && buyerIdForNotif !== 'anonymous') {
    for (const order of orders) {
      await createNotification({
        user_id: buyerIdForNotif,
        type: 'order_update',
        title: 'Payment confirmed',
        body: 'Your order has been placed and payment received.',
        link: `/dashboard/orders/${order.id}`,
      })
    }
  }
```

- [ ] **Step 3: Insert payout_update notification after each successful transfer in handlePaymentIntentSucceeded**

Inside the `for (const order of orders)` loop, after `await supabaseAdmin.from('orders').update({ stripe_transfer_id: transfer.id }).eq('id', order.id)`, add:

```ts
      await createNotification({
        user_id: order.seller_id,
        type: 'payout_update',
        title: 'Payout sent',
        body: `Your payout for order has been transferred to your Stripe account.`,
        link: `/dashboard/billing`,
      })
```

- [ ] **Step 4: Insert claim_request notification in claims route**

In `app/api/claims/route.ts`, add the import at the top:

```ts
import { createNotification } from '@/lib/notifications'
```

Then after `await supabaseAdmin.from('listings').update({ status: 'claimed' }).eq('id', listing_id)`, add:

```ts
  // Notify seller of the new claim
  await createNotification({
    user_id: listing.seller_id,
    type: 'claim_request',
    title: 'New claim request',
    body: `Someone requested your item "${listing.title as string}".`,
    link: `/dashboard/listings`,
  })
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: no new type errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/webhooks/stripe/route.ts app/api/claims/route.ts
git commit -m "feat: insert notifications on payment, payout, and claim events"
```

---

### Task 8: useNotifications hook

**Files:**
- Create: `lib/hooks/useNotifications.ts`

- [ ] **Step 1: Create the hook**

```ts
// lib/hooks/useNotifications.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Notification {
  id: string
  type: 'order_update' | 'claim_request' | 'payout_update'
  title: string
  body: string
  link: string
  read: boolean
  created_at: string
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

async function fetchNotifications(): Promise<NotificationsResponse> {
  const res = await fetch('/api/notifications')
  if (!res.ok) throw new Error('Failed to fetch notifications')
  const json = await res.json()
  return json.data
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 30 * 1000,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await fetch('/api/notifications/read-all', { method: 'PATCH' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/useNotifications.ts
git commit -m "feat: useNotifications, useMarkRead, useMarkAllRead hooks"
```

---

### Task 9: Rewrite TopBar component

**Files:**
- Rewrite: `components/dashboard/TopBar.tsx`

- [ ] **Step 1: Replace the entire file with this implementation**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { Search, Bell, User, LogOut, Package, ShoppingCart, Tag } from "lucide-react";
import { useMe, useSignOut } from "@/lib/hooks/useAuth";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/lib/hooks/useNotifications";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchListing {
  id: string
  title: string
  status: string
  listing_type: string
  images: string[]
}

interface SearchOrder {
  id: string
  status: string
  total_price: number
  created_at: string
}

interface SearchClaim {
  id: string
  status: string
  listing: { id: string; title: string } | null
}

interface SearchResults {
  listings: SearchListing[]
  orders: SearchOrder[]
  claims: SearchClaim[]
}

// ─── Search ───────────────────────────────────────────────────────────────────

function useSearch(query: string) {
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      return
    }

    const timeout = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const json = await res.json()
        setResults(json.data)
      } catch {
        setResults(null)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  return { results, isLoading }
}

// ─── SearchBox ────────────────────────────────────────────────────────────────

function SearchBox() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { results, isLoading } = useSearch(query)

  const hasResults =
    results &&
    (results.listings.length > 0 || results.orders.length > 0 || results.claims.length > 0)

  // Ctrl+K / ⌘K global shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === "Escape") {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleSelect(href: string) {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  const showDropdown = open && query.length >= 2

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <div className="relative flex items-center">
        <Search size={15} className="absolute left-3 text-text-subtle pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search listings, orders, claims..."
          className="w-full h-9 pl-9 pr-16 rounded-lg border border-border bg-surface text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors"
        />
        <kbd className="absolute right-3 hidden sm:flex items-center gap-0.5 text-[10px] text-text-subtle font-medium pointer-events-none">
          <span className="text-[11px]">⌘</span>K
        </kbd>
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-text-subtle">Searching...</div>
          )}

          {!isLoading && !hasResults && (
            <div className="px-4 py-3 text-sm text-text-subtle">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!isLoading && hasResults && (
            <div className="py-1.5 max-h-80 overflow-y-auto">
              {results!.listings.length > 0 && (
                <Section label="Listings">
                  {results!.listings.map((l) => (
                    <ResultRow
                      key={l.id}
                      icon={<Package size={14} className="text-text-subtle" />}
                      title={l.title}
                      detail={l.status}
                      onClick={() => handleSelect(`/dashboard/listings/${l.id}`)}
                    />
                  ))}
                </Section>
              )}

              {results!.orders.length > 0 && (
                <Section label="Orders">
                  {results!.orders.map((o) => (
                    <ResultRow
                      key={o.id}
                      icon={<ShoppingCart size={14} className="text-text-subtle" />}
                      title={`Order #${o.id.slice(0, 8)}`}
                      detail={o.status}
                      onClick={() => handleSelect(`/dashboard/orders/${o.id}`)}
                    />
                  ))}
                </Section>
              )}

              {results!.claims.length > 0 && (
                <Section label="Claims">
                  {results!.claims.map((c) => {
                    const listing = Array.isArray(c.listing) ? c.listing[0] : c.listing
                    return (
                      <ResultRow
                        key={c.id}
                        icon={<Tag size={14} className="text-text-subtle" />}
                        title={listing?.title ?? "Claim"}
                        detail={c.status}
                        onClick={() => handleSelect(`/dashboard/orders`)}
                      />
                    )
                  })}
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
        {label}
      </p>
      {children}
    </div>
  )
}

function ResultRow({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-surface transition-colors"
    >
      {icon}
      <span className="text-sm text-text flex-1 truncate">{title}</span>
      <span className="text-xs text-text-subtle capitalize shrink-0">{detail}</span>
    </button>
  )
}

// ─── NotificationBell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data } = useNotifications()
  const { mutate: markRead } = useMarkRead()
  const { mutate: markAllRead } = useMarkAllRead()

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleOpen() {
    setOpen((v) => !v)
  }

  function handleNotificationClick(id: string, link: string) {
    markRead(id)
    setOpen(false)
    router.push(link)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-text-subtle hover:text-text hover:bg-surface transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-text">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-subtle text-center">
                No notifications yet
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n.id, n.link)}
                  className="flex gap-3 w-full px-4 py-3 text-left hover:bg-surface transition-colors border-b border-border/50 last:border-0"
                >
                  <span
                    className={[
                      "mt-1 w-1 shrink-0 self-stretch rounded-full",
                      n.read ? "bg-transparent" : "bg-primary",
                    ].join(" ")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={["text-sm truncate", n.read ? "text-text-subtle" : "text-text font-medium"].join(" ")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-text-subtle mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-text-subtle mt-1">
                      {new Date(n.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AvatarMenu ───────────────────────────────────────────────────────────────

function AvatarMenu() {
  const { data: me } = useMe()
  const { mutate: signOut } = useSignOut()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-3 rounded-full px-2 py-1.5 hover:bg-surface transition-colors"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
          {me?.avatar_url ? (
            <CldImage
              src={me.avatar_url}
              width={32}
              height={32}
              alt={me?.name ?? "Avatar"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center">
              <span className="text-xs font-semibold text-white">
                {me?.name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
          )}
        </div>
        <div className="text-left min-w-0 hidden sm:block">
          <p className="text-sm font-medium text-text truncate max-w-[140px]">
            {me?.name ?? "Account"}
          </p>
          <p className="text-xs text-text-subtle truncate max-w-[140px]">
            {me?.email ?? ""}
          </p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-xl z-50">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
                {me?.avatar_url ? (
                  <CldImage
                    src={me.avatar_url}
                    width={40}
                    height={40}
                    alt={me?.name ?? "Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {me?.name?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text truncate">{me?.name ?? "Account"}</p>
                <p className="text-xs text-text-subtle truncate">{me?.email ?? ""}</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="py-1.5">
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-surface transition-colors"
            >
              <User size={16} strokeWidth={1.75} className="text-text-subtle" />
              <span>Profile Settings</span>
            </Link>

            <button
              onClick={() => { setOpen(false); signOut() }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/5 transition-colors"
            >
              <LogOut size={16} strokeWidth={1.75} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar() {
  return (
    <header className="hidden lg:flex items-center gap-4 h-14 px-6 lg:px-8 bg-card border-b border-border shrink-0 sticky top-0 z-20">
      <SearchBox />
      <NotificationBell />
      <AvatarMenu />
    </header>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors in `components/dashboard/TopBar.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/TopBar.tsx lib/hooks/useNotifications.ts
git commit -m "feat: rewrite TopBar with search, notification bell, and avatar dropdown"
```

---

### Task 10: Wire TopBar into dashboard layout

**Files:**
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: Update the layout**

Replace the entire file content:

```tsx
"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { TopBar } from "@/components/dashboard/TopBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileHeader />
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start the dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard`. On a desktop-width screen (≥1024px) you should see:
- Sidebar on the left (unchanged)
- TopBar across the top with: search input on the left, bell icon, avatar on the right
- MobileHeader is hidden on desktop (no double header)
- On mobile/tablet (<1024px): only MobileHeader shows, TopBar is hidden

- [ ] **Step 3: Test Ctrl+K**

Press `Ctrl+K` (or `⌘K` on Mac) — search input should focus and the cursor should be in the input.

- [ ] **Step 4: Test search**

Type at least 2 characters. After 300ms a dropdown should appear (empty state or results depending on your data).

- [ ] **Step 5: Test bell**

Click the bell icon — dropdown panel should appear with "No notifications yet" (unless you have data).

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: wire TopBar into dashboard layout"
```
