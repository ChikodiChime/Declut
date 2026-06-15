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
    .from('users')
    .select('id, name, email, account_type, suspended, created_at', { count: 'exact' })

  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`)
  if (type && ['individual', 'business', 'dispatcher', 'admin'].includes(type)) {
    query = query.eq('account_type', type)
  }
  if (status === 'active')    query = query.eq('suspended', false)
  if (status === 'suspended') query = query.eq('suspended', true)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) return err('Failed to fetch users', 'SERVER_ERROR', 500)
  return ok({ users: data, total: count ?? 0 })
}
