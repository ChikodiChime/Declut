# Claim UI Design

**Date:** 2026-05-26
**Status:** Approved

---

## Goal

Give buyers a way to claim free listings and track their claims. Give sellers a way to accept or decline incoming claims and reveal pickup addresses. All surfaces live either on the listing detail page or in the existing `/dashboard/orders` page.

---

## Section 1 — Listing Detail Page

**File:** `app/listings/[id]/page.tsx`

Replace the current "Contact Seller — Coming Soon" disabled button for non-for-sale listings with claim-aware CTA logic.

### Claim state detection

Call `GET /api/claims/mine` via `useMyClaims()` hook and filter by `listing_id` client-side. This avoids a new endpoint.

### CTA states

| Condition | UI |
|-----------|-----|
| `listing_type = 'donate'` | Disabled badge: "Donated to a charity" |
| `listing_type = 'free'` + `status = 'claimed'` + no user claim | Disabled button: "Already Claimed" |
| `listing_type = 'free'` + `status = 'available'` + not logged in | "Claim for Free" → redirects to `/auth/login?redirect=/listings/[id]` |
| `listing_type = 'free'` + `status = 'available'` + logged in + no claim | "Claim for Free" button → `POST /api/claims` |
| User has claim with `status = 'pending'` | Amber badge "Claim pending — waiting for seller" + "Cancel" link |
| User has claim with `status = 'accepted'` | Green badge "Claim accepted!" + pickup address card + "Mark as Collected" button |
| User has claim with `status = 'completed'` | Neutral badge "You collected this item" |
| User has claim with `status = 'cancelled'` | Re-show "Claim for Free" if listing still available |

### Pickup address card

Shown only when `claim.status === 'accepted'`. Displays `claim.pickup_address` in a green-tinted card with a MapPin icon. Not visible before acceptance.

---

## Section 2 — Dashboard Claims Tab

**File:** `app/dashboard/orders/page.tsx`

Add "Claims" as a third value in the top toggle (Sales / Purchases / Claims). Inside, a pill selector switches between two sub-panels.

### My Claims (buyer sub-panel)

Data from `GET /api/claims/mine`.

Each card shows:
- Listing thumbnail, title, area
- Seller name
- Status badge: Pending (amber), Accepted (green), Completed (muted), Cancelled (muted)
- If `status = 'accepted'`: pickup address revealed inline
- Actions:
  - `pending` → "Cancel" button → `PATCH /api/claims/[id]` `{ status: 'cancelled' }`
  - `accepted` → "Mark as Collected" button → `PATCH /api/claims/[id]` `{ status: 'completed' }`

### Incoming Claims (seller sub-panel)

Data from `GET /api/seller/claims`.

Each card shows:
- Listing thumbnail, title
- Buyer name
- Claim date
- Actions:
  - `pending` → "Accept" button (opens Modal for pickup address input) + "Decline" button (`status: 'cancelled'`)
  - `accepted` → "Mark as Collected" button (`status: 'completed'`)

### Accept modal

Uses the existing `Modal` component. Contains a single textarea for pickup address. Submits `PATCH /api/claims/[id]` `{ status: 'accepted', pickup_address: '...' }`. Validates that address is non-empty before enabling submit.

---

## Section 3 — Hooks

**Directory:** `lib/hooks/`

### `useMyClaims()`

```ts
// GET /api/claims/mine
// Returns: Claim[] with nested listing + seller
```

Used on: listing detail page (filter by listing_id), Claims dashboard (My Claims panel).

### `useSellerClaims()`

```ts
// GET /api/seller/claims
// Returns: Claim[] with nested listing + buyer
```

Used on: Claims dashboard (Incoming panel).

### `useClaimListing()`

```ts
// POST /api/claims
// Body: { listing_id: string }
// Invalidates: useMyClaims on success
```

Used on: listing detail page.

### `useUpdateClaim()`

```ts
// PATCH /api/claims/[id]
// Body: { status: string, pickup_address?: string }
// Invalidates: useMyClaims + useSellerClaims on success
```

Used on: both dashboard panels and listing detail page.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `lib/hooks/useClaims.ts` | All 4 claim hooks |
| Modify | `app/listings/[id]/page.tsx` | Claim-aware CTA |
| Modify | `app/dashboard/orders/page.tsx` | Add Claims tab with buyer + seller panels |

---

## Out of scope

- Email/push notifications when a claim is accepted or received
- Claim expiry (auto-cancel if seller doesn't respond)
- Donate listing UI (charity selection on new listing form — separate feature)
