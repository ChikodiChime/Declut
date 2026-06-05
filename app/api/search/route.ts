import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return ok({ listings: [], orders: [], claims: [] })

  const pattern = `%${q}%`

  const [listingsRes, ordersRes, claimsRes] = await Promise.all([
    supabaseAdmin
      .from('listings')
      .select('id, title, status, listing_type, images')
      .eq('seller_id', authUser.id)
      .ilike('title', pattern)
      .limit(5),

    supabaseAdmin
      .from('orders')
      .select('id, status, total_price, created_at')
      .or(`buyer_id.eq.${authUser.id},seller_id.eq.${authUser.id}`)
      .ilike('id', pattern)
      .limit(5),

    supabaseAdmin
      .from('claims')
      .select('id, status, listing:listings(id, title)')
      .eq('buyer_id', authUser.id)
      .limit(5),
  ])

  // Filter claims client-side since we can't ilike on a joined column
  const allClaims = claimsRes.data ?? []
  const filteredClaims = allClaims.filter((c) => {
    const listing = Array.isArray(c.listing) ? c.listing[0] : c.listing
    return listing?.title?.toLowerCase().includes(q.toLowerCase())
  })

  return ok({
    listings: listingsRes.data ?? [],
    orders: ordersRes.data ?? [],
    claims: filteredClaims,
  })
}
