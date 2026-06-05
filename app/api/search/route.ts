import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return ok({ listings: [], claims: [] })

  const pattern = `%${q}%`
  const qLower = q.toLowerCase()

  const [listingsRes, claimsRes] = await Promise.all([
    supabaseAdmin
      .from('listings')
      .select('id, title, status, listing_type, images')
      .eq('seller_id', authUser.id)
      .ilike('title', pattern)
      .limit(5),

    supabaseAdmin
      .from('claims')
      .select('id, status, listing:listings(id, title)')
      .eq('buyer_id', authUser.id)
      .limit(50),
  ])

  if (listingsRes.error) {
    console.error('Search listings error:', listingsRes.error)
    return err('Search failed', 'DB_ERROR', 500)
  }
  if (claimsRes.error) {
    console.error('Search claims error:', claimsRes.error)
    return err('Search failed', 'DB_ERROR', 500)
  }

  const filteredClaims = (claimsRes.data ?? [])
    .filter((c) => {
      const listing = Array.isArray(c.listing) ? c.listing[0] : c.listing
      return listing?.title?.toLowerCase().includes(qLower)
    })
    .slice(0, 5)

  return ok({ listings: listingsRes.data ?? [], claims: filteredClaims })
}
