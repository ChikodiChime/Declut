import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { sendClaimRequestEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

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
    .select('id, listing_type, status, seller_id, title, seller:users(id, name, email)')
    .eq('id', listing_id)
    .single()

  if (listingError || !listing) return err('Listing not found', 'NOT_FOUND', 404)
  if (listing.listing_type !== 'free') return err('Listing is not a free item', 'VALIDATION_ERROR', 400)
  if (listing.status !== 'available') return err('Listing is no longer available', 'CONFLICT', 409)
  if (listing.seller_id === authUser.id) return err('Cannot claim your own listing', 'VALIDATION_ERROR', 400)

  const { count: activeCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_id', authUser.id)
    .in('status', ['pending', 'accepted'])

  if ((activeCount ?? 0) >= 3) {
    return err(
      'You already have 3 active claims. Complete or cancel one before claiming another item.',
      'CONFLICT',
      409
    )
  }

  const { data: existingClaim } = await supabaseAdmin
    .from('claims')
    .select('id, status')
    .eq('listing_id', listing_id)
    .eq('buyer_id', authUser.id)
    .single()

  if (existingClaim && existingClaim.status !== 'cancelled') {
    return err('This item has already been claimed', 'CONFLICT', 409)
  }

  let claim
  if (existingClaim) {
    const { data: reactivated, error: reactivateError } = await supabaseAdmin
      .from('claims')
      .update({ status: 'pending', claimed_at: new Date().toISOString(), accepted_at: null, completed_at: null, pickup_address: null })
      .eq('id', existingClaim.id)
      .select('*')
      .single()

    if (reactivateError || !reactivated) {
      console.error('Reactivate claim error:', reactivateError)
      return err('Failed to create claim', 'SERVER_ERROR', 500)
    }
    claim = reactivated
  } else {
    const { data: inserted, error: claimError } = await supabaseAdmin
      .from('claims')
      .insert({ listing_id, buyer_id: authUser.id })
      .select('*')
      .single()

    if (claimError) {
      console.error('Create claim error:', claimError)
      return err('Failed to create claim', 'SERVER_ERROR', 500)
    }
    claim = inserted
  }

  await supabaseAdmin
    .from('listings')
    .update({ status: 'claimed' })
    .eq('id', listing_id)

  // Notify seller of the new claim
  await createNotification({
    user_id: listing.seller_id,
    type: 'claim_request',
    title: 'New claim request',
    body: `Someone requested your item "${listing.title as string}".`,
    link: `/dashboard/listings`,
  })

  const sellerRaw = listing.seller
  const seller = (Array.isArray(sellerRaw) ? sellerRaw[0] : sellerRaw) as { name: string | null; email: string } | null
  if (seller?.email) {
    supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', authUser.id)
      .single()
      .then(({ data: buyer }) => {
        sendClaimRequestEmail({
          to: seller.email,
          sellerName: seller.name ?? 'there',
          claimerName: buyer?.name ?? 'Someone',
          listingTitle: listing.title as string,
        }).catch((e) => console.error('Claim request email failed:', e))
      })
  }

  return ok(claim, 201)
}
