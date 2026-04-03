# Phase 2: Listings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build create/read/update/delete listing API routes, a multi-step listing form, and a My Listings dashboard where sellers manage their listings.

**Architecture:** Thin API route handlers delegate to testable `utils.ts` files. A shared `ListingForm` component (4-step, `useReducer` state, React Hook Form per step) is used for both create and edit. Images are uploaded via a custom `/api/upload` route to Cloudinary, cropped client-side with `react-easy-crop`, stored as `public_id` strings, displayed with `CldImage`.

**Tech Stack:** Next.js 16 App Router, Supabase (supabaseAdmin), React Hook Form, react-easy-crop, cloudinary (Node SDK), next-cloudinary (CldImage), @tanstack/react-query, sonner (toasts), Tailwind 4, Vitest

> Read `node_modules/next/dist/docs/` before writing any Next.js-specific code.

---

## File Map

```
types/
  index.ts                         — add ListingFormData interface
proxy.ts                           — add /listings/:path* and /api/upload to matcher
app/
  layout.tsx                       — add <Toaster /> from sonner
  api/
    listings/
      route.ts                     — POST: create listing
      utils.ts                     — validateListingBody(), CATEGORIES, CONDITIONS constants
      mine/
        route.ts                   — GET: seller's own listings
      [id]/
        route.ts                   — GET (public), PATCH (owner), DELETE (owner)
        utils.ts                   — validateUpdateBody()
    upload/
      route.ts                     — POST: multipart → Cloudinary SDK → { public_id }
  listings/
    new/
      page.tsx                     — mounts ListingForm, calls useCreateListing
    mine/
      page.tsx                     — grid of ListingCard components
    [id]/
      edit/
        page.tsx                   — prefills ListingForm, calls useUpdateListing
components/
  listings/
    ListingForm.tsx                — step shell: useReducer(step + formData), renders steps
    ListingCard.tsx                — listing card with status dropdown + actions
    ImageCropper.tsx               — react-easy-crop modal, returns cropped Blob
    steps/
      StepType.tsx                 — radio cards: For Sale / Free / Donate
      StepDetails.tsx              — title, description, category, condition
      StepPricing.tsx              — price (for_sale only) + area
      StepPhotos.tsx               — file picker, crop trigger, thumbnail grid, submit
    index.ts                       — barrel export
lib/
  hooks/
    useListings.ts                 — all listing + upload React Query hooks
__tests__/
  api/
    listings/
      create.test.ts               — validateListingBody() tests
      update.test.ts               — validateUpdateBody() tests
```

---

### Task 1: Install dependencies, add env vars, update types

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`
- Modify: `types/index.ts`

- [ ] **Step 1: Install packages**

```bash
npm install react-hook-form react-easy-crop cloudinary next-cloudinary sonner
```

- [ ] **Step 2: Verify installations**

```bash
node -e "require('react-hook-form'); require('react-easy-crop'); require('cloudinary'); require('next-cloudinary'); require('sonner'); console.log('all ok')"
```

Expected: `all ok`

- [ ] **Step 3: Add Cloudinary env vars to `.env.local`**

Open `.env.local` and add these three lines (get values from cloudinary.com → your cloud → Settings → API Keys):

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

- [ ] **Step 4: Add `ListingFormData` to `types/index.ts`**

Open `types/index.ts` and append at the bottom:

```ts
// Form data shape for the create/edit listing form
export interface ListingFormData {
  listing_type: ListingType
  title: string
  description: string
  category: string
  condition: Condition
  price: number | null   // null for free/donate listings
  area: string
  images: string[]       // Cloudinary public_ids
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json types/index.ts
git commit -m "chore: add listing deps and ListingFormData type"
```

---

### Task 2: Update proxy matcher

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Add `/listings/:path*` and `/api/upload` to the matcher**

In `proxy.ts`, replace the `config` export:

```ts
export const config = {
  matcher: [
    '/api/listings/:path*',
    '/api/users/:path*',
    '/api/upload',
    '/listings/:path*',
    '/dashboard/:path*',
  ],
}
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: build output ending with route list, no errors.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: extend proxy matcher to cover listings pages and upload route"
```

---

### Task 3: POST /api/listings (create listing)

**Files:**
- Create: `app/api/listings/utils.ts`
- Create: `app/api/listings/route.ts`
- Create: `__tests__/api/listings/create.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/listings/create.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateListingBody } from '@/app/api/listings/utils'

describe('validateListingBody', () => {
  const valid = {
    listing_type: 'for_sale',
    title: 'Blue Nike shoes',
    description: 'Barely worn',
    category: 'Clothing & Accessories',
    condition: 'like_new',
    price: 15000,
    area: 'Ajah, Lagos',
    images: ['listings/abc123'],
  }

  it('returns valid:true for a correct for_sale body', () => {
    const result = validateListingBody(valid)
    expect(result).toHaveProperty('valid', true)
  })

  it('returns error when listing_type is missing', () => {
    const result = validateListingBody({ ...valid, listing_type: undefined })
    expect(result).toHaveProperty('error')
  })

  it('returns error when listing_type is invalid', () => {
    const result = validateListingBody({ ...valid, listing_type: 'auction' })
    expect(result).toHaveProperty('error')
  })

  it('returns error when title is missing', () => {
    const result = validateListingBody({ ...valid, title: undefined })
    expect(result).toHaveProperty('error')
  })

  it('returns error when title exceeds 100 chars', () => {
    const result = validateListingBody({ ...valid, title: 'a'.repeat(101) })
    expect(result).toHaveProperty('error')
  })

  it('returns error when category is invalid', () => {
    const result = validateListingBody({ ...valid, category: 'Weapons' })
    expect(result).toHaveProperty('error')
  })

  it('returns error when condition is invalid', () => {
    const result = validateListingBody({ ...valid, condition: 'perfect' })
    expect(result).toHaveProperty('error')
  })

  it('returns error when for_sale has no price', () => {
    const result = validateListingBody({ ...valid, price: undefined })
    expect(result).toHaveProperty('error')
  })

  it('returns error when for_sale price is 0', () => {
    const result = validateListingBody({ ...valid, price: 0 })
    expect(result).toHaveProperty('error')
  })

  it('does not require price for free listings', () => {
    const result = validateListingBody({ ...valid, listing_type: 'free', price: undefined })
    expect(result).toHaveProperty('valid', true)
  })

  it('returns error when images array is empty', () => {
    const result = validateListingBody({ ...valid, images: [] })
    expect(result).toHaveProperty('error')
  })

  it('returns error when images array has more than 5 items', () => {
    const result = validateListingBody({ ...valid, images: ['a', 'b', 'c', 'd', 'e', 'f'] })
    expect(result).toHaveProperty('error')
  })

  it('returns error when area is missing', () => {
    const result = validateListingBody({ ...valid, area: undefined })
    expect(result).toHaveProperty('error')
  })

  it('sets price to null for free listings', () => {
    const result = validateListingBody({ ...valid, listing_type: 'free', price: undefined })
    if ('valid' in result) {
      expect(result.data.price).toBeNull()
    }
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/api/listings/create.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/listings/utils'`

- [ ] **Step 3: Create `app/api/listings/utils.ts`**

```ts
import type { ListingFormData, ListingType, Condition } from '@/types'

export const VALID_LISTING_TYPES: ListingType[] = ['for_sale', 'free', 'donate']
export const VALID_CONDITIONS: Condition[] = ['new', 'like_new', 'good', 'fair', 'poor']
export const VALID_CATEGORIES = [
  'Electronics',
  'Furniture & Home',
  'Clothing & Accessories',
  'Appliances',
  'Books & Stationery',
  'Kids & Baby',
  'Sports & Outdoors',
  'Vehicles & Parts',
  'Other',
]

interface ListingBody {
  listing_type?: unknown
  title?: unknown
  description?: unknown
  category?: unknown
  condition?: unknown
  price?: unknown
  area?: unknown
  images?: unknown
}

export function validateListingBody(body: ListingBody):
  | { valid: true; data: ListingFormData }
  | { error: string } {

  if (!body.listing_type || !VALID_LISTING_TYPES.includes(body.listing_type as ListingType)) {
    return { error: 'listing_type must be for_sale, free, or donate' }
  }
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    return { error: 'title is required' }
  }
  if ((body.title as string).length > 100) {
    return { error: 'title must be 100 characters or fewer' }
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return { error: 'description must be a string' }
  }
  if (body.description && (body.description as string).length > 1000) {
    return { error: 'description must be 1000 characters or fewer' }
  }
  if (!body.category || !VALID_CATEGORIES.includes(body.category as string)) {
    return { error: 'category is required and must be one of the valid categories' }
  }
  if (!body.condition || !VALID_CONDITIONS.includes(body.condition as Condition)) {
    return { error: 'condition must be new, like_new, good, fair, or poor' }
  }
  if (body.listing_type === 'for_sale') {
    if (body.price === undefined || body.price === null || typeof body.price !== 'number' || body.price <= 0) {
      return { error: 'price is required and must be greater than 0 for for_sale listings' }
    }
  }
  if (!body.area || typeof body.area !== 'string' || body.area.trim().length === 0) {
    return { error: 'area is required' }
  }
  if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 5) {
    return { error: 'between 1 and 5 images are required' }
  }
  if (!(body.images as unknown[]).every((img) => typeof img === 'string')) {
    return { error: 'images must be an array of strings' }
  }

  return {
    valid: true,
    data: {
      listing_type: body.listing_type as ListingType,
      title: (body.title as string).trim(),
      description: typeof body.description === 'string' ? body.description.trim() : '',
      category: body.category as string,
      condition: body.condition as Condition,
      price: body.listing_type === 'for_sale' ? (body.price as number) : null,
      area: (body.area as string).trim(),
      images: body.images as string[],
    },
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run __tests__/api/listings/create.test.ts
```

Expected: 14 tests PASS

- [ ] **Step 5: Create `app/api/listings/route.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { validateListingBody } from './utils'

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const validated = validateListingBody(body)

  if ('error' in validated) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .insert({ ...validated.data, seller_id: authUser.id })
    .select('*')
    .single()

  if (error || !listing) {
    console.error('Create listing error:', error)
    return Response.json({ error: 'Failed to create listing' }, { status: 500 })
  }

  return Response.json({ listing }, { status: 201 })
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/listings/ __tests__/api/listings/create.test.ts
git commit -m "feat: POST /api/listings — create listing"
```

---

### Task 4: GET /api/listings/mine

**Files:**
- Create: `app/api/listings/mine/route.ts`

- [ ] **Step 1: Create `app/api/listings/mine/route.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('seller_id', authUser.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get my listings error:', error)
    return Response.json({ error: 'Failed to fetch listings' }, { status: 500 })
  }

  return Response.json({ listings: listings ?? [] })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/listings/mine/
git commit -m "feat: GET /api/listings/mine — seller's own listings"
```

---

### Task 5: GET / PATCH / DELETE /api/listings/[id]

**Files:**
- Create: `app/api/listings/[id]/utils.ts`
- Create: `app/api/listings/[id]/route.ts`
- Create: `__tests__/api/listings/update.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/listings/update.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateUpdateBody } from '@/app/api/listings/[id]/utils'

describe('validateUpdateBody', () => {
  it('accepts a partial price-only update', () => {
    const result = validateUpdateBody({ price: 5000 })
    expect(result).toHaveProperty('valid', true)
  })

  it('accepts a status-only update', () => {
    const result = validateUpdateBody({ status: 'sold' })
    expect(result).toHaveProperty('valid', true)
  })

  it('returns error when price is 0', () => {
    const result = validateUpdateBody({ price: 0 })
    expect(result).toHaveProperty('error')
  })

  it('returns error when price is negative', () => {
    const result = validateUpdateBody({ price: -100 })
    expect(result).toHaveProperty('error')
  })

  it('returns error when status is invalid', () => {
    const result = validateUpdateBody({ status: 'pending' })
    expect(result).toHaveProperty('error')
  })

  it('returns error when title exceeds 100 chars', () => {
    const result = validateUpdateBody({ title: 'a'.repeat(101) })
    expect(result).toHaveProperty('error')
  })

  it('returns error when images array is empty', () => {
    const result = validateUpdateBody({ images: [] })
    expect(result).toHaveProperty('error')
  })

  it('returns error when body has no recognised fields', () => {
    const result = validateUpdateBody({})
    expect(result).toHaveProperty('error')
  })

  it('accepts a full update with multiple fields', () => {
    const result = validateUpdateBody({
      title: 'Updated title',
      price: 8000,
      area: 'Lekki, Lagos',
      status: 'available',
    })
    expect(result).toHaveProperty('valid', true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/api/listings/update.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/listings/[id]/utils'`

- [ ] **Step 3: Create `app/api/listings/[id]/utils.ts`**

```ts
import type { Listing, ListingStatus } from '@/types'
import { VALID_CATEGORIES, VALID_CONDITIONS } from '../utils'

const VALID_STATUSES: ListingStatus[] = ['available', 'sold', 'claimed', 'donated']

interface UpdateBody {
  title?: unknown
  description?: unknown
  category?: unknown
  condition?: unknown
  price?: unknown
  area?: unknown
  images?: unknown
  status?: unknown
}

export function validateUpdateBody(body: UpdateBody):
  | { valid: true; data: Partial<Listing> }
  | { error: string } {

  const data: Record<string, unknown> = {}

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return { error: 'title must be a non-empty string' }
    }
    if (body.title.length > 100) return { error: 'title must be 100 characters or fewer' }
    data.title = body.title.trim()
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') return { error: 'description must be a string' }
    if (body.description.length > 1000) return { error: 'description must be 1000 characters or fewer' }
    data.description = body.description.trim()
  }
  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category as string)) return { error: 'category is invalid' }
    data.category = body.category
  }
  if (body.condition !== undefined) {
    if (!VALID_CONDITIONS.includes(body.condition as string)) return { error: 'condition is invalid' }
    data.condition = body.condition
  }
  if (body.price !== undefined) {
    if (typeof body.price !== 'number' || body.price <= 0) {
      return { error: 'price must be a number greater than 0' }
    }
    data.price = body.price
  }
  if (body.area !== undefined) {
    if (typeof body.area !== 'string' || body.area.trim().length === 0) {
      return { error: 'area must be a non-empty string' }
    }
    data.area = body.area.trim()
  }
  if (body.images !== undefined) {
    if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 5) {
      return { error: 'between 1 and 5 images are required' }
    }
    if (!(body.images as unknown[]).every((img) => typeof img === 'string')) {
      return { error: 'images must be strings' }
    }
    data.images = body.images
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as ListingStatus)) {
      return { error: 'status must be available, sold, claimed, or donated' }
    }
    data.status = body.status
  }

  if (Object.keys(data).length === 0) {
    return { error: 'no valid fields to update' }
  }

  return { valid: true, data: data as Partial<Listing> }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run __tests__/api/listings/update.test.ts
```

Expected: 9 tests PASS

- [ ] **Step 5: Create `app/api/listings/[id]/route.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { validateUpdateBody } from './utils'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !listing) {
    return Response.json({ error: 'Listing not found' }, { status: 404 })
  }

  return Response.json({ listing })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('seller_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return Response.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (existing.seller_id !== authUser.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const validated = validateUpdateBody(body)

  if ('error' in validated) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .update(validated.data)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !listing) {
    console.error('Update listing error:', error)
    return Response.json({ error: 'Failed to update listing' }, { status: 500 })
  }

  return Response.json({ listing })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('seller_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return Response.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (existing.seller_id !== authUser.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('listings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Delete listing error:', error)
    return Response.json({ error: 'Failed to delete listing' }, { status: 500 })
  }

  return Response.json({ success: true })
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/listings/[id]/ __tests__/api/listings/update.test.ts
git commit -m "feat: GET/PATCH/DELETE /api/listings/[id]"
```

---

### Task 6: POST /api/upload (Cloudinary)

**Files:**
- Create: `app/api/upload/route.ts`

- [ ] **Step 1: Create `app/api/upload/route.ts`**

```ts
import { v2 as cloudinary } from 'cloudinary'
import { getAuthUser } from '@/lib/auth'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return Response.json({ error: 'File must be an image' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise<{ public_id: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: 'listings', resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'))
          resolve({ public_id: result.public_id })
        }
      )
      .end(buffer)
  })

  return Response.json(result, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/upload/
git commit -m "feat: POST /api/upload — Cloudinary image upload"
```

---

### Task 7: useListings hooks + Toaster

**Files:**
- Create: `lib/hooks/useListings.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `lib/hooks/useListings.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Listing, ListingFormData, ListingStatus } from '@/types'

async function apiRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
  return data
}

export function useMyListings() {
  return useQuery<{ listings: Listing[] }>({
    queryKey: ['listings', 'mine'],
    queryFn: () => apiRequest('GET', '/api/listings/mine'),
  })
}

export function useListing(id: string) {
  return useQuery<{ listing: Listing }>({
    queryKey: ['listings', id],
    queryFn: () => apiRequest('GET', `/api/listings/${id}`),
    enabled: !!id,
  })
}

export function useCreateListing() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ListingFormData) => apiRequest('POST', '/api/listings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
      toast.success('Listing published!')
      router.push('/listings/mine')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateListing(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<ListingFormData & { status: ListingStatus }>) =>
      apiRequest('PATCH', `/api/listings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['listings', id] })
      toast.success('Listing updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/listings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
      toast.success('Listing deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (blob: Blob): Promise<{ public_id: string }> => {
      const form = new FormData()
      form.append('file', blob, 'image.jpg')
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      return data
    },
    onError: () => toast.error('Upload failed — please try again'),
  })
}
```

- [ ] **Step 2: Add `<Toaster />` to `app/layout.tsx`**

In `app/layout.tsx`, add the import after the existing imports:

```ts
import { Toaster } from 'sonner'
```

Then inside `<body>`, add `<Toaster />` right before `</body>`:

```tsx
<body className="min-h-full flex flex-col">
  <Providers>{children}</Providers>
  <Toaster richColors position="top-right" />
</body>
```

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useListings.ts app/layout.tsx
git commit -m "feat: useListings hooks and sonner Toaster"
```

---

### Task 8: ImageCropper component

**Files:**
- Create: `components/listings/ImageCropper.tsx`

- [ ] **Step 1: Create `components/listings/ImageCropper.tsx`**

```tsx
'use client'

import Cropper from 'react-easy-crop'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui'

interface Area {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropperProps {
  imageSrc: string
  onCropDone: (blob: Blob) => void
  onCancel: () => void
}

async function getCroppedBlob(imageSrc: string, cropArea: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  canvas.width = cropArea.width
  canvas.height = cropArea.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas empty'))),
      'image/jpeg',
      0.9
    )
  })
}

export function ImageCropper({ imageSrc, onCropDone, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
    onCropDone(blob)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={4 / 3}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div className="flex gap-3 justify-end p-4 bg-card">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleConfirm}>
          Use Photo
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/listings/ImageCropper.tsx
git commit -m "feat: ImageCropper component (react-easy-crop, 4:3)"
```

---

### Task 9: Step components

**Files:**
- Create: `components/listings/steps/StepType.tsx`
- Create: `components/listings/steps/StepDetails.tsx`
- Create: `components/listings/steps/StepPricing.tsx`
- Create: `components/listings/steps/StepPhotos.tsx`

- [ ] **Step 1: Create `components/listings/steps/StepType.tsx`**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui'
import type { ListingType } from '@/types'

interface StepTypeData {
  listing_type: ListingType
}

interface StepTypeProps {
  defaultValues?: Partial<StepTypeData>
  onNext: (data: StepTypeData) => void
}

const OPTIONS: { value: ListingType; label: string; description: string }[] = [
  { value: 'for_sale', label: 'For Sale', description: 'Set a price, buyer pays via Stripe' },
  { value: 'free', label: 'Free', description: 'Give it away at no cost' },
  { value: 'donate', label: 'Donate', description: 'Donate to a charity' },
]

export function StepType({ defaultValues, onNext }: StepTypeProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StepTypeData>({ defaultValues })

  const selected = watch('listing_type')

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text mb-1">What kind of listing is this?</h2>
        <p className="text-sm text-text-muted">You can't change this after publishing.</p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={[
              'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors',
              selected === opt.value
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/40',
            ].join(' ')}
          >
            <input
              type="radio"
              value={opt.value}
              className="mt-1 accent-primary"
              {...register('listing_type', { required: 'Please select a listing type' })}
            />
            <div>
              <p className="font-semibold text-text">{opt.label}</p>
              <p className="text-sm text-text-muted">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      {errors.listing_type && (
        <p className="text-sm text-error">{errors.listing_type.message}</p>
      )}

      <Button type="submit" className="w-full">
        Next
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Create `components/listings/steps/StepDetails.tsx`**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { Input, Button } from '@/components/ui'
import type { Condition } from '@/types'

interface StepDetailsData {
  title: string
  description: string
  category: string
  condition: Condition
}

interface StepDetailsProps {
  defaultValues?: Partial<StepDetailsData>
  onNext: (data: StepDetailsData) => void
  onBack: () => void
}

const CATEGORIES = [
  'Electronics',
  'Furniture & Home',
  'Clothing & Accessories',
  'Appliances',
  'Books & Stationery',
  'Kids & Baby',
  'Sports & Outdoors',
  'Vehicles & Parts',
  'Other',
]

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
]

const selectClass = (hasError: boolean) =>
  [
    'block w-full px-4 py-3 text-text bg-card border rounded-md shadow-sm',
    'focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 transition duration-200',
    hasError ? 'border-error' : 'border-border',
  ].join(' ')

export function StepDetails({ defaultValues, onNext, onBack }: StepDetailsProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StepDetailsData>({ defaultValues })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <h2 className="text-xl font-bold text-text">Item details</h2>

      <Input
        label="Title"
        placeholder="e.g. Blue Nike Air Max size 43"
        error={errors.title?.message}
        {...register('title', {
          required: 'Title is required',
          maxLength: { value: 100, message: 'Title must be 100 characters or fewer' },
        })}
      />

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">
          Description <span className="text-text-muted">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Describe the item — any defects, history, or reasons for selling"
          className="block w-full px-4 py-3 text-text placeholder-text-muted bg-card border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 transition duration-200"
          {...register('description', {
            maxLength: { value: 1000, message: 'Description must be 1000 characters or fewer' },
          })}
        />
        {errors.description && (
          <p className="text-sm text-error">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">Category</label>
        <select
          className={selectClass(!!errors.category)}
          {...register('category', { required: 'Category is required' })}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-sm text-error">{errors.category.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">Condition</label>
        <select
          className={selectClass(!!errors.condition)}
          {...register('condition', { required: 'Condition is required' })}
        >
          <option value="">Select condition</option>
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {errors.condition && <p className="text-sm text-error">{errors.condition.message}</p>}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" className="flex-1">
          Next
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create `components/listings/steps/StepPricing.tsx`**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { Input, Button } from '@/components/ui'
import type { ListingType } from '@/types'

interface StepPricingData {
  price: number | null
  area: string
}

interface StepPricingProps {
  listingType: ListingType
  defaultValues?: Partial<StepPricingData>
  onNext: (data: StepPricingData) => void
  onBack: () => void
}

export function StepPricing({ listingType, defaultValues, onNext, onBack }: StepPricingProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StepPricingData>({ defaultValues })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <h2 className="text-xl font-bold text-text">Pricing & location</h2>

      {listingType === 'for_sale' && (
        <Input
          label="Price (₦)"
          type="number"
          min="1"
          placeholder="e.g. 15000"
          error={errors.price?.message}
          {...register('price', {
            required: 'Price is required for For Sale listings',
            valueAsNumber: true,
            min: { value: 1, message: 'Price must be greater than 0' },
          })}
        />
      )}

      <Input
        label="Area"
        placeholder="e.g. Ajah, Lagos"
        error={errors.area?.message}
        {...register('area', { required: 'Area is required' })}
      />

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" className="flex-1">
          Next
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Create `components/listings/steps/StepPhotos.tsx`**

```tsx
'use client'

import { useState, useRef } from 'react'
import { CldImage } from 'next-cloudinary'
import { Button } from '@/components/ui'
import { ImageCropper } from '../ImageCropper'
import { useUploadImage } from '@/lib/hooks/useListings'
import { toast } from 'sonner'

interface StepPhotosProps {
  defaultImages?: string[]
  onNext: (images: string[]) => void
  onBack: () => void
  isPending: boolean
}

export function StepPhotos({ defaultImages = [], onNext, onBack, isPending }: StepPhotosProps) {
  const [images, setImages] = useState<string[]>(defaultImages)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadImage()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    e.target.value = ''
  }

  async function handleCropDone(blob: Blob) {
    setCropSrc(null)
    try {
      const { public_id } = await uploadImage(blob)
      setImages((prev) => [...prev, public_id])
    } catch {
      // error toast is handled inside useUploadImage onError
    }
  }

  function handleCancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  function handleRemove(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    if (images.length === 0) {
      toast.error('Please add at least one photo')
      return
    }
    onNext(images)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-text">Photos</h2>
        <p className="text-sm text-text-muted">Add 1–5 photos. First photo is the cover image.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {images.map((public_id, i) => (
          <div key={public_id} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-border">
            <CldImage
              src={public_id}
              fill
              sizes="(max-width: 640px) 33vw, 20vw"
              className="object-cover"
              alt={`Photo ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
            >
              ×
            </button>
          </div>
        ))}

        {images.length < 5 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <span className="text-xs">Uploading…</span>
            ) : (
              <>
                <span className="text-2xl leading-none">+</span>
                <span className="text-xs">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          onCropDone={handleCropDone}
          onCancel={handleCancelCrop}
        />
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
          disabled={isPending}
        >
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          loading={isPending}
          disabled={isPending || isUploading}
        >
          {isPending ? 'Publishing…' : 'Publish Listing'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/listings/steps/
git commit -m "feat: add 4 listing form step components"
```

---

### Task 10: ListingForm shell

**Files:**
- Create: `components/listings/ListingForm.tsx`

- [ ] **Step 1: Create `components/listings/ListingForm.tsx`**

```tsx
'use client'

import { useReducer } from 'react'
import { StepType } from './steps/StepType'
import { StepDetails } from './steps/StepDetails'
import { StepPricing } from './steps/StepPricing'
import { StepPhotos } from './steps/StepPhotos'
import type { ListingFormData, ListingType } from '@/types'

export interface ListingFormProps {
  initialValues?: Partial<ListingFormData>
  onSubmit: (data: ListingFormData) => Promise<void>
  isPending: boolean
}

interface FormState {
  step: 1 | 2 | 3 | 4
  data: Partial<ListingFormData>
}

type FormAction =
  | { type: 'NEXT'; payload: Partial<ListingFormData> }
  | { type: 'BACK' }

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'NEXT':
      return {
        step: (Math.min(state.step + 1, 4)) as FormState['step'],
        data: { ...state.data, ...action.payload },
      }
    case 'BACK':
      return { ...state, step: (Math.max(state.step - 1, 1)) as FormState['step'] }
  }
}

const STEP_LABELS = ['Type', 'Details', 'Pricing', 'Photos']

export function ListingForm({ initialValues, onSubmit, isPending }: ListingFormProps) {
  const [state, dispatch] = useReducer(formReducer, {
    step: 1,
    data: initialValues ?? {},
  })

  async function handleFinalSubmit(images: string[]) {
    const finalData = { ...state.data, images } as ListingFormData
    await onSubmit(finalData)
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as FormState['step']
          const isActive = stepNum === state.step
          const isDone = stepNum < state.step
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={[
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    isActive
                      ? 'bg-primary text-white'
                      : isDone
                      ? 'bg-primary/20 text-primary'
                      : 'bg-border text-text-muted',
                  ].join(' ')}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                <span
                  className={`text-xs hidden sm:block ${
                    isActive ? 'text-text font-medium' : 'text-text-muted'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className="flex-1 h-px bg-border mx-2" />
              )}
            </div>
          )
        })}
      </div>

      {state.step === 1 && (
        <StepType
          defaultValues={{ listing_type: state.data.listing_type }}
          onNext={(data) => dispatch({ type: 'NEXT', payload: data })}
        />
      )}
      {state.step === 2 && (
        <StepDetails
          defaultValues={{
            title: state.data.title,
            description: state.data.description,
            category: state.data.category,
            condition: state.data.condition,
          }}
          onNext={(data) => dispatch({ type: 'NEXT', payload: data })}
          onBack={() => dispatch({ type: 'BACK' })}
        />
      )}
      {state.step === 3 && (
        <StepPricing
          listingType={state.data.listing_type as ListingType}
          defaultValues={{ price: state.data.price, area: state.data.area }}
          onNext={(data) => dispatch({ type: 'NEXT', payload: data })}
          onBack={() => dispatch({ type: 'BACK' })}
        />
      )}
      {state.step === 4 && (
        <StepPhotos
          defaultImages={state.data.images}
          onNext={handleFinalSubmit}
          onBack={() => dispatch({ type: 'BACK' })}
          isPending={isPending}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/listings/ListingForm.tsx
git commit -m "feat: ListingForm shell (4-step, useReducer)"
```

---

### Task 11: ListingCard component

**Files:**
- Create: `components/listings/ListingCard.tsx`

- [ ] **Step 1: Create `components/listings/ListingCard.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CldImage } from 'next-cloudinary'
import { Button } from '@/components/ui'
import { useDeleteListing, useUpdateListing } from '@/lib/hooks/useListings'
import type { Listing, ListingStatus } from '@/types'

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'donated', label: 'Donated' },
]

const TYPE_LABELS: Record<string, string> = {
  for_sale: 'For Sale',
  free: 'Free',
  donate: 'Donate',
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  sold: 'bg-gray-100 text-gray-600',
  claimed: 'bg-blue-100 text-blue-700',
  donated: 'bg-purple-100 text-purple-700',
}

interface ListingCardProps {
  listing: Listing
}

export function ListingCard({ listing }: ListingCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { mutate: deleteListing, isPending: isDeleting } = useDeleteListing()
  const { mutate: updateListing, isPending: isUpdating } = useUpdateListing(listing.id)

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden">
      <div className="relative aspect-[4/3]">
        {listing.images[0] ? (
          <CldImage
            src={listing.images[0]}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            alt={listing.title}
          />
        ) : (
          <div className="w-full h-full bg-border flex items-center justify-center text-text-muted text-sm">
            No photo
          </div>
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-medium">
          {TYPE_LABELS[listing.listing_type]}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-text truncate">{listing.title}</h3>
          <p className="text-sm text-text-muted">{listing.area}</p>
        </div>

        <div className="flex items-center justify-between">
          {listing.listing_type === 'for_sale' && listing.price != null && (
            <span className="font-bold text-primary">
              ₦{listing.price.toLocaleString()}
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ml-auto ${STATUS_COLORS[listing.status]}`}
          >
            {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
          </span>
        </div>

        <div className="space-y-2">
          <select
            value={listing.status}
            disabled={isUpdating}
            onChange={(e) => updateListing({ status: e.target.value as ListingStatus })}
            className="block w-full px-3 py-2 text-sm text-text bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Link href={`/listings/${listing.id}/edit`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Edit
              </Button>
            </Link>

            {confirmDelete ? (
              <div className="flex gap-1 flex-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-error text-error hover:bg-error/5"
                  loading={isDeleting}
                  onClick={() => deleteListing(listing.id)}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-error border-error hover:bg-error/5"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/listings/ListingCard.tsx
git commit -m "feat: ListingCard with status dropdown and delete confirmation"
```

---

### Task 12: Barrel export

**Files:**
- Create: `components/listings/index.ts`

- [ ] **Step 1: Create `components/listings/index.ts`**

```ts
export { ListingForm } from './ListingForm'
export { ListingCard } from './ListingCard'
export { ImageCropper } from './ImageCropper'
export { StepType } from './steps/StepType'
export { StepDetails } from './steps/StepDetails'
export { StepPricing } from './steps/StepPricing'
export { StepPhotos } from './steps/StepPhotos'
```

- [ ] **Step 2: Commit**

```bash
git add components/listings/index.ts
git commit -m "chore: barrel export for listings components"
```

---

### Task 13: /listings/new page

**Files:**
- Create: `app/listings/new/page.tsx`

- [ ] **Step 1: Create `app/listings/new/page.tsx`**

```tsx
'use client'

import { ListingForm } from '@/components/listings'
import { useCreateListing } from '@/lib/hooks/useListings'
import type { ListingFormData } from '@/types'

export default function NewListingPage() {
  const { mutateAsync: createListing, isPending } = useCreateListing()

  async function handleSubmit(data: ListingFormData) {
    await createListing(data)
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-12">
      <h1 className="text-2xl font-bold text-text text-center mb-8">Create a Listing</h1>
      <ListingForm onSubmit={handleSubmit} isPending={isPending} />
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/listings/new/
git commit -m "feat: /listings/new page"
```

---

### Task 14: /listings/mine page

**Files:**
- Create: `app/listings/mine/page.tsx`

- [ ] **Step 1: Create `app/listings/mine/page.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { ListingCard } from '@/components/listings'
import { useMyListings } from '@/lib/hooks/useListings'
import { Button } from '@/components/ui'

export default function MyListingsPage() {
  const { data, isLoading, error } = useMyListings()
  const listings = data?.listings ?? []

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-text-muted">Loading your listings…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-error">Failed to load listings. Please refresh.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text">My Listings</h1>
          <Link href="/listings/new">
            <Button size="sm">+ New Listing</Button>
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted mb-4">You haven't listed anything yet.</p>
            <Link href="/listings/new">
              <Button>Create your first listing →</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/listings/mine/
git commit -m "feat: /listings/mine page — seller dashboard"
```

---

### Task 15: /listings/[id]/edit page

**Files:**
- Create: `app/listings/[id]/edit/page.tsx`

- [ ] **Step 1: Create `app/listings/[id]/edit/page.tsx`**

```tsx
'use client'

import { use } from 'react'
import Link from 'next/link'
import { ListingForm } from '@/components/listings'
import { useListing, useUpdateListing } from '@/lib/hooks/useListings'
import type { ListingFormData } from '@/types'

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data, isLoading } = useListing(id)
  const { mutateAsync: updateListing, isPending } = useUpdateListing(id)

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-text-muted">Loading…</p>
      </main>
    )
  }

  if (!data?.listing) {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-error">
          Listing not found.{' '}
          <Link href="/listings/mine" className="underline text-primary">
            Back to My Listings
          </Link>
        </p>
      </main>
    )
  }

  const { listing } = data

  const initialValues: Partial<ListingFormData> = {
    listing_type: listing.listing_type,
    title: listing.title,
    description: listing.description ?? '',
    category: listing.category,
    condition: listing.condition,
    price: listing.price,
    area: listing.area,
    images: listing.images,
  }

  async function handleSubmit(formData: ListingFormData) {
    await updateListing(formData)
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-12">
      <h1 className="text-2xl font-bold text-text text-center mb-8">Edit Listing</h1>
      <ListingForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        isPending={isPending}
      />
    </main>
  )
}
```

- [ ] **Step 2: Run all tests to confirm nothing is broken**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 3: Run a production build to confirm no type errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds, route list shows `/listings/new`, `/listings/mine`, `/listings/[id]/edit`

- [ ] **Step 4: Commit**

```bash
git add app/listings/
git commit -m "feat: /listings/[id]/edit page — pre-filled edit form"
```
