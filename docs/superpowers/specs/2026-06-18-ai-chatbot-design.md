# AI Chatbot — Design Spec

**Date:** 2026-06-18  
**Status:** Approved

---

## Overview

An AI-powered chatbot that lets both buyers and sellers interact with the Declutter marketplace through natural language. Buyers can search for items, get recommendations, add to cart, and claim free items. Sellers can check their listings and pending orders. The bot takes light actions (add to cart, initiate claim) but hands off to the existing checkout flow for payment.

---

## Architecture

```
Browser                    Next.js App Router            External
──────                     ──────────────────            ────────
useChat hook  ──POST──▶  /api/chat/route.ts  ──▶  Gemini Flash
(message[])  ◀──stream──  streamText()            (function calling)
                           │
                           ├─ search_listings ──▶  /api/listings
                           ├─ get_listing     ──▶  /api/listings/[id]
                           ├─ add_to_cart     ──▶  /api/cart
                           ├─ initiate_claim  ──▶  /api/claims
                           ├─ get_my_orders   ──▶  /api/buyer/orders
                           ├─ get_my_listings ──▶  /api/listings/mine
                           └─ get_seller_orders ▶  /api/seller/claims
```

**Key principle:** All tool calls hit existing API routes internally. No new DB queries or duplicated data-access logic.

**Stack:**
- AI provider: Gemini Flash via `@ai-sdk/google`
- SDK: Vercel AI SDK (`ai` package) — `streamText` on server, `useChat` on client
- History: Session-only, managed by `useChat` React state. No DB involvement.

---

## New Files

| File | Purpose |
|------|---------|
| `app/api/chat/route.ts` | Streaming POST route — receives message history, calls Gemini Flash with tools, streams response |
| `components/chat/ChatWidget.tsx` | Shared chat UI component — renders as floating widget or full-page |
| `components/chat/ListingCard.tsx` | Compact listing card rendered inline in bot messages |
| `components/chat/ChatBubble.tsx` | Floating bubble button that opens the widget |
| `app/chat/page.tsx` | Full-page chat at `/chat` |

The `ChatBubble` + `ChatWidget` are mounted in the root layout (`app/layout.tsx`) so they appear on every page.

---

## Tools

### Buyer Tools

| Tool | Auth Required | Description |
|------|--------------|-------------|
| `search_listings` | No | Search available listings by keyword, category, listing_type, condition, price_min, price_max |
| `get_listing` | No | Fetch full detail for a single listing by ID |
| `add_to_cart` | No | Add a for-sale listing to the cart |
| `initiate_claim` | Yes | Claim a free item (requires user identity) |
| `get_my_orders` | Yes | Fetch the authenticated buyer's order history |

### Seller Tools

| Tool | Auth Required | Description |
|------|--------------|-------------|
| `get_my_listings` | Yes | Fetch the authenticated seller's listings |
| `get_seller_orders` | Yes | Fetch the seller's pending/active orders (paid) and free-item claims to fulfil |

---

## System Prompt

The system prompt is constructed server-side on each request and includes:

- User context: name (or "Guest"), auth status, role (buyer/seller/both)
- Marketplace rules:
  - Never fabricate listings or prices
  - Always display prices in Naira (₦)
  - For checkout: respond with "Ready to checkout? [Go to cart →](/cart)"
  - For auth-gated actions when user is unauthenticated: "You'll need to log in first. [Sign in →](/auth/login)"
  - Stay focused on the marketplace — redirect off-topic questions politely
- Listing types explanation: For Sale (paid), Free (claim flow), Donate (to charity — not purchasable)

---

## UI / UX

### Floating Widget
- Fixed bottom-right corner, `z-50`
- Collapsed: circular chat icon button (`ChatBubble`)
- Expanded: slide-up panel, ~400px tall × 360px wide
- Header: "Declutter Assistant" + close button + expand-to-full-page icon
- Message thread: user bubbles right-aligned, bot bubbles left-aligned
- Tool results render as inline `ListingCard` strips (horizontal scroll on mobile)
- Streaming: bot response types in progressively
- Input: textarea + send button, `Enter` to send, `Shift+Enter` for newline

### Full-Page `/chat`
- Same `ChatWidget` component in full-page mode prop
- Listing cards render in a 2-column grid
- Linked from dashboard sidebar as "Chat with AI"
- Widget's expand icon links here

### Empty State (first load)
Suggested prompt chips:
- "Show me free items near me"
- "I'm looking for a laptop under ₦50,000"
- "What orders do I have pending?"
- "Show my active listings"

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Tool call fails (DB/network error) | Bot responds: "I had trouble fetching that — try again or [browse listings](/search)" |
| `search_listings` returns empty | Bot suggests broadening search (remove filters, try different keyword) |
| Out-of-scope question | Politely redirect: "I'm here to help you find items on Declutter — what are you looking for?" |
| Unauthenticated user hits auth-gated tool | "You'll need to log in first. [Sign in →](/auth/login)" |
| Gemini stream drops | AI SDK surfaces error; `useChat` shows a retry button |
| Rate limit (30 messages/session) | "You've sent a lot of messages — take a breather and try again shortly." Enforced via in-memory counter per session cookie |

---

## Out of Scope

- Persistent chat history (DB storage) — can be added later by introducing a `chat_messages` table
- Full in-chat checkout (Paystack redirect) — payment happens on existing `/cart` → `/checkout` flow
- Seller listing creation via chat
- Image search or upload in chat
