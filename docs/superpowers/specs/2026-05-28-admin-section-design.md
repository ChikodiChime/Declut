# Admin Section — Design Spec

**Date:** 2026-05-28
**Status:** Approved

---

## Overview

A standalone admin section at `/admin` for platform operators. Admins are the only users with `account_type = 'admin'`; accounts are created directly in the database (no self-registration). The admin section is fully isolated from the seller dashboard and dispatcher portal.

---

## Structure

```
app/admin/
  layout.tsx              ← admin shell with persistent sidebar
  page.tsx                ← redirects to /admin/dashboard
  dashboard/page.tsx      ← platform stats home
  users/page.tsx          ← user list + suspend/reactivate
  listings/page.tsx       ← listing list + remove
  orders/page.tsx         ← order list + force-cancel
  dispatchers/page.tsx    ← create + list dispatchers (existing, moved here)
  charities/page.tsx      ← CRUD for charities
```

Sidebar links (in order): **Dashboard · Users · Listings · Orders · Dispatchers · Charities**

Visual language matches the seller dashboard — same card style, same Tailwind token colors.

---

## API Endpoints

All endpoints under `/api/admin/*` require `account_type === 'admin'` enforced in both `proxy.ts` and each route handler via `getAuthUser()`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/stats` | Platform stats for dashboard |
| GET | `/api/admin/users` | List all users (50 rows, no pagination at MVP) |
| PATCH | `/api/admin/users/[id]` | Suspend or reactivate a user |
| GET | `/api/admin/listings` | List all listings (50 rows) |
| DELETE | `/api/admin/listings/[id]` | Remove a listing (sets status = 'removed') |
| GET | `/api/admin/orders` | List all orders (50 rows) |
| POST | `/api/admin/orders/[id]/cancel` | Force-cancel a pending/paid order |
| GET | `/api/admin/charities` | List charities |
| POST | `/api/admin/charities` | Add a charity |
| PATCH | `/api/admin/charities/[id]` | Edit a charity |
| DELETE | `/api/admin/charities/[id]` | Delete a charity |
| GET | `/api/admin/dispatchers` | List dispatchers (already exists) |
| POST | `/api/admin/dispatchers` | Create a dispatcher (already exists) |

---

## Pages & Actions

### Dashboard
Stats cards in a grid covering three categories:

- **Platform health:** total users, total listings, active orders, completed orders
- **Money:** total GMV (sum of all paid order totals), platform fee revenue
- **Activity:** new signups this week, listings posted this week, orders completed this week

Stats are computed fresh on each load via parallel Supabase count/sum queries. No caching at MVP.

### Users
Table columns: name, email, account type, joined date, status (active/suspended).

Actions:
- **Suspend** — sets `suspended = true` on the user; proxy blocks their subsequent requests with 403
- **Reactivate** — clears suspension (`suspended = false`)

### Listings
Table columns: title, seller, listing type, status, area, posted date.

Actions:
- **Remove** — sets `status = 'removed'`; listing disappears from public browse automatically since the browse API filters by status

### Orders
Table columns: order ID (truncated), buyer, seller, dispatcher, total (₦), status, date.

Read-only except:
- **Force-cancel** — available only on `pending` or `paid` orders; triggers Stripe refund if the order is `paid`

### Dispatchers
Existing `/admin/dispatchers` page absorbed into the new admin shell. Admin enters name, email, and temporary password; account is created with `account_type = 'dispatcher'` and `email_verified = true`.

### Charities
List of charities with name and description. Full CRUD:
- Add charity (name + description)
- Edit charity (same slide-in form pattern as add)
- Delete charity

The existing public `GET /api/charities` endpoint is unchanged.

---

## Technical Decisions

### User Suspension
Add `suspended boolean DEFAULT false` column to the `users` table. The proxy already queries Supabase to check `email_verified`; extend that same query to also check `suspended`. If true, return 403 for API routes or redirect to `/auth/login` for page routes.

### Admin Guard
Already implemented in `proxy.ts` — `/admin/*` and `/api/admin/*` routes require `account_type === 'admin'`. Non-admin users are redirected to `/dashboard`. Each API route additionally calls `getAuthUser()` and checks `account_type` as defense-in-depth.

### Listings Removal
Soft-delete only: set `status = 'removed'`. The public listings browse API filters by status so removed listings are invisible to buyers. No hard deletes.

### Force-Cancel
Reuses the existing order cancellation logic from `POST /api/orders/[id]/cancel`. Admin version skips the buyer-only ownership check.

### Pagination
All admin tables default to 50 rows with no pagination UI at MVP. Easy to add later.

---

## Database Changes

| Change | Detail |
|--------|--------|
| `users.suspended` | `boolean DEFAULT false NOT NULL` |
| `listings` status enum | Add `'removed'` as a valid value (also update `ListingStatus` type in `types/index.ts`) |
| No other schema changes | Charities table already exists |
