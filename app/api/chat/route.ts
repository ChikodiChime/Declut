// app/api/chat/route.ts
import { streamText, stepCountIs, convertToModelMessages } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

type AuthUser = { id: string; email: string } | null

function buildSystemPrompt(user: AuthUser): string {
  const identity = user
    ? `The user is logged in (ID: ${user.id}).`
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
  const cappedMessages = Array.isArray(messages) ? messages.slice(-20) : []
  const cookieHeader = request.headers.get('cookie') ?? ''
  const origin = new URL(request.url).origin

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: buildSystemPrompt(authUser),
    messages: await convertToModelMessages(cappedMessages),
    stopWhen: stepCountIs(5),
    tools: {
      search_listings: {
        description:
          'Search available listings on Declutter. Use when the user asks to find, browse, or search for items.',
        inputSchema: z.object({
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
          limit: z.number().min(1).optional().describe('Max results to return (default 6, max 12)'),
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
      },

      get_listing: {
        description:
          'Get full details for a specific listing by ID. Use when the user asks for more information on a particular item.',
        inputSchema: z.object({
          listing_id: z.string().describe('The listing ID to fetch'),
        }),
        execute: async ({ listing_id }) => {
          const { data, error } = await supabaseAdmin
            .from('listings')
            .select(
              'id, title, price, listing_type, condition, category, area, images, status, description, created_at'
            )
            .eq('id', listing_id)
            .eq('status', 'available')
            .single()
          if (error || !data) return { success: false, error: 'Listing not found or no longer available' }
          return { success: true, listing: data }
        },
      },

      add_to_cart: {
        description:
          'Add a for_sale listing to the cart. Only works for for_sale listings. For guest users, returns an unauthenticated reason.',
        inputSchema: z.object({
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
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            let message = 'Failed to add to cart'
            try { message = (JSON.parse(text) as { message?: string }).message ?? message } catch { /* non-JSON */ }
            return { success: false, error: message }
          }
          await res.json()
          return { success: true }
        },
      },

      initiate_claim: {
        description: 'Claim a free listing for the authenticated user. Only works for free listings.',
        inputSchema: z.object({
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
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            let message = 'Failed to initiate claim'
            try { message = (JSON.parse(text) as { message?: string }).message ?? message } catch { /* non-JSON */ }
            return { success: false, error: message }
          }
          const data = await res.json() as { data?: unknown; message?: string }
          return { success: true, claim: (data as { data?: unknown }).data }
        },
      },

      get_my_orders: {
        description: "Fetch the authenticated buyer's recent order history.",
        inputSchema: z.object({}),
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
      },

      get_my_listings: {
        description: "Fetch the authenticated seller's listings.",
        inputSchema: z.object({}),
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
      },

      get_seller_orders: {
        description:
          "Fetch the authenticated seller's pending/active paid orders and free-item claims awaiting action.",
        inputSchema: z.object({}),
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
      },
    },
  })

  return result.toUIMessageStreamResponse()
}
