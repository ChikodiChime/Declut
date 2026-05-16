# Seller Orders Dashboard — Design Spec

**Date:** 2026-05-17
**Status:** Approved
**Scope:** `app/dashboard/orders/`, `app/api/orders/mine/`, `app/api/orders/[id]/`

---

## Overview

A dedicated orders page at `/dashboard/orders` where sellers can view their incoming paid orders, confirm them, and mark them as delivered. Buyers are anonymous — sellers see buyer contact details directly on each order card without any additional action.

---

## Status Flow

```
pending → paid → confirmed → delivered
```

- `pending` — order created, payment not yet completed. Never shown to seller.
- `paid` — Stripe webhook confirmed payment. Appears in "New" tab.
- `confirmed` — seller confirmed the order. Appears in "Confirmed" tab.
- `delivered` — seller marked as delivered. Appears in "Delivered" tab.

Only forward transitions are valid. The PATCH endpoint enforces: `paid → confirmed` and `confirmed → delivered` only.

---

## Page: `/dashboard/orders`

**File:** `app/dashboard/orders/page.tsx`

Client component. Three tabs — New, Confirmed, Delivered — mapping to statuses `paid`, `confirmed`, `delivered`. Active tab stored in local React state (default: "New").

Each tab fetches `GET /api/orders/mine?status=<status>`. After a successful PATCH action, the hook re-fetches the current tab — the card disappears from the list immediately.

### Order Card

Displayed for each order in the active tab:

| Field | Source |
|---|---|
| Item thumbnail | `listing.images[0]` via CldImage (or Package icon fallback) |
| Item title | `listing.title` |
| Total price | `order.total_price` formatted as `₦{n.toLocaleString()}` |
| Delivery type | `order.delivery_type` — "Delivery" or "Pickup" pill |
| Buyer name | `order.buyer_name` |
| Buyer phone | `order.buyer_phone` |
| Buyer address | `order.buyer_address` |
| Action button | "Confirm order" (New tab), "Mark as delivered" (Confirmed tab), none (Delivered tab) |

Action button triggers `PATCH /api/orders/[id]` with the next status. Button shows a loading spinner while in flight. On success the hook re-fetches; on error a toast/inline error message is shown.

### Empty State

Each tab shows a neutral empty state when no orders match: icon + "No [new/confirmed/delivered] orders."

### Loading State

Skeleton cards (same dimensions as real cards) while the fetch is in flight.

---

## API: `GET /api/orders/mine`

**File:** `app/api/orders/mine/route.ts`

Auth required. Returns orders where `seller_id = authUser.id`.

Query param: `status` (required) — one of `paid`, `confirmed`, `delivered`. Invalid values return 400.

Joins listing data: `listing:listings(id, title, images)`.

Response shape:
```json
{
  "data": [
    {
      "id": "uuid",
      "listing_id": "uuid",
      "status": "paid",
      "delivery_type": "delivery",
      "item_price": 5000,
      "delivery_fee": 1500,
      "total_price": 6500,
      "buyer_name": "Ada Okafor",
      "buyer_email": "ada@example.com",
      "buyer_phone": "08012345678",
      "buyer_address": "12 Bode Thomas, Surulere, Lagos",
      "created_at": "2026-05-17T00:33:46Z",
      "listing": {
        "id": "uuid",
        "title": "Vintage lamp",
        "images": ["cloudinary-public-id"]
      }
    }
  ]
}
```

---

## API: `PATCH /api/orders/[id]`

**File:** `app/api/orders/[id]/route.ts`

Auth required. Body: `{ "status": "confirmed" | "delivered" }`.

Guards:
1. Order must exist.
2. `order.seller_id` must equal `authUser.id` — sellers can only update their own orders.
3. Transition must be valid: `paid → confirmed` or `confirmed → delivered`. Any other transition returns 409.

On success: updates `orders.status` and returns the updated order row.

---

## Hook: `useSellerOrders(status)`

**File:** `lib/hooks/useSellerOrders.ts`

Thin SWR or fetch wrapper over `GET /api/orders/mine?status=<status>`. Exposes `{ orders, isLoading, mutate }`. Called once per active tab render; `mutate()` called after each successful PATCH to re-fetch the tab list.

---

## Files Changed

| File | Action |
|---|---|
| `app/dashboard/orders/page.tsx` | Create — orders page with tabs and order cards |
| `app/api/orders/mine/route.ts` | Create — GET seller orders by status |
| `app/api/orders/[id]/route.ts` | Create — PATCH order status |
| `lib/hooks/useSellerOrders.ts` | Create — data fetching hook |
| `proxy.ts` | Modify — add `/api/orders/mine` and `/api/orders/:path*` already covered |

---

## What Does Not Change

- Existing `POST /api/orders/route.ts` — buyer checkout flow unchanged
- Existing `app/api/orders/utils.ts` — shared utilities unchanged
- Dashboard layout, nav, and other pages — unchanged
- Stripe webhook — unchanged
