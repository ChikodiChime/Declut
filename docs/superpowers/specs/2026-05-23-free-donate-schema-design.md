# Free & Donate Listings — DB Schema Design

**Date:** 2026-05-23
**Status:** Approved

---

## Context

The `listings` table already supports three types via `listing_type` ('for_sale', 'free', 'donate') and four statuses ('available', 'sold', 'claimed', 'donated'). The `orders` table and `order_items` table handle the paid flow exclusively. This spec covers the new tables needed for the free and donate flows.

---

## Approach

Three new tables: `claims`, `charities`, `donations`.

- `claims` — handles the free item claim handshake
- `charities` — platform-seeded lookup of donation recipients
- `donations` — tracks the two-leg donate journey (seller → Declutter → charity)

`orders` remains Stripe-only and is untouched.

---

## Free Item Flow

```
Buyer claims → listing locked (first-come-first-served)
             → seller notified
             → pickup_address revealed to buyer
             → buyer collects → marked completed
```

**Pickup only** — no delivery option for free items.

### `claims` table

```sql
create table public.claims (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id),
  buyer_id        uuid not null references public.users(id),
  status          text not null default 'pending'
                    check (status in ('pending', 'accepted', 'completed', 'cancelled')),
  pickup_address  text,
  claimed_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  completed_at    timestamptz,

  unique(listing_id)
);

create index claims_buyer_id_idx on public.claims(buyer_id);
create index claims_status_idx on public.claims(status);
```

**Key decisions:**
- `unique(listing_id)` enforces first-come-first-served at the DB level — the first insert wins, concurrent attempts get a unique violation.
- `pickup_address` lives on the claim, not the listing — only accessible to the buyer once status is `accepted`.
- Listing `status` transitions: `available` → `claimed` on insert; back to `available` on cancel.

### Status lifecycle

```
pending → accepted → completed
        ↘ cancelled
```

---

## Donate Item Flow

```
Seller lists → picks a charity (or "any")
             → delivers item to Declutter platform
             → platform assigns charity (if "any")
             → platform delivers to charity
             → listing marked donated
```

### `charities` table

Platform-seeded. Users cannot create charities.

```sql
create table public.charities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  logo_url    text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
```

### `donations` table

```sql
create table public.donations (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null unique references public.listings(id),
  seller_id           uuid not null references public.users(id),
  charity_id          uuid references public.charities(id),   -- null = "any"
  assigned_charity_id uuid references public.charities(id),   -- set by platform when charity_id is null

  -- Leg 1: seller → Declutter
  handoff_status      text not null default 'pending'
                        check (handoff_status in ('pending', 'received')),
  received_at         timestamptz,

  -- Leg 2: Declutter → charity
  delivery_status     text not null default 'pending'
                        check (delivery_status in ('pending', 'delivered')),
  delivered_at        timestamptz,

  created_at          timestamptz not null default now()
);

create index donations_seller_id_idx on public.donations(seller_id);
create index donations_charity_id_idx on public.donations(charity_id);
```

**Key decisions:**
- `charity_id = null` means the seller chose "any" — platform fills `assigned_charity_id` when routing.
- Two separate status columns (one per leg) so each stage is independently queryable.
- `unique(listing_id)` — one donation record per listing.
- Listing `status` moves to `donated` when `delivery_status = 'delivered'`.

### Status lifecycle

```
Leg 1 (handoff_status):   pending → received
Leg 2 (delivery_status):  pending → delivered
```

---

## What stays the same

- `listings.listing_type` and `listings.status` — no changes needed.
- `orders` table — Stripe flow only, untouched.
- Free and donate items **cannot be added to the cart**.

---

## Out of scope

- Donation tax receipts
- Charity management UI (admin only, future)
- Free item delivery (pickup only in MVP)
