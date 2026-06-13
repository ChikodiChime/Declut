# Stripe → Paystack Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every Stripe touchpoint with Paystack, using the redirect-to-hosted-page flow for buyers and bank-account-based transfers for seller payouts after delivery.

**Architecture:** Paystack's `transaction/initialize` replaces PaymentIntents; buyers are redirected to Paystack's hosted checkout page and return with a `reference` in the URL; `lib/payout.ts` triggers a Paystack bank transfer when an order is marked delivered (instead of immediately at checkout). Seller bank details are stored as a Paystack Transfer Recipient and collected via a form in the billing dashboard.

**Tech Stack:** Paystack REST API (no SDK — plain `fetch`), Next.js App Router, Supabase, TypeScript

---

## File Map

| File | Action |
|---|---|
| `supabase/migrations/020_paystack_fields.sql` | Create — add paystack columns to users + orders |
| `supabase/migrations/021_drop_stripe_columns.sql` | Create — drop old stripe columns after migration |
| `lib/paystack.ts` | Create — typed Paystack API client |
| `lib/stripe.ts` | Delete |
| `lib/stripe-browser.ts` | Delete |
| `lib/payout.ts` | Modify — Stripe transfer → Paystack transfer |
| `lib/types/earnings.ts` | Modify — remove stripe fields from EarningsSummary |
| `types/index.ts` | Modify — update User and Order types |
| `app/api/paystack/recipient/route.ts` | Create — seller bank account submission |
| `app/api/paystack/banks/route.ts` | Create — list Nigerian banks |
| `app/api/paystack/resolve-account/route.ts` | Create — verify account number |
| `app/api/stripe/connect/route.ts` | Delete |
| `app/api/stripe/connect/return/route.ts` | Delete |
| `app/api/webhooks/stripe/route.ts` | Delete |
| `app/api/webhooks/paystack/route.ts` | Create — charge.success + transfer events |
| `app/api/orders/route.ts` | Modify — PaymentIntent → Paystack initialize |
| `app/api/orders/settle/route.ts` | Modify — PI verify → Paystack transaction verify |
| `app/api/orders/[id]/cancel/route.ts` | Modify — Stripe refund → Paystack refund |
| `app/api/admin/orders/[id]/cancel/route.ts` | Modify — same refund swap |
| `app/api/seller/earnings/route.ts` | Modify — remove Stripe balance/payout fetch |
| `app/api/listings/route.ts` | Modify — stripe_onboarding_complete → paystack_onboarding_complete |
| `app/api/listings/[id]/route.ts` | Modify — same field rename |
| `app/api/users/me/utils.ts` | Modify — remove stripe_account_id from omit list |
| `app/cart/page.tsx` | Modify — redirect to authorization_url instead of /checkout |
| `app/checkout/page.tsx` | Delete (or simplify to empty redirect shell) |
| `components/checkout/CheckoutForm.tsx` | Delete |
| `app/checkout/success/page.tsx` | Modify — read reference from URL ?reference= param |
| `app/dashboard/billing/page.tsx` | Modify — Stripe Connect UI → bank account form |
| `app/dashboard/listings/new/page.tsx` | Modify — rename StripeBanner → PayoutBanner, update API call |
| `app/dashboard/page.tsx` | Modify — stripe_onboarding_complete → paystack_onboarding_complete |
| `app/dashboard/profile/page.tsx` | Modify — same field rename |
| `app/dashboard/orders/page.tsx` | Modify — same field rename if referenced |

---

## Task 1: DB Migration — Add Paystack Columns

**Files:**
- Create: `supabase/migrations/020_paystack_fields.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/020_paystack_fields.sql

-- Add Paystack payout fields to users
alter table public.users
  add column if not exists paystack_recipient_code text,
  add column if not exists paystack_bank_code text,
  add column if not exists paystack_bank_name text,
  add column if not exists paystack_account_number text,
  add column if not exists paystack_account_name text,
  add column if not exists paystack_onboarding_complete boolean not null default false;

-- Add Paystack reference fields to orders
alter table public.orders
  add column if not exists paystack_reference text,
  add column if not exists paystack_transfer_id text;

-- Down:
-- alter table public.users
--   drop column if exists paystack_recipient_code,
--   drop column if exists paystack_bank_code,
--   drop column if exists paystack_bank_name,
--   drop column if exists paystack_account_number,
--   drop column if exists paystack_account_name,
--   drop column if exists paystack_onboarding_complete;
-- alter table public.orders
--   drop column if exists paystack_reference,
--   drop column if exists paystack_transfer_id;
```

- [ ] **Step 2: Apply the migration**

Run in Supabase SQL editor or via CLI:
```bash
# If using Supabase CLI:
npx supabase db push
# Or paste the SQL directly into the Supabase dashboard SQL editor
```

Expected: no errors, columns visible in Table Editor for `users` and `orders`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/020_paystack_fields.sql
git commit -m "feat: add paystack columns to users and orders"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/types/earnings.ts`

- [ ] **Step 1: Update User interface in `types/index.ts`**

Replace the Stripe fields in the `User` interface:

```typescript
export interface User {
  id: string
  email: string
  name: string | null
  password_hash: string
  account_type: AccountType
  paystack_recipient_code: string | null
  paystack_bank_code: string | null
  paystack_bank_name: string | null
  paystack_account_number: string | null
  paystack_account_name: string | null
  paystack_onboarding_complete: boolean
  avatar_url: string | null
  phone: string | null
  address: string | null
  address_state: string | null
  created_at: string
  email_verified: boolean
  otp_code: string | null
  otp_expires_at: string | null
  otp_resend_after: string | null
}
```

- [ ] **Step 2: Update Order interface in `types/index.ts`**

Replace `stripe_payment_intent_id` with `paystack_reference`:

```typescript
export interface Order {
  id: string
  listing_id: string
  buyer_id: string | null
  seller_id: string
  dispatcher_id: string | null
  status: OrderStatus
  delivery_type: DeliveryType
  item_price: number
  delivery_fee: number
  total_price: number
  platform_fee: number
  paystack_reference: string | null
  pickup_address: string | null
  auto_cancel_at: string | null
  created_at: string
}
```

- [ ] **Step 3: Update EarningsSummary in `lib/types/earnings.ts`**

Remove Stripe-specific balance fields:

```typescript
// lib/types/earnings.ts
export type TransferStatus = 'transferred' | 'processing' | 'pending'

export type EarningsOrder = {
  id: string
  listing_title: string
  listing_image: string | null
  created_at: string
  item_price: number
  fee: number
  net: number
  transfer_status: TransferStatus
}

export type EarningsSummary = {
  total_gross: number
  total_fee: number
  total_net: number
}

export type EarningsData = {
  summary: EarningsSummary
  orders: EarningsOrder[]
}
```

- [ ] **Step 4: Update `app/api/users/me/utils.ts`**

Remove `stripe_account_id` from the destructure (it no longer exists on User):

```typescript
import type { User } from '@/types'

export function formatUserResponse(user: User) {
  const { password_hash, otp_code, otp_expires_at, ...safeUser } = user
  return safeUser
}
```

- [ ] **Step 5: Commit**

```bash
git add types/index.ts lib/types/earnings.ts app/api/users/me/utils.ts
git commit -m "refactor: update types for Paystack migration"
```

---

## Task 3: Create Paystack API Client

**Files:**
- Create: `lib/paystack.ts`

- [ ] **Step 1: Write the Paystack client**

```typescript
// lib/paystack.ts
import { createHmac } from 'crypto'

const BASE = 'https://api.paystack.co'

async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.status) throw new Error(json.message ?? 'Paystack API error')
  return json.data as T
}

export type PaystackTransaction = {
  status: string
  reference: string
  amount: number
  metadata: {
    order_ids: string
    buyer_id: string
    buyer_email: string
  }
}

export type PaystackRecipient = {
  recipient_code: string
}

export type PaystackTransfer = {
  transfer_code: string
}

export type PaystackBank = {
  name: string
  code: string
}

export type PaystackResolvedAccount = {
  account_name: string
  account_number: string
}

export function initializeTransaction(params: {
  email: string
  amount: number
  reference: string
  metadata: object
  callback_url: string
}): Promise<{ authorization_url: string; reference: string }> {
  return request('POST', '/transaction/initialize', params)
}

export function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  return request('GET', `/transaction/verify/${encodeURIComponent(reference)}`)
}

export function createTransferRecipient(params: {
  type: 'nuban'
  name: string
  account_number: string
  bank_code: string
  currency: 'NGN'
}): Promise<PaystackRecipient> {
  return request('POST', '/transferrecipient', params)
}

export function initiateTransfer(params: {
  source: 'balance'
  amount: number
  recipient: string
  reason: string
}): Promise<PaystackTransfer> {
  return request('POST', '/transfer', params)
}

export function refundTransaction(params: {
  transaction: string
  amount: number
}): Promise<void> {
  return request('POST', '/refund', params)
}

export function listBanks(): Promise<PaystackBank[]> {
  return request('GET', '/bank?country=nigeria&per_page=100&use_cursor=false')
}

export function resolveAccount(
  accountNumber: string,
  bankCode: string
): Promise<PaystackResolvedAccount> {
  return request('GET', `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`)
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const hash = createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')
  return hash === signature
}
```

- [ ] **Step 2: Delete the old Stripe server lib**

Delete `lib/stripe.ts` and `lib/stripe-browser.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/paystack.ts
git rm lib/stripe.ts lib/stripe-browser.ts
git commit -m "feat: add Paystack API client, remove Stripe libs"
```

---

## Task 4: Paystack Bank Account API Routes

**Files:**
- Create: `app/api/paystack/banks/route.ts`
- Create: `app/api/paystack/resolve-account/route.ts`
- Create: `app/api/paystack/recipient/route.ts`

- [ ] **Step 1: Create `app/api/paystack/banks/route.ts`**

```typescript
import { ok, err } from '@/lib/api-response'
import { listBanks } from '@/lib/paystack'

export async function GET() {
  try {
    const banks = await listBanks()
    return ok(banks)
  } catch (error) {
    console.error('List banks error:', error)
    return err('Failed to fetch banks', 'PAYSTACK_ERROR', 500)
  }
}
```

- [ ] **Step 2: Create `app/api/paystack/resolve-account/route.ts`**

```typescript
import { ok, err } from '@/lib/api-response'
import { resolveAccount } from '@/lib/paystack'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const accountNumber = searchParams.get('account_number') ?? ''
  const bankCode = searchParams.get('bank_code') ?? ''

  if (!accountNumber || !bankCode) {
    return err('account_number and bank_code are required', 'VALIDATION_ERROR', 400)
  }

  try {
    const result = await resolveAccount(accountNumber, bankCode)
    return ok(result)
  } catch {
    return err('Could not verify account. Check the account number and bank.', 'PAYSTACK_ERROR', 400)
  }
}
```

- [ ] **Step 3: Create `app/api/paystack/recipient/route.ts`**

```typescript
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { createTransferRecipient } from '@/lib/paystack'

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const body = await req.json()
  const { bank_code, bank_name, account_number, account_name } = body

  if (!bank_code || !bank_name || !account_number || !account_name) {
    return err('All bank fields are required', 'VALIDATION_ERROR', 400)
  }

  try {
    const recipient = await createTransferRecipient({
      type: 'nuban',
      name: account_name,
      account_number,
      bank_code,
      currency: 'NGN',
    })

    await supabaseAdmin
      .from('users')
      .update({
        paystack_recipient_code: recipient.recipient_code,
        paystack_bank_code: bank_code,
        paystack_bank_name: bank_name,
        paystack_account_number: account_number,
        paystack_account_name: account_name,
        paystack_onboarding_complete: true,
      })
      .eq('id', authUser.id)

    await supabaseAdmin
      .from('listings')
      .update({ status: 'available' })
      .eq('seller_id', authUser.id)
      .eq('status', 'draft')

    return ok({ recipient_code: recipient.recipient_code })
  } catch (error) {
    console.error('Paystack recipient error:', error)
    return err(
      error instanceof Error ? error.message : 'Failed to save payout account',
      'PAYSTACK_ERROR',
      500
    )
  }
}
```

- [ ] **Step 4: Delete old Stripe connect routes**

Delete:
- `app/api/stripe/connect/route.ts`
- `app/api/stripe/connect/return/route.ts`

```bash
git rm app/api/stripe/connect/route.ts app/api/stripe/connect/return/route.ts
```

- [ ] **Step 5: Commit**

```bash
git add app/api/paystack/
git commit -m "feat: add Paystack bank account API routes (banks, resolve-account, recipient)"
```

---

## Task 5: Update Orders Route (Initialize Transaction)

**Files:**
- Modify: `app/api/orders/route.ts`

- [ ] **Step 1: Replace the PaymentIntent block at the bottom of the route**

In `app/api/orders/route.ts`, replace the entire Stripe import and PaymentIntent block. The file currently imports `{ stripe }` from `@/lib/stripe`. Change the import and the payment initialization code.

Replace:
```typescript
import { stripe } from '@/lib/stripe'
```
With:
```typescript
import { initializeTransaction } from '@/lib/paystack'
```

Replace the entire PaymentIntent block (lines ~114–145):
```typescript
  const reference = `declut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const origin = new URL(req.url).origin

  let paystackData: { authorization_url: string; reference: string }
  try {
    paystackData = await initializeTransaction({
      email: authUser?.email ?? buyer_info?.email ?? '',
      amount: Math.round(grandTotal * 100),
      reference,
      metadata: {
        order_ids: orders.map((o) => o.id).join(','),
        buyer_id: authUser?.id ?? 'anonymous',
        buyer_email: authUser?.email ?? buyer_info?.email ?? '',
      },
      callback_url: `${origin}/checkout/success`,
    })
  } catch (paystackError) {
    await supabaseAdmin
      .from('orders')
      .delete()
      .in('id', orders.map((o) => o.id))
    console.error('Paystack initialize error:', paystackError)
    return err('Payment setup failed, please try again', 'PAYSTACK_ERROR', 500)
  }

  await supabaseAdmin
    .from('orders')
    .update({ paystack_reference: paystackData.reference })
    .in('id', orders.map((o) => o.id))

  return ok({
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
    order_ids: orders.map((o) => o.id),
    total: grandTotal,
  })
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in `app/api/orders/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/orders/route.ts
git commit -m "feat: replace Stripe PaymentIntent with Paystack transaction initialize"
```

---

## Task 6: Update Settle Route (Verify Transaction)

**Files:**
- Modify: `app/api/orders/settle/route.ts`

- [ ] **Step 1: Rewrite `app/api/orders/settle/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { ok, err } from '@/lib/api-response'
import { verifyTransaction } from '@/lib/paystack'

export async function POST(req: Request) {
  const body = await req.json()
  const { reference } = body

  if (!reference || typeof reference !== 'string') {
    return err('reference is required', 'VALIDATION_ERROR', 400)
  }

  let transaction
  try {
    transaction = await verifyTransaction(reference)
  } catch {
    return err('Failed to verify payment', 'PAYSTACK_ERROR', 500)
  }

  if (transaction.status !== 'success') {
    return err('Payment not confirmed', 'PAYMENT_INCOMPLETE', 402)
  }

  const orderIdsRaw = transaction.metadata?.order_ids
  if (!orderIdsRaw) {
    return err('No orders associated with this payment', 'NOT_FOUND', 404)
  }

  const orderIds = orderIdsRaw.split(',').map((id) => id.trim()).filter(Boolean)

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, status, delivery_type, item_price, delivery_fee, total_price')
    .in('id', orderIds)

  if (!orders || orders.length === 0) {
    return err('Orders not found', 'NOT_FOUND', 404)
  }

  const alreadySettled = orders.every((o) => o.status !== 'pending')

  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select('order_id, listing_id, item_price, listing:listings(id, title, price, listing_type, status, seller_id, area, images, condition, category)')
    .in('order_id', orderIds)

  const listingIds = (orderItems ?? []).map((i) => i.listing_id)

  if (!alreadySettled) {
    await Promise.all([
      supabaseAdmin.from('orders').update({ status: 'paid' }).in('id', orderIds).eq('status', 'pending'),
      listingIds.length > 0
        ? supabaseAdmin.from('listings').update({ status: 'sold' }).in('id', listingIds)
        : Promise.resolve(),
      listingIds.length > 0
        ? supabaseAdmin.from('cart_items').delete().in('listing_id', listingIds)
        : Promise.resolve(),
    ])
  }

  const buyerEmail = transaction.metadata?.buyer_email
  const buyerId = transaction.metadata?.buyer_id

  if (buyerEmail) {
    let buyerName = 'Customer'
    if (buyerId && buyerId !== 'anonymous') {
      const { data: buyer } = await supabaseAdmin
        .from('users')
        .select('name')
        .eq('id', buyerId)
        .single()
      if (buyer?.name) buyerName = buyer.name
    }

    const deliveryType = (orders[0].delivery_type ?? 'delivery') as 'delivery' | 'pickup'
    const grandTotal = orders.reduce((sum, o) => sum + (o.total_price ?? 0), 0)
    const groups = orders.map((o) => {
      const items = (orderItems ?? [])
        .filter((i) => i.order_id === o.id)
        .map((i) => ({ id: i.listing_id, listing_id: i.listing_id, listing: i.listing as never }))
      return {
        seller_id: o.seller_id,
        items,
        subtotal: o.item_price ?? 0,
        delivery_fee: o.delivery_fee ?? 0,
        total: o.total_price ?? 0,
      }
    })

    sendOrderConfirmationEmail({ to: buyerEmail, buyerName, orderIds, groups, grandTotal, deliveryType })
      .catch((e) => console.error('Confirmation email failed:', e))
  }

  return ok({ settled: !alreadySettled })
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/orders/settle/route.ts
git commit -m "feat: replace Stripe PI verify with Paystack transaction verify in settle route"
```

---

## Task 7: Update Cancel Routes (Paystack Refund)

**Files:**
- Modify: `app/api/orders/[id]/cancel/route.ts`
- Modify: `app/api/admin/orders/[id]/cancel/route.ts`

- [ ] **Step 1: Update buyer cancel route**

In `app/api/orders/[id]/cancel/route.ts`, replace the Stripe import and refund block:

Replace:
```typescript
import { stripe } from '@/lib/stripe'
```
With:
```typescript
import { refundTransaction } from '@/lib/paystack'
```

Replace the select to use `paystack_reference`:
```typescript
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, buyer_id, listing_id, paystack_reference, status')
    .eq('id', id)
    .single()
```

Replace the refund block:
```typescript
  if (order.paystack_reference) {
    try {
      await refundTransaction({
        transaction: order.paystack_reference,
        amount: Math.round((order as { total_price?: number }).total_price ?? 0 * 100),
      })
    } catch (paystackError) {
      console.error('Paystack refund error:', paystackError)
      return err('Refund failed, please contact support', 'PAYSTACK_ERROR', 500)
    }
  }
```

Update the cancel update to use `paystack_reference`:
```typescript
  await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('paystack_reference', order.paystack_reference)
```

The full updated file:
```typescript
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { refundTransaction } from '@/lib/paystack'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, buyer_id, listing_id, paystack_reference, total_price, status')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.buyer_id !== authUser.id) return err('Only the buyer can cancel', 'FORBIDDEN', 403)
  if (order.status === 'cancelled') return err('Order already cancelled', 'INVALID_STATE', 409)
  if (order.status === 'completed') return err('Completed orders cannot be cancelled', 'INVALID_STATE', 409)
  if (order.status === 'shipped') return err('Orders in transit cannot be cancelled', 'INVALID_STATE', 409)
  if (order.status === 'delivered') return err('Delivered orders cannot be cancelled', 'INVALID_STATE', 409)

  if (order.paystack_reference) {
    try {
      await refundTransaction({
        transaction: order.paystack_reference,
        amount: Math.round((order.total_price ?? 0) * 100),
      })
    } catch (paystackError) {
      console.error('Paystack refund error:', paystackError)
      return err('Refund failed, please contact support', 'PAYSTACK_ERROR', 500)
    }
  }

  await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', id)

  await supabaseAdmin
    .from('listings')
    .update({ status: 'available' })
    .eq('id', order.listing_id)

  return ok({ ok: true })
}
```

- [ ] **Step 2: Update admin cancel route**

Full updated `app/api/admin/orders/[id]/cancel/route.ts`:

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { refundTransaction } from '@/lib/paystack'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, listing_id, paystack_reference, total_price, status')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (!['pending', 'paid'].includes(order.status)) {
    return err('Only pending or paid orders can be force-cancelled', 'INVALID_STATE', 409)
  }

  if (order.paystack_reference) {
    try {
      await refundTransaction({
        transaction: order.paystack_reference,
        amount: Math.round((order.total_price ?? 0) * 100),
      })
    } catch (paystackError) {
      console.error('Admin force-cancel refund error:', paystackError)
      return err('Refund failed', 'PAYSTACK_ERROR', 500)
    }
  }

  const { error: orderErr } = await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', id)
  const { error: listingErr } = await supabaseAdmin.from('listings').update({ status: 'available' }).eq('id', order.listing_id)

  if (orderErr || listingErr) {
    console.error('Force-cancel state update error:', orderErr ?? listingErr)
    return err('State update failed after refund — please check order manually', 'SERVER_ERROR', 500)
  }

  return ok({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/orders/[id]/cancel/route.ts app/api/admin/orders/[id]/cancel/route.ts
git commit -m "feat: replace Stripe refunds with Paystack refunds in cancel routes"
```

---

## Task 8: Update Payout Utility (Transfer After Delivery)

**Files:**
- Modify: `lib/payout.ts`

- [ ] **Step 1: Rewrite `lib/payout.ts`**

```typescript
// lib/payout.ts
import { initiateTransfer } from '@/lib/paystack'
import { supabaseAdmin } from '@/lib/supabase'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'

export async function executePayout(orderId: string): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, item_price, paystack_transfer_id')
    .eq('id', orderId)
    .single()

  if (!order) {
    console.error(`executePayout: order ${orderId} not found`)
    return
  }

  if (order.paystack_transfer_id) return // already paid out (idempotent check)

  // Atomically claim the payout slot — prevents concurrent double-payout
  const { data: locked } = await supabaseAdmin
    .from('orders')
    .update({ paystack_transfer_id: 'pending' })
    .eq('id', orderId)
    .is('paystack_transfer_id', null)
    .select('id')
    .single()

  if (!locked) return // another caller claimed it first

  await supabaseAdmin
    .from('orders')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', orderId)

  const { data: seller } = await supabaseAdmin
    .from('users')
    .select('paystack_recipient_code, paystack_onboarding_complete')
    .eq('id', order.seller_id)
    .single()

  if (!seller?.paystack_recipient_code || !seller.paystack_onboarding_complete) {
    console.error(`executePayout: seller ${order.seller_id} has not completed Paystack onboarding — manual payout required`)
    return
  }

  const sellerAmountKobo = Math.round(
    order.item_price * (1 - PLATFORM_FEE_PERCENT / 100) * 100
  )

  try {
    const transfer = await initiateTransfer({
      source: 'balance',
      amount: sellerAmountKobo,
      recipient: seller.paystack_recipient_code,
      reason: `Payout for order #${orderId.slice(0, 8)}`,
    })

    await supabaseAdmin
      .from('orders')
      .update({ paystack_transfer_id: transfer.transfer_code })
      .eq('id', orderId)
  } catch (error) {
    console.error(`executePayout: Paystack transfer failed for order ${orderId}:`, error)
    await supabaseAdmin
      .from('orders')
      .update({ paystack_transfer_id: null })
      .eq('id', orderId)
      .eq('paystack_transfer_id', 'pending')
  }
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/payout.ts
git commit -m "feat: replace Stripe transfer with Paystack transfer in executePayout"
```

---

## Task 9: Create Paystack Webhook Handler

**Files:**
- Create: `app/api/webhooks/paystack/route.ts`
- Delete: `app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Create `app/api/webhooks/paystack/route.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { verifyWebhookSignature } from '@/lib/paystack'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'
import { createNotification } from '@/lib/notifications'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody) as { event: string; data: Record<string, unknown> }

  if (event.event === 'charge.success') {
    await handleChargeSuccess(event.data)
  }

  if (event.event === 'transfer.success') {
    await handleTransferSuccess(event.data)
  }

  if (event.event === 'transfer.failed') {
    await handleTransferFailed(event.data)
  }

  return Response.json({ received: true })
}

async function handleChargeSuccess(data: Record<string, unknown>) {
  const reference = data.reference as string
  const metadata = (data.metadata ?? {}) as { order_ids?: string; buyer_id?: string; buyer_email?: string }
  const amount = data.amount as number

  const orderIdsRaw = metadata.order_ids
  if (!orderIdsRaw) return

  const orderIds = orderIdsRaw.split(',').filter(Boolean)

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, item_price, delivery_fee, total_price, platform_fee, delivery_type, status')
    .in('id', orderIds)

  if (!orders || orders.length === 0) return

  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select('order_id, listing_id, item_price, listing:listings(id, title, price, listing_type, status, seller_id, area, images, condition, category)')
    .in('order_id', orderIds)

  const listingIds = (orderItems ?? []).map((i) => i.listing_id)
  const autoCancelAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  await Promise.all([
    supabaseAdmin
      .from('orders')
      .update({ status: 'paid', paystack_reference: reference, auto_cancel_at: autoCancelAt })
      .in('id', orderIds)
      .eq('status', 'pending'),
    listingIds.length > 0
      ? supabaseAdmin.from('listings').update({ status: 'sold' }).in('id', listingIds)
      : Promise.resolve(),
    listingIds.length > 0
      ? supabaseAdmin.from('cart_items').delete().in('listing_id', listingIds)
      : Promise.resolve(),
  ])

  const buyerIdForNotif = metadata.buyer_id
  if (buyerIdForNotif && buyerIdForNotif !== 'anonymous') {
    await createNotification({
      user_id: buyerIdForNotif,
      type: 'order_update',
      title: 'Payment confirmed',
      body: `Your payment was received. ${orders.length > 1 ? `${orders.length} orders are` : 'Your order is'} now being prepared.`,
      link: `/dashboard/orders`,
    })
  }

  for (const order of orders) {
    await createNotification({
      user_id: order.seller_id,
      type: 'order_update',
      title: 'New order received',
      body: `You have a new paid order. Accept within 12 hours to avoid auto-cancellation.`,
      link: `/dashboard/orders`,
    })
  }

  const buyerEmail = metadata.buyer_email
  const buyerId = metadata.buyer_id

  if (buyerEmail) {
    let buyerName = 'Customer'
    if (buyerId && buyerId !== 'anonymous') {
      const { data: buyer } = await supabaseAdmin
        .from('users')
        .select('name')
        .eq('id', buyerId)
        .single()
      if (buyer?.name) buyerName = buyer.name
    }

    const deliveryType = (orders[0].delivery_type ?? 'delivery') as 'delivery' | 'pickup'
    const grandTotal = Math.round(amount / 100)
    const groups = orders.map((o) => {
      const items = (orderItems ?? [])
        .filter((i) => i.order_id === o.id)
        .map((i) => ({ id: i.listing_id, listing_id: i.listing_id, listing: i.listing as never }))
      return {
        seller_id: o.seller_id,
        items,
        subtotal: o.item_price ?? 0,
        delivery_fee: o.delivery_fee ?? 0,
        total: o.total_price ?? 0,
      }
    })

    sendOrderConfirmationEmail({ to: buyerEmail, buyerName, orderIds, groups, grandTotal, deliveryType })
      .catch((e) => console.error('Confirmation email failed:', e))

    if (buyerId && buyerId !== 'anonymous') {
      await supabaseAdmin.from('cart_items').delete().eq('user_id', buyerId)
    }
  }
}

async function handleTransferSuccess(data: Record<string, unknown>) {
  const transferCode = data.transfer_code as string
  const reason = data.reason as string | undefined

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id')
    .eq('paystack_transfer_id', transferCode)
    .single()

  if (!order) return

  const orderId = reason?.match(/#([a-f0-9-]{8})/)?.[1] ?? order.id.slice(0, 8)

  await createNotification({
    user_id: order.seller_id,
    type: 'payout_update',
    title: 'Payout sent',
    body: `Your payout for order #${orderId} has been transferred to your bank account.`,
    link: `/dashboard/billing`,
  })
}

async function handleTransferFailed(data: Record<string, unknown>) {
  const transferCode = data.transfer_code as string
  console.error(`Paystack transfer failed: ${transferCode}`, data)

  await supabaseAdmin
    .from('orders')
    .update({ paystack_transfer_id: null })
    .eq('paystack_transfer_id', transferCode)
}
```

- [ ] **Step 2: Delete the Stripe webhook handler**

```bash
git rm app/api/webhooks/stripe/route.ts
```

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/paystack/route.ts
git commit -m "feat: add Paystack webhook handler, remove Stripe webhook handler"
```

---

## Task 10: Update Seller Earnings Route

**Files:**
- Modify: `app/api/seller/earnings/route.ts`

- [ ] **Step 1: Remove Stripe balance/payout fetch, use paystack_transfer_id**

```typescript
// app/api/seller/earnings/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'
import type { TransferStatus, EarningsOrder, EarningsSummary } from '@/lib/types/earnings'

function deriveTransferStatus(paystack_transfer_id: string | null): TransferStatus {
  if (!paystack_transfer_id) return 'pending'
  if (paystack_transfer_id === 'pending') return 'processing'
  return 'transferred'
}

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)
  if (authUser.account_type === 'dispatcher') return err('Forbidden', 'FORBIDDEN', 403)

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select(
      'id, item_price, paystack_transfer_id, created_at, order_items(listing:listings(title, images))'
    )
    .eq('seller_id', authUser.id)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error('Fetch seller earnings error:', ordersError)
    return err('Failed to fetch earnings', 'SERVER_ERROR', 500)
  }

  const earningsOrders: EarningsOrder[] = (orders ?? []).map((o) => {
    type OrderItemRow = { listing: { title: string; images: string[] } | null }
    const firstItem = (o.order_items as unknown as OrderItemRow[] | null)?.[0]
    const fee = Math.round(o.item_price * PLATFORM_FEE_PERCENT)
    const net = o.item_price - fee
    return {
      id: o.id,
      listing_title: firstItem?.listing?.title ?? 'Deleted listing',
      listing_image: firstItem?.listing?.images?.[0] ?? null,
      created_at: o.created_at,
      item_price: o.item_price,
      fee,
      net,
      transfer_status: deriveTransferStatus(o.paystack_transfer_id as string | null),
    }
  })

  const summary: EarningsSummary = {
    total_gross: earningsOrders.reduce((s, o) => s + o.item_price, 0),
    total_fee: earningsOrders.reduce((s, o) => s + o.fee, 0),
    total_net: earningsOrders.reduce((s, o) => s + o.net, 0),
  }

  return ok({ summary, orders: earningsOrders })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/seller/earnings/route.ts
git commit -m "refactor: remove Stripe balance from earnings route, use paystack_transfer_id"
```

---

## Task 11: Update Listing Publish Gate

**Files:**
- Modify: `app/api/listings/route.ts`
- Modify: `app/api/listings/[id]/route.ts`

- [ ] **Step 1: Update `app/api/listings/route.ts`**

Find and replace both occurrences of `stripe_onboarding_complete` with `paystack_onboarding_complete`:

```typescript
// In the seller lookup:
    .select('paystack_onboarding_complete')
// In the gate check:
  const paystackConnected = seller?.paystack_onboarding_complete ?? false
```

Also update the variable name from `stripeConnected` to `paystackConnected` and update its usage.

- [ ] **Step 2: Update `app/api/listings/[id]/route.ts`**

Find and replace `stripe_onboarding_complete` with `paystack_onboarding_complete`:

```typescript
      .select('paystack_onboarding_complete')
    if (!seller?.paystack_onboarding_complete) {
```

- [ ] **Step 3: Commit**

```bash
git add app/api/listings/route.ts app/api/listings/[id]/route.ts
git commit -m "refactor: use paystack_onboarding_complete for listing publish gate"
```

---

## Task 12: Update Cart Page (Redirect to Paystack)

**Files:**
- Modify: `app/cart/page.tsx`

- [ ] **Step 1: Update `submitOrder` in `app/cart/page.tsx`**

The `submitOrder` function currently stores `client_secret` in sessionStorage and routes to `/checkout`. Replace with storing `reference` and redirecting to Paystack:

Find the `submitOrder` function and replace:
```typescript
async function submitOrder(address: string | null, state: string | null = null) {
    setCheckingOut(true);
    setError("");
    const body: Record<string, unknown> = { delivery_type: deliveryType };
    if (address) body.delivery_address = address.trim();
    if (deliveryType === "delivery") body.delivery_state = state ?? null;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setCheckingOut(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Checkout failed, please try again");
      return;
    }
    sessionStorage.setItem("checkout_reference", data.data.reference);
    window.location.href = data.data.authorization_url;
  }
```

- [ ] **Step 2: Update `handleAnonymousCheckout` in `app/cart/page.tsx`**

Find and replace the sessionStorage + router.push block at the end of `handleAnonymousCheckout`:
```typescript
    sessionStorage.setItem("checkout_reference", data.data.reference);
    window.location.href = data.data.authorization_url;
```

- [ ] **Step 3: Commit**

```bash
git add app/cart/page.tsx
git commit -m "feat: redirect to Paystack authorization_url instead of Stripe Elements checkout"
```

---

## Task 13: Update Success Page (Read Reference from URL)

**Files:**
- Modify: `app/checkout/success/page.tsx`
- Delete: `app/checkout/page.tsx`
- Delete: `components/checkout/CheckoutForm.tsx`

- [ ] **Step 1: Rewrite `app/checkout/success/page.tsx`**

Paystack returns `?reference=xxx&trxref=xxx` in the redirect URL. The success page should read it from there:

```typescript
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { clearSessionCart } from "@/lib/session-cart";
import { useMe } from "@/lib/hooks/useAuth";
import { Suspense } from "react";

const ORDERS_URL = "/dashboard/orders?tab=purchases";
const LOGIN_THEN_ORDERS_URL =
  "/auth/login?next=/dashboard/orders%3Ftab%3Dpurchases";

function SuccessContent() {
  const { data: me, isLoading } = useMe();
  const searchParams = useSearchParams();

  useEffect(() => {
    clearSessionCart();

    const reference =
      searchParams.get("reference") ??
      searchParams.get("trxref") ??
      sessionStorage.getItem("checkout_reference");

    if (reference) {
      sessionStorage.removeItem("checkout_reference");
    }

    Promise.allSettled([
      reference
        ? fetch("/api/orders/settle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference }),
          })
        : Promise.resolve(),
      fetch("/api/cart", { method: "DELETE" }),
    ]).finally(() => {
      window.dispatchEvent(new Event("cart-updated"));
    });
  }, [searchParams]);

  const trackHref = isLoading || me ? ORDERS_URL : LOGIN_THEN_ORDERS_URL;

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
        <Link
          href={trackHref}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity"
          style={{ background: "#4f46e5" }}
        >
          Track your order
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-card transition-colors"
        >
          Continue browsing
        </Link>
      </div>
    </div>
  );
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
  );
}
```

- [ ] **Step 2: Delete unused checkout files**

```bash
git rm app/checkout/page.tsx components/checkout/CheckoutForm.tsx
```

- [ ] **Step 3: Commit**

```bash
git add app/checkout/success/page.tsx
git commit -m "feat: update success page to read Paystack reference from URL, remove Stripe checkout page"
```

---

## Task 14: Update Billing Page (Bank Account Form)

**Files:**
- Modify: `app/dashboard/billing/page.tsx`

- [ ] **Step 1: Rewrite `app/dashboard/billing/page.tsx`**

Replace the entire Stripe Connect UI with a bank account form. The page has two states: not connected (show form) and connected (show earnings + bank account summary with edit option).

```typescript
'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CldImage } from 'next-cloudinary'
import {
  Package,
  TrendingUp,
  Wallet,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import {
  useSellerEarnings,
  type EarningsOrder,
  type EarningsSummary,
} from '@/lib/hooks/useSellerEarnings'
import { StatCard } from '@/components/dashboard/StatCard'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNairaWhole(naira: number) {
  return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Transfer badge ───────────────────────────────────────────────────────────

const BADGE_CONFIG = {
  transferred: {
    label: 'Paid out',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  processing: {
    label: 'Processing',
    className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-400',
  },
  pending: {
    label: 'Pending',
    className: 'bg-gray-100 text-text-muted ring-1 ring-border',
    dot: 'bg-gray-300',
  },
} as const

function TransferBadge({ status }: { status: EarningsOrder['transfer_status'] }) {
  const cfg = BADGE_CONFIG[status] ?? BADGE_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function OrderRow({ order, index }: { order: EarningsOrder; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.04 * index }}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-border-strong transition-colors duration-150"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-surface border border-border flex items-center justify-center">
        {order.listing_image ? (
          <CldImage
            src={order.listing_image}
            fill
            sizes="44px"
            className="object-cover"
            alt={order.listing_title}
          />
        ) : (
          <Package size={14} strokeWidth={1.5} className="text-text-subtle" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate leading-tight">{order.listing_title}</p>
        <p className="text-[11px] text-text-subtle mt-0.5">{formatDate(order.created_at)}</p>
        <p className="sm:hidden text-xs font-bold text-text mt-1">{formatNairaWhole(order.net)}</p>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0 text-right">
        <p className="text-[11px] text-text-subtle">
          {formatNairaWhole(order.item_price)}
          <span className="mx-1.5 text-border-strong">−</span>
          <span className="text-error/80">{formatNairaWhole(order.fee)} fee</span>
        </p>
        <p className="text-sm font-bold text-text">{formatNairaWhole(order.net)}</p>
      </div>

      <div className="shrink-0">
        <TransferBadge status={order.transfer_status} />
      </div>
    </motion.div>
  )
}

function RowSkeleton({ index }: { index: number }) {
  return (
    <div className="relative overflow-hidden flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="skeleton-shimmer" style={{ animationDelay: `${index * 0.1}s` }} />
      <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: '#ede9e3' }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3 w-2/5 rounded" style={{ background: '#ede9e3' }} />
        <div className="h-2.5 w-1/4 rounded" style={{ background: '#e8e4dc' }} />
      </div>
      <div className="hidden sm:block h-3 w-24 rounded" style={{ background: '#ede9e3' }} />
      <div className="h-5 w-16 rounded-full" style={{ background: '#ede9e3' }} />
    </div>
  )
}

function StatCardSkeleton({ index }: { index: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="skeleton-shimmer" style={{ animationDelay: `${index * 0.1}s` }} />
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: '#ede9e3' }} />
      <div className="w-12 h-12 rounded-xl mb-4" style={{ background: '#ede9e3' }} />
      <div className="h-8 w-20 rounded mb-2" style={{ background: '#ede9e3' }} />
      <div className="h-3.5 w-28 rounded" style={{ background: '#e8e4dc' }} />
    </div>
  )
}

// ─── Earnings section ─────────────────────────────────────────────────────────

function EarningsSection() {
  const { data, isLoading, isError } = useSellerEarnings()
  const sliderRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  useEffect(() => {
    const el = sliderRef.current
    if (!el) return
    const check = () => setHasOverflow(el.scrollWidth > el.clientWidth)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])

  function scrollSlider(dir: 'left' | 'right') {
    sliderRef.current?.scrollBy({ left: dir === 'right' ? 240 : -240, behavior: 'smooth' })
  }

  const summary: EarningsSummary = data?.summary ?? {
    total_gross: 0,
    total_fee: 0,
    total_net: 0,
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {isError && (
        <div className="rounded-xl border border-error/20 bg-error-bg px-4 py-3 text-sm text-error flex items-center gap-2">
          <AlertCircle size={14} strokeWidth={2} />
          Could not load earnings data. Please refresh.
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Overview</p>
          {hasOverflow && (
            <div className="flex gap-1">
              <button onClick={() => scrollSlider('left')} className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-border-strong transition-colors">
                <ChevronLeft size={14} strokeWidth={2} />
              </button>
              <button onClick={() => scrollSlider('right')} className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-border-strong transition-colors">
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shrink-0 pb-1" style={{ width: 'calc((100% - 32px) / 3)', minWidth: 200 }}>
                <StatCardSkeleton index={i} />
              </div>
            ))}
          </div>
        ) : !isError && (
          <div ref={sliderRef} className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
            {([
              { label: 'Total gross', value: formatNairaWhole(summary.total_gross), icon: DollarSign, color: 'text-blue-600', bgColor: 'bg-blue-500/10', lineColor: 'bg-blue-500' },
              { label: 'Total net', value: formatNairaWhole(summary.total_net), icon: Wallet, color: 'text-primary', bgColor: 'bg-primary/10', lineColor: 'bg-primary' },
              { label: 'Platform fee', value: formatNairaWhole(summary.total_fee), icon: TrendingUp, color: 'text-amber-600', bgColor: 'bg-amber-500/10', lineColor: 'bg-amber-500' },
            ] as const).map((card) => (
              <div key={card.label} className="shrink-0 snap-start" style={{ width: 'calc((100% - 32px) / 3)', minWidth: 200 }}>
                <StatCard {...card} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Transactions</h3>
          {!isLoading && data && data.orders.length > 0 && (
            <p className="text-[11px] text-text-subtle mt-0.5">
              {data.orders.length} completed sale{data.orders.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => <RowSkeleton key={i} index={i} />)}
          </div>
        )}

        {!isLoading && data && data.orders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-strong bg-card p-12 text-center">
            <div className="inline-flex rounded-2xl bg-surface p-3 mb-4 border border-border">
              <Package size={22} strokeWidth={1.5} className="text-text-subtle" />
            </div>
            <p className="text-sm font-semibold text-text mb-1.5">No completed sales yet</p>
            <p className="text-xs text-text-subtle max-w-xs mx-auto leading-relaxed">
              Earnings appear here after a buyer confirms delivery.
            </p>
          </div>
        )}

        {!isLoading && data && data.orders.length > 0 && (
          <div className="flex flex-col gap-2">
            {data.orders.map((order, i) => (
              <OrderRow key={order.id} order={order} index={i} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Bank account form ────────────────────────────────────────────────────────

type Bank = { name: string; code: string }

function BankAccountForm({ onSuccess }: { onSuccess: () => void }) {
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankCode, setBankCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    fetch('/api/paystack/banks')
      .then((r) => r.json())
      .then((res) => setBanks(res.data ?? []))
      .catch(() => {})
  }, [])

  async function handleAccountNumberBlur() {
    if (!bankCode || accountNumber.length < 10) return
    setResolving(true)
    setResolveError('')
    setAccountName('')
    const res = await fetch(`/api/paystack/resolve-account?account_number=${accountNumber}&bank_code=${bankCode}`)
    const data = await res.json()
    setResolving(false)
    if (!res.ok) {
      setResolveError(data.error?.message ?? 'Could not verify account number')
      return
    }
    setAccountName(data.data.account_name)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountName) {
      setSubmitError('Please verify your account number first')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    const res = await fetch('/api/paystack/recipient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank_code: bankCode, bank_name: bankName, account_number: accountNumber, account_name: accountName }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      setSubmitError(data.error?.message ?? 'Failed to save payout account')
      return
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-xs font-semibold text-text-muted uppercase tracking-widest mb-1.5">Bank</label>
        <select
          value={bankCode}
          onChange={(e) => {
            const selected = banks.find((b) => b.code === e.target.value)
            setBankCode(e.target.value)
            setBankName(selected?.name ?? '')
            setAccountName('')
          }}
          required
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Select your bank</option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-muted uppercase tracking-widest mb-1.5">Account Number</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={10}
          value={accountNumber}
          onChange={(e) => { setAccountNumber(e.target.value); setAccountName(''); setResolveError('') }}
          onBlur={handleAccountNumberBlur}
          required
          placeholder="0123456789"
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {resolving && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted">
            <Loader2 size={11} className="animate-spin" /> Verifying…
          </p>
        )}
        {resolveError && <p className="mt-1.5 text-xs text-error">{resolveError}</p>}
        {accountName && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 size={11} /> {accountName}
          </p>
        )}
      </div>

      {submitError && <p className="text-xs text-error">{submitError}</p>}

      <button
        type="submit"
        disabled={submitting || !accountName}
        className="w-full rounded-xl bg-primary text-white py-2.5 text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Saving…' : 'Save payout account'}
      </button>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function BillingContent() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [user, setUser] = useState<{
    paystack_onboarding_complete: boolean
    paystack_bank_name: string | null
    paystack_account_name: string | null
    paystack_account_number: string | null
  } | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((res) => setUser(res.data))
      .finally(() => setUserLoading(false))
  }, [])

  function handleBankSaved() {
    queryClient.invalidateQueries({ queryKey: ['me'] })
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((res) => setUser(res.data))
    setShowEditForm(false)
  }

  const isConnected = user?.paystack_onboarding_complete ?? false

  return (
    <div className="space-y-8">
      {searchParams.get('from') === 'new-listing' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <AlertCircle size={14} strokeWidth={2} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            Add your bank account to receive payouts before publishing your listing.
          </p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">Payouts</h1>
          <p className="text-text-muted mt-1 text-sm">
            {isConnected
              ? 'Track your earnings and manage your payout account.'
              : 'Add your bank account to receive earnings from your sales.'}
          </p>
        </div>

        {!userLoading && isConnected && !showEditForm && (
          <div className="shrink-0 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2">
            <CheckCircle2 size={13} strokeWidth={2.5} className="text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">
              {user?.paystack_bank_name} ···{user?.paystack_account_number?.slice(-4)}
            </span>
            <button
              onClick={() => setShowEditForm(true)}
              className="ml-1 text-[11px] text-emerald-600 underline underline-offset-2 hover:text-emerald-800"
            >
              Change
            </button>
          </div>
        )}
      </motion.div>

      {userLoading ? null : !isConnected || showEditForm ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-text mb-1">
            {showEditForm ? 'Update payout account' : 'Add payout account'}
          </h2>
          <p className="text-xs text-text-muted mb-5">
            Enter your Nigerian bank account. We&apos;ll send your earnings here after each sale is delivered.
          </p>
          <BankAccountForm onSuccess={handleBankSaved} />
          {showEditForm && (
            <button onClick={() => setShowEditForm(false)} className="mt-3 text-xs text-text-muted underline underline-offset-2">
              Cancel
            </button>
          )}
        </div>
      ) : null}

      {isConnected && !showEditForm && <EarningsSection />}

      {isConnected && !showEditForm && (
        <p className="text-[11px] text-text-subtle pb-4">
          The platform deducts a 10% fee from each sale.
        </p>
      )}
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/billing/page.tsx
git commit -m "feat: replace Stripe Connect billing UI with Paystack bank account form"
```

---

## Task 15: Update Listings New Page

**Files:**
- Modify: `app/dashboard/listings/new/page.tsx`

- [ ] **Step 1: Update all Stripe references to Paystack**

In `app/dashboard/listings/new/page.tsx`:

1. Rename the `StripeBanner` component to `PayoutBanner`
2. Rename `StripePromptModal` to `PayoutPromptModal`
3. Replace the fetch call from `/api/stripe/connect` to `/api/dashboard/billing` redirect:

The banner and modal no longer need to call a connect API — they just link to `/dashboard/billing?from=new-listing`. Replace the `handleConnect` functions in both components:

In `PayoutBanner`:
```typescript
function PayoutBanner() {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <Wallet size={14} strokeWidth={2} className="text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900 leading-snug">
              List everything first — go live when you&apos;re ready
            </p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Add as many items as you want today. When you add your bank account
              for payouts, all your listings go live at once and buyers can start
              finding them immediately.
            </p>
            <button
              onClick={() => router.push('/dashboard/billing?from=new-listing')}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
            >
              Set up payouts
              <ArrowUpRight size={11} strokeWidth={2.5} />
            </button>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="mt-0.5 shrink-0 rounded-md p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-700 transition-colors"
            aria-label="Dismiss"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

In `PayoutPromptModal`:
```typescript
function PayoutPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  function handleSetupPayouts() {
    router.push('/dashboard/billing?from=new-listing');
  }

  function handleLater() {
    onClose();
    router.push("/dashboard/listings");
  }

  return (
    <Modal open={open} onClose={handleLater} title="One more thing">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50">
            <CheckCircle2 size={20} strokeWidth={1.75} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">Your listing is saved!</p>
            <p className="text-sm text-text mt-1 leading-relaxed">
              To receive payment when your item sells, add your bank account for
              payouts. It takes about 2 minutes — and once you do, all your
              saved listings go live instantly.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSetupPayouts}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Set up payouts
            <ArrowUpRight size={14} strokeWidth={2.5} />
          </button>
          <button
            onClick={handleLater}
            className="w-full inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-text hover:bg-surface transition-colors"
          >
            I&apos;ll do it later
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

In `NewListingPage`, update references:
```typescript
  const { mutateAsync: createListing, isPending } = useCreateListing(
    user?.paystack_onboarding_complete
      ? undefined
      : () => setShowModal(true),
  );
  // ...
  {user?.stripe_onboarding_complete  →  user?.paystack_onboarding_complete}
  {!user?.stripe_onboarding_complete  →  !user?.paystack_onboarding_complete}
  {!user?.stripe_onboarding_complete && <StripeBanner />}  →  {!user?.paystack_onboarding_complete && <PayoutBanner />}
  <StripePromptModal  →  <PayoutPromptModal
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/listings/new/page.tsx
git commit -m "refactor: replace Stripe banner/modal with Paystack payout prompts in new listing page"
```

---

## Task 16: Remaining Reference Cleanup

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/profile/page.tsx`
- Modify: `app/dashboard/orders/page.tsx` (if it references Stripe)
- Modify: `app/dashboard/listings/page.tsx` (if it references Stripe)
- Modify: `app/api/auth/signin/route.ts`
- Modify: `app/api/auth/signup/route.ts`

- [ ] **Step 1: Find all remaining stripe references**

```bash
grep -r "stripe" app/ lib/ types/ --include="*.ts" --include="*.tsx" -l
```

- [ ] **Step 2: For each file found, replace field references**

Common replacements:
- `stripe_onboarding_complete` → `paystack_onboarding_complete`
- `stripe_account_id` → `paystack_recipient_code`
- `'Powered by Stripe'` → `'Powered by Paystack'`
- Any Stripe dashboard links → remove or replace with Paystack docs link

In `app/checkout/page.tsx` the page was deleted in Task 13 — skip if already gone.

- [ ] **Step 3: Uninstall Stripe npm packages**

```bash
npm uninstall stripe @stripe/stripe-js @stripe/react-stripe-js
```

- [ ] **Step 4: Verify build passes**

```bash
npx tsc --noEmit
npm run lint
```

Expected: no TypeScript errors, no lint errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove all remaining Stripe references, uninstall Stripe packages"
```

---

## Task 17: Add Environment Variables

- [ ] **Step 1: Add Paystack env vars to `.env.local`**

```bash
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=your_paystack_secret_key  # same key used for HMAC-SHA512
```

Note: Paystack uses the secret key itself as the webhook HMAC key (not a separate secret). Set `PAYSTACK_WEBHOOK_SECRET` to the same value as `PAYSTACK_SECRET_KEY`.

- [ ] **Step 2: Remove old Stripe env vars from `.env.local`**

Remove:
```
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

- [ ] **Step 3: Update your hosting provider (Vercel/Railway) with the new env vars**

Log in to your deployment dashboard and update environment variables accordingly.

- [ ] **Step 4: Commit any env template updates (not `.env.local` itself)**

If you have a `.env.example` or similar template file, update it:
```bash
git add .env.example  # if it exists
git commit -m "docs: update env vars for Paystack"
```

---

## Task 18: DB Migration — Drop Old Stripe Columns

Run this only after Task 17 is deployed and confirmed working in production.

**Files:**
- Create: `supabase/migrations/021_drop_stripe_columns.sql`

- [ ] **Step 1: Create the drop migration**

```sql
-- supabase/migrations/021_drop_stripe_columns.sql

alter table public.users
  drop column if exists stripe_account_id,
  drop column if exists stripe_onboarding_complete;

alter table public.orders
  drop column if exists stripe_payment_intent_id,
  drop column if exists stripe_transfer_id;

-- Down (cannot restore data, only re-add columns):
-- alter table public.users
--   add column if not exists stripe_account_id text,
--   add column if not exists stripe_onboarding_complete boolean not null default false;
-- alter table public.orders
--   add column if not exists stripe_payment_intent_id text,
--   add column if not exists stripe_transfer_id text;
```

- [ ] **Step 2: Apply and commit**

```bash
git add supabase/migrations/021_drop_stripe_columns.sql
git commit -m "feat: drop stripe columns from users and orders tables"
```

---

## Self-Review Checklist

- [x] DB migration adds all 6 new user columns + 2 order columns
- [x] All Stripe PaymentIntent → Paystack reference mapped (orders, settle, cancel, webhook)
- [x] Seller payout deferred to delivery (executePayout called from verify routes, unchanged)
- [x] Webhook handles charge.success (idempotent), transfer.success, transfer.failed
- [x] Bank account form fetches bank list, resolves account name before saving
- [x] Publish gate updated in listings API (stripe_onboarding_complete → paystack_onboarding_complete)
- [x] Cart page redirects to Paystack authorization_url
- [x] Success page reads reference from ?reference= URL param
- [x] Billing page: bank form for not-connected state, earnings + bank summary for connected
- [x] Listings new page: banners link to /dashboard/billing instead of calling Stripe API
- [x] EarningsSummary type removes stripe_available, stripe_pending, next_payout_date
- [x] Stripe packages uninstalled
- [x] Drop migration is a separate task (run after confirming production works)
