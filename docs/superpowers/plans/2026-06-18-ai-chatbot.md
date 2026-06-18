# AI Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Gemini Flash–powered chatbot that lets buyers browse listings and add to cart, and sellers check their listings and orders — accessible as a floating widget on every page and as a full-page `/chat` route.

**Architecture:** A single streaming API route (`/api/chat`) uses Vercel AI SDK's `streamText` with 7 typed tools that query Supabase directly (reads) or forward to existing API routes (writes). The chat UI uses the `useChat` hook and is shared between a floating bubble widget mounted in the root layout and the `/chat` full-page view.

**Tech Stack:** `ai` (Vercel AI SDK v4), `@ai-sdk/google` (Gemini Flash), Supabase Admin client (existing), Tailwind CSS 4, Lucide React (existing), Next.js App Router

## Global Constraints

- Next.js version is 16.2.1 — read `node_modules/next/dist/docs/` before writing any Next.js-specific code
- Tailwind 4: no `tailwind.config.js` — all tokens live in `globals.css` under `@theme inline`
- Path alias: `@/` maps to the project root
- Auth: `getAuthUser()` from `@/lib/auth` — returns `{ id, name, email, ... }` or `null` for unauthenticated
- DB: `supabaseAdmin` from `@/lib/supabase` — use for all direct DB reads
- Response helpers: `ok`, `err`, `list` from `@/lib/api-response` (only for API routes that return direct responses — not needed in `/api/chat`)
- Gemini model ID: `'gemini-2.0-flash'`
- No test files exist in this project — use manual curl + browser verification per task

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `app/api/chat/route.ts` | Streaming POST — system prompt, 7 tools, Gemini Flash |
| Create | `components/chat/ListingCard.tsx` | Compact listing card rendered inline in bot messages |
| Create | `components/chat/ChatWidget.tsx` | Shared chat UI — used by bubble panel and full page |
| Create | `components/chat/ChatBubble.tsx` | Floating bottom-right button + slide-up panel wrapper |
| Create | `app/chat/page.tsx` | Full-page chat at `/chat` |
| Modify | `app/layout.tsx` | Mount `<ChatBubble />` inside `<Providers>` before closing `</body>` |
| Modify | `components/dashboard/Sidebar.tsx` | Add "Chat with AI" to `NAV_ITEMS` |

---

### Task 1: Install dependencies and add env var

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`

**Interfaces:**
- Produces: `import { streamText, tool } from 'ai'` and `import { google } from '@ai-sdk/google'` resolve without error

- [ ] **Step 1: Install packages**

```bash
npm install ai @ai-sdk/google
```

Expected output: packages added, no peer-dep errors.

- [ ] **Step 2: Add environment variable**

Open `.env.local` and add:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

Get the key from [Google AI Studio](https://aistudio.google.com/app/apikey). The variable name `GOOGLE_GENERATIVE_AI_API_KEY` is what `@ai-sdk/google` reads automatically.

- [ ] **Step 3: Verify imports resolve**

```bash
node -e "require('./node_modules/ai/dist/index.js'); console.log('ai ok')"
node -e "require('./node_modules/@ai-sdk/google/dist/index.js'); console.log('@ai-sdk/google ok')"
```

Expected: `ai ok` and `@ai-sdk/google ok` printed with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Vercel AI SDK and Gemini provider"
```

---

### Task 2: Build `/api/chat/route.ts`

**Files:**
- Create: `app/api/chat/route.ts`

**Interfaces:**
- Consumes: `getAuthUser` from `@/lib/auth`, `supabaseAdmin` from `@/lib/supabase`
- Produces: `POST /api/chat` — accepts `{ messages: CoreMessage[] }`, returns a data stream compatible with Vercel AI SDK's `useChat` hook

- [ ] **Step 1: Create the file**

```typescript
// app/api/chat/route.ts
import { streamText, tool } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function buildSystemPrompt(user: { id: string; name: string } | null): string {
  const identity = user
    ? `The user is logged in as "${user.name}" (ID: ${user.id}).`
    : `The user is browsing as a guest (not logged in).`

  return `You are "Declutter Assistant", a helpful AI for the Declutter marketplace — a Nigeria-focused platform for buying, selling, giving away, and donating secondhand items.

${identity}

## Your capabilities
- Search available listings by keyword, category, type, price, area
- Get full details on a specific listing
- Add for-sale items to the cart (authenticated users only — guests get a link instead)
- Initiate a claim on a free item (authenticated users only)
- Show the user their order history as a buyer (authenticated users only)
- Show the user their listings as a seller (authenticated users only)
- Show the seller their pending paid orders and free-item claims (authenticated users only)

## Rules
- NEVER make up listings, prices, or availability. Only describe items returned by tools.
- Always display prices in Nigerian Naira (₦). Format as ₦50,000 not 50000.
- When a user wants to checkout, say: "Ready to pay? [Go to your cart →](/cart)"
- If an action requires login and the user is a guest, say: "You'll need to log in first. [Sign in →](/auth/login)"
- For free items, use initiate_claim — do not add them to cart.
- Donate items go to charities only — they cannot be purchased or claimed by users.
- Stay focused on the marketplace. If asked something unrelated, say: "I'm here to help you find items on Declutter — what are you looking for?"
- Listing types: "for_sale" = paid item, "free" = claimable at no cost, "donate" = donated to charity

## Formatting
- Use markdown for responses
- After showing items from a search, briefly name each one (title + price or "Free" + area)
- Then ask if they want more details or to take action`
}

export async function POST(request: Request) {
  const authUser = await getAuthUser()
  const { messages } = await request.json()
  const cookieHeader = request.headers.get('cookie') ?? ''
  const origin = new URL(request.url).origin

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: buildSystemPrompt(authUser),
    messages,
    maxSteps: 5,
    tools: {
      search_listings: tool({
        description:
          'Search available listings on Declutter. Use when the user asks to find, browse, or search for items.',
        parameters: z.object({
          q: z.string().optional().describe('Keyword to search in title or description'),
          category: z.string().optional().describe('Category filter'),
          listing_type: z
            .enum(['for_sale', 'free', 'donate'])
            .optional()
            .describe('Type of listing'),
          condition: z
            .enum(['new', 'like_new', 'good', 'fair', 'poor'])
            .optional()
            .describe('Item condition'),
          price_min: z.number().optional().describe('Minimum price in Naira'),
          price_max: z.number().optional().describe('Maximum price in Naira'),
          area: z.string().optional().describe('Location or area in Nigeria'),
          sort: z
            .enum(['newest', 'price_asc', 'price_desc'])
            .optional()
            .describe('Sort order'),
          limit: z
            .number()
            .optional()
            .describe('Max results to return (default 6, max 12)'),
        }),
        execute: async ({
          q,
          category,
          listing_type,
          condition,
          price_min,
          price_max,
          area,
          sort = 'newest',
          limit = 6,
        }) => {
          let query = supabaseAdmin
            .from('listings')
            .select('id, title, price, listing_type, condition, category, area, images, status')
            .eq('status', 'available')

          if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
          if (category) query = query.eq('category', category)
          if (listing_type) query = query.eq('listing_type', listing_type)
          if (condition) query = query.eq('condition', condition)
          if (area) query = query.ilike('area', `%${area}%`)
          if (price_min != null) query = query.gte('price', price_min)
          if (price_max != null) query = query.lte('price', price_max)

          if (sort === 'price_asc') {
            query = query.order('price', { ascending: true, nullsFirst: false })
          } else if (sort === 'price_desc') {
            query = query.order('price', { ascending: false, nullsFirst: false })
          } else {
            query = query.order('created_at', { ascending: false })
          }

          query = query.limit(Math.min(limit, 12))

          const { data, error } = await query
          if (error) return { success: false, error: 'Failed to search listings' }
          return { success: true, listings: data ?? [], count: data?.length ?? 0 }
        },
      }),

      get_listing: tool({
        description:
          'Get full details for a specific listing by ID. Use when the user asks for more information on a particular item.',
        parameters: z.object({
          listing_id: z.string().describe('The listing ID to fetch'),
        }),
        execute: async ({ listing_id }) => {
          const { data, error } = await supabaseAdmin
            .from('listings')
            .select(
              'id, title, price, listing_type, condition, category, area, images, status, description, created_at'
            )
            .eq('id', listing_id)
            .single()
          if (error || !data) return { success: false, error: 'Listing not found' }
          return { success: true, listing: data }
        },
      }),

      add_to_cart: tool({
        description:
          'Add a for_sale listing to the cart. Only works for for_sale listings. For guest users, returns a link to the listing page instead.',
        parameters: z.object({
          listing_id: z.string().describe('The listing ID to add to cart'),
        }),
        execute: async ({ listing_id }) => {
          if (!authUser) {
            return { success: false, reason: 'unauthenticated', listing_id }
          }
          const res = await fetch(`${origin}/api/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
            body: JSON.stringify({ listing_id }),
          })
          const data = await res.json()
          if (!res.ok) return { success: false, error: data.message ?? 'Failed to add to cart' }
          return { success: true }
        },
      }),

      initiate_claim: tool({
        description: 'Claim a free listing for the authenticated user. Only works for free listings.',
        parameters: z.object({
          listing_id: z.string().describe('The free listing ID to claim'),
        }),
        execute: async ({ listing_id }) => {
          if (!authUser) {
            return { success: false, reason: 'unauthenticated' }
          }
          const res = await fetch(`${origin}/api/claims`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
            body: JSON.stringify({ listing_id }),
          })
          const data = await res.json()
          if (!res.ok) return { success: false, error: data.message ?? 'Failed to initiate claim' }
          return { success: true, claim: data.data }
        },
      }),

      get_my_orders: tool({
        description: "Fetch the authenticated buyer's recent order history.",
        parameters: z.object({}),
        execute: async () => {
          if (!authUser) return { success: false, reason: 'unauthenticated' }
          const { data, error } = await supabaseAdmin
            .from('orders')
            .select(
              'id, status, total_price, created_at, order_items(id, listing:listings(id, title, images))'
            )
            .eq('buyer_id', authUser.id)
            .order('created_at', { ascending: false })
            .limit(10)
          if (error) return { success: false, error: 'Failed to fetch orders' }
          return { success: true, orders: data ?? [] }
        },
      }),

      get_my_listings: tool({
        description: "Fetch the authenticated seller's listings.",
        parameters: z.object({}),
        execute: async () => {
          if (!authUser) return { success: false, reason: 'unauthenticated' }
          const { data, error } = await supabaseAdmin
            .from('listings')
            .select('id, title, price, listing_type, status, images, created_at')
            .eq('seller_id', authUser.id)
            .order('created_at', { ascending: false })
            .limit(10)
          if (error) return { success: false, error: 'Failed to fetch listings' }
          return { success: true, listings: data ?? [] }
        },
      }),

      get_seller_orders: tool({
        description:
          "Fetch the authenticated seller's pending/active paid orders and free-item claims awaiting action.",
        parameters: z.object({}),
        execute: async () => {
          if (!authUser) return { success: false, reason: 'unauthenticated' }

          const { data: myFreeListings } = await supabaseAdmin
            .from('listings')
            .select('id')
            .eq('seller_id', authUser.id)
            .eq('listing_type', 'free')

          const freeListingIds = (myFreeListings ?? []).map((l) => l.id)

          const [ordersRes, claimsRes] = await Promise.all([
            supabaseAdmin
              .from('orders')
              .select(
                'id, status, total_price, created_at, order_items(id, listing:listings(id, title))'
              )
              .eq('seller_id', authUser.id)
              .in('status', ['paid', 'shipped'])
              .order('created_at', { ascending: false })
              .limit(10),
            freeListingIds.length > 0
              ? supabaseAdmin
                  .from('claims')
                  .select(
                    'id, status, claimed_at, listing:listings(id, title), buyer:users(id, name)'
                  )
                  .in('listing_id', freeListingIds)
                  .in('status', ['pending', 'accepted'])
                  .order('claimed_at', { ascending: false })
                  .limit(10)
              : Promise.resolve({ data: [] as unknown[], error: null }),
          ])

          return {
            success: true,
            paid_orders: ordersRes.data ?? [],
            free_claims: claimsRes.data ?? [],
          }
        },
      }),
    },
  })

  return result.toDataStreamResponse()
}
```

- [ ] **Step 2: Start the dev server and test with curl**

```bash
npm run dev
```

In a separate terminal:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Show me some free items"}]}' \
  --no-buffer
```

Expected: a stream of text chunks starting with `0:"` (Vercel AI SDK data stream format). The bot should describe available free listings or say none are found.

- [ ] **Step 3: Test tool invocation for search**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Find laptops under 50000 naira"}]}' \
  --no-buffer
```

Expected: stream includes tool call chunks (`9:`) followed by a text response listing items or saying none found.

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add /api/chat streaming route with Gemini Flash and 7 tools"
```

---

### Task 3: Build `ListingCard` component

**Files:**
- Create: `components/chat/ListingCard.tsx`

**Interfaces:**
- Consumes: `CldImage` from `next-cloudinary`, `Link` from `next/link`
- Produces: `<ListingCard listing={...} />` — exported named component

```typescript
// Shape of listing data the chat API returns in tool results
interface ChatListing {
  id: string
  title: string
  price: number | null
  listing_type: 'for_sale' | 'free' | 'donate'
  condition?: string
  area?: string
  images?: string[]
}
```

- [ ] **Step 1: Create the component**

```tsx
// components/chat/ListingCard.tsx
'use client'

import Link from 'next/link'
import { CldImage } from 'next-cloudinary'
import { Tag } from 'lucide-react'

export interface ChatListing {
  id: string
  title: string
  price: number | null
  listing_type: 'for_sale' | 'free' | 'donate'
  condition?: string
  area?: string
  images?: string[]
}

const TYPE_LABELS: Record<ChatListing['listing_type'], string> = {
  for_sale: 'For Sale',
  free: 'Free',
  donate: 'Donate',
}

const TYPE_COLORS: Record<ChatListing['listing_type'], string> = {
  for_sale: 'bg-blue-100 text-blue-700',
  free: 'bg-green-100 text-green-700',
  donate: 'bg-purple-100 text-purple-700',
}

export function ListingCard({ listing }: { listing: ChatListing }) {
  const imageId = listing.images?.[0]
  const priceLabel =
    listing.listing_type === 'for_sale' && listing.price != null
      ? `₦${listing.price.toLocaleString('en-NG')}`
      : listing.listing_type === 'free'
      ? 'Free'
      : 'Donated'

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex gap-3 rounded-xl border border-border bg-card p-3 hover:bg-accent transition-colors min-w-[220px] max-w-[260px]"
    >
      <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
        {imageId ? (
          <CldImage
            src={imageId}
            width={64}
            height={64}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Tag size={20} />
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2">{listing.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold">{priceLabel}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[listing.listing_type]}`}
          >
            {TYPE_LABELS[listing.listing_type]}
          </span>
        </div>
        {listing.area && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{listing.area}</p>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors from `components/chat/ListingCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/chat/ListingCard.tsx
git commit -m "feat: add ListingCard component for inline chat display"
```

---

### Task 4: Build `ChatWidget` component

**Files:**
- Create: `components/chat/ChatWidget.tsx`

**Interfaces:**
- Consumes: `useChat` from `ai/react`, `ListingCard` + `ChatListing` from `./ListingCard`
- Produces: `<ChatWidget fullPage? onClose? />` — client component

- [ ] **Step 1: Create the component**

```tsx
// components/chat/ChatWidget.tsx
'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'
import { Send, Loader2, X, Maximize2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { ListingCard, type ChatListing } from './ListingCard'

const SUGGESTED_PROMPTS = [
  'Show me free items near me',
  "I'm looking for a laptop under ₦50,000",
  'What orders do I have pending?',
  'Show my active listings',
]

interface ChatWidgetProps {
  fullPage?: boolean
  onClose?: () => void
}

export function ChatWidget({ fullPage = false, onClose }: ChatWidgetProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setInput, append } =
    useChat({ api: '/api/chat' })
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent)
      }
    }
  }

  function selectSuggestedPrompt(prompt: string) {
    append({ role: 'user', content: prompt })
  }

  const containerClass = fullPage
    ? 'flex flex-col h-full max-w-3xl mx-auto w-full'
    : 'flex flex-col h-full'

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-semibold text-sm">Declutter Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          {!fullPage && (
            <Link
              href="/chat"
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
              title="Open full page"
            >
              <Maximize2 size={15} />
            </Link>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center pt-4">
              Ask me anything about listings, orders, or your account.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => selectSuggestedPrompt(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          if (message.role === 'user') {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="bg-primary text-primary-foreground text-sm rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] whitespace-pre-wrap">
                  {message.content as string}
                </div>
              </div>
            )
          }

          // Assistant message — may include tool invocations
          const listings = extractListingsFromMessage(message)

          return (
            <div key={message.id} className="flex flex-col gap-2">
              {message.content && (
                <div className="bg-muted text-sm rounded-2xl rounded-tl-sm px-4 py-2 max-w-[90%] whitespace-pre-wrap">
                  {message.content as string}
                </div>
              )}
              {listings.length > 0 && (
                <div
                  className={
                    fullPage
                      ? 'grid grid-cols-2 gap-3'
                      : 'flex gap-3 overflow-x-auto pb-1 scrollbar-none'
                  }
                >
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 size={14} className="animate-spin" />
            <span>Thinking…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-xl px-3 py-2">
            <AlertCircle size={14} />
            <span>Something went wrong. Please try again.</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about listings, orders…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 max-h-32 overflow-y-auto"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

// Extract listing objects from tool invocations in an assistant message
function extractListingsFromMessage(message: {
  toolInvocations?: Array<{
    toolName: string
    state: string
    result?: unknown
  }>
}): ChatListing[] {
  if (!message.toolInvocations) return []

  const listings: ChatListing[] = []

  for (const inv of message.toolInvocations) {
    if (inv.state !== 'result' || !inv.result) continue

    const result = inv.result as Record<string, unknown>

    if (inv.toolName === 'search_listings' && Array.isArray(result.listings)) {
      listings.push(...(result.listings as ChatListing[]))
    }

    if (inv.toolName === 'get_listing' && result.listing) {
      listings.push(result.listing as ChatListing)
    }

    if (inv.toolName === 'get_my_listings' && Array.isArray(result.listings)) {
      listings.push(...(result.listings as ChatListing[]))
    }
  }

  return listings
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors from `components/chat/ChatWidget.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/chat/ChatWidget.tsx
git commit -m "feat: add ChatWidget component with useChat, tool result rendering, and suggested prompts"
```

---

### Task 5: Build `ChatBubble` and mount in root layout

**Files:**
- Create: `components/chat/ChatBubble.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `ChatWidget` from `./ChatWidget`
- Produces: `<ChatBubble />` — self-contained floating bubble; mounts in `app/layout.tsx`

- [ ] **Step 1: Create ChatBubble**

```tsx
// components/chat/ChatBubble.tsx
'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { ChatWidget } from './ChatWidget'

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Slide-up panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] h-[480px] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden">
          <ChatWidget onClose={() => setIsOpen(false)} />
        </div>
      )}

      {/* Floating bubble button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  )
}
```

- [ ] **Step 2: Mount ChatBubble in root layout**

Open `app/layout.tsx`. Add the import and mount `<ChatBubble />` inside `<Providers>`, just before the closing `</body>` tag (after `<Toaster>`):

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Raleway, Geist_Mono, DM_Serif_Display } from "next/font/google";
import { Providers } from "./providers";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";
import { FooterWrapper } from "@/components/layout/FooterWrapper";
import { Toaster } from "sonner";
import { ChatBubble } from "@/components/chat/ChatBubble";
import "lenis/dist/lenis.css";
import "./globals.css";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif-display",
});

export const metadata: Metadata = {
  title: {
    default: "Declutter Marketplace",
    template: "%s | Declutter",
  },
  description: "Buy, sell, and donate secondhand items in Nigeria.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Declutter Marketplace",
    description: "Buy, sell, and donate secondhand items in Nigeria.",
    siteName: "Declutter Marketplace",
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Declutter Marketplace",
    description: "Buy, sell, and donate secondhand items in Nigeria.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${raleway.variable} ${geistMono.variable} ${dmSerifDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <NavbarWrapper />
          {children}
          <FooterWrapper />
        </Providers>
        <Toaster richColors position="top-right" />
        <ChatBubble />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify in browser**

With `npm run dev` running, open `http://localhost:3000`. You should see a circular chat button in the bottom-right corner. Clicking it should open the slide-up panel with the suggested prompt chips. Type a message and verify a response streams back.

- [ ] **Step 4: Test a search flow**

Click the "Show me free items near me" chip. Verify:
- A loading indicator appears briefly
- The bot responds with text describing available free items (or says none found)
- If items are returned, `ListingCard` components appear below the text response

- [ ] **Step 5: Commit**

```bash
git add components/chat/ChatBubble.tsx app/layout.tsx
git commit -m "feat: add ChatBubble floating widget and mount in root layout"
```

---

### Task 6: Add `/chat` full-page route and sidebar link

**Files:**
- Create: `app/chat/page.tsx`
- Modify: `components/dashboard/Sidebar.tsx`

**Interfaces:**
- Consumes: `ChatWidget` from `@/components/chat/ChatWidget`
- Produces: `/chat` page route; "Chat with AI" nav item in dashboard sidebar

- [ ] **Step 1: Create the full-page chat route**

```tsx
// app/chat/page.tsx
import type { Metadata } from 'next'
import { ChatWidget } from '@/components/chat/ChatWidget'

export const metadata: Metadata = {
  title: 'Chat with AI',
}

export default function ChatPage() {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
      <ChatWidget fullPage />
    </div>
  )
}
```

- [ ] **Step 2: Add "Chat with AI" to the dashboard sidebar**

Open `components/dashboard/Sidebar.tsx`. Find the `NAV_ITEMS` array (line 48) and add the chat link. Import `MessageCircle` from lucide-react alongside the existing imports:

```tsx
// In the lucide-react import block, add MessageCircle:
import {
  LayoutDashboard,
  Package,
  LogOut,
  ShoppingCart,
  CreditCard,
  Store,
  X,
  Search,
  User,
  BookMarked,
  MessageCircle,
} from "lucide-react";

// In NAV_ITEMS, add after the Address Book entry:
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/listings", label: "My Listings", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/billing", label: "Payouts", icon: CreditCard },
  { href: "/dashboard/address-book", label: "Address Book", icon: BookMarked },
  { href: "/chat", label: "Chat with AI", icon: MessageCircle },
  { href: "/", label: "Browse Listings", icon: Store },
];
```

- [ ] **Step 3: Verify the full-page chat in browser**

Navigate to `http://localhost:3000/chat`. Verify:
- The full-page chat UI renders
- Listing cards render in a 2-column grid when search results are returned (vs. horizontal scroll in the widget)
- The widget's expand icon (Maximize2) in the bubble links to `/chat`

- [ ] **Step 4: Verify sidebar link in dashboard**

Navigate to `http://localhost:3000/dashboard`. Verify "Chat with AI" appears in the sidebar and clicking it navigates to `/chat`.

- [ ] **Step 5: Commit**

```bash
git add app/chat/page.tsx components/dashboard/Sidebar.tsx
git commit -m "feat: add /chat full-page route and Chat with AI sidebar link"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Gemini Flash via `@ai-sdk/google` — Task 1 + 2
- ✅ 7 tools (search_listings, get_listing, add_to_cart, initiate_claim, get_my_orders, get_my_listings, get_seller_orders) — Task 2
- ✅ Buyers and sellers supported — Task 2 tools
- ✅ Floating bubble widget — Task 5
- ✅ Full-page `/chat` — Task 6
- ✅ Session-only history (useChat state, no DB) — Task 4
- ✅ Anonymous users can search and browse — Task 2 (no auth required for search_listings, get_listing)
- ✅ Anonymous add_to_cart returns unauthenticated reason — Task 2 (system prompt handles response)
- ✅ Suggested prompt chips — Task 4
- ✅ Listing cards inline in messages — Task 3 + 4
- ✅ Streaming responses — Task 2 (`toDataStreamResponse`)
- ✅ Error state — Task 4 (`error` from useChat)
- ✅ Sidebar "Chat with AI" link — Task 6
- ✅ Expand icon links to `/chat` — Task 5 ChatBubble + Task 4 ChatWidget header

**Type consistency check:**
- `ChatListing` defined in `ListingCard.tsx`, exported, imported in `ChatWidget.tsx` ✅
- `extractListingsFromMessage` uses `ChatListing[]` return type matching `ListingCard` prop ✅
- `fullPage` prop consistently `boolean` with default `false` across ChatWidget + ChatBubble usage ✅
