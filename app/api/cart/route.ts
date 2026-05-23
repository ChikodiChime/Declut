import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request) {
  const authUser = await getAuthUser()
  
  if (authUser) {
    const { data: items, error } = await supabaseAdmin
      .from('cart_items')
      .select(
        'id, listing_id, listing:listings(id, title, price, listing_type, status, seller_id, area, images, condition, category)'
      )
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })

    if (error) return err('Failed to fetch cart', 'DB_ERROR', 500)
    return ok(items ?? [])
  }

  const url = new URL(req.url)
  const listingIds = url.searchParams.get('listing_ids')

  if (!listingIds) {
    return err('Not authenticated', 'UNAUTHORIZED', 401)
  }

  const ids = listingIds.split(',').filter(Boolean)
  if (ids.length === 0) {
    return ok([])
  }

  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, price, listing_type, status, seller_id, area, images, condition, category')
    .in('id', ids)

  if (error) return err('Failed to fetch listings', 'DB_ERROR', 500)

  const items = (listings ?? []).map((listing) => ({
    id: listing.id,
    listing_id: listing.id,
    listing,
  }))

  return ok(items)
}

export async function DELETE() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Not authenticated', 'UNAUTHORIZED', 401)

  const { error } = await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('user_id', authUser.id)

  if (error) return err('Failed to clear cart', 'DB_ERROR', 500)
  return ok(null)
}

export async function POST(req: Request) {
  const authUser = await getAuthUser()

  const body = await req.json()
  const { listing_id } = body

  if (!listing_id || typeof listing_id !== 'string') {
    return err('listing_id is required', 'VALIDATION_ERROR', 400)
  }

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, listing_type, status')
    .eq('id', listing_id)
    .single()

  if (!listing) return err('Listing not found', 'NOT_FOUND', 404)
  if (listing.listing_type !== 'for_sale')
    return err('Only for_sale listings can be added to cart', 'INVALID_TYPE', 400)
  if (listing.status !== 'available')
    return err('Listing is not available', 'UNAVAILABLE', 409)

  if (!authUser) {
    return err('Not authenticated', 'UNAUTHORIZED', 401)
  }

  const { data: item, error } = await supabaseAdmin
    .from('cart_items')
    .insert({ user_id: authUser.id, listing_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return err('Item already in cart', 'DUPLICATE', 409)
    return err('Failed to add to cart', 'DB_ERROR', 500)
  }

  return ok(item, 201)
}
