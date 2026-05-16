# Order Confirmation Email — Design Spec

**Date:** 2026-05-16  
**Status:** Approved  
**Scope:** `lib/email.ts`, `app/api/orders/route.ts`

---

## Overview

Send a transactional order confirmation email to the buyer after a successful checkout. Resend is already configured and used for OTP emails — this adds a second email type following the same pattern. The email is fire-and-forget: failure never blocks the order response.

---

## Architecture

No new files. No new dependencies.

| File | Change |
|---|---|
| `lib/email.ts` | Add `sendOrderConfirmationEmail(params)` and its HTML builder |
| `app/api/orders/route.ts` | Call `sendOrderConfirmationEmail` after PaymentIntent is created |

---

## Function Signature

```ts
type OrderConfirmationParams = {
  to: string
  buyerName: string
  orderIds: string[]
  groups: SellerGroup[]
  grandTotal: number
  deliveryType: 'delivery' | 'pickup'
}

export async function sendOrderConfirmationEmail(params: OrderConfirmationParams): Promise<void>
```

`SellerGroup` is imported from `@/app/api/orders/utils` — it already carries `items`, `subtotal`, `delivery_fee`, and `total` per seller group.

---

## Call Site — `app/api/orders/route.ts`

Called immediately after the PaymentIntent is created, before the final `return ok(...)`. Fire-and-forget — log but never throw:

```ts
const buyerEmail = buyer_info?.email ?? authUser?.email
const buyerName  = buyer_info?.name  ?? 'Customer'

if (buyerEmail) {
  sendOrderConfirmationEmail({
    to: buyerEmail,
    buyerName,
    orderIds: orders.map((o) => o.id),
    groups,
    grandTotal,
    deliveryType: delivery_type,
  }).catch((e) => console.error('Order confirmation email failed:', e))
}
```

---

## Email Content

**Subject:** `Your Declutter order is confirmed`

**Sections (top to bottom):**

1. **Header** — indigo brand bar, "declut" wordmark (matches OTP email)
2. **Greeting** — "Hi [buyerName],"
3. **Confirmation line** — "Your order has been placed. Here's what you ordered:"
4. **Itemized table** — for each seller group:
   - Row per item: name (left) + price (right)
   - Delivery fee row in muted style (omitted if pickup / fee is 0)
   - Group subtotal row in medium weight
5. **Divider**
6. **Grand total row** — bold, larger font
7. **Delivery note** — "The seller will be in touch within 12 hours to arrange [delivery to your address / pickup]."
8. **Footer** — "© 2026 declut. All rights reserved."

---

## Error Handling

- `sendOrderConfirmationEmail` throws if Resend returns an error (matches `sendOtpEmail` pattern)
- Call site catches with `.catch(console.error)` — email failure is logged, never surfaced to the buyer or the API response
- If `buyerEmail` is undefined (edge case), the call is skipped entirely

---

## Out of Scope

- Seller notification email (separate feature)
- Email open/click tracking
- HTML email preview in dev
- Retry logic for failed sends
