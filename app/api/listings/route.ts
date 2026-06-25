import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { validateListingBody, VALID_LISTING_TYPES, VALID_CONDITIONS, VALID_CATEGORIES } from './utils'
import { ok, list, err } from '@/lib/api-response'
import { createNotification } from '@/lib/notifications'
import type { ListingType, Condition } from '@/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const q = searchParams.get('q')?.trim()
  const category = searchParams.get('category')
  const listing_type = searchParams.get('listing_type')
  const condition = searchParams.get('condition')
  const area = searchParams.get('area')?.trim()
  const seller_id = searchParams.get('seller_id')
  const price_min = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : null
  const price_max = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : null
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
  if (seller_id) {
    query = query.eq('seller_id', seller_id)
  }
  if (price_min != null && !isNaN(price_min)) {
    query = query.gte('price', price_min)
  }
  if (price_max != null && !isNaN(price_max)) {
    query = query.lte('price', price_max)
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
    .select('paystack_onboarding_complete')
    .eq('id', authUser.id)
    .single()

  const paystackConnected = seller?.paystack_onboarding_complete ?? false

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

  const rawBody = body as Record<string, unknown>
  const requestIds: string[] = Array.isArray(rawBody.request_ids)
    ? (rawBody.request_ids as unknown[]).filter((id): id is string => typeof id === 'string' && !!id)
    : []

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .insert({
      ...validated.data,
      seller_id: authUser.id,
      status: paystackConnected ? 'available' : 'draft',
    })
    .select('*')
    .single()

  if (error || !listing) {
    console.error('Create listing error:', error)
    return err('Failed to create listing', 'SERVER_ERROR', 500)
  }

  if (validated.data.listing_type === 'donate') {
    const charityId = rawBody.charity_id
    await supabaseAdmin.from('donations').insert({
      listing_id: listing.id,
      seller_id: authUser.id,
      charity_id: typeof charityId === 'string' && charityId ? charityId : null,
    })
  }

  // Link to community requests and notify followers
  if (requestIds.length > 0) {
    await supabaseAdmin.from('listing_requests').insert(
      requestIds.map((rid) => ({ listing_id: listing.id, request_id: rid }))
    )

    const [{ data: follows }, { data: requests }] = await Promise.all([
      supabaseAdmin.from('request_follows').select('user_id').in('request_id', requestIds),
      supabaseAdmin.from('item_requests').select('user_id').in('id', requestIds),
    ])

    if (follows && follows.length > 0) {
      // Build a map of requester user_id → their request_ids (a user can own multiple linked requests)
      const requesterRequestMap = new Map<string, string[]>()
      for (const req of (requests ?? [])) {
        const existing = requesterRequestMap.get(req.user_id) ?? []
        existing.push(...requestIds.filter((rid) => rid === requestIds.find((r) => r === rid)))
        requesterRequestMap.set(req.user_id, requestIds)
      }

      const uniqueFollowers = [...new Set(follows.map((f) => f.user_id))]

      await Promise.all(
        uniqueFollowers.map((userId) => {
          const ownedRequestIds = requesterRequestMap.get(userId)
          return ownedRequestIds
            ? createNotification({
                user_id: userId,
                type: 'request_fulfilled',
                title: 'Someone listed an item you requested',
                body: `"${listing.title}" was just listed. Does this help?`,
                link: `/listings/${listing.id}`,
                metadata: { request_ids: ownedRequestIds },
              })
            : createNotification({
                user_id: userId,
                type: 'request_fulfilled',
                title: 'An item you\'re following was just listed',
                body: `"${listing.title}" is now available — check it out.`,
                link: `/listings/${listing.id}`,
              })
        })
      )
    }
  }

  return ok(listing, 201)
}
