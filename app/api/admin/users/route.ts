import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, account_type, suspended, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return err('Failed to fetch users', 'SERVER_ERROR', 500)
  return ok({ users: data })
}
