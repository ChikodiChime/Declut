# Dispatch Dashboard Redesign

**Date:** 2026-06-14
**Status:** Approved

## Problem

The current dispatch dashboard buries delivery requests inside a three-sub-tab interface. Dispatchers must navigate past an earnings hero and stats row before seeing available orders. Active deliveries (which require urgent action — entering a verification code) live in the same tab as available orders with no visual hierarchy between them. The visual design is generic and does not help dispatchers scan for the numbers they care about (delivery fees, earnings).

## Goals

- Make available delivery requests the first thing a dispatcher sees on login
- Elevate active in-transit deliveries above available orders (urgent action first)
- Move earnings and history to a dedicated Stats tab
- Bold, functional aesthetic on a light background — no dark backgrounds

## Navigation

Bottom nav: **3 tabs**

| Tab | Route | Default on login |
|-----|-------|-----------------|
| Deliveries | `/dispatch` | Yes |
| Stats | `/dispatch/stats` | No |
| Profile | `/dispatch/profile` | No |

The current three-sub-tab structure (Available / My Deliveries / Completed) is removed entirely. Each concern now has its own page.

---

## Page Designs

### 1. Deliveries Tab (`/dispatch`)

Single scrollable page. No sub-tabs.

#### Active Delivery Hero Card
Shown only when the dispatcher has a claimed order with status `shipped`.

- Large card with a bold accent stripe (primary color, left or top edge) to signal urgency — no dark background fill
- Item name + buyer name in large text
- Pickup area → delivery area with arrow
- Buyer phone number with one-tap call button
- 4-digit code input + "Confirm Delivery" button visible immediately — no extra taps
- Confirm button uses primary or green color; appears disabled only when fewer than 4 digits entered
- When no active delivery: compact empty state ("Ready for your next job?") — does not dominate the page

#### Available Orders Section
Below the hero card (or at top when no active delivery).

- Section label: "Available Deliveries" with a live count badge (green)
- Auto-refreshes every 30 seconds (existing behavior)
- Each order card:
  - **Delivery fee** in large bold primary-colored text — the first thing the eye lands on
  - Item name + pickup area → drop-off area
  - Item thumbnail (right-aligned)
  - "Claim" button — full-width, solid, clearly tappable
- Empty state: "No deliveries available right now"

---

### 2. Stats Tab (`/dispatch/stats`)

Single scrollable page. Two sections.

#### Earnings Summary (top)
- Current month earnings as the headline number — large, bold
- Two supporting stats: Deliveries this month · Average per job
- All-time totals in a compact row below: Total Deliveries · Total Earned

#### Delivery History (below)
- Section label: "Completed Deliveries"
- Grouped by month ("June 2026", "May 2026" …) with monthly subtotal on the right of each group header
- Newest month first
- Each history card: item name, pickup → delivery areas, date delivered, earnings amount in green
- Empty state: "No completed deliveries yet"

---

### 3. Profile Tab (`/dispatch/profile`)

Unchanged from current implementation. Existing layout kept as-is.

---

## Visual Style

**Background:** White or off-white page background throughout. No dark backgrounds.

**Color usage:**
- Primary brand color: accent stripe on active hero card; large fee text on available order cards; primary action buttons
- Green: earnings amounts, confirmed delivery badge, available orders count badge
- Amber: active delivery count badge (signals in-progress work)

**Typography:**
- Key numbers (fee, earnings totals) significantly larger than supporting text
- Section labels in muted uppercase or small caps — subordinate to data

**Cards:**
- Rounded corners, subtle shadow — elevated off the background
- Active hero card noticeably larger than regular order cards
- Generous padding; clear vertical separation between cards

**Actions:**
- Claim button: solid, full-width on mobile
- Confirm Delivery button: primary or green; disabled state only when code input is incomplete
- Call button: large, immediately visible on the active hero card

---

## Data & Behavior (unchanged)

All existing API routes, hooks, and auth logic are preserved:

| Hook | Endpoint | Behavior |
|------|----------|----------|
| `useAvailableOrders()` | `GET /api/dispatch/orders` | Refetches every 30s |
| `useMyDeliveries()` | `GET /api/dispatch/orders/mine` | Active deliveries |
| `useCompletedDeliveries()` | `GET /api/dispatch/orders/completed` | History for Stats tab |
| `useClaimOrder()` | `POST /api/dispatch/orders/{id}/claim` | Invalidates available + mine |
| `useVerifyDelivery()` | `POST /api/dispatch/orders/{id}/verify` | Invalidates mine + completed |

Delivery code verification: max 5 attempts, 429 on exceeded (existing behavior kept).

---

## Out of Scope

- Real-time push notifications
- Multiple simultaneous active deliveries (dispatcher carries one job at a time)
- Changes to login, register, or admin dispatcher management pages
- Any changes to API routes or database schema
