# Buyer Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OTP-only buyer accounts so buyers can log in, track orders, and link anonymous purchases to their account — without touching the anonymous checkout flow.

**Architecture:** A separate `otp_codes` table holds hashed codes keyed by email only (no user FK), so OTP can be requested before a user row exists. On verify, we upsert the user with `account_type = 'buyer'` and backfill any orders matching their email. JWT shape is unchanged; proxy enforces account-type-based route access.

**Tech Stack:** Next.js 16 App Router, proxy.ts, Supabase (supabaseAdmin), Resend (existing `sendOtpEmail`), jose JWT (existing `signToken`/`verifyToken`), TanStack Query, bcryptjs (existing `lib/otp.ts`)

---

## File Map

**Create:**
- `supabase/migrations/006_buyer_auth.sql` — extend account_type CHECK, create otp_codes table
- `app/api/auth/buyer/otp/route.ts` — POST: send OTP to email
- `app/api/auth/buyer/verify/route.ts` — POST: verify code, upsert user, issue JWT
- `app/api/buyer/orders/route.ts` — GET: buyer's order list
- `app/api/buyer/orders/[id]/route.ts` — GET: single buyer order detail
- `lib/hooks/useBuyerAuth.ts` — TanStack mutations for OTP send + verify
- `lib/hooks/useBuyerOrders.ts` — TanStack queries for buyer order list + detail
- `app/login/page.tsx` — two-step OTP login page (email → code)
- `app/orders/page.tsx` — buyer orders list page
- `app/orders/[id]/page.tsx` — buyer order detail page

**Modify:**
- `types/index.ts` — add `'buyer'` to `AccountType`, update `OrderStatus`
- `proxy.ts` — public `/login`, protect `/orders/*` and `/api/buyer/*`, account-type gates
- `app/checkout/success/page.tsx` — add "Track your order" CTA
- `lib/email.ts` — add track order link to order confirmation email
- `app/checkout/page.tsx` — add optional inline OTP prompt (entry point A)

---

### Task 1: DB Migration — buyer account type + otp_codes table

**Files:**
- Create: `supabase/migrations/006_buyer_auth.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/006_buyer_auth.sql
-- Rollback: drop otp_codes table; restore account_type constraint to ('individual','business')

-- 1. Extend users.account_type to include 'buyer'
alter table public.users
  drop constraint if exists users_account_type_check;

alter table public.users
  add constraint users_account_type_check
    check (account_type in ('individual', 'business', 'buyer'));

-- 2. Buyer OTP codes — separate from users so OTP works before user row exists
create table public.otp_codes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index otp_codes_email_idx on public.otp_codes (email);
```

- [ ] **Step 2: Run it in Supabase SQL editor**

Paste the contents of `supabase/migrations/006_buyer_auth.sql` into the Supabase SQL editor and run it. Verify: no errors, `otp_codes` table appears in the Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_buyer_auth.sql
git commit -m "feat: add buyer account type and otp_codes migration"
```

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add `'buyer'` to AccountType and fix OrderStatus**

In `types/index.ts`, replace:
```typescript
export type AccountType = 'individual' | 'business'
```
With:
```typescript
export type AccountType = 'individual' | 'business' | 'buyer'
```

Also replace the OrderStatus type (add `'confirmed'` which was added in migration 005):
```typescript
export type OrderStatus = 'pending' | 'paid' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npm run build 2>&1 | head -40
```

Expected: build succeeds or only pre-existing errors (none introduced by this change).

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add buyer to AccountType, add confirmed to OrderStatus"
```

---

### Task 3: OTP send API endpoint

**Files:**
- Create: `app/api/auth/buyer/otp/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/auth/buyer/otp/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { ok, err } from '@/lib/api-response'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_TTL_MINUTES = 15

export async function POST(req: Request) {
  let body: { email?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : null
  if (!email || !EMAIL_REGEX.test(email)) {
    return err('Valid email is required', 'VALIDATION_ERROR', 400)
  }

  // Reject sellers trying to use buyer OTP flow
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('account_type')
    .eq('email', email)
    .single()

  if (existing && existing.account_type !== 'buyer') {
    return err('This email is registered as a seller. Use the seller login page.', 'SELLER_ACCOUNT', 409)
  }

  // Invalidate previous unused codes for this email
  await supabaseAdmin
    .from('otp_codes')
    .delete()
    .eq('email', email)
    .is('used_at', null)

  const code = generateOtp()
  const code_hash = await hashOtp(code)
  const expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()

  const { error } = await supabaseAdmin
    .from('otp_codes')
    .insert({ email, code_hash, expires_at })

  if (error) {
    console.error('otp_codes insert error:', error)
    return err('Failed to create verification code', 'SERVER_ERROR', 500)
  }

  try {
    await sendOtpEmail(email, code)
  } catch (emailError) {
    console.error('Failed to send OTP email:', emailError)
    return err('Failed to send verification email', 'EMAIL_ERROR', 500)
  }

  return ok({ sent: true })
}
```

- [ ] **Step 2: Verify manually**

Start dev server (`npm run dev`), then:
```bash
curl -s -X POST http://localhost:3000/api/auth/buyer/otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com"}' | jq
```
Expected: `{"data":{"sent":true}}` and an OTP email arrives.

```bash
curl -s -X POST http://localhost:3000/api/auth/buyer/otp \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail"}' | jq
```
Expected: `{"error":{"message":"Valid email is required","code":"VALIDATION_ERROR"}}` with status 400.

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/buyer/otp/route.ts
git commit -m "feat: add POST /api/auth/buyer/otp endpoint"
```

---

### Task 4: OTP verify API endpoint

**Files:**
- Create: `app/api/auth/buyer/verify/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/auth/buyer/verify/route.ts
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyOtp, hashOtp } from '@/lib/otp'
import { signToken } from '@/lib/jwt'
import { ok, err } from '@/lib/api-response'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export async function POST(req: Request) {
  let body: { email?: unknown; code?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : null
  const code = typeof body.code === 'string' ? body.code.trim() : null

  if (!email || !EMAIL_REGEX.test(email)) {
    return err('Valid email is required', 'VALIDATION_ERROR', 400)
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return err('A 6-digit code is required', 'VALIDATION_ERROR', 400)
  }

  // Find the most recent unused, unexpired code for this email
  const { data: otpRow } = await supabaseAdmin
    .from('otp_codes')
    .select('id, code_hash, expires_at')
    .eq('email', email)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!otpRow) {
    return err('Code is invalid or expired', 'INVALID_CODE', 401)
  }

  const valid = await verifyOtp(code, otpRow.code_hash)
  if (!valid) {
    return err('Code is invalid or expired', 'INVALID_CODE', 401)
  }

  // Mark code as used
  await supabaseAdmin
    .from('otp_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', otpRow.id)

  // Placeholder hash — buyers never use password auth
  const password_hash = await hashOtp(crypto.randomBytes(32).toString('hex'))

  // Upsert user as buyer (reject if email belongs to a seller)
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, account_type')
    .eq('email', email)
    .single()

  if (existingUser && existingUser.account_type !== 'buyer') {
    return err('This email is registered as a seller.', 'SELLER_ACCOUNT', 409)
  }

  let userId: string
  if (existingUser) {
    userId = existingUser.id
  } else {
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password_hash,
        account_type: 'buyer',
        email_verified: true,
      })
      .select('id')
      .single()

    if (insertError || !newUser) {
      console.error('Buyer upsert error:', insertError)
      return err('Failed to create account', 'SERVER_ERROR', 500)
    }
    userId = newUser.id
  }

  // Backfill anonymous orders placed with this email
  await supabaseAdmin
    .from('orders')
    .update({ buyer_id: userId })
    .eq('buyer_email', email)
    .is('buyer_id', null)

  const token = await signToken({ sub: userId, email, account_type: 'buyer' })

  const response = ok({ success: true })
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )
  return response
}
```

- [ ] **Step 2: Verify manually**

Use the code received in Task 3's email test:
```bash
curl -s -X POST http://localhost:3000/api/auth/buyer/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com","code":"123456"}' | jq
```
Expected with correct code: `{"data":{"success":true}}` with a `Set-Cookie: token=...` header.
Expected with wrong code: `{"error":{"message":"Code is invalid or expired","code":"INVALID_CODE"}}` status 401.

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/buyer/verify/route.ts
git commit -m "feat: add POST /api/auth/buyer/verify endpoint"
```

---

### Task 5: Buyer orders API

**Files:**
- Create: `app/api/buyer/orders/route.ts`
- Create: `app/api/buyer/orders/[id]/route.ts`

- [ ] **Step 1: Create the list endpoint**

```typescript
// app/api/buyer/orders/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { headers } from 'next/headers'

export async function GET() {
  const headersList = await headers()
  const buyerId = headersList.get('x-user-id')
  const accountType = headersList.get('x-user-account-type')

  if (!buyerId || accountType !== 'buyer') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, total_price, created_at,
      listing:listings(id, title, images)
    `)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Buyer orders fetch error:', error)
    return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  }

  return ok(orders ?? [])
}
```

- [ ] **Step 2: Create the detail endpoint**

```typescript
// app/api/buyer/orders/[id]/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { headers } from 'next/headers'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const headersList = await headers()
  const buyerId = headersList.get('x-user-id')
  const accountType = headersList.get('x-user-account-type')

  if (!buyerId || accountType !== 'buyer') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, item_price, delivery_fee, total_price,
      buyer_name, buyer_address, created_at,
      listing:listings(id, title, images, price),
      seller:users!orders_seller_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .eq('buyer_id', buyerId)
    .single()

  if (error || !order) {
    return err('Order not found', 'NOT_FOUND', 404)
  }

  return ok(order)
}
```

- [ ] **Step 3: Verify manually** (requires a buyer JWT cookie from Task 4)

```bash
curl -s http://localhost:3000/api/buyer/orders \
  -H "Cookie: token=<paste-token-from-task-4>" | jq
```
Expected: `{"data":[...]}` — empty array if no orders yet, or list of orders if backfill ran.

- [ ] **Step 4: Commit**

```bash
git add app/api/buyer/orders/route.ts app/api/buyer/orders/[id]/route.ts
git commit -m "feat: add GET /api/buyer/orders and /api/buyer/orders/[id] endpoints"
```

---

### Task 6: Proxy route protection

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Read the current proxy.ts** — it is at the project root.

- [ ] **Step 2: Update the proxy**

Replace the entire contents of `proxy.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth endpoints and Stripe webhook are public — no token required
  if (pathname.startsWith('/api/auth/') || pathname === '/api/stripe/webhook') {
    return NextResponse.next()
  }

  // UUID pattern — all listing/order IDs are UUIDs
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

  // Public browse: GET /api/listings or GET /api/listings/<uuid>
  if (request.method === 'GET' && pathname === '/api/listings') {
    return NextResponse.next()
  }
  if (request.method === 'GET' && new RegExp(`^/api/listings/${UUID}$`).test(pathname)) {
    return NextResponse.next()
  }

  // Public cart API endpoints for anonymous buyers
  // Only the base /api/orders POST (buyer checkout) is public — sub-routes need seller auth
  if (pathname.startsWith('/api/cart') || pathname === '/api/orders') {
    return NextResponse.next()
  }

  // Public pages: /listings and /listings/<uuid>
  if (pathname === '/listings') {
    return NextResponse.next()
  }
  if (new RegExp(`^/listings/${UUID}$`).test(pathname)) {
    return NextResponse.next()
  }

  // Public cart and checkout pages for anonymous buyers
  if (pathname === '/cart' || pathname.startsWith('/checkout')) {
    return NextResponse.next()
  }

  // Buyer login page is public
  if (pathname === '/login') {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value

  // Unauthenticated: route to correct login page based on destination
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginPath = pathname.startsWith('/orders') ? '/login' : '/auth/login'
    return NextResponse.redirect(
      new URL(`${loginPath}?next=${encodeURIComponent(pathname)}`, request.url)
    )
  }

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginPath = pathname.startsWith('/orders') ? '/login' : '/auth/login'
    return NextResponse.redirect(new URL(loginPath, request.url))
  }

  // Sellers must verify email; buyers skip this (OTP already proves email)
  if (payload.account_type !== 'buyer') {
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
  }

  // Account-type route gates
  const isBuyer = payload.account_type === 'buyer'

  // Buyers must not access seller dashboard
  if (isBuyer && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/orders', request.url))
  }
  if (isBuyer && pathname.startsWith('/api/users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Sellers must not access buyer orders area
  if (!isBuyer && (pathname.startsWith('/orders') || pathname.startsWith('/api/buyer'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Forward user identity to route handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.sub)
  requestHeaders.set('x-user-email', payload.email)
  requestHeaders.set('x-user-account-type', payload.account_type)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    '/api/listings/:path*',
    '/api/users/:path*',
    '/api/upload',
    '/api/cart/:path*',
    '/api/orders/:path*',
    '/api/buyer/:path*',
    '/api/stripe/:path*',
    '/listings/:path*',
    '/dashboard/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/login',
  ],
}
```

- [ ] **Step 3: Verify proxy behaviour**

With no cookie: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/buyer/orders`
Expected: `401`

With a seller cookie on `/orders`: visiting `http://localhost:3000/orders` in a browser while logged in as a seller should redirect to `/dashboard`.

- [ ] **Step 4: Commit**

```bash
git add proxy.ts
git commit -m "feat: extend proxy for buyer routes and account-type gates"
```

---

### Task 7: Client-side hooks

**Files:**
- Create: `lib/hooks/useBuyerAuth.ts`
- Create: `lib/hooks/useBuyerOrders.ts`

- [ ] **Step 1: Create useBuyerAuth.ts**

```typescript
// lib/hooks/useBuyerAuth.ts
'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

async function postJson(url: string, body: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Request failed')
  return json.data
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (email: string) =>
      postJson('/api/auth/buyer/otp', { email }),
  })
}

export function useVerifyOtp(next?: string | null) {
  const router = useRouter()
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      postJson('/api/auth/buyer/verify', { email, code }),
    onSuccess: () => {
      router.push(next ?? '/orders')
      router.refresh()
    },
  })
}
```

- [ ] **Step 2: Create useBuyerOrders.ts**

```typescript
// lib/hooks/useBuyerOrders.ts
'use client'

import { useQuery } from '@tanstack/react-query'

export type BuyerOrder = {
  id: string
  status: string
  delivery_type: 'delivery' | 'pickup'
  total_price: number
  created_at: string
  listing: {
    id: string
    title: string
    images: string[]
  }
}

export type BuyerOrderDetail = BuyerOrder & {
  item_price: number
  delivery_fee: number
  buyer_name: string | null
  buyer_address: string | null
  seller: {
    id: string
    name: string | null
    email: string
  } | null
  listing: {
    id: string
    title: string
    images: string[]
    price: number | null
  }
}

async function fetchJson(url: string) {
  const res = await fetch(url)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Request failed')
  return json.data
}

export function useBuyerOrders() {
  return useQuery<BuyerOrder[]>({
    queryKey: ['buyer-orders'],
    queryFn: () => fetchJson('/api/buyer/orders'),
  })
}

export function useBuyerOrderDetail(id: string) {
  return useQuery<BuyerOrderDetail>({
    queryKey: ['buyer-orders', id],
    queryFn: () => fetchJson(`/api/buyer/orders/${id}`),
    enabled: !!id,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useBuyerAuth.ts lib/hooks/useBuyerOrders.ts
git commit -m "feat: add useBuyerAuth and useBuyerOrders hooks"
```

---

### Task 8: /login page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowRight, KeyRound } from 'lucide-react'
import { useSendOtp, useVerifyOtp } from '@/lib/hooks/useBuyerAuth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function BuyerLoginPage() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next')

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')

  const sendOtp = useSendOtp()
  const verifyOtp = useVerifyOtp(next)

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_REGEX.test(email)) return
    sendOtp.mutate(email, {
      onSuccess: () => setStep('code'),
    })
  }

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    verifyOtp.mutate({ email, code })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-9" />
        </div>

        <div className="bg-card rounded-2xl shadow-card px-8 py-10">
          {step === 'email' ? (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: '#16130f' }}>
                Track your orders
              </h1>
              <p className="text-sm mb-6" style={{ color: '#78726c' }}>
                Enter your email and we&apos;ll send you a login code.
              </p>

              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#78726c' }}>
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      strokeWidth={1.8}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: '#a8a09a' }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2"
                      style={{
                        borderColor: '#e8e4dc',
                        background: '#faf9f7',
                        color: '#16130f',
                      }}
                    />
                  </div>
                </div>

                {sendOtp.error && (
                  <p className="text-xs text-red-600">{sendOtp.error.message}</p>
                )}

                <button
                  type="submit"
                  disabled={sendOtp.isPending}
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: '#4f46e5' }}
                >
                  {sendOtp.isPending ? 'Sending…' : 'Send code'}
                  {!sendOtp.isPending && <ArrowRight size={14} strokeWidth={2} />}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: '#16130f' }}>
                Check your email
              </h1>
              <p className="text-sm mb-6" style={{ color: '#78726c' }}>
                We sent a 6-digit code to <strong>{email}</strong>.
              </p>

              <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#78726c' }}>
                    Verification code
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      strokeWidth={1.8}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: '#a8a09a' }}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm font-mono outline-none focus:ring-2 tracking-widest"
                      style={{
                        borderColor: '#e8e4dc',
                        background: '#faf9f7',
                        color: '#16130f',
                      }}
                    />
                  </div>
                </div>

                {verifyOtp.error && (
                  <p className="text-xs text-red-600">{verifyOtp.error.message}</p>
                )}

                <button
                  type="submit"
                  disabled={verifyOtp.isPending || code.length !== 6}
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: '#4f46e5' }}
                >
                  {verifyOtp.isPending ? 'Verifying…' : 'Log in'}
                  {!verifyOtp.isPending && <ArrowRight size={14} strokeWidth={2} />}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode('') }}
                  className="text-xs text-center transition-colors"
                  style={{ color: '#78726c' }}
                >
                  Use a different email
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs" style={{ color: '#a8a09a' }}>
            Selling on Declutter?{' '}
            <Link href="/auth/login" className="underline" style={{ color: '#4f46e5' }}>
              Seller login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test in browser**

Visit `http://localhost:3000/login`. Enter an email. Confirm the code step renders. Enter the code from the email. Confirm redirect to `/orders` (which will 404 until Task 9 — that's fine).

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: add /login page with two-step OTP flow"
```

---

### Task 9: /orders page (buyer order list)

**Files:**
- Create: `app/orders/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/orders/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import { Package, Truck, MapPin, ChevronRight } from 'lucide-react'
import { useBuyerOrders, type BuyerOrder } from '@/lib/hooks/useBuyerOrders'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  paid: 'Confirmed',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_STYLE: Record<string, { background: string; color: string }> = {
  pending:   { background: 'rgba(251,191,36,0.12)',  color: '#d97706' },
  paid:      { background: 'rgba(79,70,229,0.08)',   color: '#4f46e5' },
  confirmed: { background: 'rgba(79,70,229,0.08)',   color: '#4f46e5' },
  shipped:   { background: 'rgba(16,185,129,0.08)',  color: '#10b981' },
  delivered: { background: 'rgba(16,185,129,0.08)',  color: '#10b981' },
  completed: { background: 'rgba(16,185,129,0.08)',  color: '#10b981' },
  cancelled: { background: 'rgba(239,68,68,0.08)',   color: '#ef4444' },
}

function OrderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border p-4 flex gap-4" style={{ borderColor: '#e8e4dc' }}>
      <div className="w-16 h-16 rounded-xl shrink-0" style={{ background: '#f0ece5' }} />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3 w-2/3 rounded" style={{ background: '#f0ece5' }} />
        <div className="h-3 w-1/3 rounded" style={{ background: '#f0ece5' }} />
      </div>
    </div>
  )
}

function OrderRow({ order }: { order: BuyerOrder }) {
  const statusStyle = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={`/orders/${order.id}`}
        className="flex items-center gap-4 rounded-2xl border p-4 transition-colors hover:bg-[#faf9f7]"
        style={{ borderColor: '#e8e4dc' }}
      >
        <div
          className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: '#f0ece5' }}
        >
          {order.listing.images?.[0] ? (
            <CldImage
              src={order.listing.images[0]}
              fill
              sizes="64px"
              className="object-cover"
              alt={order.listing.title}
            />
          ) : (
            <Package size={18} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>
            {order.listing.title}
          </p>
          <p className="text-xs mt-0.5 font-medium" style={{ color: '#4f46e5' }}>
            ₦{order.total_price.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={statusStyle}
            >
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: '#a8a09a' }}>
              {order.delivery_type === 'delivery' ? (
                <><Truck size={9} strokeWidth={2} /> Delivery</>
              ) : (
                <><MapPin size={9} strokeWidth={2} /> Pickup</>
              )}
            </span>
          </div>
        </div>

        <ChevronRight size={16} strokeWidth={1.5} style={{ color: '#c8c2bb' }} />
      </Link>
    </motion.div>
  )
}

export default function BuyerOrdersPage() {
  const { data: orders, isLoading } = useBuyerOrders()

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold" style={{ color: '#16130f' }}>Your orders</h1>
          <p className="text-sm mt-1" style={{ color: '#78726c' }}>
            Track everything you&apos;ve bought on Declutter.
          </p>
        </motion.div>

        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && (!orders || orders.length === 0) && (
          <div className="flex flex-col items-center py-24 text-center">
            <div
              className="h-20 w-20 rounded-3xl flex items-center justify-center mb-6"
              style={{
                background: 'linear-gradient(135deg, #f5f1eb 0%, #ede8e0 100%)',
                boxShadow: '0 2px 12px rgba(22,19,15,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
            >
              <span className="text-3xl">🛍️</span>
            </div>
            <p className="text-base font-semibold mb-2" style={{ color: '#16130f' }}>
              No orders yet
            </p>
            <p className="text-sm max-w-xs leading-relaxed mb-6" style={{ color: '#a8a09a' }}>
              When you buy something on Declutter, your orders will appear here.
            </p>
            <Link
              href="/listings"
              className="rounded-xl border px-5 py-2 text-sm font-medium transition-colors hover:bg-card"
              style={{ borderColor: '#e8e4dc', color: '#78726c' }}
            >
              Browse listings
            </Link>
          </div>
        )}

        {!isLoading && orders && orders.length > 0 && (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Test in browser**

Log in at `/login` with a buyer account. You should be redirected to `/orders`. Confirm the page renders — empty state or order list.

- [ ] **Step 3: Commit**

```bash
git add app/orders/page.tsx
git commit -m "feat: add /orders buyer order list page"
```

---

### Task 10: /orders/[id] page (buyer order detail)

**Files:**
- Create: `app/orders/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/orders/[id]/page.tsx
'use client'

import Link from 'next/link'
import { use } from 'react'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import { Package, Truck, MapPin, ArrowLeft, Mail } from 'lucide-react'
import { useBuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'

const STATUS_STEPS = ['paid', 'confirmed', 'delivered'] as const
const STATUS_LABEL: Record<string, string> = {
  paid: 'Order placed',
  confirmed: 'Seller confirmed',
  delivered: 'Delivered',
}

function StatusTimeline({ status }: { status: string }) {
  const currentIndex = STATUS_STEPS.indexOf(status as typeof STATUS_STEPS[number])
  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done = currentIndex >= i
        const isLast = i === STATUS_STEPS.length - 1
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{
                  background: done ? '#4f46e5' : '#e8e4dc',
                  color: done ? 'white' : '#a8a09a',
                }}
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

export default function BuyerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: order, isLoading, error } = useBuyerOrderDetail(id)

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-24 rounded" style={{ background: '#f0ece5' }} />
            <div className="h-40 rounded-2xl" style={{ background: '#f0ece5' }} />
          </div>
        </div>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-surface">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-sm" style={{ color: '#78726c' }}>Order not found.</p>
          <Link href="/orders" className="text-sm underline mt-4 inline-block" style={{ color: '#4f46e5' }}>
            Back to orders
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: '#78726c' }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          All orders
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* Item card */}
          <div
            className="rounded-2xl border p-5 flex gap-4 bg-card"
            style={{ borderColor: '#e8e4dc' }}
          >
            <div
              className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
              style={{ background: '#f0ece5' }}
            >
              {order.listing.images?.[0] ? (
                <CldImage
                  src={order.listing.images[0]}
                  fill
                  sizes="80px"
                  className="object-cover"
                  alt={order.listing.title}
                />
              ) : (
                <Package size={22} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold" style={{ color: '#16130f' }}>
                {order.listing.title}
              </h1>
              <p className="text-base font-medium mt-0.5" style={{ color: '#4f46e5' }}>
                ₦{order.total_price.toLocaleString()}
              </p>
              <span
                className="inline-flex items-center gap-1 mt-2 text-[10px] rounded-full px-2 py-0.5"
                style={
                  order.delivery_type === 'delivery'
                    ? { background: 'rgba(79,70,229,0.08)', color: '#4f46e5' }
                    : { background: 'rgba(16,185,129,0.08)', color: '#10b981' }
                }
              >
                {order.delivery_type === 'delivery'
                  ? <><Truck size={9} strokeWidth={2} /> Delivery</>
                  : <><MapPin size={9} strokeWidth={2} /> Pickup</>}
              </span>
            </div>
          </div>

          {/* Status timeline */}
          <div className="rounded-2xl border p-5 bg-card" style={{ borderColor: '#e8e4dc' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: '#a8a09a' }}>
              Order status
            </p>
            <StatusTimeline status={order.status} />
          </div>

          {/* Price breakdown */}
          <div className="rounded-2xl border p-5 bg-card" style={{ borderColor: '#e8e4dc' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#a8a09a' }}>
              Payment
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm" style={{ color: '#78726c' }}>
                <span>Item</span>
                <span>₦{order.item_price.toLocaleString()}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-sm" style={{ color: '#78726c' }}>
                  <span>Delivery</span>
                  <span>₦{order.delivery_fee.toLocaleString()}</span>
                </div>
              )}
              <div
                className="flex justify-between text-sm font-semibold pt-2 border-t"
                style={{ color: '#16130f', borderColor: '#e8e4dc' }}
              >
                <span>Total</span>
                <span>₦{order.total_price.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Seller contact */}
          {order.seller && (
            <div className="rounded-2xl border p-5 bg-card" style={{ borderColor: '#e8e4dc' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#a8a09a' }}>
                Seller
              </p>
              <p className="text-sm font-medium mb-2" style={{ color: '#16130f' }}>
                {order.seller.name ?? 'Declutter seller'}
              </p>
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
    </main>
  )
}
```

- [ ] **Step 2: Test in browser**

From `/orders`, click an order row. Confirm the detail page loads with the status timeline, price breakdown, and seller contact.

- [ ] **Step 3: Commit**

```bash
git add app/orders/[id]/page.tsx
git commit -m "feat: add /orders/[id] buyer order detail page"
```

---

### Task 11: Success page CTA + order confirmation email link

**Files:**
- Modify: `app/checkout/success/page.tsx`
- Modify: `lib/email.ts`

- [ ] **Step 1: Add "Track your order" CTA to success page**

In `app/checkout/success/page.tsx`, replace:
```tsx
          <Link
            href="/listings"
            className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-card transition-colors"
          >
            Continue browsing
          </Link>
```
With:
```tsx
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/login?next=/orders"
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity"
              style={{ background: '#4f46e5' }}
            >
              Track your order
            </Link>
            <Link
              href="/listings"
              className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-card transition-colors"
            >
              Continue browsing
            </Link>
          </div>
```

- [ ] **Step 2: Update order confirmation email to include track link**

In `lib/email.ts`, find `buildOrderConfirmationHtml` and replace the closing note paragraph (after the `deliveryNote` paragraph) so it reads:

Replace:
```typescript
              <p style="margin:28px 0 0;font-size:14px;color:#6B7280;line-height:1.6;background:#F9FAFB;border-radius:10px;padding:16px 20px;">
                ${deliveryNote}
              </p>
```
With:
```typescript
              <p style="margin:28px 0 0;font-size:14px;color:#6B7280;line-height:1.6;background:#F9FAFB;border-radius:10px;padding:16px 20px;">
                ${deliveryNote}
              </p>
              <p style="margin:20px 0 0;text-align:center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://declut.com'}/login?next=/orders" style="display:inline-block;background:#4F46E5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;padding:12px 24px;">
                  Track your order
                </a>
              </p>
```

Also update `buildOrderConfirmationText` — replace:
```typescript
  lines.push(
    deliveryType === 'delivery'
      ? 'The seller will be in touch within 12 hours to arrange delivery.'
      : 'The seller will be in touch within 12 hours to arrange pickup.'
  )
  lines.push('')
  lines.push('— The declut team')
```
With:
```typescript
  lines.push(
    deliveryType === 'delivery'
      ? 'The seller will be in touch within 12 hours to arrange delivery.'
      : 'The seller will be in touch within 12 hours to arrange pickup.'
  )
  lines.push('')
  lines.push(`Track your order: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://declut.com'}/login?next=/orders`)
  lines.push('')
  lines.push('— The declut team')
```

- [ ] **Step 3: Add NEXT_PUBLIC_APP_URL to .env.local if missing**

Check if `.env.local` has `NEXT_PUBLIC_APP_URL`. If not, add:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
(Set to the real domain in production env.)

- [ ] **Step 4: Test in browser**

Visit `/checkout/success`. Confirm "Track your order" button renders and links to `/login?next=/orders`.

- [ ] **Step 5: Commit**

```bash
git add app/checkout/success/page.tsx lib/email.ts
git commit -m "feat: add track order CTA to success page and order confirmation email"
```

---

### Task 12: Checkout inline OTP prompt (entry point A)

**Files:**
- Modify: `app/checkout/page.tsx`

This adds an optional "Log in to track this order" prompt on the checkout page. It is non-blocking — skipping it leaves anonymous checkout unchanged.

- [ ] **Step 1: Read the current checkout page**

Read `app/checkout/page.tsx` fully to understand the current component structure before editing.

- [ ] **Step 2: Add the inline login prompt component**

Add this component above the `CheckoutContent` function (before `export default`):

```tsx
function InlineLoginPrompt() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'idle' | 'email' | 'code' | 'done'>('idle')
  const sendOtp = useSendOtp()
  const router = useRouter()

  const verifyOtp = useVerifyOtp(null)

  if (step === 'done') {
    return (
      <div
        className="rounded-xl border p-4 flex items-center gap-2 text-sm"
        style={{ borderColor: '#e8e4dc', background: 'rgba(16,185,129,0.06)' }}
      >
        <span style={{ color: '#10b981' }}>✓</span>
        <span style={{ color: '#16130f' }}>Logged in — your order will be saved to your account.</span>
      </div>
    )
  }

  if (step === 'idle') {
    return (
      <div
        className="rounded-xl border p-4 flex items-center justify-between gap-4"
        style={{ borderColor: '#e8e4dc', background: '#faf9f7' }}
      >
        <p className="text-sm" style={{ color: '#78726c' }}>
          Log in to track this order after checkout.
        </p>
        <button
          onClick={() => setStep('email')}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: '#4f46e5' }}
        >
          Log in
        </button>
      </div>
    )
  }

  if (step === 'email') {
    return (
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: '#e8e4dc', background: '#faf9f7' }}>
        <p className="text-xs font-semibold" style={{ color: '#16130f' }}>Log in with your email</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#e8e4dc', background: 'white', color: '#16130f' }}
          />
          <button
            onClick={() => sendOtp.mutate(email, { onSuccess: () => setStep('code') })}
            disabled={sendOtp.isPending || !email}
            className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: '#4f46e5' }}
          >
            {sendOtp.isPending ? '…' : 'Send'}
          </button>
          <button
            onClick={() => setStep('idle')}
            className="shrink-0 text-xs px-2"
            style={{ color: '#a8a09a' }}
          >
            Skip
          </button>
        </div>
        {sendOtp.error && <p className="text-xs text-red-600">{sendOtp.error.message}</p>}
      </div>
    )
  }

  // step === 'code'
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: '#e8e4dc', background: '#faf9f7' }}>
      <p className="text-xs font-semibold" style={{ color: '#16130f' }}>
        Enter the code sent to {email}
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono tracking-widest outline-none"
          style={{ borderColor: '#e8e4dc', background: 'white', color: '#16130f' }}
        />
        <button
          onClick={() =>
            verifyOtp.mutate(
              { email, code },
              {
                onSuccess: () => {
                  setStep('done')
                  router.refresh()
                },
              }
            )
          }
          disabled={verifyOtp.isPending || code.length !== 6}
          className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: '#4f46e5' }}
        >
          {verifyOtp.isPending ? '…' : 'Verify'}
        </button>
      </div>
      {verifyOtp.error && <p className="text-xs text-red-600">{verifyOtp.error.message}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Add required imports**

At the top of `app/checkout/page.tsx`, add to the existing imports:
```tsx
import { useSendOtp, useVerifyOtp } from '@/lib/hooks/useBuyerAuth'
```

`useState`, `useEffect`, `useRouter` are already imported — confirm before adding duplicates.

- [ ] **Step 4: Place the prompt in the checkout layout**

In `CheckoutContent`, after the `<h1>Payment</h1>` heading block and before the `<div className="rounded-2xl border border-border bg-card p-5 mb-6 text-sm">` secure checkout block, insert:

```tsx
        <div className="mb-6">
          <InlineLoginPrompt />
        </div>
```

- [ ] **Step 5: Test in browser**

Visit `/cart`, proceed to checkout. Confirm the "Log in to track this order" prompt appears above the secure checkout block. Log in via the prompt, confirm it shows "✓ Logged in" state. Confirm anonymous checkout still works when skipping the prompt.

- [ ] **Step 6: Commit**

```bash
git add app/checkout/page.tsx
git commit -m "feat: add optional inline OTP login prompt to checkout page"
```

---

## Self-Review

**Spec coverage:**
- ✅ OTP-only auth → Tasks 3 + 4
- ✅ `otp_codes` table → Task 1
- ✅ `account_type = 'buyer'` → Tasks 1 + 2
- ✅ Order backfill on login → Task 4 (`UPDATE orders SET buyer_id`)
- ✅ `/login` page, two-step → Task 8
- ✅ Proxy: `/login` public, `/orders` buyer-only, account-type gates → Task 6
- ✅ Entry point A (checkout prompt) → Task 12
- ✅ Entry point B (success page + email CTA) → Task 11
- ✅ Entry point C (standalone `/login`) → Task 8
- ✅ `/orders` list page → Task 9
- ✅ `/orders/[id]` detail page → Task 10
- ✅ Seller login redirect note on `/login` → Task 8
- ✅ Seller blocked from buyer routes → Task 6
- ✅ Buyer blocked from dashboard → Task 6

**Placeholder scan:** None found.

**Type consistency:** `BuyerOrder` and `BuyerOrderDetail` defined in `useBuyerOrders.ts` Task 7, used consistently in Tasks 9 and 10. `useSendOtp` / `useVerifyOtp` defined in `useBuyerAuth.ts` Task 7, used in Tasks 8 and 12. API route handlers use `x-user-account-type` header consistently with proxy injection.
