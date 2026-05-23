import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { list, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data: listings, error: listingsError } = await supabaseAdmin
    .from('listings')
    .select('id')
    .eq('seller_id', authUser.id)
    .eq('listing_type', 'free')

  if (listingsError) return err('Failed to fetch listings', 'SERVER_ERROR', 500)

  const listingIds = (listings ?? []).map((l) => l.id)

  if (listingIds.length === 0) {
    return list([], { total: 0, limit: 100, offset: 0 })
  }

  const { data, error } = await supabaseAdmin
    .from('claims')
    .select('*, listing:listings(id, title, images, area), buyer:users(id, name, avatar_url)')
    .in('listing_id', listingIds)
    .order('claimed_at', { ascending: false })

  if (error) {
    console.error('Fetch seller claims error:', error)
    return err('Failed to fetch claims', 'SERVER_ERROR', 500)
  }

  return list(data ?? [], { total: data?.length ?? 0, limit: 100, offset: 0 })
}
