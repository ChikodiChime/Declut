# Places Address Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all free-text address fields with a reusable Google Places autocomplete component that extracts a structured state name, enabling reliable cross-state delivery fee calculation and live fee preview at checkout.

**Architecture:** A single `PlacesAddressInput` component wraps `AutocompleteService` + `PlacesService` from `@vis.gl/react-google-maps`. It emits `{ formatted_address, city, state }` on selection. The `APIProvider` wrapper lives in `app/providers.tsx` so the Maps script loads once. Zone detection on the buyer side switches from substring guessing to exact state-name matching via a new `zoneForState` helper.

**Tech Stack:** `@vis.gl/react-google-maps`, Google Maps Places API (legacy), React Hook Form `setValue`, Supabase migration, Vitest

---

## File Map

| Action | File |
|---|---|
| Install | `package.json` |
| Create | `supabase/migrations/016_users_address_state.sql` |
| Create | `components/checkout/PlacesAddressInput.tsx` |
| Modify | `types/index.ts` |
| Modify | `lib/hooks/useAuth.ts` |
| Modify | `app/api/users/me/route.ts` |
| Modify | `app/api/orders/utils.ts` |
| Modify | `app/api/orders/route.ts` |
| Modify | `app/providers.tsx` |
| Modify | `app/dashboard/profile/page.tsx` |
| Modify | `app/cart/page.tsx` |
| Modify | `components/listings/steps/StepPricing.tsx` |
| Modify | `__tests__/api/orders/utils.test.ts` |

---

## Task 1: Install package and set env var

**Files:**
- Modify: `package.json` (via npm)
- Modify: `.env.local`

- [ ] **Step 1: Install the package**

```bash
npm install @vis.gl/react-google-maps
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Add the API key to .env.local**

Open `.env.local` and add:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA9tVygAE206SJYycphyXbzxkVJfi-3cDM
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @vis.gl/react-google-maps"
```

---

## Task 2: DB migration — add address_state to users

**Files:**
- Create: `supabase/migrations/016_users_address_state.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/016_users_address_state.sql`:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_state text;
```

- [ ] **Step 2: Run the migration**

```bash
npx supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/016_users_address_state.sql
git commit -m "feat: add address_state column to users"
```

---

## Task 3: Update User type, useUpdateProfile hook, and PATCH route

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/hooks/useAuth.ts`
- Modify: `app/api/users/me/route.ts`

- [ ] **Step 1: Add address_state to User type**

In `types/index.ts`, find the `User` type (around line 14–21) and add `address_state`:

```ts
export type User = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  phone: string | null
  address: string | null
  address_state: string | null
  created_at: string
  email_verified: boolean
  // ... rest of fields unchanged
}
```

- [ ] **Step 2: Add address_state to useUpdateProfile input type**

In `lib/hooks/useAuth.ts`, find `useUpdateProfile` (line ~140). Update the `mutationFn` input type:

```ts
mutationFn: async (input: {
  name?: string
  avatar_url?: string
  phone?: string
  address?: string
  address_state?: string | null
}) => {
```

- [ ] **Step 3: Update PATCH /api/users/me to accept and persist address_state**

In `app/api/users/me/route.ts`, make these changes:

```ts
// Line 25 — update body type
let body: { name?: unknown; avatar_url?: unknown; phone?: unknown; address?: unknown; address_state?: unknown }

// Line 32 — destructure address_state
const { name, avatar_url, phone, address, address_state } = body

// Line 34 — include in "at least one field" check
if (
  name === undefined &&
  avatar_url === undefined &&
  phone === undefined &&
  address === undefined &&
  address_state === undefined
) {
  return err('At least one field required', 'VALIDATION_ERROR', 400)
}
```

Then add the `address_state` validation block after the `address` block (around line 72):

```ts
  if (address_state !== undefined) {
    if (address_state !== null && (typeof address_state !== 'string' || address_state.trim().length > 100)) {
      return err('address_state must be 100 characters or less', 'VALIDATION_ERROR', 400)
    }
    updates.address_state = address_state === null ? null : (address_state as string).trim()
  }
```

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/hooks/useAuth.ts app/api/users/me/route.ts
git commit -m "feat: add address_state to User type and profile update API"
```

---

## Task 4: Add zoneForState, update groupBySeller, update tests

**Files:**
- Modify: `app/api/orders/utils.ts`
- Modify: `app/api/orders/route.ts`
- Modify: `__tests__/api/orders/utils.test.ts`

- [ ] **Step 1: Write the failing test for zoneForState behaviour**

In `__tests__/api/orders/utils.test.ts`, update the cross-state tests that currently pass `'Abuja, FCT'` and `'Ikeja, Lagos'` as `buyerArea` strings. Rename the third argument to reflect it is now a state name, and update the `groupBySeller` call signature. Replace the two cross-state tests added in the prior session:

```ts
it('charges outside rate when buyer state is outside Lagos, seller is in Lagos', () => {
  const items = [
    makeCartItem({ listing: makeListing({ seller_id: 'seller-1', area: 'Ajah, Lagos', size_category: 'small' }) }),
  ]
  const groups = groupBySeller(items, 'delivery', 'FCT')
  expect(groups[0].delivery_fee).toBe(DELIVERY_RATES.outside.small)
})

it('charges Lagos rate when both buyer and seller are in Lagos', () => {
  const items = [
    makeCartItem({ listing: makeListing({ seller_id: 'seller-1', area: 'Ajah, Lagos', size_category: 'small' }) }),
  ]
  const groups = groupBySeller(items, 'delivery', 'Lagos')
  expect(groups[0].delivery_fee).toBe(DELIVERY_RATES.lagos.small)
})

it('charges outside rate when buyer state is null', () => {
  const items = [
    makeCartItem({ listing: makeListing({ seller_id: 'seller-1', area: 'Ajah, Lagos', size_category: 'small' }) }),
  ]
  const groups = groupBySeller(items, 'delivery', null)
  // null buyerState treated as outside
  expect(groups[0].delivery_fee).toBe(DELIVERY_RATES.outside.small)
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
npx vitest run __tests__/api/orders/utils.test.ts
```

Expected: the new cross-state tests fail because `groupBySeller` still takes `buyerArea`.

- [ ] **Step 3: Add zoneForState and update groupBySeller in utils.ts**

In `app/api/orders/utils.ts`, add `zoneForState` alongside `zoneForArea`, then rewrite `groupBySeller`:

```ts
function zoneForState(state: string | null): DeliveryZone {
  if (!state) return 'outside'
  return state.toLowerCase() === 'lagos' ? 'lagos' : 'outside'
}
```

Replace the `groupBySeller` function:

```ts
export function groupBySeller(
  items: CartItemWithListing[],
  deliveryType: 'delivery' | 'pickup',
  buyerState?: string | null
): SellerGroup[] {
  const map = new Map<string, CartItemWithListing[]>()
  for (const item of items) {
    const sid = item.listing.seller_id
    if (!map.has(sid)) map.set(sid, [])
    map.get(sid)!.push(item)
  }
  return Array.from(map.entries()).map(([seller_id, sellerItems]) => {
    const subtotal = sellerItems.reduce((sum, i) => sum + i.listing.price, 0)
    let delivery_fee = 0
    if (deliveryType === 'delivery') {
      const sellerZone = zoneForArea(sellerItems[0].listing.area)
      const effectiveZone: DeliveryZone =
        sellerZone === 'outside' || zoneForState(buyerState ?? null) === 'outside'
          ? 'outside'
          : 'lagos'
      delivery_fee = DELIVERY_RATES[effectiveZone][largestSize(sellerItems)]
    }
    return { seller_id, items: sellerItems, subtotal, delivery_fee, total: subtotal + delivery_fee }
  })
}
```

- [ ] **Step 4: Update app/api/orders/route.ts — rename buyerArea to buyerState**

Find the `buyerArea` / `buyerState` block (around line 65) and replace:

```ts
  const buyerState =
    delivery_type === 'delivery'
      ? (authUser ? delivery_state : buyer_info?.address_state) ?? null
      : null
  const groups = groupBySeller(items, delivery_type, buyerState)
```

Note: `delivery_state` and `buyer_info.address_state` don't exist in the body yet — that comes in Task 11. For now this compiles because they're `undefined ?? null` = `null`. This is intentional.

- [ ] **Step 5: Run tests to verify all pass**

```bash
npx vitest run __tests__/api/orders/utils.test.ts
```

Expected: all 17 tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/api/orders/utils.ts app/api/orders/route.ts __tests__/api/orders/utils.test.ts
git commit -m "feat: add zoneForState, update groupBySeller to use buyer state name"
```

---

## Task 5: Add APIProvider to Providers

**Files:**
- Modify: `app/providers.tsx`

- [ ] **Step 1: Add APIProvider**

In `app/providers.tsx`, import and wrap with `APIProvider`:

```tsx
"use client";

import { ReactLenis } from "lenis/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { CART_QUERY_KEY } from "@/lib/hooks/useCart";

function CartSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const onUpdate = () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    window.addEventListener("cart-updated", onUpdate);
    return () => window.removeEventListener("cart-updated", onUpdate);
  }, [queryClient]);
  return <>{children}</>;
}

function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/dispatch") || pathname.startsWith("/admin") || pathname.startsWith("/search")) return <>{children}</>;
  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.2 }}>
      {children}
    </ReactLenis>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { networkMode: "always" },
          queries: { networkMode: "always" },
        },
      }),
  );

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <QueryClientProvider client={client}>
        <CartSyncProvider>
          <LenisProvider>{children}</LenisProvider>
        </CartSyncProvider>
      </QueryClientProvider>
    </APIProvider>
  );
}
```

- [ ] **Step 2: Start dev server and verify no console errors**

```bash
npm run dev
```

Open `http://localhost:3000`. Check browser console — no `Google Maps JavaScript API` errors expected. If you see "API key missing" or similar, verify `.env.local` has the key and restart the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/providers.tsx
git commit -m "feat: add Google Maps APIProvider to app providers"
```

---

## Task 6: Create PlacesAddressInput component

**Files:**
- Create: `components/checkout/PlacesAddressInput.tsx`

- [ ] **Step 1: Create the component**

Create `components/checkout/PlacesAddressInput.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

export type PlaceResult = {
  formatted_address: string;
  city: string | null;
  state: string | null;
};

type Prediction = {
  description: string;
  place_id: string;
};

type Props = {
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  onSelect: (result: PlaceResult) => void;
  onClear?: () => void;
};

export default function PlacesAddressInput({
  defaultValue = "",
  placeholder = "Search for your address",
  label,
  error,
  required,
  onSelect,
  onClear,
}: Props) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showStateFallback, setShowStateFallback] = useState(false);
  const [pendingResult, setPendingResult] = useState<PlaceResult | null>(null);
  const [stateOverride, setStateOverride] = useState("");

  const placesLib = useMapsLibrary("places");
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const attrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!placesLib || !attrRef.current) return;
    autocompleteRef.current ??= new placesLib.AutocompleteService();
    placesServiceRef.current ??= new placesLib.PlacesService(attrRef.current);
  }, [placesLib]);

  useEffect(() => {
    const query = inputValue.trim();
    if (!query || query.length < 2 || !autocompleteRef.current) {
      setPredictions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      autocompleteRef.current!.getPlacePredictions(
        {
          input: query,
          types: ["address"],
          componentRestrictions: { country: "ng" },
        },
        (results, status) => {
          if (status !== "OK" || !results) {
            setPredictions([]);
            return;
          }
          setPredictions(
            results
              .slice(0, 5)
              .map((r) => ({ description: r.description, place_id: r.place_id }))
          );
        }
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [inputValue]);

  const handleSelect = useCallback(
    (prediction: Prediction) => {
      setInputValue(prediction.description);
      setPredictions([]);

      placesServiceRef.current!.getDetails(
        {
          placeId: prediction.place_id,
          fields: ["formatted_address", "address_components"],
        },
        (place, status) => {
          if (status !== "OK" || !place) return;

          const components = place.address_components ?? [];
          const city =
            components.find((c) => c.types.includes("locality"))?.long_name ??
            null;
          const state =
            components.find((c) =>
              c.types.includes("administrative_area_level_1")
            )?.long_name ?? null;

          const result: PlaceResult = {
            formatted_address: place.formatted_address ?? prediction.description,
            city,
            state,
          };

          if (!state) {
            setPendingResult(result);
            setShowStateFallback(true);
          } else {
            onSelect(result);
          }
        }
      );
    },
    [onSelect]
  );

  function confirmStateOverride() {
    if (!pendingResult || !stateOverride.trim()) return;
    onSelect({ ...pendingResult, state: stateOverride.trim() });
    setShowStateFallback(false);
    setPendingResult(null);
    setStateOverride("");
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-text">
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <MapPin size={16} className="text-text-muted" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!e.target.value) onClear?.();
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-4 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none transition-colors"
        />

        {predictions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-border bg-card shadow-card overflow-hidden">
            {predictions.map((p) => (
              <button
                key={p.place_id}
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-surface transition-colors"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(p)}
              >
                {p.description}
              </button>
            ))}
          </div>
        )}
      </div>

      {showStateFallback && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <p className="text-xs text-text-muted">
            We couldn&apos;t detect the state automatically. Please enter it:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={stateOverride}
              onChange={(e) => setStateOverride(e.target.value)}
              placeholder="e.g. Lagos"
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={confirmStateOverride}
              className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      {/* Required by PlacesService for attribution rendering */}
      <div ref={attrRef} className="hidden" />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `PlacesAddressInput.tsx`. If you see `google is not defined`, ensure `@vis.gl/react-google-maps` is installed (it ships the `google.maps` types).

- [ ] **Step 3: Commit**

```bash
git add components/checkout/PlacesAddressInput.tsx
git commit -m "feat: add PlacesAddressInput component"
```

---

## Task 7: Update profile AddressForm

**Files:**
- Modify: `app/dashboard/profile/page.tsx`

- [ ] **Step 1: Replace AddressForm textarea with PlacesAddressInput**

In `app/dashboard/profile/page.tsx`, find `AddressForm` (around line 697). Replace the entire function:

```tsx
function AddressForm({ currentAddress, onClose }: { currentAddress: string; onClose: () => void }) {
  const [selected, setSelected] = useState<{ address: string; state: string | null } | null>(
    currentAddress ? { address: currentAddress, state: null } : null
  );
  const [error, setError] = useState("");
  const { mutate, isPending } = useUpdateProfile();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected?.address.trim()) {
      setError("Please search for and select your address");
      return;
    }
    setError("");
    mutate(
      { address: selected.address, address_state: selected.state },
      { onSuccess: onClose, onError: (e) => setError(e.message) }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PlacesAddressInput
        label="Delivery address"
        defaultValue={currentAddress}
        placeholder="Search for your delivery address"
        onSelect={(result) =>
          setSelected({ address: result.formatted_address, state: result.state })
        }
        onClear={() => setSelected(null)}
        error={error}
      />
      {selected && (
        <p className="text-xs text-text-muted">
          Selected: <span className="text-text">{selected.address}</span>
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-text hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save address"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Add imports at the top of the profile page**

```tsx
import PlacesAddressInput, { type PlaceResult } from "@/components/checkout/PlacesAddressInput";
```

Update the `AddressForm` function signature to use `PlaceResult` for the selected state:

```tsx
function AddressForm({ currentAddress, onClose }: { currentAddress: string; onClose: () => void }) {
  const [selected, setSelected] = useState<{ address: string; state: string | null } | null>(
    currentAddress ? { address: currentAddress, state: null } : null
  );
```

- [ ] **Step 3: Test in browser**

Start the dev server (`npm run dev`). Log in, go to `/dashboard/profile`, click "Add" or "Edit" on the delivery address. The textarea should be replaced by the Places search input. Type a Nigerian address and verify suggestions appear and a selection populates the field.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/profile/page.tsx
git commit -m "feat: use PlacesAddressInput in profile address form"
```

---

## Task 8: Update cart SummaryPanel — hide delivery fee in main view

**Files:**
- Modify: `app/cart/page.tsx`

- [ ] **Step 1: Add showDeliveryFee prop to SummaryPanel**

In `app/cart/page.tsx`, find `SummaryPanelProps` (around line 30) and add the prop:

```tsx
type SummaryPanelProps = {
  groups: SellerGroup[];
  grandTotal: number;
  checkingOut: boolean;
  error: string;
  ctaLabel: string;
  formId?: string;
  onCheckout?: () => void;
  showDeliveryFee?: boolean;
};
```

- [ ] **Step 2: Use showDeliveryFee in SummaryPanel body**

In the `SummaryPanel` component body, find the delivery fee section (around line 75–82) and replace it:

```tsx
{showDeliveryFee !== false && group.delivery_fee > 0 && (
  <div className="flex justify-between">
    <span className="text-sm text-text-muted">Delivery</span>
    <span className="text-sm text-text-muted">
      ₦{group.delivery_fee.toLocaleString()}
    </span>
  </div>
)}
```

- [ ] **Step 3: Add "Calculated at checkout" line below the items loop in SummaryPanel**

After the `groups.map(...)` block and before the divider, add (when `showDeliveryFee === false` and `deliveryType === 'delivery'`). Pass `deliveryType` as a prop too:

Actually, the simpler approach: add a `deliveryFeeHint` prop and show it when present. Update `SummaryPanelProps`:

```tsx
type SummaryPanelProps = {
  groups: SellerGroup[];
  grandTotal: number;
  checkingOut: boolean;
  error: string;
  ctaLabel: string;
  formId?: string;
  onCheckout?: () => void;
  showDeliveryFee?: boolean;
  deliveryFeeHint?: string;
};
```

In the `SummaryPanel` body, after the `groups.map(...)` block (around line 84) and before the divider, add:

```tsx
{deliveryFeeHint && (
  <p className="text-xs text-text-muted mt-1">{deliveryFeeHint}</p>
)}
```

- [ ] **Step 4: Pass props in main cart SummaryPanel usage**

In the main cart render (the final `return` around line 519), find the `<SummaryPanel>` component and add:

```tsx
<SummaryPanel
  groups={groups}
  grandTotal={grandTotal}
  checkingOut={checkingOut}
  error={error}
  ctaLabel="Proceed to checkout"
  onCheckout={handleCheckout}
  showDeliveryFee={false}
  deliveryFeeHint={deliveryType === "delivery" ? "Delivery fee calculated after entering address" : undefined}
/>
```

- [ ] **Step 5: Verify in browser**

Go to `/cart` with items in cart. The order summary should show item prices and subtotal but not a delivery fee line. With delivery selected, the hint text should appear.

- [ ] **Step 6: Commit**

```bash
git add app/cart/page.tsx
git commit -m "feat: hide delivery fee in cart summary, show hint instead"
```

---

## Task 9: Update cart delivery address step — auth users

**Files:**
- Modify: `app/cart/page.tsx`

- [ ] **Step 1: Add deliveryState state variable**

In `CartPage`, add to the existing state declarations (around line 112):

```tsx
const [deliveryState, setDeliveryState] = useState<string | null>(null);
```

- [ ] **Step 2: Initialize deliveryState from saved profile when entering delivery step**

In `handleCheckout` (around line 181), update the delivery branch:

```tsx
if (deliveryType === "delivery") {
  setError("");
  setUseNewAddress(false);
  setDeliveryAddress(user?.address ?? "");
  setDeliveryState(user?.address_state ?? null);
  setShowDeliveryStep(true);
  return;
}
```

- [ ] **Step 3: Update submitOrder to send delivery_state**

In `submitOrder` (around line 161), add `delivery_state` to the body:

```tsx
async function submitOrder(address: string | null, state: string | null = null) {
  setCheckingOut(true);
  setError("");
  const body: Record<string, unknown> = { delivery_type: deliveryType };
  if (address) body.delivery_address = address.trim();
  if (state) body.delivery_state = state;
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
  sessionStorage.setItem("checkout_secret", data.data.client_secret);
  router.push("/checkout");
}
```

- [ ] **Step 4: Move hasSavedAddress to component scope and update handleDeliveryAddressConfirm**

`hasSavedAddress` is currently declared inside the delivery step render. Move it to just above the state declarations so `handleDeliveryAddressConfirm` can reference it:

```tsx
// Place this just above the useState declarations, inside CartPage
const hasSavedAddress = Boolean(user?.address);
```

Then update `handleDeliveryAddressConfirm`:

```tsx
async function handleDeliveryAddressConfirm() {
  const addr =
    hasSavedAddress && !useNewAddress ? user?.address ?? "" : deliveryAddress.trim();
  if (!addr) {
    setError("Please enter a delivery address");
    return;
  }
  const state =
    hasSavedAddress && !useNewAddress ? user?.address_state ?? null : deliveryState;
  await submitOrder(addr, state);
}
```

Also remove the `const hasSavedAddress = Boolean(user.address)` line that was previously inside the delivery step render block (it is now declared at component scope above).

- [ ] **Step 5: Replace the delivery step textarea with PlacesAddressInput**

In the delivery step render block (around line 383), add the import at the top of the file:

```tsx
import PlacesAddressInput from "@/components/checkout/PlacesAddressInput";
```

Replace the `{showTextarea && (...)}` block (the textarea section, around line 422–439):

```tsx
{showTextarea && (
  <PlacesAddressInput
    label="Delivery address"
    placeholder="Search for your delivery address"
    onSelect={(result) => {
      setDeliveryAddress(result.formatted_address);
      setDeliveryState(result.state);
    }}
    onClear={() => {
      setDeliveryAddress("");
      setDeliveryState(null);
    }}
  />
)}
```

- [ ] **Step 6: Update the delivery step summary to show live fee**

The delivery step has its own inline summary (around line 454). Replace the `groups` it uses with a live-computed version using `deliveryState`:

Add just above the delivery step `return`:

```tsx
const deliveryGroups = groupBySeller(items, "delivery", deliveryState);
const deliveryGrandTotal = calculateGrandTotal(deliveryGroups);
```

Then in the inline summary panel, replace all references to `group` / `groups` / `grandTotal` with `deliveryGroups` / `deliveryGrandTotal`. The delivery_fee lines should show because `showDeliveryFee` is not passed (so it defaults to showing).

- [ ] **Step 7: Test in browser**

Go to `/cart` with a delivery item. Click "Proceed to checkout". The saved address card should show and the fee should appear immediately. Click "Use a different address" and type a Kano address — fee should update to outside rate. Type a Lagos address — fee should update to Lagos rate.

- [ ] **Step 8: Commit**

```bash
git add app/cart/page.tsx
git commit -m "feat: live delivery fee preview in cart delivery step using Places"
```

---

## Task 10: Update cart anonymous buyer form

**Files:**
- Modify: `app/cart/page.tsx`

- [ ] **Step 1: Add buyerState to buyerInfo state**

Update the `buyerInfo` state initializer (around line 120):

```tsx
const [buyerInfo, setBuyerInfo] = useState({
  name: "",
  email: "",
  phone: "",
  address: "",
  address_state: null as string | null,
});
```

- [ ] **Step 2: Update handleAnonymousCheckout to send address_state**

In `handleAnonymousCheckout` (around line 196), update the fetch body:

```tsx
body: JSON.stringify({
  delivery_type: deliveryType,
  listing_ids: items.map((i) => i.listing_id),
  buyer_info: buyerInfo,
}),
```

`buyerInfo` already includes `address_state` since we added it to state — no other change needed here.

- [ ] **Step 3: Replace address textarea in the anonymous buyer form**

In the anonymous buyer form section (around line 349–363), replace the address `<div>`:

```tsx
<div>
  <PlacesAddressInput
    label={deliveryType === "delivery" ? "Delivery address" : "Contact address"}
    placeholder={
      deliveryType === "delivery"
        ? "Search for your delivery address"
        : "Search for your address"
    }
    required
    onSelect={(result) =>
      setBuyerInfo({
        ...buyerInfo,
        address: result.formatted_address,
        address_state: result.state,
      })
    }
    onClear={() =>
      setBuyerInfo({ ...buyerInfo, address: "", address_state: null })
    }
  />
</div>
```

- [ ] **Step 4: Update the anonymous buyer form SummaryPanel to show live fee**

The anonymous buyer form uses `<SummaryPanel groups={groups} grandTotal={grandTotal} ...>` where `groups` is the top-level computation with no buyer state. Compute a live version:

Just above the anonymous buyer form `return` (around line 274):

```tsx
const anonGroups =
  deliveryType === "delivery" && buyerInfo.address_state
    ? groupBySeller(items, "delivery", buyerInfo.address_state)
    : groups;
const anonGrandTotal = calculateGrandTotal(anonGroups);
```

Update the `SummaryPanel` in the anonymous buyer form to use these:

```tsx
<SummaryPanel
  groups={anonGroups}
  grandTotal={anonGrandTotal}
  checkingOut={checkingOut}
  error={error}
  ctaLabel="Continue to payment"
  formId="buyer-form"
/>
```

- [ ] **Step 5: Test in browser**

Log out. Add an item to cart. Click "Proceed to checkout". The buyer form should show the Places input for address. Selecting a Lagos address should show Lagos delivery fee. Selecting a Port Harcourt address should show outside rate.

- [ ] **Step 6: Commit**

```bash
git add app/cart/page.tsx
git commit -m "feat: Places address input and live fee in anonymous buyer form"
```

---

## Task 11: Update POST /api/orders to accept delivery_state

**Files:**
- Modify: `app/api/orders/route.ts`

- [ ] **Step 1: Add delivery_state and buyer_info.address_state to body destructure**

In `app/api/orders/route.ts`, update the body destructure (around line 17):

```ts
const { delivery_type, listing_ids, buyer_info, delivery_address, delivery_state } = body
```

- [ ] **Step 2: Update buyerState extraction**

The `buyerState` line added in Task 4 reads:

```ts
const buyerState =
  delivery_type === 'delivery'
    ? (authUser ? delivery_state : buyer_info?.address_state) ?? null
    : null
```

Verify this is already in the file from Task 4. If not, add it above the `groupBySeller` call.

- [ ] **Step 3: Run the orders utils tests to confirm nothing regressed**

```bash
npx vitest run __tests__/api/orders/utils.test.ts
```

Expected: all 17 tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/api/orders/route.ts
git commit -m "feat: orders API accepts delivery_state for cross-state fee calculation"
```

---

## Task 12: Update StepPricing — replace area + pickup_address with PlacesAddressInput

**Files:**
- Modify: `components/listings/steps/StepPricing.tsx`

- [ ] **Step 1: Rewrite StepPricing with PlacesAddressInput**

Replace the entire file content with the following. This removes the hand-rolled `AutocompleteService` implementation, the `<Script>` tag, and the manual area input. The `pickup_address` field uses `PlacesAddressInput`; `area` is set automatically.

```tsx
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  ArrowRight,
  Banknote,
  Bike,
  Car,
  Truck,
  Package,
} from "lucide-react";
import { Input, Button } from "@/components/ui";
import PlacesAddressInput from "@/components/checkout/PlacesAddressInput";
import type { ListingType, SizeCategory } from "@/types";

interface StepPricingData {
  price: number | null;
  area: string;
  size_category: SizeCategory;
  pickup_address: string;
}

const SIZE_OPTIONS: {
  value: SizeCategory;
  label: string;
  description: string;
  vehicle: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    strokeWidth?: number;
  }>;
}[] = [
  {
    value: "small",
    label: "Small",
    description: "Fits in a bag — clothes, phones, accessories",
    vehicle: "Motorbike",
    icon: Bike,
  },
  {
    value: "medium",
    label: "Medium",
    description: "Boxed items — small appliances, shoes",
    vehicle: "Car",
    icon: Car,
  },
  {
    value: "large",
    label: "Large",
    description: "Bulky items — TVs, large appliances",
    vehicle: "Van",
    icon: Truck,
  },
  {
    value: "extra_large",
    label: "Extra Large",
    description: "Heavy/oversized — furniture, fridges",
    vehicle: "Large Van",
    icon: Package,
  },
];

interface StepPricingProps {
  listingType: ListingType;
  defaultValues?: Partial<StepPricingData>;
  onNext: (data: StepPricingData) => void;
  onBack: () => void;
}

export function StepPricing({
  listingType,
  defaultValues,
  onNext,
  onBack,
}: StepPricingProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<StepPricingData>({ defaultValues });

  const [pickupError, setPickupError] = useState("");

  function handlePickupSelect(result: { formatted_address: string; city: string | null; state: string | null }) {
    setValue("pickup_address", result.formatted_address, { shouldValidate: true });
    const area = result.city
      ? `${result.city}, ${result.state ?? ""}`.trim().replace(/,\s*$/, "")
      : result.state ?? "";
    setValue("area", area);
    setPickupError("");
  }

  function onSubmit(data: StepPricingData) {
    if (!data.pickup_address) {
      setPickupError("Please search for and select a pickup address");
      return;
    }
    onNext(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-text">Pricing &amp; location</h2>
        <p className="text-sm text-text-muted mt-1">
          {listingType === "for_sale"
            ? "Set your price and where pickup is."
            : "Let buyers know where to collect."}
        </p>
      </div>

      {listingType === "for_sale" && (
        <Input
          label="Price (₦)"
          type="number"
          min="1"
          placeholder="e.g. 15000"
          error={errors.price?.message}
          leadingIcon={<Banknote size={16} className="text-text-muted" />}
          {...register("price", {
            required: "Price is required for For Sale listings",
            valueAsNumber: true,
            min: { value: 1, message: "Price must be greater than 0" },
          })}
        />
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-text">
          Item size{" "}
          <span className="text-text-muted text-xs font-normal">
            — determines delivery vehicle
          </span>
        </label>
        <Controller
          name="size_category"
          control={control}
          rules={{ required: "Please select a size" }}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {SIZE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = field.value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={[
                      "flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-border-strong",
                    ].join(" ")}
                  >
                    <div
                      className={`mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-text-muted"}`}
                    >
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-text"}`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-text-muted leading-snug">
                        {opt.description}
                      </p>
                      <p
                        className={`text-xs font-medium mt-1 ${isSelected ? "text-primary" : "text-text-muted"}`}
                      >
                        via {opt.vehicle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.size_category && (
          <p className="text-sm text-error">{errors.size_category.message}</p>
        )}
      </div>

      {/* Hidden fields — set programmatically from PlacesAddressInput */}
      <input type="hidden" {...register("pickup_address")} />
      <input type="hidden" {...register("area")} />

      <PlacesAddressInput
        label="Pickup address"
        placeholder="Search for your pickup address"
        defaultValue={defaultValues?.pickup_address ?? ""}
        onSelect={handlePickupSelect}
        onClear={() => {
          setValue("pickup_address", "");
          setValue("area", "");
        }}
        error={pickupError}
        required
      />

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
        >
          Back
        </Button>
        <Button type="submit" className="flex-1 gap-2">
          Next <ArrowRight size={16} strokeWidth={2} />
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Test in browser**

Go to `/listings/new` (or wherever the listing form is). Navigate to step 3 (Pricing). The "Area (for display)" input and the area suggestions dropdown should be gone. The "Pickup address" field should be a Places search input. Search for "15 Awolowo Road" and verify a suggestion appears, selecting it populates the field and the hidden `area` and `pickup_address` values are set. Proceed through to step 4 to verify form submission works.

- [ ] **Step 4: Run full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/listings/steps/StepPricing.tsx
git commit -m "feat: replace hand-rolled area autocomplete with PlacesAddressInput in listing form"
```
