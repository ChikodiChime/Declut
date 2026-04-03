# Phase 2: Listings — Design Spec

**Date:** 2026-04-03
**Scope:** Create/read listings, image upload, My Listings dashboard

---

## Goal

Enable sellers to create, view, edit, and manage their listings. Buyers can view a single listing by ID. Public browse/search/filter is Phase 3.

---

## Pages

| Route | Description |
|-------|-------------|
| `/listings/new` | 4-step create form |
| `/listings/mine` | Seller's listing dashboard (My Listings) |
| `/listings/[id]/edit` | Pre-filled 4-step edit form |

All three pages require authentication (proxy already enforces `/dashboard/:path*` and `/api/*` — page-level auth for `/listings/*` will be enforced by checking `getAuthUser()` in the page and redirecting if null).

---

## API Routes

All routes follow the existing pattern: thin `route.ts` + logic in `utils.ts`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/listings` | Required | Create a listing |
| `GET` | `/api/listings/mine` | Required | Seller's own listings |
| `GET` | `/api/listings/[id]` | Optional | Single listing (public) |
| `PATCH` | `/api/listings/[id]` | Required (owner) | Partial update |
| `DELETE` | `/api/listings/[id]` | Required (owner) | Delete listing |

**Ownership check:** `PATCH` and `DELETE` verify `x-user-id === listing.seller_id` before touching the DB. Returns `403` if not the owner.

**Partial updates:** `PATCH` accepts any subset of listing fields. Validation only runs on fields present in the body.

**Proxy matcher update:** Add `/api/listings/:path*` and `/api/upload` to the matcher in `proxy.ts`.

**Note on `GET /api/listings/[id]`:** The proxy will require auth on this route in Phase 2 (since there's no public browse yet). In Phase 3, the proxy matcher will be updated to allow unauthenticated GET requests to listing detail routes.

---

## Multi-Step Form

Shared `ListingForm` component used by both `/listings/new` and `/listings/[id]/edit`.

**`ListingFormData` type** (defined in `types/index.ts`):
```ts
export interface ListingFormData {
  listing_type: ListingType
  title: string
  description: string
  category: string
  condition: Condition
  price: number | null
  area: string
  images: string[]  // Cloudinary public_ids
}
```

**Props:**
```ts
interface ListingFormProps {
  initialValues?: Partial<ListingFormData>
  onSubmit: (data: ListingFormData) => Promise<void>
  isPending: boolean
}
```

**Step state:** Managed by `useReducer` in `ListingForm` — a `step` counter (1–4) and accumulated `formData`.

**Per-step validation:** Each step uses **React Hook Form** (`useForm`) scoped to that step's fields. The "Next" button triggers `handleSubmit` — if validation passes, data is merged into the parent `formData` and `step` increments. If validation fails, inline field errors appear (no toast for field errors).

### Step 1 — Listing Type
- Select one: **For Sale** / **Free** / **Donate**
- Displayed as three large selectable cards
- Required — cannot proceed without a selection

### Step 2 — Details
| Field | Type | Validation |
|-------|------|------------|
| Title | text input | Required, max 100 chars |
| Description | textarea | Optional, max 1000 chars |
| Category | dropdown | Required |
| Condition | dropdown | Required |

**Categories:** Electronics, Furniture & Home, Clothing & Accessories, Appliances, Books & Stationery, Kids & Baby, Sports & Outdoors, Vehicles & Parts, Other

**Conditions:** New, Like New, Good, Fair, Poor

### Step 3 — Pricing & Location
| Field | Type | Shown when | Validation |
|-------|------|-----------|------------|
| Price (₦) | number input | `listing_type === 'for_sale'` | Required, > 0 |
| Area | text input | Always | Required (e.g. "Ajah, Lagos") |

### Step 4 — Photos
- Custom file picker (`<input type="file" accept="image/*">`)
- On file select → crop modal opens (`react-easy-crop`, 4:3 ratio)
- On crop confirm → cropped Blob `POST`ed to `/api/upload`
- `/api/upload` calls Cloudinary Node SDK, returns `{ public_id }`
- `public_id` added to `images` array, thumbnail shown via `CldImage`
- Min 1 image, max 5. Attempting to submit with 0 shows a toast error.
- Can remove any image before submitting (removes from `images` array)

---

## Image Upload

### Browser → `/api/upload`
```
POST /api/upload
Content-Type: multipart/form-data
Body: file (Blob)

Response: { public_id: string }
```

### `/api/upload` → Cloudinary
- Uses `cloudinary.uploader.upload()` from the Node.js SDK
- Uploads to folder `listings/`
- Returns `public_id` (e.g. `listings/abc123xyz`)
- Route is protected (requires valid JWT cookie)

### Display
```tsx
<CldImage src={public_id} width={400} height={300} crop="fill" gravity="auto" alt={title} />
```

**Env vars required:**
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## My Listings Page (`/listings/mine`)

Grid of `ListingCard` components. Each card shows:
- Primary image (via `CldImage`)
- Title
- Listing type badge (For Sale / Free / Donate)
- Status badge (Available / Sold / Claimed / Donated)
- Price (if For Sale)
- Area

**Actions per card:**
- **Edit** — navigates to `/listings/[id]/edit`
- **Update status** — dropdown: Available / Sold / Claimed / Donated → calls `PATCH /api/listings/[id]` with `{ status }`, optimistic update
- **Delete** — confirmation dialog → calls `DELETE /api/listings/[id]`, optimistic removal

Empty state: "You haven't listed anything yet. [Create your first listing →]"

---

## React Query Hooks (`lib/hooks/useListings.ts`)

```ts
useMyListings()         // GET /api/listings/mine
useListing(id)          // GET /api/listings/[id]
useCreateListing()      // POST /api/listings
useUpdateListing(id)    // PATCH /api/listings/[id]
useDeleteListing(id)    // DELETE /api/listings/[id]
useUploadImage()        // POST /api/upload
```

Same pattern as `useAuth.ts`: `useMutation` for writes, `useQuery` for reads. On success, invalidate `['listings', 'mine']` query.

---

## Toast Notifications (`sonner`)

| Event | Toast |
|-------|-------|
| Listing created | `toast.success('Listing published!')` |
| Listing updated | `toast.success('Listing updated')` |
| Listing deleted | `toast.success('Listing deleted')` |
| Status updated | `toast.success('Status updated')` |
| Upload fails | `toast.error('Upload failed — please try again')` |
| API error | `toast.error(error.message)` |
| 0 images on submit | `toast.error('Please add at least one photo')` |

`<Toaster />` added to root `layout.tsx`.

---

## New Dependencies

```bash
npm install react-hook-form react-easy-crop cloudinary next-cloudinary sonner
```

---

## File Map

```
app/
  api/
    listings/
      route.ts                  — POST (create), handler calls utils
      utils.ts                  — validateListingBody(), createListing()
      mine/
        route.ts                — GET seller's listings
      [id]/
        route.ts                — GET (public), PATCH (owner), DELETE (owner)
        utils.ts                — validateUpdateBody(), ownershipCheck()
    upload/
      route.ts                  — POST multipart → Cloudinary SDK → { public_id }
  listings/
    new/
      page.tsx                  — mounts ListingForm with empty initialValues
    mine/
      page.tsx                  — fetches useMyListings(), renders ListingCard grid
    [id]/
      edit/
        page.tsx                — fetches useListing(id), mounts ListingForm pre-filled
components/
  listings/
    ListingForm.tsx             — 4-step form shell (useReducer for step + formData)
    ListingCard.tsx             — card with image, badges, action buttons
    steps/
      StepType.tsx              — listing type selection cards
      StepDetails.tsx           — title, description, category, condition
      StepPricing.tsx           — price (conditional), area
      StepPhotos.tsx            — file input, crop modal, thumbnail grid
    ImageCropper.tsx            — react-easy-crop modal (4:3, returns cropped Blob)
    index.ts                    — barrel export
lib/
  hooks/
    useListings.ts              — all listing + upload React Query hooks
proxy.ts                        — add /api/listings/:path* to matcher
```

---

## Validation Rules Summary

| Field | Rule |
|-------|------|
| listing_type | One of: `for_sale`, `free`, `donate` |
| title | Required, max 100 chars |
| description | Optional, max 1000 chars |
| category | One of the 9 defined categories |
| condition | One of: `new`, `like_new`, `good`, `fair`, `poor` |
| price | Required and > 0 when `listing_type === 'for_sale'`; omitted otherwise |
| area | Required, non-empty string |
| images | 1–5 `public_id` strings |

---

## Out of Scope (Phase 3+)

- Public browse/search/filter (including filter by seller)
- Claim flow for Free listings
- Donation flow for Donate listings
- Cart and checkout
