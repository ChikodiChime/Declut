---
name: unstash
description: Use when working on the Unstash marketplace project — Nigeria-focused secondhand platform with For Sale, Free, and Donate listing types. Covers PRD decisions, APIs, stack, and feature patterns.
user_invocable: true
---

# Unstash Marketplace — Project Reference

A **Nigeria-focused Next.js marketplace** where individuals and businesses can list, sell, give away, or donate second-hand items. This is a **learning project** — keep it simple, avoid over-engineering.

## Core Concept: 3 Listing Types

| Type | Payment | Flow |
|------|---------|------|
| **For Sale** | Buyer pays via Stripe | Cart → checkout → Stripe Connect payout to seller |
| **Free** | None | Buyer claims → seller accepts → pickup address revealed |
| **Donate** | None | Seller marks item as donated to a charity |

This is what makes it a *declutter* app vs a plain resale app (the marketplace itself is branded Unstash). Always preserve all 3 types.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js (App Router) | Read `node_modules/next/dist/docs/` before writing Next.js code |
| Auth | Clerk or NextAuth.js | Both have native App Router support |
| Database | Supabase (Postgres) | Relational + built-in storage option |
| Images | **Cloudinary** | `next-cloudinary`; store only `public_id` in DB |
| Payments | **Stripe + Stripe Connect** | Confirmed available in Nigeria; split payouts to sellers |
| Search | Postgres full-text (MVP) → Algolia (later) | Keep it simple for learning |
| Styling | Tailwind CSS 4 | CSS-first config via `@theme` in `globals.css`, no `tailwind.config.js` |

---

## Key PRD Decisions

### Payments
- **Stripe Connect** for marketplace payouts — seller onboards via Stripe, platform takes commission
- Flat delivery fee tiers: **Lagos rate** vs **outside Lagos rate**
- Full order total (item + delivery) shown before payment confirmation
- Pickup address revealed only after payment confirmed

### Order Lifecycle (simplified)
```
pending → paid → shipped → delivered → completed
```
- `delivered` set by seller
- `completed` triggered by buyer confirming receipt → prompts review
- `cancelled` available (buyer-initiated only)

### Cancellation Policy
- Buyers only can cancel
- 12-hour auto-cancel if seller doesn't respond after payment confirmed
- Automatic Stripe refund on cancellation

### Seller Onboarding (3 steps)
1. Create account (name, email, password, account type: Individual / Business)
2. Connect Stripe account
3. Start listing — **no listings allowed without connected payment account**

### Cart
- Supports multiple items from multiple sellers
- Each item processed as separate Stripe payment behind the scenes
- Free and Donate items cannot be added to cart — use claim flow

### Reviews
- Buyer confirms receipt → triggers `completed` → review prompt appears
- Only buyers trigger `completed` — sellers cannot game the review system

---

## Image Handling (Cloudinary)

```bash
npm install cloudinary next-cloudinary
```

```js
// Upload widget
<CldUploadWidget uploadPreset="your_preset" onSuccess={(result) => {
  saveToDb(result.info.public_id) // Store only public_id
}} />

// Display with auto-optimize
<CldImage src={public_id} width={800} height={600} alt={title} />
```

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Stripe Connect (Payments)

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

Key flow:
1. `POST /v1/accounts` — create connected seller account
2. `POST /v1/account_links` — generate Stripe-hosted onboarding URL
3. `POST /v1/payment_intents` with `application_fee_amount` — charge buyer + take platform cut
4. Funds held until seller fulfils order; release via `POST /v1/transfers`

```env
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Scope Boundaries

**In MVP:**
- 3 listing types (For Sale / Free / Donate)
- Cart with multi-seller Stripe payments
- Flat delivery fees (Lagos / outside Lagos)
- Simplified order lifecycle (5 statuses)
- Cloudinary image uploads
- Reviews tied to buyer-confirmed receipt

**Out of scope (keep out):**
- Real-time chat
- Bulk CSV / barcode scan / estate mode
- AI recommendations
- Multi-staff accounts
- Donation tax receipts (future enhancement)

---

## Environment Variables

```env
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=

# Payments
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Images
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```
