# Dispatch System & Payouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gig-worker dispatcher role and a 4-digit code verification system as the single trigger for seller payouts — dispatchers enter the code at delivery handoff, sellers enter it at pickup.

**Architecture:** Delivery codes are derived on-demand via HMAC-SHA256 (no DB storage needed). A new `dispatcher` account type can claim confirmed delivery orders, moving them to `shipped`, then verify the buyer's code to trigger a Stripe transfer to the seller. Pickup orders follow the same code path but the seller is the one entering it. A cron endpoint auto-releases stuck orders after 14 days. The existing `PATCH /api/orders/[id]` is narrowed to seller confirm-only; all code verification goes through dedicated `/verify` routes.

**Tech Stack:** Next.js 16 App Router, proxy.ts, Supabase (supabaseAdmin), Stripe transfers, jose JWT (existing signToken/verifyToken), TanStack Query, Sonner toasts, Framer Motion, Lucide, Tailwind CSS 4, bcryptjs.

---

## Status Flow (after this plan)

```
Delivery:  pending → paid → confirmed → shipped → delivered  (+ Stripe transfer)
Pickup:    pending → paid → confirmed → delivered             (+ Stripe transfer)
Auto:      confirmed/shipped older than 14d → delivered      (+ Stripe transfer)
```

---

## File Map

**Create:**
- `supabase/migrations/007_dispatch_system.sql` — add `dispatcher` to account_type check; add `dispatcher_id` FK to orders
- `lib/delivery-code.ts` — stateless HMAC code generation and verification
- `lib/payout.ts` — shared Stripe transfer + order status update
- `app/api/auth/dispatcher/register/route.ts` — dispatcher signup
- `app/api/dispatch/orders/route.ts` — GET available delivery orders
- `app/api/dispatch/orders/[id]/claim/route.ts` — POST claim an order
- `app/api/dispatch/orders/mine/route.ts` — GET dispatcher's active deliveries
- `app/api/dispatch/orders/[id]/verify/route.ts` — POST delivery code → payout
- `app/api/orders/[id]/verify/route.ts` — POST pickup code by seller → payout
- `app/api/cron/auto-release/route.ts` — GET auto-release stuck orders
- `lib/hooks/useDispatch.ts` — TanStack queries/mutations for dispatcher portal
- `app/dispatch/register/page.tsx` — dispatcher signup page
- `app/dispatch/page.tsx` — dispatcher portal (available + my deliveries tabs)

**Modify:**
- `types/index.ts` — add `'dispatcher'` to `AccountType`; add `dispatcher_id` to `Order`
- `app/api/orders/[id]/route.ts` — narrow PATCH to `paid → confirmed` only; add dispatcher to GET access
- `app/api/orders/mine/route.ts` — add `'shipped'` to valid statuses
- `app/api/buyer/orders/[id]/route.ts` — include `delivery_code` in response
- `lib/hooks/useSellerOrders.ts` — add `useVerifyPickup` mutation; update `SellerOrder` type
- `lib/hooks/useBuyerOrders.ts` — add `delivery_code` to `BuyerOrderDetail`
- `app/dashboard/orders/page.tsx` — replace "Mark as delivered" with pickup code entry; add Shipped tab
- `app/orders/[id]/page.tsx` — show delivery code; add `shipped` step to timeline
- `proxy.ts` — dispatcher gates, `/dispatch/*` routes, `/api/dispatch/*` routes

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/007_dispatch_system.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/007_dispatch_system.sql
-- Rollback: alter table users drop constraint users_account_type_check;
--           alter table users add constraint users_account_type_check
--             check (account_type in ('individual','business','buyer'));
--           alter table orders drop column dispatcher_id;

-- 1. Extend account_type to include dispatcher
alter table public.users
  drop constraint if exists users_account_type_check;

alter table public.users
  add constraint users_account_type_check
    check (account_type in ('individual', 'business', 'buyer', 'dispatcher'));

-- 2. Track which dispatcher claimed a delivery order
alter table public.orders
  add column if not exists dispatcher_id uuid references public.users(id);

create index if not exists orders_dispatcher_id_idx on public.orders (dispatcher_id);
```

- [ ] **Step 2: Run it in the Supabase SQL editor**

Paste the contents and run. Verify: no errors, `orders.dispatcher_id` column appears in the Table Editor, users `account_type` constraint updated.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_dispatch_system.sql
git commit -m "feat: add dispatcher account type and dispatcher_id to orders"
```

---

## Task 2: Update TypeScript types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add `'dispatcher'` to AccountType and `dispatcher_id` to Order**

In `types/index.ts`, replace:
```typescript
export type AccountType = 'individual' | 'business' | 'buyer'
```
With:
```typescript
export type AccountType = 'individual' | 'business' | 'buyer' | 'dispatcher'
```

In the `Order` interface, add `dispatcher_id` after `seller_id`:
```typescript
  dispatcher_id: string | null
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | head -40
```

Expected: succeeds or only pre-existing errors.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add dispatcher to AccountType, dispatcher_id to Order"
```

---

## Task 3: Delivery code utility

**Files:**
- Create: `lib/delivery-code.ts`

The code is derived from the order ID + a server secret via HMAC. No DB column needed — the same code is computed on demand by both the buyer (to display) and the server (to verify).

- [ ] **Step 1: Add `DELIVERY_CODE_SECRET` to `.env.local`**

```
DELIVERY_CODE_SECRET=<generate with: openssl rand -hex 32>
```

- [ ] **Step 2: Create the utility**

```typescript
// lib/delivery-code.ts
import { createHmac } from 'crypto'

export function computeDeliveryCode(orderId: string): string {
  const hmac = createHmac('sha256', process.env.DELIVERY_CODE_SECRET!)
    .update(orderId)
    .digest('hex')
  const code = parseInt(hmac.slice(0, 4), 16) % 10000
  return code.toString().padStart(4, '0')
}
```

- [ ] **Step 3: Verify manually**

```bash
node -e "
process.env.DELIVERY_CODE_SECRET='test-secret';
const { createHmac } = require('crypto');
function computeDeliveryCode(id) {
  const hmac = createHmac('sha256', process.env.DELIVERY_CODE_SECRET).update(id).digest('hex');
  return (parseInt(hmac.slice(0,4),16) % 10000).toString().padStart(4,'0');
}
const id = 'abc123';
console.log(computeDeliveryCode(id)); // same id always produces same code
console.log(computeDeliveryCode(id));
console.log(computeDeliveryCode('other-id')); // different id → different code
"
```

Expected: first two lines are identical, third is different.

- [ ] **Step 4: Commit**

```bash
git add lib/delivery-code.ts
git commit -m "feat: add delivery code utility using HMAC"
```

---

## Task 4: Payout utility

**Files:**
- Create: `lib/payout.ts`

Single function called by both verify routes and the cron. Idempotent — safe to call twice on the same order.

- [ ] **Step 1: Create the utility**

```typescript
// lib/payout.ts
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

const PLATFORM_FEE_PERCENT = 10

export async function executePayout(orderId: string): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, total_price, stripe_payment_intent_id, stripe_transfer_id')
    .eq('id', orderId)
    .single()

  if (!order) {
    console.error(`executePayout: order ${orderId} not found`)
    return
  }

  if (order.stripe_transfer_id) return // already paid out

  // Mark delivered first — buyer UX shouldn't wait on the financial operation
  await supabaseAdmin
    .from('orders')
    .update({ status: 'delivered' })
    .eq('id', orderId)

  const { data: seller } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('id', order.seller_id)
    .single()

  if (!seller?.stripe_account_id || !seller.stripe_onboarding_complete) {
    console.error(`executePayout: seller ${order.seller_id} has not completed Stripe onboarding — manual payout required`)
    return
  }

  const sellerAmountKobo = Math.round(
    order.total_price * (1 - PLATFORM_FEE_PERCENT / 100) * 100
  )

  try {
    const transfer = await stripe.transfers.create({
      amount: sellerAmountKobo,
      currency: 'ngn',
      destination: seller.stripe_account_id,
      transfer_group: orderId,
      metadata: { order_id: orderId },
    })

    await supabaseAdmin
      .from('orders')
      .update({ stripe_transfer_id: transfer.id })
      .eq('id', orderId)
  } catch (error) {
    console.error(`executePayout: Stripe transfer failed for order ${orderId}:`, error)
    // Status already set to delivered. Manual payout resolution needed.
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/payout.ts
git commit -m "feat: add executePayout utility for Stripe transfers"
```

---

## Task 5: Dispatcher register API

**Files:**
- Create: `app/api/auth/dispatcher/register/route.ts`

Dispatchers sign up with name, email, and password — same pattern as sellers but `account_type = 'dispatcher'`.

- [ ] **Step 1: Create the route**

```typescript
// app/api/auth/dispatcher/register/route.ts
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken } from '@/lib/jwt'
import { ok, err } from '@/lib/api-response'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export async function POST(req: Request) {
  let body: { name?: unknown; email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : null
  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : null
  const password = typeof body.password === 'string' ? body.password : null

  if (!name || name.length < 2) return err('Name is required', 'VALIDATION_ERROR', 400)
  if (!email || !EMAIL_REGEX.test(email)) return err('Valid email is required', 'VALIDATION_ERROR', 400)
  if (!password || password.length < 8) return err('Password must be at least 8 characters', 'VALIDATION_ERROR', 400)

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) return err('An account with this email already exists', 'CONFLICT', 409)

  const password_hash = await bcrypt.hash(password, 12)

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({ name, email, password_hash, account_type: 'dispatcher', email_verified: true })
    .select('id')
    .single()

  if (error || !user) {
    console.error('Dispatcher register error:', error)
    return err('Failed to create account', 'SERVER_ERROR', 500)
  }

  const token = await signToken({ sub: user.id, email, account_type: 'dispatcher' })

  const response = ok({ success: true })
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )
  return response
}
```

- [ ] **Step 2: Verify manually**

Start dev server (`npm run dev`), then:
```bash
curl -s -X POST http://localhost:3000/api/auth/dispatcher/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Dispatch","email":"dispatch@test.com","password":"password123"}' | jq
```
Expected: `{"data":{"success":true}}` with `Set-Cookie` header containing the JWT.

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/dispatcher/register/route.ts
git commit -m "feat: add POST /api/auth/dispatcher/register endpoint"
```

---

## Task 6: Update proxy.ts

**Files:**
- Modify: `proxy.ts`

Dispatchers get their own portal at `/dispatch`. They cannot access `/dashboard` or `/orders`. Sellers and buyers cannot access `/dispatch`.

- [ ] **Step 1: Read the current proxy.ts**

Already read above. Key changes:
1. Add `/dispatch` and `/dispatch/register` as public pages.
2. After token verification, redirect `dispatcher` to `/dispatch` if they land on seller/buyer routes.
3. Block non-dispatchers from `/dispatch/*` and `/api/dispatch/*`.
4. Add `/dispatch/:path*` and `/api/dispatch/:path*` to matcher.

- [ ] **Step 2: Replace the relevant sections**

Add the public page bypass (after the existing `/login` bypass):
```typescript
  // Dispatcher register page is public
  if (pathname === '/dispatch/register') {
    return NextResponse.next()
  }
```

After `const isBuyer = payload.account_type === 'buyer'`, add:
```typescript
  const isDispatcher = payload.account_type === 'dispatcher'

  // Dispatchers can only access /dispatch and /api/dispatch
  if (isDispatcher && !pathname.startsWith('/dispatch') && !pathname.startsWith('/api/dispatch')) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dispatch', request.url))
  }

  // Non-dispatchers cannot access dispatcher routes
  if (!isDispatcher && (pathname.startsWith('/dispatch') || pathname.startsWith('/api/dispatch'))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
```

Update the unauthenticated redirect logic to also cover `/dispatch`:
```typescript
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let loginPath = '/auth/login'
    if (pathname.startsWith('/orders')) loginPath = '/login'
    if (pathname.startsWith('/dispatch')) loginPath = '/auth/login'
    return NextResponse.redirect(
      new URL(`${loginPath}?next=${encodeURIComponent(pathname)}`, request.url)
    )
  }
```

Update the matcher to include dispatch routes:
```typescript
export const config = {
  matcher: [
    '/api/listings/:path*',
    '/api/users/:path*',
    '/api/upload',
    '/api/cart/:path*',
    '/api/orders/:path*',
    '/api/buyer/:path*',
    '/api/dispatch/:path*',
    '/api/stripe/:path*',
    '/api/cron/:path*',
    '/listings/:path*',
    '/dashboard/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/dispatch/:path*',
    '/login',
  ],
}
```

- [ ] **Step 3: Verify lint**

```bash
npm run lint 2>&1 | grep proxy
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add proxy.ts
git commit -m "feat: add dispatcher route gates to proxy"
```

---

## Task 7: Dispatcher order APIs

**Files:**
- Create: `app/api/dispatch/orders/route.ts`
- Create: `app/api/dispatch/orders/mine/route.ts`
- Create: `app/api/dispatch/orders/[id]/claim/route.ts`

- [ ] **Step 1: Create GET /api/dispatch/orders — available delivery orders**

```typescript
// app/api/dispatch/orders/route.ts
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
      id, status, delivery_type, total_price, buyer_address, created_at,
      listing:listings(id, title, images)
    `)
    .eq('status', 'confirmed')
    .eq('delivery_type', 'delivery')
    .is('dispatcher_id', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetch available orders error:', error)
    return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  }

  return ok(orders ?? [])
}
```

- [ ] **Step 2: Create GET /api/dispatch/orders/mine — dispatcher's active deliveries**

```typescript
// app/api/dispatch/orders/mine/route.ts
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
      id, status, delivery_type, total_price, buyer_name, buyer_phone, buyer_address, created_at,
      listing:listings(id, title, images)
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

- [ ] **Step 3: Create POST /api/dispatch/orders/[id]/claim**

```typescript
// app/api/dispatch/orders/[id]/claim/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, status, delivery_type, dispatcher_id')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.delivery_type !== 'delivery') return err('Only delivery orders can be claimed', 'INVALID_STATE', 409)
  if (order.status !== 'confirmed') return err('Order is not available for claiming', 'INVALID_STATE', 409)
  if (order.dispatcher_id) return err('Order already claimed', 'INVALID_STATE', 409)

  const { data: updated, error } = await supabaseAdmin
    .from('orders')
    .update({ dispatcher_id: authUser.id, status: 'shipped' })
    .eq('id', id)
    .eq('status', 'confirmed')      // optimistic lock: fails if another dispatcher claimed first
    .is('dispatcher_id', null)
    .select('id, status')
    .single()

  if (error || !updated) {
    return err('Order was already claimed by another dispatcher', 'CONFLICT', 409)
  }

  return ok(updated)
}
```

- [ ] **Step 4: Verify lint**

```bash
npm run lint 2>&1 | grep dispatch
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add app/api/dispatch/orders/route.ts app/api/dispatch/orders/mine/route.ts "app/api/dispatch/orders/[id]/claim/route.ts"
git commit -m "feat: add dispatcher order list, mine, and claim APIs"
```

---

## Task 8: Delivery code verify APIs

**Files:**
- Create: `app/api/dispatch/orders/[id]/verify/route.ts` — dispatcher verifies delivery
- Create: `app/api/orders/[id]/verify/route.ts` — seller verifies pickup

- [ ] **Step 1: Create dispatcher verify endpoint**

```typescript
// app/api/dispatch/orders/[id]/verify/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { computeDeliveryCode } from '@/lib/delivery-code'
import { executePayout } from '@/lib/payout'
import { ok, err } from '@/lib/api-response'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { id } = await params

  let body: { code?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const code = typeof body.code === 'string' ? body.code.trim() : null
  if (!code || !/^\d{4}$/.test(code)) {
    return err('A 4-digit code is required', 'VALIDATION_ERROR', 400)
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, status, delivery_type, dispatcher_id')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.delivery_type !== 'delivery') return err('Not a delivery order', 'INVALID_STATE', 409)
  if (order.status !== 'shipped') return err('Order is not in transit', 'INVALID_STATE', 409)
  if (order.dispatcher_id !== authUser.id) return err('Forbidden', 'FORBIDDEN', 403)

  const expected = computeDeliveryCode(id)
  if (code !== expected) {
    return err('Incorrect code', 'INVALID_CODE', 400)
  }

  await executePayout(id)

  return ok({ delivered: true })
}
```

- [ ] **Step 2: Create seller pickup verify endpoint**

```typescript
// app/api/orders/[id]/verify/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { computeDeliveryCode } from '@/lib/delivery-code'
import { executePayout } from '@/lib/payout'
import { ok, err } from '@/lib/api-response'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  let body: { code?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const code = typeof body.code === 'string' ? body.code.trim() : null
  if (!code || !/^\d{4}$/.test(code)) {
    return err('A 4-digit code is required', 'VALIDATION_ERROR', 400)
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, status, delivery_type, seller_id')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.delivery_type !== 'pickup') return err('Not a pickup order', 'INVALID_STATE', 409)
  if (order.status !== 'confirmed') return err('Order is not awaiting pickup', 'INVALID_STATE', 409)
  if (order.seller_id !== authUser.id) return err('Forbidden', 'FORBIDDEN', 403)

  const expected = computeDeliveryCode(id)
  if (code !== expected) {
    return err('Incorrect code', 'INVALID_CODE', 400)
  }

  await executePayout(id)

  return ok({ delivered: true })
}
```

- [ ] **Step 3: Verify lint**

```bash
npm run lint 2>&1 | grep verify
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "app/api/dispatch/orders/[id]/verify/route.ts" "app/api/orders/[id]/verify/route.ts"
git commit -m "feat: add delivery code verify endpoints for dispatcher and seller"
```

---

## Task 9: Narrow seller PATCH /api/orders/[id]

**Files:**
- Modify: `app/api/orders/[id]/route.ts`

Sellers can only do `paid → confirmed` now. Delivery `confirmed → delivered` is gone (dispatcher handles it). Pickup `confirmed → delivered` is gone (new `/verify` route handles it).

Also update GET to allow dispatcher access to orders they own.

- [ ] **Step 1: Replace the file**

```typescript
// app/api/orders/[id]/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) return err('Order not found', 'NOT_FOUND', 404)

  const canView =
    order.buyer_id === authUser.id ||
    order.seller_id === authUser.id ||
    order.dispatcher_id === authUser.id

  if (!canView) return err('Forbidden', 'FORBIDDEN', 403)

  return ok(order)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  let body: { status?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const { status: nextStatus } = body

  if (nextStatus !== 'confirmed') {
    return err('status must be confirmed', 'VALIDATION_ERROR', 400)
  }

  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.seller_id !== authUser.id) return err('Forbidden', 'FORBIDDEN', 403)
  if (order.status !== 'paid') {
    return err(`Cannot confirm order in status: ${order.status}`, 'INVALID_TRANSITION', 409)
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'confirmed' })
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
npm run lint 2>&1 | grep "orders/\[id\]/route"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/api/orders/[id]/route.ts"
git commit -m "fix: narrow seller PATCH /api/orders/[id] to confirm-only"
```

---

## Task 10: Expose delivery code in buyer order detail API

**Files:**
- Modify: `app/api/buyer/orders/[id]/route.ts`

The buyer's order detail response needs to include the computed delivery code so they can show it in the UI.

- [ ] **Step 1: Read the current file**

```
app/api/buyer/orders/[id]/route.ts
```

- [ ] **Step 2: Add delivery_code to the response**

Add the import at the top of the file:
```typescript
import { computeDeliveryCode } from '@/lib/delivery-code'
```

Replace the final `return ok(order)` with:
```typescript
  const showCode = !['delivered', 'completed', 'cancelled'].includes(order.status)

  return ok({
    ...order,
    delivery_code: showCode ? computeDeliveryCode(order.id) : null,
  })
```

- [ ] **Step 3: Verify lint**

```bash
npm run lint 2>&1 | grep "buyer/orders"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "app/api/buyer/orders/[id]/route.ts"
git commit -m "feat: include delivery_code in buyer order detail response"
```

---

## Task 11: Update seller orders API and hook

**Files:**
- Modify: `app/api/orders/mine/route.ts`
- Modify: `lib/hooks/useSellerOrders.ts`

Add `'shipped'` to valid statuses so sellers can see in-transit delivery orders. Add `useVerifyPickup` mutation.

- [ ] **Step 1: Update the mine route**

In `app/api/orders/mine/route.ts`, replace:
```typescript
const VALID_STATUSES = ['paid', 'confirmed', 'delivered'] as const
```
With:
```typescript
const VALID_STATUSES = ['paid', 'confirmed', 'shipped', 'delivered'] as const
```

And update the error message:
```typescript
    return err('status must be paid, confirmed, shipped, or delivered', 'VALIDATION_ERROR', 400)
```

- [ ] **Step 2: Update useSellerOrders.ts**

Replace the entire file:

```typescript
// lib/hooks/useSellerOrders.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type SellerOrder = {
  id: string
  listing_id: string
  status: 'paid' | 'confirmed' | 'shipped' | 'delivered'
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

export function useSellerOrders(status: 'paid' | 'confirmed' | 'shipped' | 'delivered') {
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

export function useVerifyPickup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) =>
      apiRequest('POST', `/api/orders/${id}/verify`, { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', 'confirmed'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', 'delivered'] })
      toast.success('Pickup confirmed — payout initiated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
```

Note: `useDeliverOrder` is removed — sellers no longer mark delivery. Pickup verification is handled by `useVerifyPickup`.

- [ ] **Step 3: Verify lint**

```bash
npm run lint 2>&1 | grep -E "orders/mine|useSellerOrders"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add app/api/orders/mine/route.ts lib/hooks/useSellerOrders.ts
git commit -m "feat: add shipped to seller orders API, replace useDeliverOrder with useVerifyPickup"
```

---

## Task 12: Update seller orders dashboard page

**Files:**
- Modify: `app/dashboard/orders/page.tsx`

Replace "Mark as delivered" with pickup code entry for confirmed pickup orders. Add a "Shipped" tab so sellers can see in-transit delivery orders. Confirmed delivery orders show "Awaiting dispatcher".

- [ ] **Step 1: Replace the file**

```tsx
// app/dashboard/orders/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CldImage } from "next-cloudinary";
import {
  Package,
  MapPin,
  Phone,
  User,
  Mail,
  Truck,
  ShoppingBag,
  CheckCircle2,
  Clock,
  KeyRound,
} from "lucide-react";
import {
  useSellerOrders,
  useConfirmOrder,
  useVerifyPickup,
  type SellerOrder,
} from "@/lib/hooks/useSellerOrders";

type Tab = { label: string; status: "paid" | "confirmed" | "shipped" | "delivered" };

const TABS: Tab[] = [
  { label: "New", status: "paid" },
  { label: "Confirmed", status: "confirmed" },
  { label: "Shipped", status: "shipped" },
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

const EMPTY_STATE_CONFIG: Record<string, {
  emoji: string;
  heading: string;
  body: string;
}> = {
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

function EmptyState({ tab }: { tab: string }) {
  const config = EMPTY_STATE_CONFIG[tab] ?? EMPTY_STATE_CONFIG.New;
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

function OrderCard({ order, tab }: { order: SellerOrder; tab: Tab }) {
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

function TabContent({ tab }: { tab: Tab }) {
  const { data: orders, isLoading } = useSellerOrders(tab.status);

  if (isLoading) {
    return <div className="flex flex-col gap-4">{[1, 2, 3].map((i) => <OrderSkeleton key={i} />)}</div>;
  }

  if (!orders || orders.length === 0) {
    return <EmptyState tab={tab.label} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order) => <OrderCard key={order.id} order={order} tab={tab} />)}
    </div>
  );
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<Tab>(TABS[0]);

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold" style={{ color: "#16130f" }}>Orders</h1>
        <p className="mt-1 text-sm" style={{ color: "#78726c" }}>Manage orders from buyers.</p>
      </motion.div>

      <div className="inline-flex gap-0.5 rounded-full p-0.5" style={{ background: "#f0ece5" }}>
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

      <TabContent tab={activeTab} />
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Visit `/dashboard/orders`. Confirm:
- Four tabs: New, Confirmed, Shipped, Delivered
- Confirmed delivery orders show "Awaiting dispatcher" badge
- Confirmed pickup orders show the code entry input + "Confirm pickup" button

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/orders/page.tsx
git commit -m "feat: update seller orders dashboard with pickup code entry and shipped tab"
```

---

## Task 13: Update buyer orders hook and order detail page

**Files:**
- Modify: `lib/hooks/useBuyerOrders.ts`
- Modify: `app/orders/[id]/page.tsx`

Add `delivery_code` to the hook type. Update the timeline to show `shipped` as an intermediate step for delivery orders, and show the code prominently.

- [ ] **Step 1: Add delivery_code to BuyerOrderDetail in useBuyerOrders.ts**

In `lib/hooks/useBuyerOrders.ts`, add `delivery_code: string | null` to `BuyerOrderDetail`:

```typescript
export type BuyerOrderDetail = BuyerOrder & {
  item_price: number
  delivery_fee: number
  buyer_name: string | null
  buyer_address: string | null
  delivery_code: string | null
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
```

- [ ] **Step 2: Replace app/orders/[id]/page.tsx**

```tsx
// app/orders/[id]/page.tsx
'use client'

import Link from 'next/link'
import { use } from 'react'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import { Package, Truck, MapPin, ArrowLeft, Mail, KeyRound } from 'lucide-react'
import { useBuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'

// Delivery timeline steps differ by delivery type
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
  const currentIndex = steps.indexOf(resolvedStatus as typeof DELIVERY_STEPS[number])

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
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors" style={{ color: '#78726c' }}>
          <ArrowLeft size={14} strokeWidth={2} />
          All orders
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

          {/* Delivery code — shown until delivered */}
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
    </main>
  )
}
```

- [ ] **Step 3: Test in browser**

Log in as a buyer and visit an order in `paid` or `confirmed` status. Confirm the delivery code card appears with a 4-digit code. Confirm the timeline shows the correct steps for delivery vs pickup.

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/useBuyerOrders.ts "app/orders/[id]/page.tsx"
git commit -m "feat: show delivery code and update timeline on buyer order detail page"
```

---

## Task 14: Dispatcher portal hook and pages

**Files:**
- Create: `lib/hooks/useDispatch.ts`
- Create: `app/dispatch/register/page.tsx`
- Create: `app/dispatch/page.tsx`

- [ ] **Step 1: Create lib/hooks/useDispatch.ts**

```typescript
// lib/hooks/useDispatch.ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type DispatchOrder = {
  id: string
  status: string
  delivery_type: 'delivery'
  total_price: number
  buyer_address: string
  buyer_name?: string
  buyer_phone?: string
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

export function useAvailableOrders() {
  return useQuery<DispatchOrder[]>({
    queryKey: ['dispatch', 'available'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/dispatch/orders')
      return json.data
    },
    refetchInterval: 30_000, // poll every 30s for new available orders
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
      toast.success('Delivery confirmed!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
```

- [ ] **Step 2: Create app/dispatch/register/page.tsx**

```tsx
// app/dispatch/register/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, ArrowRight } from 'lucide-react'

export default function DispatcherRegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/dispatcher/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Registration failed')
      router.push('/dispatch')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-9" />
        </div>

        <div className="bg-card rounded-2xl shadow-card px-8 py-10">
          <h1 className="text-xl font-bold mb-1" style={{ color: '#16130f' }}>Join as a dispatcher</h1>
          <p className="text-sm mb-6" style={{ color: '#78726c' }}>Create your account to start delivering.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { key: 'name', label: 'Full name', icon: User, type: 'text', placeholder: 'Your name' },
              { key: 'email', label: 'Email address', icon: Mail, type: 'email', placeholder: 'you@example.com' },
              { key: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: '8+ characters' },
            ].map(({ key, label, icon: Icon, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#78726c' }}>{label}</label>
                <div className="relative">
                  <Icon size={15} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8a09a' }} />
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    required
                    className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ borderColor: '#e8e4dc', background: '#faf9f7', color: '#16130f' }}
                  />
                </div>
              </div>
            ))}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: '#4f46e5' }}
            >
              {loading ? 'Creating account…' : 'Create account'}
              {!loading && <ArrowRight size={14} strokeWidth={2} />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: '#a8a09a' }}>
            Already have an account?{' '}
            <Link href="/auth/login" className="underline" style={{ color: '#4f46e5' }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create app/dispatch/page.tsx**

```tsx
// app/dispatch/page.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import { Package, MapPin, KeyRound } from 'lucide-react'
import {
  useAvailableOrders,
  useMyDeliveries,
  useClaimOrder,
  useVerifyDelivery,
  type DispatchOrder,
} from '@/lib/hooks/useDispatch'

function OrderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border p-4 flex gap-4" style={{ borderColor: '#e8e4dc' }}>
      <div className="w-16 h-16 rounded-xl shrink-0" style={{ background: '#f0ece5' }} />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3 w-2/3 rounded" style={{ background: '#f0ece5' }} />
        <div className="h-3 w-1/2 rounded" style={{ background: '#f0ece5' }} />
      </div>
    </div>
  )
}

function AvailableOrderCard({ order }: { order: DispatchOrder }) {
  const { mutate: claim, isPending } = useClaimOrder()
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border bg-card p-4 flex gap-4"
      style={{ borderColor: '#e8e4dc' }}
    >
      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: '#f0ece5' }}>
        {order.listing.images?.[0] ? (
          <CldImage src={order.listing.images[0]} fill sizes="64px" className="object-cover" alt={order.listing.title} />
        ) : (
          <Package size={18} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>{order.listing.title}</p>
        <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#78726c' }}>
          <MapPin size={10} strokeWidth={2} />
          <span className="truncate">{order.buyer_address}</span>
        </div>
        <p className="text-xs mt-1 font-medium" style={{ color: '#4f46e5' }}>₦{order.total_price.toLocaleString()}</p>
      </div>
      <button
        onClick={() => claim(order.id)}
        disabled={isPending}
        className="self-center shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: '#4f46e5' }}
      >
        {isPending ? '…' : 'Claim'}
      </button>
    </motion.div>
  )
}

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
      <div className="flex gap-4 mb-4">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: '#f0ece5' }}>
          {order.listing.images?.[0] ? (
            <CldImage src={order.listing.images[0]} fill sizes="64px" className="object-cover" alt={order.listing.title} />
          ) : (
            <Package size={18} strokeWidth={1.5} style={{ color: '#a8a09a' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#16130f' }}>{order.listing.title}</p>
          {order.buyer_name && <p className="text-xs mt-0.5" style={{ color: '#78726c' }}>{order.buyer_name}</p>}
          <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#78726c' }}>
            <MapPin size={10} strokeWidth={2} />
            <span className="truncate">{order.buyer_address}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#f5f1eb' }}>
        <p className="text-xs flex-1" style={{ color: '#78726c' }}>Ask the buyer for their 4-digit code and enter it below to confirm delivery.</p>
      </div>

      <div className="flex gap-2 mt-3">
        <div className="relative flex-1">
          <KeyRound size={12} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#a8a09a' }} />
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

export default function DispatchPortalPage() {
  const [tab, setTab] = useState<'available' | 'mine'>('available')
  const { data: available, isLoading: loadingAvailable } = useAvailableOrders()
  const { data: mine, isLoading: loadingMine } = useMyDeliveries()

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#16130f' }}>Dispatch portal</h1>
          <p className="text-sm mt-1" style={{ color: '#78726c' }}>Claim deliveries and confirm handoffs.</p>
        </motion.div>

        <div className="inline-flex gap-0.5 rounded-full p-0.5 mb-6" style={{ background: '#f0ece5' }}>
          {(['available', 'mine'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200"
              style={{
                background: tab === t ? '#4f46e5' : 'transparent',
                color: tab === t ? 'white' : '#78726c',
                boxShadow: tab === t ? '0 1px 4px rgba(79,70,229,0.35)' : 'none',
              }}
            >
              {t === 'available' ? 'Available' : 'My deliveries'}
            </button>
          ))}
        </div>

        {tab === 'available' && (
          <div className="flex flex-col gap-3">
            {loadingAvailable && [1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
            {!loadingAvailable && (!available || available.length === 0) && (
              <div className="py-20 text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: '#16130f' }}>No deliveries available</p>
                <p className="text-xs" style={{ color: '#a8a09a' }}>Check back soon — new orders appear when sellers confirm them.</p>
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
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Test in browser**

Visit `http://localhost:3000/dispatch/register`. Create a dispatcher account. Confirm redirect to `/dispatch`. Confirm both tabs render. If any confirmed delivery orders exist in the DB, confirm they appear in "Available".

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/useDispatch.ts app/dispatch/register/page.tsx app/dispatch/page.tsx
git commit -m "feat: add dispatcher portal with available orders, claim, and delivery verify"
```

---

## Task 15: Auto-release cron endpoint

**Files:**
- Create: `app/api/cron/auto-release/route.ts`

Runs on a schedule. Finds orders stuck in `confirmed` or `shipped` for 14+ days and forces payout.

- [ ] **Step 1: Add `CRON_SECRET` to `.env.local`**

```
CRON_SECRET=<generate with: openssl rand -hex 32>
```

- [ ] **Step 2: Create the endpoint**

```typescript
// app/api/cron/auto-release/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { executePayout } from '@/lib/payout'

const STALE_DAYS = 14

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: staleOrders, error } = await supabaseAdmin
    .from('orders')
    .select('id, status')
    .in('status', ['confirmed', 'shipped'])
    .lt('created_at', cutoff)

  if (error) {
    console.error('Auto-release fetch error:', error)
    return new Response('Internal error', { status: 500 })
  }

  if (!staleOrders || staleOrders.length === 0) {
    return Response.json({ released: 0 })
  }

  const results = await Promise.allSettled(
    staleOrders.map((order) => executePayout(order.id))
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.error(`Auto-release: ${failed} of ${staleOrders.length} payouts failed`)
  }

  return Response.json({ released: staleOrders.length - failed, failed })
}
```

- [ ] **Step 3: Configure Vercel Cron (if deploying on Vercel)**

Create `vercel.json` at the project root (or add to existing):

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-release",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs daily at 2am UTC. Vercel automatically sets the `Authorization: Bearer <CRON_SECRET>` header using the `CRON_SECRET` env var when configured in the Vercel dashboard.

- [ ] **Step 4: Verify manually**

```bash
curl -s http://localhost:3000/api/cron/auto-release \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" | jq
```

Expected: `{"released":0,"failed":0}` (no stale orders in dev).

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/auto-release/route.ts vercel.json
git commit -m "feat: add auto-release cron endpoint for stuck orders"
```

---

## Self-Review

**Spec coverage:**
- ✅ 4-digit delivery code per order → Task 3 (`computeDeliveryCode` via HMAC)
- ✅ Code generated at `paid` → stateless HMAC means it's always available once order exists
- ✅ Buyer sees code on `/orders/[id]` → Tasks 10 + 13
- ✅ Dispatcher enters code at delivery → Tasks 7 + 8 (`/api/dispatch/orders/[id]/verify`)
- ✅ Seller enters code at pickup → Tasks 8 + 12 (`/api/orders/[id]/verify`)
- ✅ `dispatcher` account type → Tasks 1 + 2 + 5
- ✅ Dispatcher signup → Task 5
- ✅ Dispatchers claim from pool → Tasks 7 + 14
- ✅ Claim is race-condition safe → Task 7 (optimistic lock with `.eq('status','confirmed').is('dispatcher_id',null)`)
- ✅ Stripe transfer on code verify → Task 4 (`executePayout`) called from both verify routes
- ✅ 10% platform fee deducted → Task 4 (`PLATFORM_FEE_PERCENT = 10`)
- ✅ Idempotent payout → Task 4 (`if (order.stripe_transfer_id) return`)
- ✅ Auto-release after 14 days → Task 15
- ✅ Seller dashboard updated → Task 12 (pickup code entry, awaiting dispatcher, Shipped tab)
- ✅ Proxy dispatcher gates → Task 6
- ✅ Seller PATCH narrowed to confirm-only → Task 9
- ✅ `shipped` status added to seller orders API → Task 11
- ✅ Dispatcher portal → Task 14

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `DispatchOrder` defined in `useDispatch.ts` (Task 14), used in `dispatch/page.tsx` (Task 14) ✅
- `SellerOrder.status` updated to include `'shipped'` in Task 11, used in dashboard Task 12 ✅
- `BuyerOrderDetail.delivery_code` added in Task 13, API returns it in Task 10 ✅
- `executePayout(orderId: string)` defined in Task 4, called in Tasks 8 and 15 ✅
- `computeDeliveryCode(orderId: string)` defined in Task 3, called in Tasks 8 and 10 ✅
- `useVerifyPickup` defined in Task 11, imported in Task 12 ✅
- `useVerifyDelivery` defined in Task 14, used in `dispatch/page.tsx` Task 14 ✅
