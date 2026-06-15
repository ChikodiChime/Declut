# Address Book Design

**Date:** 2026-06-15  
**Status:** Approved

## Overview

Replace the single delivery address field on the user profile with a full address book. Users can save up to 10 named addresses, set a default, and pick from saved addresses (or enter a new one) in the listing creation and buying flows.

---

## Section 1: Data Layer

### New table: `user_addresses`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `users.id` | |
| `label` | `text` | Required, max 30 chars (e.g. "Home", "Office") |
| `address` | `text` | Formatted address from Google Places |
| `address_state` | `text \| null` | State extracted from Places result |
| `is_default` | `boolean` | Default `false`. Only one per user at a time |
| `created_at` | `timestamptz` | |

**Constraints:**
- Max 10 addresses per user — enforced in the API layer
- Only one `is_default = true` per user — the API sets all others to `false` when a new default is set
- RLS: users can only read/write their own rows

### Migration

1. Create `user_addresses` table
2. For every user where `users.address IS NOT NULL`, insert one row into `user_addresses` with `label = 'Home'`, `is_default = true`, copying `address` and `address_state`
3. Drop `users.address` and `users.address_state` columns

### API Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/user/addresses` | List all saved addresses for the current user |
| `POST` | `/api/user/addresses` | Create a new address |
| `PATCH` | `/api/user/addresses/[id]` | Update label/address or set as default |
| `DELETE` | `/api/user/addresses/[id]` | Delete an address |

All routes require authentication. `PATCH` setting `is_default: true` atomically clears `is_default` on all other addresses for that user.

---

## Section 2: Address Book Page

**Route:** `/dashboard/address-book`  
**Nav:** Linked from the dashboard sidebar.

### Layout

Follows the existing `InfoCard` pattern from the profile page.

- **Page header:** "Address Book" + subtitle "Manage your saved addresses"
- **Add address button** (top right): opens the Add/Edit drawer. Disabled at 10 addresses with tooltip "You've reached the 10-address limit"
- **Address cards:** one per saved address, showing:
  - Label (bold)
  - Formatted address text
  - State (as a muted badge)
  - "Default" pill badge on the default address
  - "Set as default" button (non-default addresses only)
  - Edit button → opens drawer pre-filled
  - Delete button → confirmation before delete
- **Empty state:** illustration + "No saved addresses yet" + "Add your first address" CTA

### Add/Edit Drawer

- Label input (required, max 30 chars)
- `PlacesAddressInput` (existing component, reused)
- Save / Cancel buttons

---

## Section 3: Profile Page Changes

The Contact card's "Delivery address" row and its `PlacesAddressInput` are removed.  
Phone number stays.  
A "Manage addresses →" link pointing to `/dashboard/address-book` is added in place of the address row.

The `useUpdateProfile` mutation no longer accepts `address` / `address_state` fields.

---

## Section 4: Address Picker Modal

A shared `AddressPickerModal` component used in both the listing creation and buying flows.

### Props

```ts
type AddressPickerModalProps = {
  open: boolean
  onClose: () => void
  title: string                          // "Choose pickup address" | "Choose delivery address"
  currentAddress?: string | null
  onConfirm: (address: string, state: string | null) => void
}
```

### Modal Content

1. **Saved address list** — each address is a selectable card (label + formatted address + state). Active selection gets a primary-colored ring. Default address has a "Default" pill.
2. **"Use a different address" section** (always visible at the bottom, collapsed by default) — expands to show:
   - `PlacesAddressInput`
   - "Save to address book" checkbox (checked by default if user has < 10 addresses)
   - Label input (shown when checkbox is checked)
3. **Confirm button** — disabled until a selection is made or a new address is entered

**Empty address book:** modal skips the list and opens directly to the new-address form.

### Integration: Listing Flow

Affected files: `StepPricing.tsx`, `EditListingDrawer.tsx`

- Replace the inline `PlacesAddressInput` with a read-only address display field + "Change" button that opens `AddressPickerModal` with `title="Choose pickup address"`
- On mount, if the user has a default address and no `pickup_address` is already set on the listing, pre-fill with the default address
- Confirmed selection populates the existing hidden `pickup_address` field — no form shape changes

### Integration: Buying Flow

Affected file: `app/listings/[id]/page.tsx`

- When a buyer initiates purchase/claim with delivery selected, show `AddressPickerModal` with `title="Choose delivery address"` before proceeding to checkout
- Pre-fill with user's default address if one exists
- Confirmed address is passed to the order creation payload as `pickup_address` (field already exists on `Order`)

---

## Out of Scope

- Address validation beyond what Google Places provides
- Multiple default addresses per context (e.g. separate pickup vs delivery default) — one default serves both flows
- Dispatcher address book — dispatchers use a separate bank/profile setup flow
