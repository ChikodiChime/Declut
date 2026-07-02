// app/api/listings/ai-draft/route.ts
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { computePriceSuggestion } from '@/lib/listings/priceComp'
import { VALID_CATEGORIES, VALID_CONDITIONS, VALID_LISTING_TYPES } from '../utils'
import type { Condition, ListingType } from '@/types'

const MAX_PHOTOS = 5

const draftSchema = z.object({
  title: z.string().min(1).max(100).describe('A concise, buyer-friendly title for the item'),
  description: z
    .string()
    .max(1000)
    .describe('A short description covering what the item is, notable features, and visible condition details'),
  category: z
    .enum(VALID_CATEGORIES as [string, ...string[]])
    .describe('The single best-fitting category from the allowed list'),
  condition: z
    .enum(VALID_CONDITIONS as [Condition, ...Condition[]])
    .describe('The item condition, judged from the photos'),
  listing_type: z
    .enum(VALID_LISTING_TYPES as [ListingType, ...ListingType[]])
    .describe(
      'for_sale for anything with resale value; free for low-value but usable items; donate for items better suited to a charity than an individual buyer',
    ),
})

const DRAFT_PROMPT = `You are helping a seller on Declutter, a Nigeria-focused secondhand marketplace, draft a listing from photos of their item.

Look at the photos and produce:
- A clear, specific title (not generic — include brand/model/color if visible)
- A short honest description mentioning visible condition, notable features, and any flaws
- The single best category from the allowed list
- The condition, judged conservatively from what's visible
- The listing_type: choose "for_sale" for anything with resale value, "free" for low-value but still usable items, or "donate" if the item would be better suited to a charity than an individual buyer

Never invent details you can't see in the photos. If the photos are unclear, keep the description general rather than guessing specifics.`

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  let body: { public_ids?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body', 'BAD_REQUEST', 400)
  }

  const publicIds = body.public_ids
  if (
    !Array.isArray(publicIds) ||
    publicIds.length === 0 ||
    publicIds.length > MAX_PHOTOS ||
    !publicIds.every((id) => typeof id === 'string')
  ) {
    return err(`public_ids must be an array of 1 to ${MAX_PHOTOS} strings`, 'VALIDATION_ERROR', 400)
  }

  const imageUrls = publicIds.map(
    (id) => `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${id}`,
  )

  let draft: z.infer<typeof draftSchema>
  try {
    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: draftSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: DRAFT_PROMPT },
            ...imageUrls.map((url) => ({ type: 'image' as const, image: url })),
          ],
        },
      ],
    })
    draft = result.object
  } catch (aiError) {
    console.error('AI listing draft generation failed:', aiError)
    return err('Could not analyze these photos — please fill in the listing manually', 'SERVER_ERROR', 502)
  }

  let priceSuggestion = { suggested_price: null as number | null, price_range: null as { min: number; max: number } | null, comp_count: 0 }
  if (draft.listing_type === 'for_sale') {
    const { data: comps } = await supabaseAdmin
      .from('listings')
      .select('price, condition')
      .eq('status', 'available')
      .eq('listing_type', 'for_sale')
      .eq('category', draft.category)
      .limit(50)

    priceSuggestion = computePriceSuggestion(draft.condition, comps ?? [])
  }

  return ok({
    ...draft,
    ...priceSuggestion,
    images: publicIds,
  })
}
