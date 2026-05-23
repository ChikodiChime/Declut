# Seller Earnings Dashboard — Design Spec

**Date:** 2026-05-23  
**Status:** Approved  

---

## Goal

Give sellers visibility into their earnings on the `/dashboard/billing` page: a summary of total earned, their Stripe Express account balance, and a per-order transaction history with payout status.

---

## Data Sources

Two sources combined server-side in a single API response:

1. **Supabase `orders` table** — all `delivered` orders where `seller_id = current user`. Provides listing title, image, delivery date, `item_price`, and `stripe_transfer_id` (used to derive transfer status).
2. **Stripe API** — the seller's Express account balance (`available` + `pending` in NGN) and the next scheduled payout date, fetched using `stripeAccount` header with the seller's `stripe_account_id`.

Stripe calls are skipped if the seller has not completed onboarding (`stripe_onboarding_complete = false`).

---

## API: `GET /api/seller/earnings`

**Auth:** Requires valid JWT token. Returns 401 if unauthenticated.

**Response shape:**

```typescript
{
  summary: {
    total_gross: number          // sum of item_price across all delivered orders (kobo)
    total_fee: number            // platform fees collected (10%)
    total_net: number            // what seller earned net of fees
    stripe_available: number     // NGN available balance from Stripe (kobo), 0 if not connected
    stripe_pending: number       // NGN pending balance from Stripe (kobo), 0 if not connected
    next_payout_date: string | null  // ISO date of next scheduled Stripe payout, null if none
  },
  orders: Array<{
    id: string
    listing_title: string
    listing_image: string | null
    delivered_at: string         // order updated_at / created_at as proxy
    item_price: number           // gross sale amount
    fee: number                  // 10% platform fee
    net: number                  // item_price * 0.9
    transfer_status: 'transferred' | 'processing' | 'pending'
    // 'transferred' = stripe_transfer_id is set and not 'pending'
    // 'processing'  = stripe_transfer_id === 'pending' (optimistic lock sentinel)
    // 'pending'     = no stripe_transfer_id (payout not yet initiated)
  }>
}
```

**Stripe balance calls use:** `stripe.balance.retrieve({ stripeAccount })` and `stripe.payouts.list({ limit: 1, status: 'pending' }, { stripeAccount })`.

---

## Page: `/dashboard/billing`

The existing page is rebuilt. Two sections:

### Section 1 — Connect Status (existing, unchanged)

Shows Stripe Connect onboarding state (`connected` / `pending` / `not_connected`) with the connect button. No changes to this logic.

### Section 2 — Earnings (shown only when `stripe_onboarding_complete = true`)

**Summary row — 3 stat cards:**

| Card | Value | Source |
|---|---|---|
| Total earned | `total_net` formatted as ₦ | DB |
| Available balance | `stripe_available` formatted as ₦ | Stripe |
| Next payout | `next_payout_date` formatted as date, or "No pending payout" | Stripe |

**Transaction list** — sorted by `delivered_at` descending, one row per delivered order:

- Thumbnail (listing image, falls back to package icon)
- Listing title
- Date delivered
- Gross: `₦item_price`
- Fee: `-₦fee` (muted red)
- Net: `₦net` (bold)
- Transfer badge:
  - `transferred` → green "Paid out"
  - `processing` → amber "Processing"
  - `pending` → gray "Pending"

**Empty state** (no delivered orders yet): friendly message — "No completed sales yet. Orders appear here after delivery is confirmed."

**Loading state:** skeleton cards + skeleton rows.

---

## Hook: `useSellerEarnings`

TanStack Query hook in `lib/hooks/useSellerEarnings.ts`. Fetches `GET /api/seller/earnings`. Used only in the billing page.

---

## Files

| File | Action |
|---|---|
| `app/api/seller/earnings/route.ts` | Create |
| `lib/hooks/useSellerEarnings.ts` | Create |
| `app/dashboard/billing/page.tsx` | Modify |

---

## Error Handling

- If seller has no `stripe_account_id`: Stripe calls are skipped, `stripe_available`, `stripe_pending`, `next_payout_date` return as 0 / null. The earnings section is still shown with DB data only.
- If Stripe API call fails: log the error, return zeros for Stripe fields. Do not fail the whole request.
- If the orders query fails: return 500.

---

## Notes

- All monetary values are stored in the DB as Nigerian Naira (whole units). Stripe balances are in kobo (smallest unit) — divide by 100 before displaying.
- In Stripe test mode, the Express account balance will be 0 unless test payouts have been simulated. This is expected.
- The `next_payout_date` comes from `stripe.payouts.list({ status: 'pending' })` on the connected account — this returns the `arrival_date` of the next pending payout, if any.
