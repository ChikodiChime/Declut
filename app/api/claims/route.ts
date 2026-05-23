import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const { listing_id } = body as Record<string, unknown>
  if (!listing_id || typeof listing_id !== 'string') {
    return err('listing_id is required', 'VALIDATION_ERROR', 400)
  }

  const { data: listing, error: listingError } = await supabaseAdmin
    .from('listings')
    .select('id, listing_type, status, seller_id')
    .eq('id', listing_id)
    .single()

  if (listingError || !listing) return err('Listing not found', 'NOT_FOUND', 404)
  if (listing.listing_type !== 'free') return err('Listing is not a free item', 'VALIDATION_ERROR', 400)
  if (listing.status !== 'available') return err('Listing is no longer available', 'CONFLICT', 409)
  if (listing.seller_id === authUser.id) return err('Cannot claim your own listing', 'VALIDATION_ERROR', 400)

  const { data: claim, error: claimError } = await supabaseAdmin
    .from('claims')
    .insert({ listing_id, buyer_id: authUser.id })
    .select('*')
    .single()

  if (claimError) {
    if (claimError.code === '23505') {
      return err('This item has already been claimed', 'CONFLICT', 409)
    }
    console.error('Create claim error:', claimError)
    return err('Failed to create claim', 'SERVER_ERROR', 500)
  }

  await supabaseAdmin
    .from('listings')
    .update({ status: 'claimed' })
    .eq('id', listing_id)

  return ok(claim, 201)
}
