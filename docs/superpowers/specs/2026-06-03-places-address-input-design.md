# Design: Google Places Address Input

**Date:** 2026-06-03  
**Scope:** Replace all free-text address fields with structured Google Places autocomplete; fix cross-state delivery fee detection; live fee preview at checkout.

---

## Problem

1. The delivery fee zone (`lagos` vs `outside`) was determined by a substring check on a free-text string. A buyer in Lagos typing "15 Bode Thomas, Surulere" (without the word "Lagos") was charged the outside-Lagos rate incorrectly.
2. Delivery fee was shown in the cart summary before the buyer entered their address — displayed as the seller-zone estimate, not the actual charge.
3. Address fields across the app (checkout, profile, listing form) are plain textareas with no structure.

---

## Solution Overview

Introduce a single reusable `PlacesAddressInput` component backed by the Google Places API. Use it everywhere addresses are collected. Extract `state` from the structured place result to drive zone detection exactly (`state === 'Lagos'`), not by substring match.

---

## Database

**Migration:** Add `address_state text` column to `users` table.

```sql
ALTER TABLE users ADD COLUMN address_state text;
```

- `address` (existing): formatted display string, e.g. `"15 Bode Thomas, Surulere, Lagos"`  
- `address_state` (new): state name only, e.g. `"Lagos"` — used for zone detection  
- Non-breaking: existing rows get `NULL`, handled as `'outside'` zone (safe default)

---

## Component: `PlacesAddressInput`

**File:** `components/checkout/PlacesAddressInput.tsx`

```ts
type PlaceResult = {
  formatted_address: string
  city: string | null
  state: string | null
}

type Props = {
  defaultValue?: string
  placeholder?: string
  onSelect: (result: PlaceResult) => void
  onClear?: () => void
}
```

**Behaviour:**
- Single text input; as the user types, Places Autocomplete suggestions appear (Nigeria-restricted, `types: ['address']`)
- On suggestion selection: calls `PlacesService.getDetails` with the `place_id` to get structured `address_components`
- Extracts:
  - `formatted_address` — full display string from Google
  - `city` — `locality` component
  - `state` — `administrative_area_level_1` component
- Emits all three via `onSelect`
- **Fallback:** if `state` is null after detail fetch (rare for remote areas), renders an inline plain text field labelled "State" so the user can type it manually. Does not block submission.
- Clears suggestions on outside click or Escape

**Script loading:** Does not manage its own script tag. Relies on `APIProvider` being present in a parent.

---

## Script Loading: `APIProvider`

Add `@vis.gl/react-google-maps` `APIProvider` to the root layout (`app/layout.tsx`). The API key comes from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Script loads once for the entire app.

```tsx
<APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
  {children}
</APIProvider>
```

**Env var:** Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local`.

---

## Zone Detection

**Add** `zoneForState(state: string | null): DeliveryZone` alongside the existing `zoneForArea`:

```ts
function zoneForState(state: string | null): DeliveryZone {
  if (!state) return 'outside'
  return state.toLowerCase() === 'lagos' ? 'lagos' : 'outside'
}
```

- **Seller zone:** continues to use `zoneForArea(area: string)` (substring match on the stored `area` string, e.g. "Ajah, Lagos"). This is kept as-is — storing `seller_state` separately on listings is out of scope.
- **Buyer zone:** uses `zoneForState(buyerState)` — exact match on the state name returned by Places API. No substring guessing.

Update `groupBySeller` to rename the third parameter from `buyerArea` to `buyerState` and route it through `zoneForState` instead of `zoneForArea`:

```ts
function groupBySeller(
  items: CartItemWithListing[],
  deliveryType: 'delivery' | 'pickup',
  buyerState?: string | null
): SellerGroup[]
```

- Cross-state rule: if either seller zone or buyer zone is `outside`, use `outside` rate.

---

## Checkout Flow — Auth Users

**Current:** Delivery address collected as free-text textarea after "Proceed to checkout" click. Fee shown in cart before address entry.

**New:**

1. **Cart summary panel:** Remove delivery fee line. Replace with "Delivery fee calculated after entering address."
2. **Delivery address step** (`showDeliveryStep`):
   - If user has `address` saved on profile:
     - Show saved address as a selectable card (pre-selected by default)
     - Fee computed immediately using saved `address_state`; shown in live summary panel
     - "Use a different address" link below reveals `PlacesAddressInput` inline
     - Selecting a new place updates fee live; the new place becomes the active address
   - If user has no saved address: show `PlacesAddressInput` directly
3. On "Continue to payment": send `delivery_address` (formatted string) and `delivery_state` (state name) to `POST /api/orders`

---

## Checkout Flow — Anonymous Users

Replace the address `<textarea>` in the buyer form with `PlacesAddressInput`. Fee in the SummaryPanel updates live as soon as a place is selected. Send `buyer_info.address` and `buyer_info.address_state` to `POST /api/orders`.

---

## Orders API (`POST /api/orders`)

Accept two new fields:

| Field | Type | Source |
|---|---|---|
| `delivery_state` | `string \| null` | Auth user checkout |
| `buyer_info.address_state` | `string \| null` | Anonymous checkout |

Pass the relevant state to `groupBySeller` as `buyerState`. Fee calculation uses `zoneForState(buyerState)`.

---

## Profile Page (`AddressForm`)

Replace `<textarea>` with `PlacesAddressInput`. On form submit: call `useUpdateProfile` with both `address` (formatted string) and `address_state` (state name). Display in the profile card is unchanged (shows `address` string).

**`useUpdateProfile` hook:** Already accepts a partial `User` object — just pass `{ address, address_state }`.

**`User` type:** Add `address_state: string | null`.

---

## Listing Form (`StepPricing`)

**Replace** the custom hand-rolled `AutocompleteService` area field with `PlacesAddressInput` on the `pickup_address` field.

**On place select:**
- `pickup_address` ← `formatted_address` from Places  
- `area` ← `"${city}, ${state}"` if city is available; falls back to `state` alone if city is null. Auto-populated and hidden from the seller — they no longer fill it in.

**Remove:**
- `AutocompleteService` instance, types, `isPlacesReady` state, `serviceRef`, `areaSuggestions` state, `normalizeAreaSuggestion` helper, the `<Script>` tag, and the suggestions dropdown UI

The `area` field value continues to be stored in the DB for display on listing cards and backward-compatible zone detection.

---

## Types

```ts
// types/index.ts
export type User = {
  ...
  address: string | null
  address_state: string | null   // new
  ...
}
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Maps script fails to load | `PlacesAddressInput` renders as plain text input (no autocomplete) |
| `getDetails` returns no state | Inline "State" text field shown; user types manually |
| User submits without selecting a place | Standard required-field validation |
| `address_state` is null in DB | `zoneForState(null)` returns `'outside'` — safe default |

---

## Out of Scope

- Storing `seller_state` separately on listings (seller zone still uses area string substring for now)
- Saving the checkout address back to the user profile (separate decision)
- Address validation beyond what Google Places provides
- Multiple saved addresses per user
