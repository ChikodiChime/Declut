import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { validateListingBody, VALID_LISTING_TYPES, VALID_CONDITIONS, VALID_CATEGORIES } from './utils'
import { ok, list, err } from '@/lib/api-response'
import type { ListingType, Condition } from '@/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const q = searchParams.get('q')?.trim()
  const category = searchParams.get('category')
  const listing_type = searchParams.get('listing_type')
  const condition = searchParams.get('condition')
  const area = searchParams.get('area')?.trim()
  const sort = searchParams.get('sort') ?? 'newest'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '24', 10), 48)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0)

  let query = supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('status', 'available')

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  }
  if (category && VALID_CATEGORIES.includes(category)) {
    query = query.eq('category', category)
  }
  if (listing_type && VALID_LISTING_TYPES.includes(listing_type as ListingType)) {
    query = query.eq('listing_type', listing_type)
  }
  if (condition && VALID_CONDITIONS.includes(condition as Condition)) {
    query = query.eq('condition', condition)
  }
  if (area) {
    query = query.ilike('area', `%${area}%`)
  }

  if (sort === 'price_asc') {
    query = query.order('price', { ascending: true, nullsFirst: false })
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false, nullsFirst: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data: listings, error, count } = await query

  if (error) {
    console.error('Browse listings error:', error)
    return err('Failed to fetch listings', 'SERVER_ERROR', 500)
  }

  return list(listings ?? [], { total: count ?? 0, limit, offset })
}

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: seller } = await supabaseAdmin
    .from('users')
    .select('stripe_onboarding_complete')
    .eq('id', authUser.id)
    .single()

  if (!seller?.stripe_onboarding_complete) {
    return err(
      'Connect your Stripe account before listing items',
      'STRIPE_NOT_CONNECTED',
      403
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }
  const validated = validateListingBody(body as Record<string, unknown>)

  if ('error' in validated) {
    return err(validated.error, 'VALIDATION_ERROR', 400)
  }

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .insert({ ...validated.data, seller_id: authUser.id })
    .select('*')
    .single()

  if (error || !listing) {
    console.error('Create listing error:', error)
    return err('Failed to create listing', 'SERVER_ERROR', 500)
  }

  return ok(listing, 201)
}
