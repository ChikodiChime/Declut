# Public Orders Drawer — Design Spec

**Date:** 2026-06-21  
**Branch:** feature/community-requests-and-ai-chat  
**Status:** Approved

---

## Overview

A right-side drawer that lets buyers track and manage their orders without navigating to the dashboard. Works for both logged-in users and anonymous buyers who just completed checkout. Triggered from the checkout success page (auto-opens) and from a persistent nav entry point.

---

## Goals

- Buyers can track orders, see delivery codes, cancel, and review sellers from anywhere on the site
- Guest buyers see their orders immediately after checkout via Paystack reference — no login required at that moment
- Logged-in buyers open the drawer from the nav profile menu / mobile menu
- Full feature parity with `/dashboard/orders/[id]` inside the drawer

---

## Architecture

### Global State — `OrdersModalContext`

Lives in `lib/context/orders-modal-context.tsx`, provided in `app/providers.tsx`.

```ts
type ReferenceOrder = {
  // Full order detail shape — same as BuyerOrderDetail from useBuyerOrders hook
  id: string
  status: string
  delivery_type: string
  item_price: number
  delivery_fee: number
  total_price: number
  delivery_code: string | null
  created_at: string
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  paystack_reference: string | null
  has_review: boolean
  seller: { id: string; name: string | null; email: string; avatar_url?: string | null } | null
  order_items: Array<{ id: string; item_price: number; listing: { id: string; title: string; images: string[] } }>
}

type OrdersModalState = {
  isOpen: boolean
  screen: 'list' | 'detail'
  activeOrderId: string | null
  referenceOrders: ReferenceOrder[] | null
}

type OrdersModalContextValue = OrdersModalState & {
  openList: () => void
  openDetail: (orderId: string) => void
  openByReference: (orders: ReferenceOrder[]) => void
  close: () => void
}
```

Context is consumed with a `useOrdersModal()` hook exported from the same file.

### Data Paths

| Trigger | User | List data source | Detail data source |
|---|---|---|---|
| Nav trigger | Logged-in | `useBuyerOrders()` | `useBuyerOrderDetail(id)` |
| Success page | Guest or logged-in | `referenceOrders` from context | Same `referenceOrders` (no extra fetch) |
| Nav trigger | Guest | N/A — shows sign-in CTA | N/A |

---

## New API Route

**`GET /api/orders/by-reference?ref=<paystack_reference>`**

- **Auth**: None required — the reference is the access token
- **Returns**: Array of full order detail objects (same shape as `ReferenceOrder` above)
- **Query**: Supabase `orders` table filtered by `paystack_reference`, joined with `order_items → listings` and `seller (users)`
- **Includes**: `delivery_code`, all timestamps, `has_review` (check `reviews` table for existing row with `order_id`)
- **Error cases**: Invalid/missing `ref` → 400. Reference not found → empty array (not 404, to avoid leaking existence).

---

## Components

### `components/orders/OrdersDrawer.tsx`
The drawer shell.

- Right-side slide-in, `max-w-[520px]` width, full viewport height
- Backdrop: `bg-black/45 backdrop-blur-sm`, click-outside closes
- Header: "My Orders" title + close `X` button. Back arrow appears when `screen === 'detail'` → calls `openList()`
- Body: scrollable, renders `<OrdersListScreen>` or `<OrdersDetailScreen>` based on context `screen`
- Screen transitions: opacity fade + `translateX(12px)` slide between screens
- Body scroll lock: `document.body.style.overflow = 'hidden'` while open, restored on close
- Mounted in root layout via `app/layout.tsx` (alongside `ChatBubble`)

### `components/orders/OrdersListScreen.tsx`
The orders list view inside the drawer.

- **Logged-in path**: calls `useBuyerOrders()`, groups by `paystack_reference` using `groupByCheckout()` (extracted to `lib/utils/orders.ts`)
- **Reference path**: renders `referenceOrders` from context, same grouping
- Each order renders as a row: thumbnail, title, status badge, delivery type, total price
- Clicking a row calls `openDetail(order.id)` — no navigation
- Skeleton loading state (3 rows) while fetching
- Empty state: "No purchases yet" with browse link

### `components/orders/OrdersDetailScreen.tsx`
The full order detail view inside the drawer.

- **Logged-in path**: calls `useBuyerOrderDetail(activeOrderId)` — existing hook from `lib/hooks/useBuyerOrders`
- **Reference path**: finds order by `activeOrderId` in `context.referenceOrders` — no extra fetch
- Renders (in order):
  1. `<OrderProgressHero>` — animated timeline banner
  2. `<DeliveryCode>` — if `order.delivery_code` is set
  3. `<ReviewForm>` / `<ReviewThankYou>` — if status is `delivered`/`completed` and no review yet
  4. Items + price breakdown card
  5. Cancel button — if `status` is `paid` or `confirmed`
  6. Seller card — avatar, name, email, contact link
- Cancel: `POST /api/orders/[id]/cancel`, then invalidates `useBuyerOrderDetail` query
- Review: uses `useSubmitReview` hook, shows `ReviewThankYou` on success

### Extracted shared components

These currently live inline inside `app/dashboard/orders/[id]/page.tsx`. Extracted so both the drawer and the dashboard page import them.

| New file | Extracted from |
|---|---|
| `components/orders/OrderProgressHero.tsx` | `dashboard/orders/[id]/page.tsx` |
| `components/orders/DeliveryCode.tsx` | `dashboard/orders/[id]/page.tsx` |
| `components/orders/ReviewForm.tsx` | `dashboard/orders/[id]/page.tsx` (both `ReviewForm` + `ReviewThankYou`) |

The dashboard detail page is updated to import from these new locations.

### Utility extraction

`groupByCheckout()` moves from `app/dashboard/orders/page.tsx` to `lib/utils/orders.ts` so both the dashboard and the drawer list screen use it.

---

## Nav Trigger Changes (`components/layout/NavbarWrapper.tsx`)

### Desktop — profile dropdown
Replace `<MenuLink href="/dashboard/orders?tab=purchases">My purchases</MenuLink>` with a `<button>` that:
1. Calls `openList()` from `useOrdersModal()`
2. Closes the dropdown (`setOpen(false)`)

### Mobile menu
Replace the "My purchases" `<Link>` with a `<button>` that:
1. Calls `openList()`
2. Closes the mobile panel (`setMobileOpen(false)`)

### Guest state
No change — guests see sign-in/sign-up links only. No orders trigger.

---

## Success Page Changes (`app/checkout/success/page.tsx`)

1. On mount, alongside the existing settle + cart-clear calls, fetch `/api/orders/by-reference?ref=<reference>`
2. On success: call `openByReference(orders)` — modal auto-opens at list screen
3. "Track your order" button (was a link) → on click, calls `openList()` if `referenceOrders` are already in context, otherwise navigates to `/dashboard/orders?tab=purchases` as fallback
4. If reference fetch fails or returns empty: button falls back to the existing link behavior — no broken state

---

## Edge Cases

| Case | Behaviour |
|---|---|
| Reference fetch fails | Modal does not auto-open. "Track your order" falls back to `/dashboard/orders?tab=purchases` link |
| Order not found in detail (logged-in) | "Order not found" message + back button |
| Cancel succeeds | `useBuyerOrderDetail` query invalidated → detail screen refetches and shows updated status |
| Review submitted | `ReviewThankYou` shown inline; back to list shows no "Rate seller" badge (query invalidated) |
| Delivery code for guest | Returned by `/api/orders/by-reference` — visible immediately without auth |
| Drawer on dashboard routes | Nav trigger is hidden on `/dashboard/*` (existing `HIDDEN_PREFIXES`). Drawer is mounted but unreachable. |
| Modal + dashboard open simultaneously | Share React Query cache — both show live data |

---

## Files Changed / Created

**New:**
- `lib/context/orders-modal-context.tsx`
- `components/orders/OrdersDrawer.tsx`
- `components/orders/OrdersListScreen.tsx`
- `components/orders/OrdersDetailScreen.tsx`
- `components/orders/OrderProgressHero.tsx` (extracted)
- `components/orders/DeliveryCode.tsx` (extracted)
- `components/orders/ReviewForm.tsx` (extracted)
- `lib/utils/orders.ts` (extracted `groupByCheckout`)
- `app/api/orders/by-reference/route.ts`

**Modified:**
- `app/providers.tsx` — add `OrdersModalProvider`
- `app/layout.tsx` — mount `<OrdersDrawer />`
- `components/layout/NavbarWrapper.tsx` — replace "My purchases" links with modal triggers
- `app/checkout/success/page.tsx` — fetch by-reference + auto-open modal
- `app/dashboard/orders/[id]/page.tsx` — import extracted components
