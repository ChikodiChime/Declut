# Buyer Authentication Design

## Goal

Add buyer accounts (OTP-only, email-based) so buyers can track orders, link anonymous purchases to their account, and participate in the delivery confirmation flow — while keeping anonymous checkout intact.

## Architecture

Single OTP flow handles both new and returning buyers with no separate registration step. JWT shape matches existing seller tokens (`{ sub, email, account_type }`), so the proxy already injects identity headers on all authenticated requests. Account type (`buyer` vs `seller`) gates access to `/orders` vs `/dashboard` respectively.

## Tech Stack

- Next.js 16 App Router, proxy.ts for route protection
- Supabase (supabaseAdmin for DB operations)
- Resend for OTP email delivery
- JWT (existing `lib/jwt.ts`) for session tokens
- TanStack Query for client-side data fetching

---

## Auth Flow

1. Buyer enters email on `/login`
2. `POST /api/auth/buyer/otp` — generates 6-digit code, stores hashed with 15-min expiry in `otp_codes` table, sends via Resend
3. Buyer enters code → `POST /api/auth/buyer/verify` — validates hash, upserts user row with `account_type = 'buyer'`, issues JWT cookie
4. Redirect to `?next=` param or `/orders`

**Order backfill on login:** After issuing the JWT, query `orders` where `buyer_email = email AND buyer_id IS NULL` and set `buyer_id` to the new/existing user id. Anonymous purchases made before account creation appear in `/orders`.

**OTP security:**
- Code is 6 digits, stored as bcrypt hash
- Expires after 15 minutes
- Marked `used_at` on first use — replay rejected
- Rate limit: one active unexpired code per email (new request invalidates old)

---

## Entry Points

### A — During Checkout (optional, non-blocking)

After the buyer fills contact details on the checkout page, show a subtle inline prompt: "Log in to track this order." One click pre-fills their email into an inline OTP panel. Skipping it leaves anonymous checkout unchanged. If they complete OTP login before paying, their `buyer_id` is included in the order at creation time.

### B — Post-order CTA

- Success page: add "Track your order" button linking to `/login?next=/orders/[order-id]`
- Order confirmation email (sent by Stripe webhook handler): include the same link
- After login, buyer lands directly on that order's detail page

### C — Standalone `/login` Page

Clean page: email input → code input → redirect. Supports `?next=` for any protected route to bounce buyers here and return them post-auth. If a seller lands here, show a note: "Selling on Declutter? Sign in at [seller login]."

---

## Data Model

### New table: `otp_codes`

```sql
create table public.otp_codes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz default now()
);

create index otp_codes_email_idx on public.otp_codes (email);
```

No foreign key to `users` — OTP is requested before a user row may exist.

### `users` table — new column

```sql
alter table public.users
  add column if not exists account_type text not null default 'seller'
  check (account_type in ('buyer', 'seller'));
```

Existing rows default to `'seller'` — no data migration needed.

### `orders` table

No changes. `buyer_id uuid references users(id)` is already nullable. Backfill sets it on login.

---

## API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/buyer/otp` | Public | Send OTP code to email |
| POST | `/api/auth/buyer/verify` | Public | Verify code, issue JWT, backfill orders |
| GET | `/api/buyer/orders` | Buyer JWT | List buyer's orders |
| GET | `/api/buyer/orders/[id]` | Buyer JWT | Single order detail |

---

## Route Protection

### proxy.ts changes

- `/login` — public (add to bypass list)
- `/orders` and `/orders/[id]` — protected; require valid JWT with `account_type = 'buyer'`
- `/dashboard` — already protected; extend check to reject `account_type = 'buyer'` (redirect to `/orders`)
- `/api/buyer/*` — protected; require `account_type = 'buyer'`

### Proxy account-type enforcement

After token verification, check `x-user-account-type`:
- Buyer accessing `/dashboard` → redirect to `/orders`
- Seller accessing `/orders` → redirect to `/dashboard`

---

## Pages

### `/login`

Two-step form (email → code). No layout chrome beyond minimal header. Accepts `?next=` param. Shows seller login note if needed.

### `/orders`

Buyer order list. Shows listing thumbnail, title, status pill, delivery type, date. Links to `/orders/[id]`.

### `/orders/[id]`

Order detail: item, price, delivery type, status timeline, seller contact (email). Placeholder for delivery confirmation code input (built in next phase).

---

## Out of Scope (next phases)

- Delivery confirmation code entry on `/orders/[id]` (built with delivery flow)
- Courier order assignment
- Buyer profile/settings page
- Password-based login or social OAuth
