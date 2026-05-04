import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { formatUserResponse } from './utils'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()

  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error || !user) {
    return err('User not found', 'NOT_FOUND', 404)
  }

  return ok(formatUserResponse(user))
}
