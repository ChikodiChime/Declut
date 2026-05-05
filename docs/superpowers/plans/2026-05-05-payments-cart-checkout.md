# Payments, Cart & Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe Connect seller onboarding, cart management, and single-charge multi-seller checkout to the Declutter marketplace.

**Architecture:** Sellers onboard via Stripe Express. Buyers check out with one PaymentIntent for the full cart total. After `payment_intent.succeeded`, the platform POSTs individual transfers to each seller (keeping 10%). All Stripe amounts are in kobo (NGN × 100). DB stores prices in naira.

**Tech Stack:** Next.js 16 App Router, Stripe SDK (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`), Supabase, existing `ok()`/`err()`/`list()` from `lib/api-response.ts`, `getAuthUser()` from `lib/auth.ts`, `verifyToken()` from `lib/jwt.ts` (pre-existing from Phase 1).

> Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for this version's APIs. For route params syntax, copy the pattern from `app/api/listings/[id]/route.ts`.

**Unit convention:** `lib/constants.ts` stores delivery fees in **naira** (e.g. `1500`). All Stripe API calls convert to kobo by multiplying by 100. Display values use naira directly. Do not store fees in kobo in constants — that would cause the `grandTotal * 100` conversion in `/api/orders` to overcharge 100×.

**API contract note:** `POST /api/orders` does not accept `cart_item_ids` — it fetches all cart items server-side for the authenticated user. This prevents client-side manipulation of which items to charge for.

**Idempotent onboarding flag:** Both the Stripe Connect return route (Task 8) and the `account.updated` webhook (Task 9) set `stripe_onboarding_complete = true`. This is intentional — the webhook is the reliable path; the return route is a fast-path for immediate UI feedback. Both are safe to run concurrently.

---

## File Map

```
lib/
  stripe.ts                                 — server Stripe singleton
  stripe-browser.ts                         — loadStripe() browser singleton
  constants.ts                              — delivery fees, platform fee percent

supabase/migrations/
  003_stripe_transfer_id.sql                — ADD COLUMN stripe_transfer_id to orders

app/api/
  cart/
    route.ts                                — GET (list), POST (add item)
    [id]/route.ts                           — DELETE (remove item)
  orders/
    route.ts                                — POST (create orders + PaymentIntent)
    [id]/
      route.ts                              — GET (order detail)
      cancel/route.ts                       — POST (refund + cancel)
    utils.ts                                — validateCartItems, groupBySeller, calculateDeliveryFee, calculateGrandTotal
  stripe/
    connect/route.ts                        — POST (create Express account + account_link)
    connect/return/route.ts                 — GET (Stripe redirect handler → billing page)
  webhooks/
    stripe/route.ts                         — POST (account.updated, payment_intent.succeeded)

proxy.ts                                    — add /api/cart, /api/orders, /api/stripe, /cart, /checkout to matcher

app/
  cart/page.tsx                             — cart items list + delivery type selector + checkout CTA
  checkout/page.tsx                         — Stripe Elements form + order summary
  checkout/success/page.tsx                 — confirmation + link to dashboard

app/dashboard/
  billing/page.tsx                          — Stripe Connect status card

components/checkout/
  DeliveryTypeSelector.tsx                  — Lagos (₦1,500) vs Outside Lagos (₦3,500) radio
  OrderSummary.tsx                          — items by seller, fees, grand total
  CheckoutForm.tsx                          — Stripe PaymentElement + submit button

__tests__/api/orders/
  utils.test.ts                             — validateCartItems, groupBySeller, calculateDeliveryFee, calculateGrandTotal
```

---

### Task 1: Install Stripe and configure environment variables

**Files:** `package.json`, `.env.local`

- [ ] **Step 1: Install Stripe packages**

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('stripe'); console.log('stripe ok')"
```

Expected: `stripe ok`

- [ ] **Step 3: Add Stripe env vars to `.env.local`**

Open `.env.local` and append:

```env
# Stripe — dashboard.stripe.com → Developers → API keys
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Stripe webhook — created in Task 9 (smoke test)
STRIPE_WEBHOOK_SECRET=whsec_placeholder_for_now
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add stripe dependencies"
```

---

### Task 2: Constants and DB migration

**Files:** `lib/constants.ts`, `supabase/migrations/003_stripe_transfer_id.sql`

- [ ] **Step 1: Create `lib/constants.ts`**

```ts
export const LAGOS_DELIVERY_FEE = 1500
export const OUTSIDE_LAGOS_DELIVERY_FEE = 3500
export const PLATFORM_FEE_PERCENT = 0.10
```

- [ ] **Step 2: Create `supabase/migrations/003_stripe_transfer_id.sql`**

```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text;
```

- [ ] **Step 3: Run migration in Supabase**

1. Go to your Supabase project → SQL Editor
2. Paste the contents of `003_stripe_transfer_id.sql` → Run
3. Verify: Table Editor → `orders` → confirm `stripe_transfer_id` column exists

- [ ] **Step 4: Commit**

```bash
git add lib/constants.ts supabase/migrations/003_stripe_transfer_id.sql
git commit -m "feat: add delivery fee constants and stripe_transfer_id migration"
```

---

### Task 3: Stripe server and browser clients

**Files:** `lib/stripe.ts`, `lib/stripe-browser.ts`

- [ ] **Step 1: Create `lib/stripe.ts`**

```ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})
```

- [ ] **Step 2: Create `lib/stripe-browser.ts`**

```ts
import { loadStripe } from '@stripe/stripe-js'

let stripePromise: ReturnType<typeof loadStripe> | null = null

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/stripe.ts lib/stripe-browser.ts
git commit -m "feat: add stripe server and browser clients"
```

---

### Task 4: Order calculation utilities (TDD)

**Files:** `__tests__/api/orders/utils.test.ts`, `app/api/orders/utils.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/orders/utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  validateCartItems,
  groupBySeller,
  calculateDeliveryFee,
  calculateGrandTotal,
} from '@/app/api/orders/utils'
import { LAGOS_DELIVERY_FEE, OUTSIDE_LAGOS_DELIVERY_FEE } from '@/lib/constants'

const makeListing = (overrides: Record<string, unknown> = {}) => ({
  id: 'listing-1',
  title: 'Test Item',
  price: 5000,
  listing_type: 'for_sale',
  status: 'available',
  seller_id: 'seller-1',
  area: 'Ajah, Lagos',
  ...overrides,
})

const makeCartItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'cart-1',
  listing_id: 'listing-1',
  listing: makeListing(),
  ...overrides,
})

describe('validateCartItems', () => {
  it('returns error when cart is empty', () => {
    expect(validateCartItems([])).toHaveProperty('error', 'Cart is empty')
  })

  it('returns error when a listing is sold', () => {
    const item = makeCartItem({ listing: makeListing({ status: 'sold' }) })
    expect(validateCartItems([item])).toHaveProperty('error')
  })

  it('returns error when a listing is not for_sale', () => {
    const item = makeCartItem({ listing: makeListing({ listing_type: 'free' }) })
    expect(validateCartItems([item])).toHaveProperty('error')
  })

  it('returns valid:true for a valid cart', () => {
    expect(validateCartItems([makeCartItem()])).toHaveProperty('valid', true)
  })
})

describe('calculateDeliveryFee', () => {
  it('returns Lagos fee for Lagos areas', () => {
    expect(calculateDeliveryFee('Lekki, Lagos')).toBe(LAGOS_DELIVERY_FEE)
    expect(calculateDeliveryFee('Ajah, Lagos')).toBe(LAGOS_DELIVERY_FEE)
  })

  it('returns outside Lagos fee for non-Lagos areas', () => {
    expect(calculateDeliveryFee('Kano, Kano')).toBe(OUTSIDE_LAGOS_DELIVERY_FEE)
    expect(calculateDeliveryFee('Port Harcourt, Rivers')).toBe(OUTSIDE_LAGOS_DELIVERY_FEE)
  })
})

describe('groupBySeller', () => {
  it('creates one group per seller', () => {
    const items = [
      makeCartItem({ id: 'c1', listing: makeListing({ seller_id: 'seller-1', price: 5000 }) }),
      makeCartItem({ id: 'c2', listing: makeListing({ id: 'listing-2', seller_id: 'seller-2', price: 3000, area: 'Kano, Kano' }) }),
    ]
    const groups = groupBySeller(items, 'delivery')
    expect(groups).toHaveLength(2)
  })

  it('sets delivery_fee from listing area', () => {
    const items = [
      makeCartItem({ id: 'c1', listing: makeListing({ seller_id: 'seller-1', area: 'Ajah, Lagos' }) }),
      makeCartItem({ id: 'c2', listing: makeListing({ id: 'l2', seller_id: 'seller-2', area: 'Kano, Kano' }) }),
    ]
    const groups = groupBySeller(items, 'delivery')
    expect(groups.find(g => g.seller_id === 'seller-1')?.delivery_fee).toBe(LAGOS_DELIVERY_FEE)
    expect(groups.find(g => g.seller_id === 'seller-2')?.delivery_fee).toBe(OUTSIDE_LAGOS_DELIVERY_FEE)
  })

  it('sets delivery_fee to 0 for pickup', () => {
    const groups = groupBySeller([makeCartItem()], 'pickup')
    expect(groups[0].delivery_fee).toBe(0)
  })

  it('calculates group total as subtotal + delivery_fee', () => {
    const groups = groupBySeller(
      [makeCartItem({ listing: makeListing({ price: 5000, area: 'Ajah, Lagos' }) })],
      'delivery'
    )
    expect(groups[0].total).toBe(5000 + LAGOS_DELIVERY_FEE)
  })
})

describe('calculateGrandTotal', () => {
  it('sums all group totals', () => {
    const groups = [
      { seller_id: 's1', items: [], subtotal: 5000, delivery_fee: 1500, total: 6500 },
      { seller_id: 's2', items: [], subtotal: 3000, delivery_fee: 3500, total: 6500 },
    ]
    expect(calculateGrandTotal(groups)).toBe(13000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/orders/utils.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/orders/utils'`

- [ ] **Step 3: Create `app/api/orders/utils.ts`**

```ts
import { LAGOS_DELIVERY_FEE, OUTSIDE_LAGOS_DELIVERY_FEE } from '@/lib/constants'

export type CartItemWithListing = {
  id: string
  listing_id: string
  listing: {
    id: string
    title: string
    price: number
    listing_type: string
    status: string
    seller_id: string
    area: string
    images: string[]
  }
}

export type SellerGroup = {
  seller_id: string
  items: CartItemWithListing[]
  subtotal: number
  delivery_fee: number
  total: number
}

export function validateCartItems(
  items: CartItemWithListing[]
): { error: string } | { valid: true } {
  if (items.length === 0) return { error: 'Cart is empty' }
  const unavailable = items.filter(
    (i) => i.listing.status !== 'available' || i.listing.listing_type !== 'for_sale'
  )
  if (unavailable.length > 0) {
    return { error: `Items no longer available: ${unavailable.map((i) => i.listing.title).join(', ')}` }
  }
  return { valid: true }
}

export function calculateDeliveryFee(area: string): number {
  return area.toLowerCase().includes('lagos') ? LAGOS_DELIVERY_FEE : OUTSIDE_LAGOS_DELIVERY_FEE
}

export function groupBySeller(
  items: CartItemWithListing[],
  deliveryType: 'delivery' | 'pickup'
): SellerGroup[] {
  const map = new Map<string, CartItemWithListing[]>()
  for (const item of items) {
    const sid = item.listing.seller_id
    if (!map.has(sid)) map.set(sid, [])
    map.get(sid)!.push(item)
  }
  return Array.from(map.entries()).map(([seller_id, sellerItems]) => {
    const subtotal = sellerItems.reduce((sum, i) => sum + i.listing.price, 0)
    const delivery_fee =
      deliveryType === 'pickup' ? 0 : calculateDeliveryFee(sellerItems[0].listing.area)
    return { seller_id, items: sellerItems, subtotal, delivery_fee, total: subtotal + delivery_fee }
  })
}

export function calculateGrandTotal(groups: SellerGroup[]): number {
  return groups.reduce((sum, g) => sum + g.total, 0)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/api/orders/utils.test.ts
```

Expected: PASS — 11 tests passing

- [ ] **Step 5: Commit**

```bash
git add app/api/orders/utils.ts __tests__/api/orders/utils.test.ts
git commit -m "feat: add order calculation utilities with tests"
```

---

### Task 5: Cart API routes + update proxy matcher

**Files:** `app/api/cart/route.ts`, `app/api/cart/[id]/route.ts`, `proxy.ts`

- [ ] **Step 1: Update `proxy.ts` matcher**

Open `proxy.ts` and replace the `config` export with:

```ts
export const config = {
  matcher: [
    '/api/listings/:path*',
    '/api/users/:path*',
    '/api/upload',
    '/api/cart/:path*',
    '/api/orders/:path*',
    '/api/stripe/:path*',
    '/listings/:path*',
    '/dashboard/:path*',
    '/cart/:path*',
    '/checkout/:path*',
  ],
}
```

- [ ] **Step 2: Create `app/api/cart/route.ts`**

```ts
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request) {
  const authUser = getAuthUser(req)
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data: items, error } = await supabaseAdmin
    .from('cart_items')
    .select(
      'id, listing_id, listing:listings(id, title, price, listing_type, status, seller_id, area, images, condition, category)'
    )
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false })

  if (error) return err('Failed to fetch cart', 'DB_ERROR', 500)
  return ok(items ?? [])
}

export async function POST(req: Request) {
  const authUser = getAuthUser(req)
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const body = await req.json()
  const { listing_id } = body

  if (!listing_id || typeof listing_id !== 'string') {
    return err('listing_id is required', 'VALIDATION_ERROR', 400)
  }

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, listing_type, status')
    .eq('id', listing_id)
    .single()

  if (!listing) return err('Listing not found', 'NOT_FOUND', 404)
  if (listing.listing_type !== 'for_sale')
    return err('Only for_sale listings can be added to cart', 'INVALID_TYPE', 400)
  if (listing.status !== 'available')
    return err('Listing is not available', 'UNAVAILABLE', 409)

  const { data: item, error } = await supabaseAdmin
    .from('cart_items')
    .insert({ user_id: authUser.id, listing_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return err('Item already in cart', 'DUPLICATE', 409)
    return err('Failed to add to cart', 'DB_ERROR', 500)
  }

  return ok(item, 201)
}
```

- [ ] **Step 3: Create `app/api/cart/[id]/route.ts`**

Check `app/api/listings/[id]/route.ts` for the exact params syntax used in this project, then create:

```ts
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getAuthUser(req)
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('id', id)
    .eq('user_id', authUser.id)

  if (error) return err('Failed to remove item from cart', 'DB_ERROR', 500)
  return ok({ ok: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add proxy.ts app/api/cart/
git commit -m "feat: add cart API routes (GET, POST, DELETE)"
```

---

### Task 6: POST /api/orders — create orders and PaymentIntent

**Files:** `app/api/orders/route.ts`

- [ ] **Step 1: Create `app/api/orders/route.ts`**

```ts
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { stripe } from '@/lib/stripe'
import {
  validateCartItems,
  groupBySeller,
  calculateGrandTotal,
  type CartItemWithListing,
} from './utils'

export async function POST(req: Request) {
  const authUser = getAuthUser(req)
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const body = await req.json()
  const { delivery_type } = body

  if (delivery_type !== 'delivery' && delivery_type !== 'pickup') {
    return err('delivery_type must be delivery or pickup', 'VALIDATION_ERROR', 400)
  }

  // Fetch cart items with listing data
  const { data: cartItems, error: cartError } = await supabaseAdmin
    .from('cart_items')
    .select(
      'id, listing_id, listing:listings(id, title, price, listing_type, status, seller_id, area)'
    )
    .eq('user_id', authUser.id)

  if (cartError) return err('Failed to fetch cart', 'DB_ERROR', 500)

  const items = (cartItems ?? []) as CartItemWithListing[]

  const validation = validateCartItems(items)
  if ('error' in validation) return err(validation.error, 'VALIDATION_ERROR', 409)

  const groups = groupBySeller(items, delivery_type)
  const grandTotal = calculateGrandTotal(groups)

  // Create one Order row per seller group
  const orderInserts = groups.map((group) => ({
    buyer_id: authUser.id,
    seller_id: group.seller_id,
    listing_id: group.items[0].listing_id, // primary listing per group
    status: 'pending' as const,
    delivery_type,
    item_price: group.subtotal,
    delivery_fee: group.delivery_fee,
    total_price: group.total,
  }))

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .insert(orderInserts)
    .select('id, seller_id, total_price')

  if (ordersError || !orders) {
    return err('Failed to create orders', 'DB_ERROR', 500)
  }

  // One PaymentIntent for the full cart total (in kobo)
  let paymentIntent
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(grandTotal * 100), // naira → kobo
      currency: 'ngn',
      metadata: {
        buyer_id: authUser.id,
        order_ids: orders.map((o) => o.id).join(','),
      },
    })
  } catch (stripeError) {
    // Roll back orders if PaymentIntent creation fails
    await supabaseAdmin
      .from('orders')
      .delete()
      .in('id', orders.map((o) => o.id))
    console.error('Stripe PaymentIntent error:', stripeError)
    return err('Payment setup failed, please try again', 'STRIPE_ERROR', 500)
  }

  // Save payment_intent_id to all orders
  await supabaseAdmin
    .from('orders')
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .in('id', orders.map((o) => o.id))

  return ok({
    client_secret: paymentIntent.client_secret,
    order_ids: orders.map((o) => o.id),
    total: grandTotal,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/orders/route.ts
git commit -m "feat: add POST /api/orders — create orders and PaymentIntent"
```

---

### Task 7: Order detail and cancel routes

**Files:** `app/api/orders/[id]/route.ts`, `app/api/orders/[id]/cancel/route.ts`

- [ ] **Step 1: Create `app/api/orders/[id]/route.ts`**

Check `app/api/listings/[id]/route.ts` for the params syntax, then create:

```ts
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getAuthUser(req)
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) return err('Order not found', 'NOT_FOUND', 404)

  if (order.buyer_id !== authUser.id && order.seller_id !== authUser.id) {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  return ok(order)
}
```

- [ ] **Step 2: Create `app/api/orders/[id]/cancel/route.ts`**

```ts
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getAuthUser(req)
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, buyer_id, stripe_payment_intent_id, status')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.buyer_id !== authUser.id) return err('Only the buyer can cancel', 'FORBIDDEN', 403)
  if (order.status === 'cancelled') return err('Order already cancelled', 'INVALID_STATE', 409)
  if (order.status === 'completed') return err('Completed orders cannot be cancelled', 'INVALID_STATE', 409)

  // Refund the full PaymentIntent (Stripe reverses seller transfers automatically)
  if (order.stripe_payment_intent_id) {
    try {
      await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
    } catch (stripeError) {
      console.error('Stripe refund error:', stripeError)
      return err('Refund failed, please contact support', 'STRIPE_ERROR', 500)
    }
  }

  // Cancel all orders sharing the same PaymentIntent
  await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('stripe_payment_intent_id', order.stripe_payment_intent_id)

  return ok({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/orders/[id]/
git commit -m "feat: add GET /api/orders/[id] and POST /api/orders/[id]/cancel"
```

---

### Task 8: Stripe Connect routes (seller onboarding)

**Files:** `app/api/stripe/connect/route.ts`, `app/api/stripe/connect/return/route.ts`

- [ ] **Step 1: Create `app/api/stripe/connect/route.ts`**

```ts
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const authUser = getAuthUser(req)
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id')
    .eq('id', authUser.id)
    .single()

  if (!user) return err('User not found', 'NOT_FOUND', 404)

  let accountId = user.stripe_account_id

  // Create a new Express account if the user doesn't have one yet
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: authUser.email,
      capabilities: { transfers: { requested: true } },
    })
    accountId = account.id

    await supabaseAdmin
      .from('users')
      .update({ stripe_account_id: accountId })
      .eq('id', authUser.id)
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/api/stripe/connect`,
    return_url: `${origin}/api/stripe/connect/return`,
    type: 'account_onboarding',
  })

  return ok({ url: accountLink.url })
}
```

- [ ] **Step 2: Create `app/api/stripe/connect/return/route.ts`**

```ts
import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { verifyToken } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id')
    .eq('id', payload.sub)
    .single()

  if (!user?.stripe_account_id) {
    return NextResponse.redirect(new URL('/dashboard/billing?status=error', req.url))
  }

  const account = await stripe.accounts.retrieve(user.stripe_account_id)

  if (account.charges_enabled) {
    await supabaseAdmin
      .from('users')
      .update({ stripe_onboarding_complete: true })
      .eq('id', payload.sub)

    return NextResponse.redirect(new URL('/dashboard/billing?status=connected', req.url))
  }

  return NextResponse.redirect(new URL('/dashboard/billing?status=pending', req.url))
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/stripe/
git commit -m "feat: add Stripe Connect onboarding routes"
```

---

### Task 9: Stripe webhook handler

**Files:** `app/api/webhooks/stripe/route.ts`

> This route must NOT be in the proxy matcher — Stripe calls it server-to-server without a cookie.

- [ ] **Step 1: Create `app/api/webhooks/stripe/route.ts`**

```ts
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'
import type Stripe from 'stripe'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'account.updated') {
    await handleAccountUpdated(event.data.object as Stripe.Account)
  }

  if (event.type === 'payment_intent.succeeded') {
    await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
  }

  return Response.json({ received: true })
}

async function handleAccountUpdated(account: Stripe.Account) {
  if (!account.charges_enabled) return

  await supabaseAdmin
    .from('users')
    .update({ stripe_onboarding_complete: true })
    .eq('stripe_account_id', account.id)
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const orderIds = (paymentIntent.metadata.order_ids ?? '').split(',').filter(Boolean)
  if (orderIds.length === 0) return

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, item_price, delivery_fee, total_price')
    .in('id', orderIds)

  if (!orders) return

  const autoCancelAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  for (const order of orders) {
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        stripe_payment_intent_id: paymentIntent.id,
        auto_cancel_at: autoCancelAt,
      })
      .eq('id', order.id)

    const { data: seller } = await supabaseAdmin
      .from('users')
      .select('stripe_account_id')
      .eq('id', order.seller_id)
      .single()

    if (!seller?.stripe_account_id) {
      // NOTE: seller has no Stripe account — transfer skipped, requires manual resolution
      console.error(`No stripe_account_id for seller ${order.seller_id} on order ${order.id}`)
      continue
    }

    const sellerTotal = order.total_price
    const transferAmount = Math.round(sellerTotal * (1 - PLATFORM_FEE_PERCENT) * 100) // kobo

    try {
      const transfer = await stripe.transfers.create({
        amount: transferAmount,
        currency: 'ngn',
        destination: seller.stripe_account_id,
        transfer_group: paymentIntent.id,
      })

      await supabaseAdmin
        .from('orders')
        .update({ stripe_transfer_id: transfer.id })
        .eq('id', order.id)
    } catch (transferError) {
      // NOTE: transfer failed — order is paid but seller payout pending manual resolution
      console.error(`Transfer failed for order ${order.id}:`, transferError)
    }
  }

  // Clear the buyer's cart after successful payment
  const buyerId = paymentIntent.metadata.buyer_id
  if (buyerId) {
    await supabaseAdmin.from('cart_items').delete().eq('user_id', buyerId)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat: add Stripe webhook handler (account.updated, payment_intent.succeeded)"
```

---

### Task 10: Stripe gate on listing creation

**Files:** `app/api/listings/route.ts`, `components/listings/ListingForm.tsx`

- [ ] **Step 1: Open `app/api/listings/route.ts` and find the POST handler**

After the `getAuthUser()` check, add a Stripe gate before the body validation:

```ts
// Add this block after the authUser check in the POST handler
const { data: seller } = await supabaseAdmin
  .from('users')
  .select('stripe_onboarding_complete')
  .eq('id', authUser.id)
  .single()

if (!seller?.stripe_onboarding_complete) {
  return err(
    'Connect your Stripe account before listing items',
    'STRIPE_NOT_CONNECTED',
    403
  )
}
```

- [ ] **Step 2: Open `components/listings/ListingForm.tsx` and add a banner**

Find where the form component fetches current user data (likely via `useQuery` or a `useEffect`). Add a banner that shows when `stripe_onboarding_complete` is false.

Add this import at the top:

```ts
import Link from 'next/link'
```

Add this state/fetch inside the component (after existing user fetch — adapt to match the existing pattern):

```tsx
// Inside the component, after user data is available:
{user && !user.stripe_onboarding_complete && (
  <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
    You need to{' '}
    <Link href="/dashboard/billing" className="font-medium underline">
      connect your Stripe account
    </Link>{' '}
    before you can list items.
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/listings/route.ts components/listings/ListingForm.tsx
git commit -m "feat: block listing creation until Stripe account is connected"
```

---

### Task 11: Dashboard billing page

**Files:** `app/dashboard/billing/page.tsx`

- [ ] **Step 1: Create `app/dashboard/billing/page.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type StripeStatus = 'connected' | 'pending' | 'not_connected'

export default function BillingPage() {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')

  const [user, setUser] = useState<{ stripe_onboarding_complete: boolean } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((res) => setUser(res.data))
  }, [])

  const stripeStatus: StripeStatus =
    statusParam === 'connected' || user?.stripe_onboarding_complete
      ? 'connected'
      : statusParam === 'pending'
      ? 'pending'
      : 'not_connected'

  async function handleConnect() {
    setConnecting(true)
    setError('')
    const res = await fetch('/api/stripe/connect', { method: 'POST' })
    const data = await res.json()
    setConnecting(false)
    if (!res.ok) {
      setError(data.error?.message ?? 'Failed to start Stripe onboarding')
      return
    }
    window.location.href = data.data.url
  }

  return (
    <div className="mx-auto max-w-2xl py-10 px-4">
      <h1 className="text-2xl font-bold mb-2">Payments</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Connect your Stripe account to list items for sale and receive payouts.
      </p>

      <div className="rounded-xl border p-6">
        {stripeStatus === 'connected' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="font-medium">Stripe account connected</span>
            </div>
            <p className="text-sm text-gray-500">
              You can list items for sale. Payouts are managed via your Stripe Express dashboard.
            </p>
          </>
        )}

        {stripeStatus === 'pending' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="font-medium">Onboarding incomplete</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              You started Stripe onboarding but didn&apos;t finish. Click below to complete it.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {connecting ? 'Loading...' : 'Complete Stripe onboarding'}
            </button>
          </>
        )}

        {stripeStatus === 'not_connected' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="font-medium">Not connected</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Connect a Stripe account to start selling. Stripe handles payouts securely.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {connecting ? 'Loading...' : 'Connect Stripe'}
            </button>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <p className="mt-6 text-xs text-gray-400">
        The platform takes a 10% fee on each sale. Stripe may charge additional processing fees.{' '}
        <Link href="https://stripe.com/pricing" className="underline" target="_blank" rel="noopener noreferrer">
          Stripe pricing
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/billing/page.tsx
git commit -m "feat: add dashboard billing page with Stripe Connect status"
```

---

### Task 12: Checkout UI components

**Files:** `components/checkout/DeliveryTypeSelector.tsx`, `components/checkout/OrderSummary.tsx`, `components/checkout/CheckoutForm.tsx`

- [ ] **Step 1: Create `components/checkout/DeliveryTypeSelector.tsx`**

```tsx
import { LAGOS_DELIVERY_FEE, OUTSIDE_LAGOS_DELIVERY_FEE } from '@/lib/constants'

type Props = {
  value: 'delivery' | 'pickup'
  onChange: (value: 'delivery' | 'pickup') => void
}

export default function DeliveryTypeSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">Delivery option</p>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="delivery_type"
            value="delivery"
            checked={value === 'delivery'}
            onChange={() => onChange('delivery')}
            className="accent-black"
          />
          <span className="text-sm">
            Delivery{' '}
            <span className="text-gray-500">
              (₦{LAGOS_DELIVERY_FEE.toLocaleString()} Lagos / ₦{OUTSIDE_LAGOS_DELIVERY_FEE.toLocaleString()} outside Lagos)
            </span>
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="delivery_type"
            value="pickup"
            checked={value === 'pickup'}
            onChange={() => onChange('pickup')}
            className="accent-black"
          />
          <span className="text-sm">Pickup <span className="text-gray-500">(free — coordinate with seller)</span></span>
        </label>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/checkout/OrderSummary.tsx`**

```tsx
import type { SellerGroup } from '@/app/api/orders/utils'

type Props = {
  groups: SellerGroup[]
  grandTotal: number
}

export default function OrderSummary({ groups, grandTotal }: Props) {
  return (
    <div className="rounded-xl border p-4 text-sm">
      <h2 className="font-semibold mb-4">Order summary</h2>
      {groups.map((group) => (
        <div key={group.seller_id} className="mb-4">
          {group.items.map((item) => (
            <div key={item.id} className="flex justify-between py-1">
              <span className="text-gray-700 truncate max-w-[200px]">{item.listing.title}</span>
              <span>₦{item.listing.price.toLocaleString()}</span>
            </div>
          ))}
          {group.delivery_fee > 0 && (
            <div className="flex justify-between py-1 text-gray-500">
              <span>Delivery</span>
              <span>₦{group.delivery_fee.toLocaleString()}</span>
            </div>
          )}
          <div className="border-t mt-1 pt-1 flex justify-between font-medium">
            <span>Subtotal</span>
            <span>₦{group.total.toLocaleString()}</span>
          </div>
        </div>
      ))}
      <div className="border-t pt-3 flex justify-between font-bold text-base">
        <span>Total</span>
        <span>₦{grandTotal.toLocaleString()}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/checkout/CheckoutForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

type Props = {
  onSuccess: () => void
}

export default function CheckoutForm({ onSuccess }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/success` },
    })

    setLoading(false)

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed, please try again')
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="rounded-lg bg-black py-3 text-white font-medium disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Pay now'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/checkout/
git commit -m "feat: add DeliveryTypeSelector, OrderSummary, CheckoutForm components"
```

---

### Task 13: Cart page

**Files:** `app/cart/page.tsx`

- [ ] **Step 1: Create `app/cart/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import DeliveryTypeSelector from '@/components/checkout/DeliveryTypeSelector'
import { groupBySeller, calculateGrandTotal } from '@/app/api/orders/utils'
import type { CartItemWithListing } from '@/app/api/orders/utils'

export default function CartPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartItemWithListing[]>([])
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery')
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState('')

  const fetchCart = useCallback(async () => {
    const res = await fetch('/api/cart')
    const data = await res.json()
    setItems(data.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCart() }, [fetchCart])

  async function removeItem(cartItemId: string) {
    await fetch(`/api/cart/${cartItemId}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== cartItemId))
  }

  async function handleCheckout() {
    setCheckingOut(true)
    setError('')

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_type: deliveryType }),
    })

    const data = await res.json()
    setCheckingOut(false)

    if (!res.ok) {
      setError(data.error?.message ?? 'Checkout failed, please try again')
      return
    }

    const { client_secret } = data.data
    router.push(`/checkout?client_secret=${encodeURIComponent(client_secret)}`)
  }

  const groups = groupBySeller(items, deliveryType)
  const grandTotal = calculateGrandTotal(groups)

  if (loading) {
    return <div className="py-20 text-center text-gray-400">Loading cart...</div>
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
        <a href="/listings" className="text-sm underline">Browse listings</a>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Your cart</h1>

      <div className="flex flex-col gap-3 mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 rounded-xl border p-4">
            {item.listing.images?.[0] && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${item.listing.images[0]}`}
                  alt={item.listing.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.listing.title}</p>
              <p className="text-sm text-gray-500">₦{item.listing.price.toLocaleString()}</p>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="text-sm text-gray-400 hover:text-red-500"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <DeliveryTypeSelector value={deliveryType} onChange={setDeliveryType} />
      </div>

      <div className="rounded-xl border p-4 mb-6 text-sm">
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span>₦{grandTotal.toLocaleString()}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Includes delivery fees where applicable</p>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <button
        onClick={handleCheckout}
        disabled={checkingOut}
        className="w-full rounded-lg bg-black py-3 text-white font-medium disabled:opacity-50"
      >
        {checkingOut ? 'Preparing checkout...' : 'Proceed to checkout'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/cart/page.tsx
git commit -m "feat: add cart page with delivery type selector and checkout CTA"
```

---

### Task 14: Checkout page

**Files:** `app/checkout/page.tsx`

- [ ] **Step 1: Create `app/checkout/page.tsx`**

```tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe-browser'
import CheckoutForm from '@/components/checkout/CheckoutForm'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const clientSecret = searchParams.get('client_secret')

  const [stripeReady, setStripeReady] = useState(false)

  useEffect(() => {
    getStripe().then(() => setStripeReady(true))
  }, [])

  if (!clientSecret) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 mb-4">No active checkout session.</p>
        <a href="/cart" className="text-sm underline">Back to cart</a>
      </div>
    )
  }

  if (!stripeReady) {
    return <div className="py-20 text-center text-gray-400">Loading payment form...</div>
  }

  return (
    <div className="mx-auto max-w-md py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Payment</h1>
      <Elements stripe={getStripe()} options={{ clientSecret }}>
        <CheckoutForm onSuccess={() => router.push('/checkout/success')} />
      </Elements>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/checkout/page.tsx
git commit -m "feat: add checkout page with Stripe Elements"
```

---

### Task 15: Success page and enable Add to Cart

**Files:** `app/checkout/success/page.tsx`, `components/listings/BrowseCard.tsx` (or wherever the Add to Cart button lives)

- [ ] **Step 1: Create `app/checkout/success/page.tsx`**

```tsx
import Link from 'next/link'

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-md py-20 px-4 text-center">
      <div className="text-4xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold mb-2">Payment successful!</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Your order has been placed. The seller will respond within 12 hours.
        You&apos;ll find your orders in your dashboard.
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg bg-black py-3 px-6 text-white font-medium text-sm"
        >
          View my orders
        </Link>
        <Link href="/listings" className="text-sm text-gray-500 underline">
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Enable Add to Cart in browse/listing detail**

Open `components/listings/BrowseCard.tsx` (and `app/listings/[id]/page.tsx` if it has a cart button). Find the disabled "Add to Cart" / "Coming Soon" button and replace it with an active handler:

```tsx
// Add this handler inside the component:
async function handleAddToCart() {
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listing_id: listing.id }),
  })
  if (res.status === 401) {
    window.location.href = '/auth/login'
    return
  }
  if (res.status === 409) {
    // already in cart — navigate to cart
    window.location.href = '/cart'
    return
  }
  if (res.ok) {
    window.location.href = '/cart'
  }
}

// Replace the disabled button with:
{listing.listing_type === 'for_sale' && listing.status === 'available' && (
  <button
    onClick={handleAddToCart}
    className="rounded-lg bg-black px-4 py-2 text-sm text-white"
  >
    Add to cart
  </button>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/checkout/success/page.tsx components/listings/BrowseCard.tsx app/listings/
git commit -m "feat: add checkout success page and enable Add to Cart button"
```

---

### Task 16: Smoke test

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (existing 41 + 11 new = 52 total)

- [ ] **Step 2: Set up Stripe webhook (local)**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret output and paste it as `STRIPE_WEBHOOK_SECRET` in `.env.local`. Restart the dev server.

- [ ] **Step 3: Start dev server**

```bash
npm run dev
```

- [ ] **Step 4: Test seller onboarding**

1. Sign in as a test seller account
2. Go to `http://localhost:3000/dashboard/billing`
3. Click "Connect Stripe"
4. Complete Stripe Express onboarding using test data (Stripe provides test SSN, bank account numbers in their docs)
5. Expected: redirected to `/dashboard/billing?status=connected` with green badge

- [ ] **Step 5: Test listing gate**

1. Create a second user account without Stripe connected
2. Try to create a listing
3. Expected: form shows "Connect your Stripe account" banner; API returns 403 if attempted directly

- [ ] **Step 6: Test Add to Cart**

1. Sign in as a buyer account (different from seller)
2. Browse to a for_sale listing
3. Click "Add to cart"
4. Expected: redirected to `/cart` with the item listed

- [ ] **Step 7: Test checkout**

1. In the cart, select delivery type → click "Proceed to checkout"
2. Enter Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
3. Click "Pay now"
4. Expected: redirected to `/checkout/success`

- [ ] **Step 8: Verify order in Supabase**

In Supabase → Table Editor → `orders`:
- `status` = `paid`
- `stripe_payment_intent_id` is set
- `stripe_transfer_id` is set
- `auto_cancel_at` = now + 12h

- [ ] **Step 9: Verify cart cleared**

Go back to `/cart` — expected: empty cart message.

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "feat: phase 4+5 complete — stripe connect, cart, and checkout"
```
