import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const PAGE_SIZE = 25

const VALID_STATUSES = ['pending', 'paid', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled']

export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const q        = searchParams.get('q')?.trim() ?? ''
  const status   = searchParams.get('status') ?? ''
  const delivery = searchParams.get('delivery') ?? ''
  const offset   = (page - 1) * PAGE_SIZE

  let query = supabaseAdmin
    .from('orders')
    .select(`
      id, status, total_price, item_price, delivery_fee, platform_fee,
      delivery_type, pickup_address, buyer_address, paystack_reference, auto_cancel_at, created_at,
      buyer:users!buyer_id(name, email, phone, account_type),
      seller:users!seller_id(name, email, phone, account_type),
      dispatcher:users!dispatcher_id(name, email, phone),
      items:order_items(listing:listings(id, title))
    `, { count: 'exact' })

  if (q) {
    // Run all independent lookups in parallel
    const [usersRes, listingsRes, prefixRes] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('id')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(100),
      supabaseAdmin
        .from('listings')
        .select('id')
        .ilike('title', `%${q}%`)
        .limit(100),
      // UUID cast works in .filter() but not inside .or() strings, so fetch by prefix separately
      supabaseAdmin
        .from('orders')
        .select('id')
        .filter('id::text', 'ilike', `${q}%`)
        .limit(100),
    ])

    const listingIds = (listingsRes.data ?? []).map(l => l.id)
    let itemOrderIds: string[] = []
    if (listingIds.length > 0) {
      const { data: itemRows } = await supabaseAdmin
        .from('order_items')
        .select('order_id')
        .in('listing_id', listingIds)
        .limit(200)
      itemOrderIds = (itemRows ?? []).map(i => i.order_id)
    }

    const matchingOrderIds = new Set([
      ...(prefixRes.data ?? []).map(o => o.id),
      ...itemOrderIds,
    ])

    const conditions: string[] = []
    for (const oid of matchingOrderIds) conditions.push(`id.eq.${oid}`)
    for (const u of (usersRes.data ?? [])) {
      conditions.push(`buyer_id.eq.${u.id}`, `seller_id.eq.${u.id}`)
    }

    if (conditions.length === 0) return ok({ orders: [], total: 0 })
    query = query.or(conditions.join(','))
  }

  if (status   && VALID_STATUSES.includes(status))             query = query.eq('status', status)
  if (delivery && ['delivery', 'pickup'].includes(delivery))   query = query.eq('delivery_type', delivery)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  return ok({ orders: data, total: count ?? 0 })
}
