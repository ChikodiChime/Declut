import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const PAGE_SIZE = 25

export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { searchParams } = new URL(req.url)
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const q      = searchParams.get('q')?.trim() ?? ''
  const type   = searchParams.get('type') ?? ''
  const status = searchParams.get('status') ?? ''
  const offset = (page - 1) * PAGE_SIZE

  let query = supabaseAdmin
    .from('listings')
    .select('id, title, listing_type, status, area, created_at, users!seller_id(name, email)', { count: 'exact' })
    .neq('status', 'removed')

  if (q)      query = query.ilike('title', `%${q}%`)
  if (type   && ['for_sale', 'free', 'donate'].includes(type))              query = query.eq('listing_type', type)
  if (status && ['available', 'sold', 'claimed', 'donated'].includes(status)) query = query.eq('status', status)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) return err('Failed to fetch listings', 'SERVER_ERROR', 500)
  return ok({ listings: data, total: count ?? 0 })
}
