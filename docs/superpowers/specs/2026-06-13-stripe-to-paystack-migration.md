# Stripe → Paystack Migration

**Date:** 2026-06-13
**Status:** Approved

## Context

Stripe does not support Nigerian businesses as a payment processor. This migration replaces all Stripe integrations with Paystack, which is the standard payment processor for Nigerian apps.

The payment model also changes from "pay seller immediately on checkout" (current, buggy behavior) to **"hold funds until delivery, transfer to seller after order is marked delivered"** (Model B — Transfers).

---

## Payment Flow (Buyer)

1. Buyer places order → `POST /api/orders` creates orders in DB and calls Paystack `transaction/initialize`
2. Paystack returns `{ reference, authorization_url }`
3. Reference stored on all orders (`paystack_reference`); client receives `authorization_url`
4. Client redirects browser to `authorization_url` (Paystack hosted checkout — supports card, bank transfer, USSD)
5. After payment, Paystack redirects buyer to `/checkout/success?reference=xxx`
6. Success page calls `POST /api/orders/settle` with `{ reference }`
7. Server calls Paystack `GET /transaction/verify/:reference` — if `status === "success"`, marks orders paid, listings sold, cart cleared
8. Paystack also fires `charge.success` webhook → `/api/webhooks/paystack` runs same settle logic (idempotent — skips already-paid orders)

**Amounts:** Kobo (NGN × 100), same convention as Stripe cents.

---

## Seller Payout Flow (After Delivery)

Replaces Stripe transfers. Funds are held in the platform Paystack account until the seller marks the order delivered.

1. Seller marks order delivered → `PATCH /api/orders/[id]` sets `status = delivered`
2. Server immediately calls Paystack `POST /transfer`:
   - `amount` = `item_price - platform_fee` (in kobo)
   - `recipient` = seller's `paystack_recipient_code`
   - `reason` = `"Payout for order #xxx"`
3. `paystack_transfer_id` stored on order
4. Paystack fires `transfer.success` or `transfer.failed` webhook:
   - Success → notify seller "Your payout has been sent"
   - Failure → log error; `paystack_transfer_id` stays for manual retry

---

## Seller Bank Account Onboarding

Replaces Stripe Connect OAuth. Sellers enter bank details directly in the app.

**Flow (dashboard billing page `/dashboard/billing`):**
1. Seller selects bank from dropdown — populated from `GET /bank?country=nigeria` (cached, static list)
2. Seller enters account number — on blur, call `GET /bank/resolve?account_number=xxx&bank_code=xxx` to fetch and display account name for confirmation
3. Seller confirms → `POST /api/paystack/recipient` → server calls Paystack `POST /transferrecipient` → stores `recipient_code` + bank details, sets `paystack_onboarding_complete = true`

**Publish gate:**
- When seller tries to publish a listing and `paystack_onboarding_complete = false` → block publish, show prompt: *"Add your bank account to receive payouts before publishing"* with link to `/dashboard/billing`

---

## Refunds

- Buyer cancels order → `POST /api/orders/[id]/cancel`
- Replaces `stripe.refunds.create()` with Paystack `POST /refund` with `{ transaction: paystack_reference, amount: total_in_kobo }`
- Only valid before delivery (before seller has been paid)

---

## Database Changes

### `users` table

| Remove | Add |
|---|---|
| `stripe_account_id` | `paystack_recipient_code` |
| `stripe_onboarding_complete` | `paystack_bank_code` |
| | `paystack_bank_name` |
| | `paystack_account_number` |
| | `paystack_account_name` |
| | `paystack_onboarding_complete` |

### `orders` table

| Remove | Add |
|---|---|
| `stripe_payment_intent_id` | `paystack_reference` |
| `stripe_transfer_id` | `paystack_transfer_id` |

---

## Files Changing

| File | Action |
|---|---|
| `lib/stripe.ts` | Replace → `lib/paystack.ts` (server-side API helper) |
| `lib/stripe-browser.ts` | Delete |
| `app/api/stripe/connect/route.ts` | Replace → `app/api/paystack/recipient/route.ts` |
| `app/api/stripe/connect/return/route.ts` | Delete |
| `app/api/webhooks/stripe/route.ts` | Replace → `app/api/webhooks/paystack/route.ts` |
| `app/api/orders/route.ts` | Replace PaymentIntent creation with Paystack initialize |
| `app/api/orders/settle/route.ts` | Replace PI verify with Paystack transaction verify |
| `app/api/orders/[id]/cancel/route.ts` | Replace Stripe refund with Paystack refund |
| `app/api/seller/earnings/route.ts` | Remove Stripe balance/payout fetch |
| `app/checkout/page.tsx` | Replace Stripe Elements with redirect to authorization_url |
| `components/checkout/CheckoutForm.tsx` | Replace with redirect trigger component |
| `app/dashboard/billing/page.tsx` | Add bank account form (bank picker + account verify + submit) |
| `app/dashboard/listings/new/page.tsx` | Add publish gate: check paystack_onboarding_complete |

---

## Environment Variables

**Remove:**
```
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

**Add:**
```
PAYSTACK_SECRET_KEY        # sk_live_xxx or sk_test_xxx
PAYSTACK_WEBHOOK_SECRET    # used to verify webhook signature (x-paystack-signature HMAC-SHA512)
```

---

## Paystack API Reference

All calls use `Authorization: Bearer $PAYSTACK_SECRET_KEY` and base URL `https://api.paystack.co`.

| Purpose | Method | Endpoint |
|---|---|---|
| Initialize transaction | POST | `/transaction/initialize` |
| Verify transaction | GET | `/transaction/verify/:reference` |
| List banks | GET | `/bank?country=nigeria` |
| Resolve account | GET | `/bank/resolve?account_number=x&bank_code=x` |
| Create recipient | POST | `/transferrecipient` |
| Initiate transfer | POST | `/transfer` |
| Refund | POST | `/refund` |

Webhook signature: `x-paystack-signature` header is HMAC-SHA512 of raw body using `PAYSTACK_SECRET_KEY`.

---

## Out of Scope

- Enabling Paystack OTP / 2FA for transfers (use Paystack dashboard setting)
- Retry UI for failed transfers (manual resolution via admin for now)
- Paystack split payments / subaccounts (not needed with Model B)
