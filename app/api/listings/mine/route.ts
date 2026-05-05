import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('seller_id', authUser.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch my listings error:', error)
    return err('Failed to fetch listings', 'SERVER_ERROR', 500)
  }

  return ok(listings ?? [])
}
