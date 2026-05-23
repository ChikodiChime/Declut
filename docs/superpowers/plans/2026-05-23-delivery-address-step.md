# Delivery Address Step for Logged-In Buyers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a logged-in user proceeds to checkout with `delivery_type === 'delivery'`, show an inline address confirmation step — presenting their saved profile address (if any) for one-click confirmation, or a textarea to enter a new one.

**Architecture:** Two files change. The cart page (`app/cart/page.tsx`) gains a new `showDeliveryStep` UI state that intercepts the checkout flow before calling the API. The orders API (`app/api/orders/route.ts`) accepts an optional `delivery_address` field for authenticated users and writes it to `buyer_address` on the order row.

**Tech Stack:** Next.js App Router, React state, existing `useMe` hook, existing `POST /api/orders` endpoint, Tailwind CSS 4.

---

## File Map

| File | Change |
|------|--------|
| `app/cart/page.tsx` | Add `showDeliveryStep` state + handler + render branch |
| `app/api/orders/route.ts` | Accept `delivery_address` in body for auth'd users; write to `buyer_address` |

---

### Task 1: Accept `delivery_address` in the orders API for authenticated users

**Files:**
- Modify: `app/api/orders/route.ts`

Currently, `buyer_address` is only stored when `buyer_info` is provided (anonymous path). This task adds support for authenticated users to pass a delivery address.

- [ ] **Step 1: Update the destructured body fields**

In `app/api/orders/route.ts`, find line 16:
```ts
const { delivery_type, listing_ids, buyer_info } = body
```
Replace with:
```ts
const { delivery_type, listing_ids, buyer_info, delivery_address } = body
```

- [ ] **Step 2: Validate delivery_address when authenticated and delivery type is delivery**

After the `delivery_type` validation block (after line 19), add:
```ts
if (authUser && delivery_type === 'delivery' && (!delivery_address || typeof delivery_address !== 'string' || !delivery_address.trim())) {
  return err('Delivery address is required', 'VALIDATION_ERROR', 400)
}
```

- [ ] **Step 3: Include delivery_address in order inserts for authenticated users**

Find the `orderInserts` block (around line 63). Replace:
```ts
const orderInserts = groups.map((group) => ({
  buyer_id: authUser?.id ?? null,
  seller_id: group.seller_id,
  listing_id: null,
  status: 'pending' as const,
  delivery_type,
  item_price: group.subtotal,
  delivery_fee: group.delivery_fee,
  total_price: group.total,
  ...(buyer_info && {
    buyer_name: buyer_info.name,
    buyer_email: buyer_info.email,
    buyer_phone: buyer_info.phone,
    buyer_address: buyer_info.address,
  }),
}))
```
With:
```ts
const orderInserts = groups.map((group) => ({
  buyer_id: authUser?.id ?? null,
  seller_id: group.seller_id,
  listing_id: null,
  status: 'pending' as const,
  delivery_type,
  item_price: group.subtotal,
  delivery_fee: group.delivery_fee,
  total_price: group.total,
  ...(authUser && delivery_address && { buyer_address: delivery_address.trim() }),
  ...(buyer_info && {
    buyer_name: buyer_info.name,
    buyer_email: buyer_info.email,
    buyer_phone: buyer_info.phone,
    buyer_address: buyer_info.address,
  }),
}))
```

- [ ] **Step 4: Commit**

```bash
git add app/api/orders/route.ts
git commit -m "feat: accept delivery_address for authenticated order creation"
```

---

### Task 2: Add delivery address step state and logic to the cart page

**Files:**
- Modify: `app/cart/page.tsx`

Add three new state variables and a new handler. Modify `handleCheckout` to intercept the delivery flow for logged-in users.

- [ ] **Step 1: Add state variables**

In `app/cart/page.tsx`, find the existing state declarations (around line 113–124). Add three new state variables directly after the `buyerInfo` state:

```ts
const [showDeliveryStep, setShowDeliveryStep] = useState(false)
const [deliveryAddress, setDeliveryAddress] = useState('')
const [useNewAddress, setUseNewAddress] = useState(false)
```

- [ ] **Step 2: Seed `deliveryAddress` from profile when the user loads**

Find the existing `useEffect` that calls `fetchCart` (around line 126). Add a second `useEffect` below it:

```ts
useEffect(() => {
  if (user?.address) {
    setDeliveryAddress(user.address)
  }
}, [user?.address])
```

- [ ] **Step 3: Modify `handleCheckout` to intercept delivery for logged-in users**

Find `handleCheckout` (around line 157). Replace the entire function with:

```ts
async function handleCheckout() {
  if (!user) {
    setShowBuyerForm(true)
    return
  }
  if (deliveryType === 'delivery') {
    setShowDeliveryStep(true)
    return
  }
  await submitOrder(null)
}
```

- [ ] **Step 4: Extract order submission into a shared helper**

Add this function directly above `handleCheckout`:

```ts
async function submitOrder(address: string | null) {
  setCheckingOut(true)
  setError('')
  const body: Record<string, unknown> = { delivery_type: deliveryType }
  if (address) body.delivery_address = address
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  setCheckingOut(false)
  if (!res.ok) {
    setError(data.error?.message ?? 'Checkout failed, please try again')
    return
  }
  sessionStorage.setItem('checkout_secret', data.data.client_secret)
  router.push('/checkout')
}
```

- [ ] **Step 5: Add the delivery step submit handler**

Add this function directly after `handleAnonymousCheckout`:

```ts
async function handleDeliveryAddressConfirm() {
  const addr = deliveryAddress.trim()
  if (!addr) {
    setError('Please enter a delivery address')
    return
  }
  await submitOrder(addr)
}
```

- [ ] **Step 6: Commit**

```bash
git add app/cart/page.tsx
git commit -m "feat: intercept delivery checkout to collect address for logged-in users"
```

---

### Task 3: Render the delivery address step UI

**Files:**
- Modify: `app/cart/page.tsx`

Add the render branch for `showDeliveryStep`. It must appear before the main cart render, after the anonymous buyer form branch.

- [ ] **Step 1: Add the `showDeliveryStep` render branch**

In `app/cart/page.tsx`, find the anonymous buyer form block that starts with:
```ts
if (showBuyerForm && !user) {
```
Directly **after** the closing `}` of that block, add:

```tsx
// ── Delivery address step (logged-in users, delivery only) ───────────────

if (showDeliveryStep && user) {
  const hasSavedAddress = Boolean(user.address)
  const showTextarea = !hasSavedAddress || useNewAddress

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="font-display text-3xl font-bold text-text mb-10">
          Your cart
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
          <div>
            <button
              onClick={() => { setShowDeliveryStep(false); setUseNewAddress(false); setError('') }}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors mb-6"
            >
              <ChevronLeft size={16} />
              Back to cart
            </button>

            <h2 className="font-display text-2xl font-bold text-text mb-6">
              Where should we deliver?
            </h2>

            {hasSavedAddress && !useNewAddress && (
              <div className="rounded-2xl border border-border bg-card p-5 mb-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">
                  Saved address
                </p>
                <p className="text-sm text-text whitespace-pre-line">{user.address}</p>
              </div>
            )}

            {showTextarea && (
              <textarea
                autoFocus
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-primary transition-colors min-h-[90px] resize-none mb-4"
                placeholder="Enter your full delivery address"
              />
            )}

            {hasSavedAddress && !useNewAddress && (
              <button
                onClick={() => { setUseNewAddress(true); setDeliveryAddress('') }}
                className="text-sm text-text-muted hover:text-text underline underline-offset-2 transition-colors"
              >
                Use a different address
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 sticky top-20 self-start">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-5">
              Order summary
            </p>
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.seller_id} className="space-y-1.5">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3">
                      <span className="text-sm text-text truncate">{item.listing.title}</span>
                      <span className="text-sm text-text shrink-0">
                        ₦{item.listing.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {group.delivery_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted">Delivery</span>
                      <span className="text-sm text-text-muted">
                        ₦{group.delivery_fee.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-border my-5" />
            <div className="flex items-baseline justify-between mb-6">
              <span className="text-sm font-medium text-text-muted">Total</span>
              <span className="font-display text-2xl font-bold text-text">
                ₦{grandTotal.toLocaleString()}
              </span>
            </div>
            <button
              onClick={handleDeliveryAddressConfirm}
              disabled={checkingOut}
              className="w-full rounded-xl bg-foreground text-white py-3.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {checkingOut ? 'Preparing…' : hasSavedAddress && !useNewAddress ? 'Deliver here' : 'Continue to payment'}
            </button>
            {error && (
              <p className="mt-3 text-sm text-error text-center">{error}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no TypeScript errors. If there are errors related to `user.address` being `string | null | undefined`, guard with `user.address ?? ''`.

- [ ] **Step 3: Smoke-test the flow manually**

1. Log in as a buyer who has a saved address in their profile
2. Add a for-sale listing to cart
3. Select "Delivery"
4. Click "Proceed to checkout"
5. Confirm the address step appears with the saved address card and "Deliver here" button
6. Click "Use a different address" — confirm textarea appears, saved card hides
7. Enter an address and click "Continue to payment" — confirm Stripe checkout loads

8. Repeat with a buyer who has NO saved address
9. Confirm textarea appears immediately (no saved card)
10. Enter address and confirm checkout proceeds

11. Switch delivery type to "Pickup" — confirm address step is skipped entirely

- [ ] **Step 4: Commit**

```bash
git add app/cart/page.tsx
git commit -m "feat: delivery address step for logged-in buyers at checkout"
```
