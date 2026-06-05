# Dashboard TopBar Redesign

**Date:** 2026-06-05  
**Status:** Approved

## Overview

Replace the existing minimal TopBar with a search-forward top bar that includes global dashboard search, a notification bell with dropdown panel, and the existing avatar dropdown. Mobile is unchanged — MobileHeader owns that surface.

---

## Layout

```
| [🔍 Search listings, orders, claims...   ⌘K]    [🔔 3]  [Avatar ▾] |
```

- `hidden lg:flex` — desktop only, 56px tall, sticky, `bg-card border-b border-border`
- **Left/center:** Search input spanning most of the bar width
- **Right:** Notification bell + avatar dropdown (existing behaviour unchanged)

---

## Search

### Input
- Placeholder: "Search listings, orders, claims..."
- Small `⌘K` / `Ctrl+K` badge on the right side of the input as a hint
- `Ctrl+K` / `⌘K` global keyboard shortcut focuses the input and opens the dropdown from anywhere in the dashboard

### Behaviour
- Dropdown opens on focus (if query non-empty) or on typing
- Results fire after **300ms debounce**
- Dropdown closes on `Escape`, on blur, or on result click

### Results dropdown
- Grouped into three sections: **Listings**, **Orders**, **Claims**
- Up to 5 results per section
- Each row: type icon | title | secondary detail (status, total, item name) 
- Clicking a result navigates to the resource and closes the dropdown
- Empty state: "No results for '[query]'" — no fuzzy matching for MVP

### API
- `GET /api/search?q=<query>` — single endpoint, queries all three tables in parallel using Postgres `ilike`
- Searches: listing `title`, order `id` + buyer/seller names, claim `listing title`
- Returns: `{ listings: [...], orders: [...], claims: [...] }` — max 5 each
- Auth-scoped: only returns the authenticated user's own records

---

## Notifications

### Bell button
- Icon button with red badge showing unread count
- Badge hidden when count is 0
- Badge clears (all marked read) when panel is opened

### Dropdown panel
- Opens on bell click, closes on outside click or `Escape`
- Max height `~400px`, scrollable
- "Mark all as read" button at the top
- Newest notifications first

### Notification rows
- Left border: colored if unread, transparent if read
- Icon (type-specific) | **Title** | short body text | relative timestamp ("2 min ago")
- Clicking a row: marks it read + navigates to `link`

### Notification types

| Type | Trigger | Title example | Body example |
|---|---|---|---|
| `order_update` | Order status changes | "Order shipped" | "Your order #abc has been shipped" |
| `claim_request` | Someone claims a free listing | "New claim request" | "Adaeze requested your Nike Sneakers" |
| `payout_update` | Transfer succeeded or failed | "Payout sent" | "₦12,500 transferred to your account" |

### Data model

New `notifications` table in Supabase:

```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references users(id) on delete cascade
type        text -- 'order_update' | 'claim_request' | 'payout_update'
title       text
body        text
link        text  -- relative URL to navigate to on click
read        boolean default false
created_at  timestamptz default now()
```

### API
- `GET /api/notifications` — returns unread count + latest 20 notifications for authenticated user
- `PATCH /api/notifications/[id]/read` — marks a single notification read
- `PATCH /api/notifications/read-all` — marks all read

### Where notifications are created
Inserted from existing server-side handlers — no new trigger points needed:
- Webhook `payment_intent.succeeded` → `order_update` for buyer
- Webhook `charge.refunded` → `order_update` for buyer (cancelled)
- Order status change endpoints (shipped, delivered) → `order_update` for buyer
- Claim creation (`POST /api/claims`) → `claim_request` for seller
- Webhook `handlePaymentIntentSucceeded` transfer block → `payout_update` for seller

---

## Component changes

| File | Change |
|---|---|
| `components/dashboard/TopBar.tsx` | Full rewrite — search input, notification bell, avatar |
| `app/dashboard/layout.tsx` | Add `TopBar` (already imported but unwired) |
| `app/api/search/route.ts` | New — dashboard search endpoint |
| `app/api/notifications/route.ts` | New — list notifications |
| `app/api/notifications/[id]/read/route.ts` | New — mark one read |
| `app/api/notifications/read-all/route.ts` | New — mark all read |

---

## Out of scope

- Real-time / push notifications (polling on open is sufficient for MVP)
- Marketplace search (other people's listings) — stays on the browse page
- Notification preferences or muting
