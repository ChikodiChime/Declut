# Free & Donate Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `claims`, `charities`, and `donations` tables plus their API routes so free-item claiming and donate-to-charity flows work end-to-end.

**Architecture:** Three new tables (`claims`, `charities`, `donations`) are added via sequential migrations. `orders` is untouched — it stays Stripe-only. The listings POST is extended to create a `donations` row when `listing_type = 'donate'`. Six new API routes handle claims and donations CRUD; one public route exposes the charity list.

**Tech Stack:** Supabase (Postgres via `supabaseAdmin`), Next.js App Router route handlers, TypeScript. Pattern: `ok()` / `err()` / `list()` from `@/lib/api-response`, `getAuthUser()` from `@/lib/auth`.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/013_claims.sql` | claims table + indexes |
| Create | `supabase/migrations/014_charities_donations.sql` | charities + donations tables |
| Create | `supabase/seeds/002_charities.sql` | seed Nigerian charities |
| Create | `app/api/charities/route.ts` | GET active charities list |
| Create | `app/api/claims/route.ts` | POST — buyer claims a free listing |
| Create | `app/api/claims/[id]/route.ts` | PATCH — accept / complete / cancel |
| Create | `app/api/claims/mine/route.ts` | GET — buyer's claims |
| Create | `app/api/seller/claims/route.ts` | GET — seller's incoming claims |
| Modify | `app/api/listings/route.ts` | POST: insert donations row for donate type |
| Create | `app/api/donations/[id]/route.ts` | PATCH — update handoff / delivery status |

---

## Task 1: Migration — claims table

**Files:**
- Create: `supabase/migrations/013_claims.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/013_claims.sql
-- Rollback:
--   drop table if exists public.claims;

create table public.claims (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  buyer_id       uuid not null references public.users(id) on delete cascade,
  status         text not null default 'pending'
                   check (status in ('pending', 'accepted', 'completed', 'cancelled')),
  pickup_address text,
  claimed_at     timestamptz not null default now(),
  accepted_at    timestamptz,
  completed_at   timestamptz,

  unique(listing_id)
);

create index claims_buyer_id_idx  on public.claims(buyer_id);
create index claims_status_idx    on public.claims(status);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applies without error.

- [ ] **Step 3: Verify in Supabase dashboard**

Open Table Editor → confirm `claims` table exists with all columns and the unique constraint on `listing_id`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/013_claims.sql
git commit -m "feat: add claims table for free item flow"
```

---

## Task 2: Migration — charities and donations tables

**Files:**
- Create: `supabase/migrations/014_charities_donations.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/014_charities_donations.sql
-- Rollback:
--   drop table if exists public.donations;
--   drop table if exists public.charities;

create table public.charities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  logo_url    text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.donations (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null unique references public.listings(id) on delete cascade,
  seller_id           uuid not null references public.users(id) on delete cascade,
  charity_id          uuid references public.charities(id),           -- null = "any"
  assigned_charity_id uuid references public.charities(id),           -- set by platform

  handoff_status  text not null default 'pending'
                    check (handoff_status in ('pending', 'received')),
  received_at     timestamptz,

  delivery_status text not null default 'pending'
                    check (delivery_status in ('pending', 'delivered')),
  delivered_at    timestamptz,

  created_at      timestamptz not null default now()
);

create index donations_seller_id_idx  on public.donations(seller_id);
create index donations_charity_id_idx on public.donations(charity_id);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: applies without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/014_charities_donations.sql
git commit -m "feat: add charities and donations tables"
```

---

## Task 3: Seed Nigerian charities

**Files:**
- Create: `supabase/seeds/002_charities.sql`

- [ ] **Step 1: Create the seed file**

```sql
-- supabase/seeds/002_charities.sql
insert into public.charities (name, description) values
  ('Lagos Food Bank Initiative',    'Provides food to vulnerable families across Lagos State'),
  ('Smile Foundation Nigeria',      'Supporting underprivileged children with education and healthcare'),
  ('Sickle Cell Foundation Nigeria','Improving quality of life for people living with sickle cell disease'),
  ('Kucheli Foundation',            'Empowering rural communities in northern Nigeria'),
  ('Reach Out To Africa (ROTA)',    'Supplying essential clothing and goods to displaced families')
on conflict (name) do nothing;
```

- [ ] **Step 2: Run the seed**

```bash
npx supabase db seed
```

Expected: 5 rows inserted (or 0 if already seeded).

- [ ] **Step 3: Verify**

Open Table Editor → `charities` → confirm 5 rows present, all `active = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/seeds/002_charities.sql
git commit -m "seed: add five Nigerian charities"
```

---

## Task 4: GET /api/charities — public charity list

**Files:**
- Create: `app/api/charities/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/charities/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { list, err } from '@/lib/api-response'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('charities')
    .select('id, name, description, logo_url')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) return err('Failed to fetch charities', 'SERVER_ERROR', 500)

  return list(data ?? [], { total: data?.length ?? 0, limit: 100, offset: 0 })
}
```

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

```bash
curl http://localhost:3000/api/charities
```

Expected: `{ "data": [ { "id": "...", "name": "Lagos Food Bank Initiative", ... }, ... ], "meta": { "total": 5 } }`

- [ ] **Step 3: Commit**

```bash
git add app/api/charities/route.ts
git commit -m "feat: GET /api/charities - public charity list"
```

---

## Task 5: POST /api/claims — buyer claims a free listing

**Files:**
- Create: `app/api/claims/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/claims/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const { listing_id } = body as Record<string, unknown>
  if (!listing_id || typeof listing_id !== 'string') {
    return err('listing_id is required', 'VALIDATION_ERROR', 400)
  }

  const { data: listing, error: listingError } = await supabaseAdmin
    .from('listings')
    .select('id, listing_type, status, seller_id, pickup_address')
    .eq('id', listing_id)
    .single()

  if (listingError || !listing) return err('Listing not found', 'NOT_FOUND', 404)
  if (listing.listing_type !== 'free') return err('Listing is not a free item', 'VALIDATION_ERROR', 400)
  if (listing.status !== 'available') return err('Listing is no longer available', 'CONFLICT', 409)
  if (listing.seller_id === authUser.id) return err('Cannot claim your own listing', 'VALIDATION_ERROR', 400)

  const { data: claim, error: claimError } = await supabaseAdmin
    .from('claims')
    .insert({ listing_id, buyer_id: authUser.id })
    .select('*')
    .single()

  if (claimError) {
    if (claimError.code === '23505') {
      return err('This item has already been claimed', 'CONFLICT', 409)
    }
    console.error('Create claim error:', claimError)
    return err('Failed to create claim', 'SERVER_ERROR', 500)
  }

  await supabaseAdmin
    .from('listings')
    .update({ status: 'claimed' })
    .eq('id', listing_id)

  return ok(claim, 201)
}
```

- [ ] **Step 2: Test the happy path**

Create a free listing in the DB, then:

```bash
curl -X POST http://localhost:3000/api/claims \
  -H "Content-Type: application/json" \
  -H "Cookie: <buyer session cookie>" \
  -d '{ "listing_id": "<free-listing-uuid>" }'
```

Expected: `201` with claim object; listing status changes to `claimed`.

- [ ] **Step 3: Test duplicate claim rejection**

Run the same request again.

Expected: `409` with `"This item has already been claimed"`.

- [ ] **Step 4: Commit**

```bash
git add app/api/claims/route.ts
git commit -m "feat: POST /api/claims - buyer claims free listing"
```

---

## Task 6: PATCH /api/claims/[id] — accept / complete / cancel

**Files:**
- Create: `app/api/claims/[id]/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/claims/[id]/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const SELLER_TRANSITIONS: Record<string, string> = {
  accepted: 'pending',
  cancelled: 'pending',
}

const BUYER_TRANSITIONS: Record<string, string> = {
  completed: 'accepted',
  cancelled: 'pending',
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { data: claim, error: fetchError } = await supabaseAdmin
    .from('claims')
    .select('*, listing:listings(seller_id)')
    .eq('id', id)
    .single()

  if (fetchError || !claim) return err('Claim not found', 'NOT_FOUND', 404)

  const isSeller = claim.listing.seller_id === authUser.id
  const isBuyer = claim.buyer_id === authUser.id

  if (!isSeller && !isBuyer) return err('Forbidden', 'FORBIDDEN', 403)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const { status, pickup_address } = body as Record<string, unknown>

  if (!status || typeof status !== 'string') {
    return err('status is required', 'VALIDATION_ERROR', 400)
  }

  const allowedTransitions = isSeller ? SELLER_TRANSITIONS : BUYER_TRANSITIONS

  if (!(status in allowedTransitions)) {
    return err(`Cannot set status to ${status}`, 'VALIDATION_ERROR', 400)
  }

  if (allowedTransitions[status] !== claim.status) {
    return err(
      `Claim must be in '${allowedTransitions[status]}' status to transition to '${status}'`,
      'CONFLICT',
      409
    )
  }

  if (status === 'accepted') {
    if (!pickup_address || typeof pickup_address !== 'string' || !pickup_address.trim()) {
      return err('pickup_address is required when accepting a claim', 'VALIDATION_ERROR', 400)
    }
  }

  const now = new Date().toISOString()
  const timestamps: Record<string, string> = {
    accepted: 'accepted_at',
    completed: 'completed_at',
  }

  const updates: Record<string, unknown> = { status }
  if (timestamps[status]) updates[timestamps[status]] = now
  if (status === 'accepted' && pickup_address) updates.pickup_address = (pickup_address as string).trim()

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('claims')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError || !updated) {
    console.error('Update claim error:', updateError)
    return err('Failed to update claim', 'SERVER_ERROR', 500)
  }

  if (status === 'cancelled') {
    await supabaseAdmin
      .from('listings')
      .update({ status: 'available' })
      .eq('id', claim.listing_id)
  }

  if (status === 'completed') {
    // 'sold' is the closest available terminal status; free items don't have a dedicated 'given' status in MVP
    await supabaseAdmin
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', claim.listing_id)
  }

  return ok(updated)
}
```

- [ ] **Step 2: Test seller accepts**

```bash
curl -X PATCH http://localhost:3000/api/claims/<claim-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: <seller session cookie>" \
  -d '{ "status": "accepted", "pickup_address": "12 Bode Thomas, Surulere, Lagos" }'
```

Expected: `200` with `status: "accepted"` and `pickup_address` set.

- [ ] **Step 3: Test buyer cancels from pending**

Create a fresh claim, then:

```bash
curl -X PATCH http://localhost:3000/api/claims/<new-claim-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: <buyer session cookie>" \
  -d '{ "status": "cancelled" }'
```

Expected: `200` with `status: "cancelled"`; listing status reverts to `available`.

- [ ] **Step 4: Test buyer completes**

Accept the claim in Step 2 first, then:

```bash
curl -X PATCH http://localhost:3000/api/claims/<claim-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: <buyer session cookie>" \
  -d '{ "status": "completed" }'
```

Expected: `200` with `status: "completed"`; listing status becomes `sold`.

- [ ] **Step 5: Commit**

```bash
git add app/api/claims/[id]/route.ts
git commit -m "feat: PATCH /api/claims/[id] - accept, complete, cancel"
```

---

## Task 7: GET /api/claims/mine — buyer's claims

**Files:**
- Create: `app/api/claims/mine/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/claims/mine/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { list, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data, error } = await supabaseAdmin
    .from('claims')
    .select('*, listing:listings(id, title, images, area, seller:users(id, name, avatar_url))')
    .eq('buyer_id', authUser.id)
    .order('claimed_at', { ascending: false })

  if (error) {
    console.error('Fetch buyer claims error:', error)
    return err('Failed to fetch claims', 'SERVER_ERROR', 500)
  }

  return list(data ?? [], { total: data?.length ?? 0, limit: 100, offset: 0 })
}
```

- [ ] **Step 2: Verify**

```bash
curl http://localhost:3000/api/claims/mine \
  -H "Cookie: <buyer session cookie>"
```

Expected: array of claims with nested listing + seller data.

- [ ] **Step 3: Commit**

```bash
git add app/api/claims/mine/route.ts
git commit -m "feat: GET /api/claims/mine - buyer claims list"
```

---

## Task 8: GET /api/seller/claims — seller's incoming claims

**Files:**
- Create: `app/api/seller/claims/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/seller/claims/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { list, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data: listings, error: listingsError } = await supabaseAdmin
    .from('listings')
    .select('id')
    .eq('seller_id', authUser.id)
    .eq('listing_type', 'free')

  if (listingsError) return err('Failed to fetch listings', 'SERVER_ERROR', 500)

  const listingIds = (listings ?? []).map((l) => l.id)

  if (listingIds.length === 0) {
    return list([], { total: 0, limit: 100, offset: 0 })
  }

  const { data, error } = await supabaseAdmin
    .from('claims')
    .select('*, listing:listings(id, title, images, area), buyer:users(id, name, avatar_url)')
    .in('listing_id', listingIds)
    .order('claimed_at', { ascending: false })

  if (error) {
    console.error('Fetch seller claims error:', error)
    return err('Failed to fetch claims', 'SERVER_ERROR', 500)
  }

  return list(data ?? [], { total: data?.length ?? 0, limit: 100, offset: 0 })
}
```

- [ ] **Step 2: Verify**

```bash
curl http://localhost:3000/api/seller/claims \
  -H "Cookie: <seller session cookie>"
```

Expected: array of incoming claims for all seller's free listings.

- [ ] **Step 3: Commit**

```bash
git add app/api/seller/claims/route.ts
git commit -m "feat: GET /api/seller/claims - seller incoming claims"
```

---

## Task 9: Create donation row when listing type is donate

**Files:**
- Modify: `app/api/listings/route.ts`

`charity_id` is not a `listings` column — it belongs on the `donations` row. No change to `utils.ts` is needed; read it separately from the raw request body.

- [ ] **Step 1: Update the POST handler in route.ts**

Open `app/api/listings/route.ts`. Find the POST handler. After the listing insert succeeds, add a conditional donations insert:

```ts
// After: const { data: listing, error } = await supabaseAdmin.from('listings').insert(...).select('*').single()
// And after: if (error || !listing) { ... }

if (validated.data.listing_type === 'donate') {
  const charityId = (body as Record<string, unknown>).charity_id
  await supabaseAdmin.from('donations').insert({
    listing_id: listing.id,
    seller_id: authUser.id,
    charity_id: typeof charityId === 'string' && charityId ? charityId : null,
  })
}
```

- [ ] **Step 2: Test creating a donate listing**

```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -H "Cookie: <seller session cookie>" \
  -d '{
    "title": "Old winter coat",
    "description": "Barely worn, size L",
    "listing_type": "donate",
    "category": "clothing",
    "condition": "good",
    "area": "Lekki, Lagos",
    "images": [],
    "charity_id": "<charity-uuid>"
  }'
```

Expected: `201` with the listing. Check `donations` table — one row should exist with `listing_id` and `charity_id` set.

- [ ] **Step 3: Test "any" option (no charity_id)**

Same request but omit `charity_id`.

Expected: `201`; `donations` row has `charity_id = null`.

- [ ] **Step 4: Commit**

```bash
git add app/api/listings/route.ts
git commit -m "feat: create donations row when donate listing is created"
```

---

## Task 10: PATCH /api/donations/[id] — platform updates handoff and delivery status

**Files:**
- Create: `app/api/donations/[id]/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/donations/[id]/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const VALID_HANDOFF_STATUSES = ['pending', 'received'] as const
const VALID_DELIVERY_STATUSES = ['pending', 'delivered'] as const

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const { handoff_status, delivery_status, assigned_charity_id } =
    body as Record<string, unknown>

  if (!handoff_status && !delivery_status && !assigned_charity_id) {
    return err(
      'Provide at least one of: handoff_status, delivery_status, assigned_charity_id',
      'VALIDATION_ERROR',
      400
    )
  }

  if (handoff_status && !VALID_HANDOFF_STATUSES.includes(handoff_status as typeof VALID_HANDOFF_STATUSES[number])) {
    return err('Invalid handoff_status', 'VALIDATION_ERROR', 400)
  }

  if (delivery_status && !VALID_DELIVERY_STATUSES.includes(delivery_status as typeof VALID_DELIVERY_STATUSES[number])) {
    return err('Invalid delivery_status', 'VALIDATION_ERROR', 400)
  }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {}

  if (handoff_status) {
    updates.handoff_status = handoff_status
    if (handoff_status === 'received') updates.received_at = now
  }

  if (delivery_status) {
    updates.delivery_status = delivery_status
    if (delivery_status === 'delivered') updates.delivered_at = now
  }

  if (assigned_charity_id && typeof assigned_charity_id === 'string') {
    updates.assigned_charity_id = assigned_charity_id
  }

  const { data: donation, error: updateError } = await supabaseAdmin
    .from('donations')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError || !donation) {
    console.error('Update donation error:', updateError)
    return err('Failed to update donation', 'SERVER_ERROR', 500)
  }

  if (delivery_status === 'delivered') {
    await supabaseAdmin
      .from('listings')
      .update({ status: 'donated' })
      .eq('id', donation.listing_id)
  }

  return ok(donation)
}
```

- [ ] **Step 2: Test marking item received by platform**

Get a donation `id` from the `donations` table, then:

```bash
curl -X PATCH http://localhost:3000/api/donations/<donation-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: <any authenticated session>" \
  -d '{ "handoff_status": "received" }'
```

Expected: `200` with `handoff_status: "received"` and `received_at` set.

- [ ] **Step 3: Test marking item delivered to charity**

```bash
curl -X PATCH http://localhost:3000/api/donations/<donation-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: <any authenticated session>" \
  -d '{ "delivery_status": "delivered" }'
```

Expected: `200` with `delivery_status: "delivered"` and `delivered_at` set; listing status changes to `donated`.

- [ ] **Step 4: Test assigning a charity to an "any" donation**

```bash
curl -X PATCH http://localhost:3000/api/donations/<donation-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: <any authenticated session>" \
  -d '{ "assigned_charity_id": "<charity-uuid>" }'
```

Expected: `200` with `assigned_charity_id` set.

- [ ] **Step 5: Commit**

```bash
git add app/api/donations/[id]/route.ts
git commit -m "feat: PATCH /api/donations/[id] - platform updates handoff and delivery status"
```
