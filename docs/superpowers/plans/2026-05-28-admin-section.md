# Admin Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully isolated admin section at `/admin` with sidebar navigation covering platform stats, user management, listings moderation, order oversight, dispatcher management, and charity CRUD.

**Architecture:** Standalone admin shell (`app/admin/layout.tsx` + `components/admin/AdminSidebar.tsx`) isolated from the seller dashboard. All `/api/admin/*` routes require `account_type === 'admin'` enforced in `proxy.ts` and re-checked in each handler. UI pages use React Query for data fetching, matching the seller dashboard patterns.

**Tech Stack:** Next.js App Router, Supabase (postgres), `@tanstack/react-query`, Tailwind CSS 4, Lucide icons, Framer Motion.

---

## File Map

**New files:**
- `components/admin/AdminSidebar.tsx` — sidebar nav component for the admin shell
- `app/admin/layout.tsx` — admin page shell (sidebar + main content)
- `app/admin/dashboard/page.tsx` — platform stats home
- `app/admin/users/page.tsx` — user list with suspend/reactivate
- `app/admin/listings/page.tsx` — listing list with remove action
- `app/admin/orders/page.tsx` — order list with force-cancel
- `app/admin/charities/page.tsx` — charity CRUD
- `app/api/admin/stats/route.ts` — GET platform stats
- `app/api/admin/users/route.ts` — GET users list
- `app/api/admin/users/[id]/route.ts` — PATCH suspend/reactivate user
- `app/api/admin/listings/route.ts` — GET listings list
- `app/api/admin/listings/[id]/route.ts` — DELETE (soft-remove) listing
- `app/api/admin/orders/route.ts` — GET orders list
- `app/api/admin/orders/[id]/cancel/route.ts` — POST force-cancel order
- `app/api/admin/charities/route.ts` — GET + POST charities
- `app/api/admin/charities/[id]/route.ts` — PATCH + DELETE charity

**Modified files:**
- `types/index.ts` — add `'removed'` to `ListingStatus`
- `app/admin/page.tsx` — redirect to `/admin/dashboard`
- `app/admin/dispatchers/page.tsx` — remove standalone page wrapper (layout provides it now)
- `proxy.ts` — extend user query to check `suspended`

**Already in place (from session setup):**
- `proxy.ts` — admin guard block and matcher entries
- `app/api/admin/dispatchers/route.ts` — GET + POST dispatcher
- `types/index.ts` — `'admin'` in `AccountType`
- `lib/hooks/useAuth.ts` — admin redirects to `/admin` after sign-in

**DB migration (run once in Supabase SQL editor):**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;
```

---

## Task 1: Schema & type changes

**Files:**
- Modify: `types/index.ts`
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Add `'removed'` to `ListingStatus` in `types/index.ts`**

Open `types/index.ts` and change line 4:

```typescript
export type ListingStatus = 'available' | 'sold' | 'claimed' | 'donated' | 'removed'
```

- [ ] **Step 2: Run the DB migration**

In the Supabase dashboard → SQL editor, run:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;
```

Verify: `SELECT suspended FROM users LIMIT 1;` should return `false`.

- [ ] **Step 3: Update `app/admin/page.tsx` redirect target**

Replace the entire file:

```typescript
import { redirect } from 'next/navigation'

export default function AdminRootPage() {
  redirect('/admin/dashboard')
}
```

- [ ] **Step 4: Commit**

```bash
git add types/index.ts app/admin/page.tsx
git commit -m "feat: add removed listing status and fix admin root redirect"
```

---

## Task 2: Suspension check in proxy

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Extend the Supabase user query in `proxy.ts` to fetch `suspended`**

Find this block (around line 80 in `proxy.ts`):

```typescript
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email_verified')
    .eq('id', payload.sub)
    .single()

  if (!user?.email_verified) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/verify-email', request.url))
  }
```

Replace with:

```typescript
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email_verified, suspended')
    .eq('id', payload.sub)
    .single()

  if (!user?.email_verified) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/verify-email', request.url))
  }

  if (user?.suspended) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/auth/login?error=suspended', request.url))
  }
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: block suspended users in proxy"
```

---

## Task 3: Admin layout & sidebar

**Files:**
- Create: `components/admin/AdminSidebar.tsx`
- Create: `app/admin/layout.tsx`
- Modify: `app/admin/dispatchers/page.tsx`

- [ ] **Step 1: Create `components/admin/AdminSidebar.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Package, ShoppingBag, Truck, Heart, LogOut, ChevronRight,
} from 'lucide-react'
import { useSignOut } from '@/lib/hooks/useAuth'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users',     label: 'Users',      icon: Users },
  { href: '/admin/listings',  label: 'Listings',   icon: Package },
  { href: '/admin/orders',    label: 'Orders',     icon: ShoppingBag },
  { href: '/admin/dispatchers', label: 'Dispatchers', icon: Truck },
  { href: '/admin/charities', label: 'Charities',  icon: Heart },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { mutate: signOut } = useSignOut()

  return (
    <aside className="hidden lg:flex flex-col w-(--sidebar-width) h-screen top-0 bg-primary shrink-0 rounded-r-4xl relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-white/5" />
      </div>

      <div className="relative z-10 px-6 py-5 shrink-0">
        <Link href="/admin/dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="declut" className="h-7" />
        </Link>
      </div>

      <div className="relative z-10 px-6 pb-3 shrink-0">
        <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">Admin</span>
      </div>

      <nav className="relative z-10 flex-1 flex flex-col px-3 py-2 gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/admin/dashboard'
            ? pathname === '/admin/dashboard' || pathname === '/admin'
            : pathname.startsWith(item.href)

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 relative overflow-hidden group',
                  isActive ? 'text-white' : 'text-white/60',
                ].join(' ')}
              >
                {isActive && (
                  <motion.div
                    layoutId="admin-sidebar-active"
                    className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent rounded-lg"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <motion.div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className={[
                    'relative z-10 transition-all duration-300',
                    isActive ? 'text-white scale-110' : 'group-hover:scale-110 group-hover:text-white/90',
                  ].join(' ')}
                />
                <span className="relative z-10 text-sm font-medium flex-1">{item.label}</span>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <ChevronRight size={14} className="relative z-10 text-white/70" />
                  </motion.div>
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="relative z-10 px-6 py-2 shrink-0">
        <div className="h-px bg-white/10" />
      </div>

      <div className="relative z-10 px-3 pb-5 shrink-0">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white/90 transition-colors duration-150"
        >
          <LogOut size={17} strokeWidth={1.75} />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create `app/admin/layout.tsx`**

```typescript
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-card">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Refactor `app/admin/dispatchers/page.tsx` to use layout tokens instead of inline styles**

Replace the entire file:

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Mail, Lock, Plus, Truck } from 'lucide-react'

interface Dispatcher {
  id: string
  name: string
  email: string
  created_at: string
}

async function fetchDispatchers(): Promise<Dispatcher[]> {
  const res = await fetch('/api/admin/dispatchers')
  if (!res.ok) throw new Error('Failed to load dispatchers')
  const json = await res.json()
  return json.data.dispatchers
}

async function createDispatcher(body: { name: string; email: string; password: string }) {
  const res = await fetch('/api/admin/dispatchers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to create dispatcher')
  return json.data.dispatcher as Dispatcher
}

const EMPTY_FORM = { name: '', email: '', password: '' }

export default function AdminDispatchersPage() {
  const queryClient = useQueryClient()
  const { data: dispatchers = [], isLoading } = useQuery({
    queryKey: ['admin', 'dispatchers'],
    queryFn: fetchDispatchers,
  })
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const mutation = useMutation({
    mutationFn: createDispatcher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispatchers'] })
      setForm(EMPTY_FORM)
      setFormError(null)
      setShowForm(false)
    },
    onError: (e: Error) => setFormError(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    mutation.mutate(form)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Truck size={22} className="text-primary" />
          <h1 className="text-xl font-bold text-text">Dispatchers</h1>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(null) }}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-primary"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add dispatcher
        </button>
      </div>

      {showForm && (
        <div className="bg-surface rounded-2xl shadow-card px-8 py-8 mb-8">
          <h2 className="text-base font-semibold text-text mb-5">New dispatcher account</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { key: 'name', label: 'Full name', icon: User, type: 'text', placeholder: 'Dispatcher name' },
              { key: 'email', label: 'Email address', icon: Mail, type: 'email', placeholder: 'dispatcher@example.com' },
              { key: 'password', label: 'Temporary password', icon: Lock, type: 'password', placeholder: '8+ characters' },
            ].map(({ key, label, icon: Icon, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1.5 text-text-muted">{label}</label>
                <div className="relative">
                  <Icon size={15} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    required
                    className="w-full rounded-xl border border-border bg-card text-text pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            ))}
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={mutation.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-primary disabled:opacity-60">
                {mutation.isPending ? 'Creating…' : 'Create account'}
              </button>
              <button type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null) }}
                className="rounded-xl px-5 py-2.5 text-sm font-medium border border-border text-text-muted">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">Loading…</p>
        ) : dispatchers.length === 0 ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">No dispatchers yet. Add one above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {dispatchers.map((d) => (
              <li key={d.id} className="flex items-center gap-4 px-8 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0 bg-primary/10 text-primary">
                  {d.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-text">{d.name}</p>
                  <p className="text-xs truncate text-text-muted">{d.email}</p>
                </div>
                <p className="ml-auto text-xs shrink-0 text-text-muted">
                  {new Date(d.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminSidebar.tsx app/admin/layout.tsx app/admin/dispatchers/page.tsx
git commit -m "feat: add admin layout, sidebar, and refactor dispatchers page"
```

---

## Task 4: Stats API + dashboard page

**Files:**
- Create: `app/api/admin/stats/route.ts`
- Create: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create `app/api/admin/stats/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: totalListings },
    { count: activeOrders },
    { count: completedOrders },
    { data: completedOrderData },
    { count: newUsersThisWeek },
    { count: listingsThisWeek },
    { count: ordersThisWeek },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).neq('status', 'removed'),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'paid', 'confirmed', 'shipped', 'delivered']),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabaseAdmin.from('orders').select('total_price').eq('status', 'completed'),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo).neq('status', 'removed'),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true })
      .eq('status', 'completed').gte('created_at', weekAgo),
  ])

  const gmv = (completedOrderData ?? []).reduce((sum, o) => sum + (o.total_price ?? 0), 0)

  return ok({
    totalUsers: totalUsers ?? 0,
    totalListings: totalListings ?? 0,
    activeOrders: activeOrders ?? 0,
    completedOrders: completedOrders ?? 0,
    gmv,
    newUsersThisWeek: newUsersThisWeek ?? 0,
    listingsThisWeek: listingsThisWeek ?? 0,
    ordersThisWeek: ordersThisWeek ?? 0,
  })
}
```

- [ ] **Step 2: Create `app/admin/dashboard/page.tsx`**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { Users, Package, ShoppingBag, CheckCircle, TrendingUp, UserPlus, PackagePlus } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalListings: number
  activeOrders: number
  completedOrders: number
  gmv: number
  newUsersThisWeek: number
  listingsThisWeek: number
  ordersThisWeek: number
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/admin/stats')
  if (!res.ok) throw new Error('Failed to load stats')
  const json = await res.json()
  return json.data
}

function StatCard({ label, value, icon: Icon, accent }: {
  label: string
  value: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="bg-card rounded-2xl shadow-card p-6 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={20} strokeWidth={1.75} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-text">{value}</p>
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { data: s, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchStats })

  if (isLoading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-text mb-8">Dashboard</h1>
        <p className="text-text-muted text-sm">Loading…</p>
      </div>
    )
  }

  if (!s) return null

  const fmt = (n: number) => n.toLocaleString('en-NG')
  const fmtMoney = (n: number) => `₦${n.toLocaleString('en-NG')}`

  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="text-2xl font-bold text-text">Dashboard</h1>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Platform health</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total users"       value={fmt(s.totalUsers)}      icon={Users}       accent="bg-primary" />
          <StatCard label="Total listings"    value={fmt(s.totalListings)}   icon={Package}     accent="bg-violet-500" />
          <StatCard label="Active orders"     value={fmt(s.activeOrders)}    icon={ShoppingBag} accent="bg-amber-500" />
          <StatCard label="Completed orders"  value={fmt(s.completedOrders)} icon={CheckCircle} accent="bg-green-500" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Money</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <StatCard label="Total GMV" value={fmtMoney(s.gmv)} icon={TrendingUp} accent="bg-blue-500" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">This week</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="New signups"       value={fmt(s.newUsersThisWeek)}  icon={UserPlus}    accent="bg-rose-500" />
          <StatCard label="Listings posted"   value={fmt(s.listingsThisWeek)}  icon={PackagePlus} accent="bg-orange-500" />
          <StatCard label="Orders completed"  value={fmt(s.ordersThisWeek)}    icon={CheckCircle} accent="bg-teal-500" />
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/stats/route.ts app/admin/dashboard/page.tsx
git commit -m "feat: add admin stats API and dashboard page"
```

---

## Task 5: Users API + users page

**Files:**
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/users/[id]/route.ts`
- Create: `app/admin/users/page.tsx`

- [ ] **Step 1: Create `app/api/admin/users/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, account_type, suspended, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return err('Failed to fetch users', 'SERVER_ERROR', 500)
  return ok({ users: data })
}
```

- [ ] **Step 2: Create `app/api/admin/users/[id]/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  let body: { suspended?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  if (typeof body.suspended !== 'boolean') {
    return err('suspended must be a boolean', 'VALIDATION_ERROR', 400)
  }

  if (id === authUser.id) {
    return err('Cannot suspend your own account', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ suspended: body.suspended })
    .eq('id', id)
    .select('id, name, email, suspended')
    .single()

  if (error || !data) return err('User not found', 'NOT_FOUND', 404)
  return ok({ user: data })
}
```

- [ ] **Step 3: Create `app/admin/users/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'

interface AdminUser {
  id: string
  name: string | null
  email: string
  account_type: string
  suspended: boolean
  created_at: string
}

async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch('/api/admin/users')
  if (!res.ok) throw new Error('Failed to load users')
  const json = await res.json()
  return json.data.users
}

async function patchUser(id: string, suspended: boolean): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspended }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to update user')
  return json.data.user
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  individual: 'Individual',
  business: 'Business',
  dispatcher: 'Dispatcher',
  admin: 'Admin',
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: fetchUsers })
  const [actionError, setActionError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) => patchUser(id, suspended),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (e: Error) => setActionError(e.message),
  })

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Users size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-text">Users</h1>
        <span className="text-sm text-text-muted">({users.length})</span>
      </div>

      {actionError && <p className="text-sm text-red-600 mb-4">{actionError}</p>}

      <div className="bg-card rounded-2xl shadow-card overflow-x-auto">
        {isLoading ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">Loading…</p>
        ) : users.length === 0 ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Joined</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium text-text">{u.name ?? '—'}</p>
                    <p className="text-xs text-text-muted">{u.email}</p>
                  </td>
                  <td className="px-6 py-3 text-text-muted">
                    {ACCOUNT_TYPE_LABEL[u.account_type] ?? u.account_type}
                  </td>
                  <td className="px-6 py-3 text-text-muted">
                    {new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-3">
                    <span className={[
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      u.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
                    ].join(' ')}>
                      {u.suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {u.account_type !== 'admin' && (
                      <button
                        onClick={() => { setActionError(null); mutation.mutate({ id: u.id, suspended: !u.suspended }) }}
                        disabled={mutation.isPending}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        {u.suspended ? 'Reactivate' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/users/route.ts "app/api/admin/users/[id]/route.ts" app/admin/users/page.tsx
git commit -m "feat: add admin user management (list, suspend, reactivate)"
```

---

## Task 6: Listings API + listings page

**Files:**
- Create: `app/api/admin/listings/route.ts`
- Create: `app/api/admin/listings/[id]/route.ts`
- Create: `app/admin/listings/page.tsx`

- [ ] **Step 1: Create `app/api/admin/listings/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, listing_type, status, area, created_at, users!seller_id(name, email)')
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return err('Failed to fetch listings', 'SERVER_ERROR', 500)
  return ok({ listings: data })
}
```

- [ ] **Step 2: Create `app/api/admin/listings/[id]/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('listings')
    .update({ status: 'removed' })
    .eq('id', id)

  if (error) return err('Failed to remove listing', 'SERVER_ERROR', 500)
  return ok({ ok: true })
}
```

- [ ] **Step 3: Create `app/admin/listings/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package } from 'lucide-react'

interface AdminListing {
  id: string
  title: string
  listing_type: string
  status: string
  area: string
  created_at: string
  users: { name: string | null; email: string } | null
}

async function fetchListings(): Promise<AdminListing[]> {
  const res = await fetch('/api/admin/listings')
  if (!res.ok) throw new Error('Failed to load listings')
  const json = await res.json()
  return json.data.listings
}

async function removeListing(id: string) {
  const res = await fetch(`/api/admin/listings/${id}`, { method: 'DELETE' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to remove listing')
}

const LISTING_TYPE_LABEL: Record<string, string> = {
  for_sale: 'For Sale',
  free: 'Free',
  donate: 'Donate',
}

export default function AdminListingsPage() {
  const queryClient = useQueryClient()
  const { data: listings = [], isLoading } = useQuery({ queryKey: ['admin', 'listings'], queryFn: fetchListings })
  const [actionError, setActionError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: removeListing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] }),
    onError: (e: Error) => setActionError(e.message),
  })

  function handleRemove(id: string) {
    if (!confirm('Remove this listing? It will no longer appear on the marketplace.')) return
    setActionError(null)
    mutation.mutate(id)
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Package size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-text">Listings</h1>
        <span className="text-sm text-text-muted">({listings.length})</span>
      </div>

      {actionError && <p className="text-sm text-red-600 mb-4">{actionError}</p>}

      <div className="bg-card rounded-2xl shadow-card overflow-x-auto">
        {isLoading ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">Loading…</p>
        ) : listings.length === 0 ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">No listings.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Title</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Area</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium text-text truncate max-w-48">{l.title}</p>
                    <p className="text-xs text-text-muted">{l.users?.name ?? l.users?.email ?? '—'}</p>
                  </td>
                  <td className="px-6 py-3 text-text-muted">{LISTING_TYPE_LABEL[l.listing_type] ?? l.listing_type}</td>
                  <td className="px-6 py-3 text-text-muted">{l.area}</td>
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleRemove(l.id)}
                      disabled={mutation.isPending}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/listings/route.ts "app/api/admin/listings/[id]/route.ts" app/admin/listings/page.tsx
git commit -m "feat: add admin listings management (list + soft remove)"
```

---

## Task 7: Orders API + orders page

**Files:**
- Create: `app/api/admin/orders/route.ts`
- Create: `app/api/admin/orders/[id]/cancel/route.ts`
- Create: `app/admin/orders/page.tsx`

- [ ] **Step 1: Create `app/api/admin/orders/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, total_price, delivery_type, created_at,
      buyer:users!buyer_id(name, email),
      seller:users!seller_id(name, email),
      dispatcher:users!dispatcher_id(name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  return ok({ orders: data })
}
```

- [ ] **Step 2: Create `app/api/admin/orders/[id]/cancel/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { stripe } from '@/lib/stripe'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, listing_id, stripe_payment_intent_id, status')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (!['pending', 'paid'].includes(order.status)) {
    return err('Only pending or paid orders can be force-cancelled', 'INVALID_STATE', 409)
  }

  if (order.stripe_payment_intent_id) {
    try {
      await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
    } catch (stripeError) {
      console.error('Admin force-cancel refund error:', stripeError)
      return err('Refund failed', 'STRIPE_ERROR', 500)
    }
  }

  await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', id)
  await supabaseAdmin.from('listings').update({ status: 'available' }).eq('id', order.listing_id)

  return ok({ ok: true })
}
```

- [ ] **Step 3: Create `app/admin/orders/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag } from 'lucide-react'

interface AdminOrder {
  id: string
  status: string
  total_price: number
  delivery_type: string
  created_at: string
  buyer: { name: string | null; email: string } | null
  seller: { name: string | null; email: string } | null
  dispatcher: { name: string | null; email: string } | null
}

async function fetchOrders(): Promise<AdminOrder[]> {
  const res = await fetch('/api/admin/orders')
  if (!res.ok) throw new Error('Failed to load orders')
  const json = await res.json()
  return json.data.orders
}

async function cancelOrder(id: string) {
  const res = await fetch(`/api/admin/orders/${id}/cancel`, { method: 'POST' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to cancel order')
}

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-blue-100 text-blue-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-violet-100 text-violet-700',
  delivered: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient()
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['admin', 'orders'], queryFn: fetchOrders })
  const [actionError, setActionError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
    onError: (e: Error) => setActionError(e.message),
  })

  function handleCancel(id: string) {
    if (!confirm('Force-cancel this order? A refund will be issued if the order is paid.')) return
    setActionError(null)
    mutation.mutate(id)
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBag size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-text">Orders</h1>
        <span className="text-sm text-text-muted">({orders.length})</span>
      </div>

      {actionError && <p className="text-sm text-red-600 mb-4">{actionError}</p>}

      <div className="bg-card rounded-2xl shadow-card overflow-x-auto">
        {isLoading ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">No orders.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Order</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Buyer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Total</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-mono text-xs text-text">{o.id.slice(0, 8)}…</p>
                    <p className="text-xs text-text-muted">
                      {new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-text">{o.buyer?.name ?? '—'}</p>
                    <p className="text-xs text-text-muted">{o.buyer?.email ?? ''}</p>
                  </td>
                  <td className="px-6 py-3 text-text">₦{o.total_price.toLocaleString('en-NG')}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status] ?? 'bg-border text-text-muted'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {['pending', 'paid'].includes(o.status) && (
                      <button
                        onClick={() => handleCancel(o.id)}
                        disabled={mutation.isPending}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Force cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/orders/route.ts "app/api/admin/orders/[id]/cancel/route.ts" app/admin/orders/page.tsx
git commit -m "feat: add admin order oversight with force-cancel"
```

---

## Task 8: Charities API + charities page

**Files:**
- Create: `app/api/admin/charities/route.ts`
- Create: `app/api/admin/charities/[id]/route.ts`
- Create: `app/admin/charities/page.tsx`

- [ ] **Step 1: Create `app/api/admin/charities/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('charities')
    .select('id, name, description, active')
    .order('name', { ascending: true })

  if (error) return err('Failed to fetch charities', 'SERVER_ERROR', 500)
  return ok({ charities: data })
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  let body: { name?: unknown; description?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : null
  const description = typeof body.description === 'string' ? body.description.trim() : ''

  if (!name || name.length < 2) return err('Name is required', 'VALIDATION_ERROR', 400)

  const { data, error } = await supabaseAdmin
    .from('charities')
    .insert({ name, description, active: true })
    .select('id, name, description, active')
    .single()

  if (error || !data) return err('Failed to create charity', 'SERVER_ERROR', 500)
  return ok({ charity: data }, 201)
}
```

- [ ] **Step 2: Create `app/api/admin/charities/[id]/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  let body: { name?: unknown; description?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const updates: { name?: string; description?: string } = {}
  if (typeof body.name === 'string' && body.name.trim().length >= 2) {
    updates.name = body.name.trim()
  }
  if (typeof body.description === 'string') {
    updates.description = body.description.trim()
  }

  if (Object.keys(updates).length === 0) {
    return err('No valid fields to update', 'VALIDATION_ERROR', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('charities')
    .update(updates)
    .eq('id', id)
    .select('id, name, description, active')
    .single()

  if (error || !data) return err('Charity not found', 'NOT_FOUND', 404)
  return ok({ charity: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  const { error } = await supabaseAdmin.from('charities').delete().eq('id', id)

  if (error) return err('Failed to delete charity', 'SERVER_ERROR', 500)
  return ok({ ok: true })
}
```

- [ ] **Step 3: Create `app/admin/charities/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, Plus, Pencil, Trash2 } from 'lucide-react'

interface Charity {
  id: string
  name: string
  description: string | null
  active: boolean
}

async function fetchCharities(): Promise<Charity[]> {
  const res = await fetch('/api/admin/charities')
  if (!res.ok) throw new Error('Failed to load charities')
  const json = await res.json()
  return json.data.charities
}

async function createCharity(body: { name: string; description: string }): Promise<Charity> {
  const res = await fetch('/api/admin/charities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to create charity')
  return json.data.charity
}

async function updateCharity(id: string, body: { name: string; description: string }): Promise<Charity> {
  const res = await fetch(`/api/admin/charities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to update charity')
  return json.data.charity
}

async function deleteCharity(id: string) {
  const res = await fetch(`/api/admin/charities/${id}`, { method: 'DELETE' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to delete charity')
}

const EMPTY_FORM = { name: '', description: '' }

export default function AdminCharitiesPage() {
  const queryClient = useQueryClient()
  const { data: charities = [], isLoading } = useQuery({ queryKey: ['admin', 'charities'], queryFn: fetchCharities })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'charities'] })

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: createCharity,
    onSuccess: () => { invalidate(); setForm(EMPTY_FORM); setShowForm(false); setFormError(null) },
    onError: (e: Error) => setFormError(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; description: string } }) => updateCharity(id, body),
    onSuccess: () => { invalidate(); setEditingId(null); setForm(EMPTY_FORM); setShowForm(false); setFormError(null) },
    onError: (e: Error) => setFormError(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCharity,
    onSuccess: invalidate,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: form })
    } else {
      createMutation.mutate(form)
    }
  }

  function startEdit(c: Charity) {
    setEditingId(c.id)
    setForm({ name: c.name, description: c.description ?? '' })
    setShowForm(true)
    setFormError(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Heart size={22} className="text-primary" />
          <h1 className="text-xl font-bold text-text">Charities</h1>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-primary"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add charity
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-surface rounded-2xl shadow-card px-8 py-8 mb-8">
          <h2 className="text-base font-semibold text-text mb-5">
            {editingId ? 'Edit charity' : 'New charity'}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-text-muted">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Charity name"
                required
                className="w-full rounded-xl border border-border bg-card text-text px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-text-muted">Description (optional)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description"
                rows={3}
                className="w-full rounded-xl border border-border bg-card text-text px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-primary disabled:opacity-60">
                {isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add charity'}
              </button>
              <button type="button" onClick={cancelForm}
                className="rounded-xl px-5 py-2.5 text-sm font-medium border border-border text-text-muted">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">Loading…</p>
        ) : charities.length === 0 ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">No charities yet. Add one above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {charities.map((c) => (
              <li key={c.id} className="flex items-start gap-4 px-8 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">{c.name}</p>
                  {c.description && <p className="text-xs text-text-muted mt-0.5">{c.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <button onClick={() => startEdit(c)}
                    className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors">
                    <Pencil size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.id) }}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-red-600 transition-colors disabled:opacity-50">
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/charities/route.ts "app/api/admin/charities/[id]/route.ts" app/admin/charities/page.tsx
git commit -m "feat: add admin charity management (CRUD)"
```

---

## Task 9: Verify proxy guards

**Files:**
- Verify: `proxy.ts`

> The admin guard and matcher entries were added earlier in this session. This task confirms they are correctly in place.

- [ ] **Step 1: Confirm matcher entries**

Open `proxy.ts`. The `config.matcher` array must contain both of these — add any that are missing:

```typescript
'/api/admin/:path*',
'/admin/:path*',
```

- [ ] **Step 2: Confirm admin guard block**

The following block must exist in `proxy.ts` (after `isAdmin` and `isDispatcher` are declared):

```typescript
if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && !isAdmin) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

- [ ] **Step 3: Final type check across entire project**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add proxy.ts
git commit -m "chore: verify admin proxy guards are in place"
```

---

## Task 10: Manual verification

- [ ] Run the dev server: `npm run dev`

- [ ] **Create an admin user in Supabase SQL editor.**
  First, generate a bcrypt hash for your chosen password:
  ```bash
  node -e "require('bcryptjs').hash('yourpassword', 12).then(console.log)"
  ```
  Then insert the admin user:
  ```sql
  INSERT INTO users (id, name, email, password_hash, account_type, email_verified, suspended)
  VALUES (gen_random_uuid(), 'Admin', 'admin@declut.com', '<paste_hash_here>', 'admin', true, false);
  ```

- [ ] Sign in at `/auth/login` with the admin credentials → confirm redirect lands on `/admin/dashboard`

- [ ] Confirm sidebar shows: **Dashboard · Users · Listings · Orders · Dispatchers · Charities**

- [ ] Confirm stats cards load on the dashboard

- [ ] Suspend a user on `/admin/users` → sign in as that user → confirm they are blocked with a redirect to `/auth/login?error=suspended` → reactivate them via admin

- [ ] Remove a listing on `/admin/listings` → confirm it no longer appears on `/listings`

- [ ] Create a dispatcher on `/admin/dispatchers` → sign in with the new dispatcher credentials → confirm redirect to `/dispatch`

- [ ] Force-cancel a `pending` order on `/admin/orders` → confirm its status changes to `cancelled`

- [ ] Add, edit, and delete a charity on `/admin/charities` → confirm changes are reflected on the donate listing flow

- [ ] Sign in as a regular user, navigate to `/admin` → confirm redirect to `/dashboard`

- [ ] Commit any fixes found during verification
