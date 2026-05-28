import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, listing_type, status, area, created_at, users!seller_id(name, email)')
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return err('Failed to fetch listings', 'SERVER_ERROR', 500)
  return ok({ listings: data })
}
