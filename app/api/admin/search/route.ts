import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return ok({ users: [], listings: [], orders: [], dispatchers: [], charities: [], withdrawals: [] })

  const pattern = `%${q}%`

  const [usersRes, listingsRes, ordersRes, dispatchersRes, charitiesRes, sellersRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, name, email, account_type, suspended')
      .not('account_type', 'eq', 'dispatcher')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),

    supabaseAdmin
      .from('listings')
      .select('id, title, status, listing_type')
      .ilike('title', pattern)
      .limit(5),

    supabaseAdmin
      .from('orders')
      .select('id, status, total_price, created_at')
      .filter('id::text', 'ilike', `${q}%`)
      .limit(5),

    supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('account_type', 'dispatcher')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),

    supabaseAdmin
      .from('charities')
      .select('id, name, description, active')
      .ilike('name', pattern)
      .limit(5),

    // Find sellers matching the query so we can look up their withdrawals
    supabaseAdmin
      .from('users')
      .select('id')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(20),
  ])

  // Two-step: use matched seller IDs to find their withdrawal requests
  const sellerIds = sellersRes.data?.map((u) => u.id) ?? []
  const withdrawalsRes = sellerIds.length > 0
    ? await supabaseAdmin
        .from('withdrawal_requests')
        .select('id, amount, status, requested_at, seller:users!seller_id(name, email)')
        .in('seller_id', sellerIds)
        .order('requested_at', { ascending: false })
        .limit(5)
    : { data: [] }

  if (usersRes.error)       console.error('Admin search users error:',       usersRes.error)
  if (listingsRes.error)    console.error('Admin search listings error:',    listingsRes.error)
  if (ordersRes.error)      console.error('Admin search orders error:',      ordersRes.error)
  if (dispatchersRes.error) console.error('Admin search dispatchers error:', dispatchersRes.error)
  if (charitiesRes.error)   console.error('Admin search charities error:',   charitiesRes.error)

  return ok({
    users:       usersRes.data       ?? [],
    listings:    listingsRes.data    ?? [],
    orders:      ordersRes.data      ?? [],
    dispatchers: dispatchersRes.data ?? [],
    charities:   charitiesRes.data   ?? [],
    withdrawals: withdrawalsRes.data ?? [],
  })
}
