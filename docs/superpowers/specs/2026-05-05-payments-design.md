# Payments Design — Phase 4 & 5

**Date:** 2026-05-05
**Scope:** Stripe Connect seller onboarding + Cart & Checkout (combined phase)

---

## Overview

Sellers connect a Stripe Express account before listing. Buyers check out with a single charge for their full cart regardless of how many sellers are involved. After payment succeeds, the platform transfers each seller's cut individually and keeps a 10% platform fee.

---

## Architecture

### Seller Onboarding

```
dashboard → POST /api/stripe/connect
          → creates Stripe Express account (if not exists)
          → generates account_link URL (Stripe-hosted KYC)
          ← redirects seller to Stripe onboarding

seller completes Stripe onboarding
stripe → POST /api/webhooks/stripe (account.updated)
       → if account.charges_enabled: set stripe_onboarding_complete = true
       → redirect to /dashboard/billing?status=connected

listing gate: POST /api/listings checks stripe_onboarding_complete
            → returns 403 if false
```

### Checkout — Single Charge, Multi-Seller

```
buyer → POST /api/orders  { cart_item_ids, delivery_type }
      → validate all items still 'available'
      → group cart items by seller
      → create one Order row per seller group
      → calculate grand_total = sum of (item_price + delivery_fee) per group
      → create ONE PaymentIntent
          { amount: grand_total,
            currency: 'ngn',
            metadata: { order_ids: 'uuid1,uuid2,...' } }
      ← returns { client_secret }

buyer confirms payment via Stripe.js (single card charge)

stripe → POST /api/webhooks/stripe (payment_intent.succeeded)
       → for each order_id in metadata.order_ids:
           → set order.status = 'paid'
           → set order.auto_cancel_at = now + 12h
           → POST /v1/transfers
               { amount: item_price + delivery_fee - 10%,
                 currency: 'ngn',
                 destination: seller.stripe_account_id }
           → save transfer.id to order.stripe_transfer_id
       → clear buyer's cart_items
```

### Cancellation & Refund

```
buyer → POST /api/orders/[id]/cancel
      → fetch all orders sharing same stripe_payment_intent_id
      → stripe.refunds.create({ payment_intent: id })  ← full refund
      → set all linked orders.status = 'cancelled'
      → Stripe automatically reverses seller transfers on full refund
```

---

## Data Model

One migration needed:

```sql
ALTER TABLE public.orders
  ADD COLUMN stripe_transfer_id text;
```

Existing schema already covers everything else:
- `users.stripe_account_id` — seller's connected account
- `users.stripe_onboarding_complete` — listing gate flag
- `orders.stripe_payment_intent_id` — shared across all orders in same checkout
- `orders.auto_cancel_at` — 12h seller response window
- `orders.pickup_address` — revealed after payment confirmed
- `cart_items` — cleared after successful checkout

---

## Delivery Fees

Stored as constants in `lib/constants.ts`:

```ts
export const LAGOS_DELIVERY_FEE = 150000      // ₦1,500 in kobo
export const OUTSIDE_LAGOS_DELIVERY_FEE = 350000  // ₦3,500 in kobo
```

Delivery type determined by buyer at checkout. All Stripe amounts in kobo (NGN smallest unit).

---

## Platform Fee

10% `application_fee_amount` on each seller transfer:

```ts
const platformFee = Math.round(sellerAmount * 0.10)
const transferAmount = sellerAmount - platformFee
```

---

## New Files

```
lib/
  stripe.ts                           — server-side Stripe singleton
  stripe-browser.ts                   — loadStripe() singleton for client components
  constants.ts                        — LAGOS_DELIVERY_FEE, OUTSIDE_LAGOS_DELIVERY_FEE, PLATFORM_FEE_PERCENT

app/api/
  stripe/
    connect/route.ts                  — POST: create Express account + account_link
    connect/return/route.ts           — GET: Stripe redirects here post-onboarding
  orders/
    route.ts                          — POST: validate cart, create orders, create PaymentIntent
    [id]/
      route.ts                        — GET: fetch order detail
      cancel/route.ts                 — POST: refund + cancel all linked orders
  webhooks/
    stripe/route.ts                   — account.updated + payment_intent.succeeded

app/
  cart/page.tsx                       — cart items, delivery type selector, grand total, checkout CTA
  checkout/page.tsx                   — Stripe Elements form + order summary
  checkout/success/page.tsx           — confirmation, order IDs, link to dashboard

app/dashboard/
  billing/page.tsx                    — Connect status card (not connected / pending / connected)

components/checkout/
  CheckoutForm.tsx                    — Stripe Elements card input, confirmPayment()
  OrderSummary.tsx                    — items by seller, delivery fees, grand total
  DeliveryTypeSelector.tsx            — Lagos (₦1,500) vs Outside Lagos (₦3,500)
```

---

## Environment Variables

```env
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Item sold between cart add and checkout | Validate status before PaymentIntent; return 409 with which items unavailable |
| PaymentIntent creation fails | No orders created; buyer sees "Payment setup failed, try again" |
| Seller transfer fails after payment | Order marked paid; failure logged with NOTE: for manual resolution |
| Seller not Stripe-connected at listing creation | Form banner + API returns 403 |
| Stripe onboarding started but incomplete | `charges_enabled` not true → webhook skips; dashboard shows "Complete onboarding" link |
| Buyer cancels after payment | Full refund; Stripe reverses seller transfers automatically |

---

## Out of Scope

- Partial refunds (buyer-initiated cancel only, always full)
- Seller-initiated cancel
- Retry logic for failed transfers (manual for now)
- Payout scheduling / instant payouts
- NGN FX handling (Stripe manages this)
