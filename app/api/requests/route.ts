import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, list, err } from '@/lib/api-response'
import { VALID_CATEGORIES } from '@/app/api/listings/utils'
import type { ListingType } from '@/types'

const VALID_LISTING_TYPES: ListingType[] = ['for_sale', 'free', 'donate']

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const q = searchParams.get('q')?.trim()
  const category = searchParams.get('category')
  const listing_type = searchParams.get('listing_type')
  const area = searchParams.get('area')?.trim()
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '24', 10), 48)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0)

  // Optionally resolve the requesting user for is_following
  const authUser = await getAuthUser()

  let query = supabaseAdmin
    .from('item_requests')
    .select(
      `*, requester:users!item_requests_user_id_fkey(id, name, avatar_url), follow_count:request_follows(count)`,
      { count: 'exact' }
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  }
  if (category && VALID_CATEGORIES.includes(category)) {
    query = query.eq('category', category)
  }
  if (listing_type && VALID_LISTING_TYPES.includes(listing_type as ListingType)) {
    query = query.eq('listing_type', listing_type)
  }
  if (area) {
    query = query.ilike('area', `%${area}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data: requests, error, count } = await query

  if (error) {
    console.error('Browse requests error:', error)
    return err('Failed to fetch requests', 'SERVER_ERROR', 500)
  }

  // Resolve is_following for authenticated users
  let followedIds = new Set<string>()
  if (authUser && requests && requests.length > 0) {
    const requestIds = requests.map((r) => r.id)
    const { data: follows } = await supabaseAdmin
      .from('request_follows')
      .select('request_id')
      .eq('user_id', authUser.id)
      .in('request_id', requestIds)
    followedIds = new Set((follows ?? []).map((f) => f.request_id))
  }

  const shaped = (requests ?? []).map((r) => ({
    ...r,
    follow_count: (r.follow_count as unknown as { count: number }[])?.[0]?.count ?? 0,
    is_following: followedIds.has(r.id),
  }))

  return list(shaped, { total: count ?? 0, limit, offset })
}

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const b = body as Record<string, unknown>

  if (!b.title || typeof b.title !== 'string' || b.title.trim().length < 3) {
    return err('title must be at least 3 characters', 'VALIDATION_ERROR', 400)
  }
  if ((b.title as string).length > 100) {
    return err('title must be 100 characters or fewer', 'VALIDATION_ERROR', 400)
  }
  if (b.description && typeof b.description === 'string' && b.description.length > 500) {
    return err('description must be 500 characters or fewer', 'VALIDATION_ERROR', 400)
  }
  if (b.category && !VALID_CATEGORIES.includes(b.category as string)) {
    return err('Invalid category', 'VALIDATION_ERROR', 400)
  }
  if (b.listing_type && !VALID_LISTING_TYPES.includes(b.listing_type as ListingType)) {
    return err('Invalid listing_type', 'VALIDATION_ERROR', 400)
  }
  if (b.max_price !== undefined && b.max_price !== null) {
    const price = Number(b.max_price)
    if (isNaN(price) || price <= 0) {
      return err('max_price must be a positive number', 'VALIDATION_ERROR', 400)
    }
  }

  const { data: request, error } = await supabaseAdmin
    .from('item_requests')
    .insert({
      user_id: authUser.id,
      title: (b.title as string).trim(),
      description: typeof b.description === 'string' ? b.description.trim() || null : null,
      category: typeof b.category === 'string' && b.category ? b.category : null,
      listing_type: typeof b.listing_type === 'string' && b.listing_type ? b.listing_type : null,
      area: typeof b.area === 'string' && b.area ? b.area.trim() : null,
      max_price: b.max_price != null ? Number(b.max_price) : null,
      status: 'open',
    })
    .select('*')
    .single()

  if (error || !request) {
    console.error('Create request error:', error)
    return err('Failed to create request', 'SERVER_ERROR', 500)
  }

  // Auto-follow: creator always follows their own request
  await supabaseAdmin.from('request_follows').insert({
    user_id: authUser.id,
    request_id: request.id,
  })

  return ok(request, 201)
}
