import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

// POST toggles follow/unfollow for the authenticated user
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  // Verify request exists
  const { data: request } = await supabaseAdmin
    .from('item_requests')
    .select('id')
    .eq('id', id)
    .single()

  if (!request) return err('Request not found', 'NOT_FOUND', 404)

  // Check current follow state
  const { data: existing } = await supabaseAdmin
    .from('request_follows')
    .select('id')
    .eq('user_id', authUser.id)
    .eq('request_id', id)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin.from('request_follows').delete().eq('id', existing.id)
    return ok({ following: false })
  }

  await supabaseAdmin.from('request_follows').insert({
    user_id: authUser.id,
    request_id: id,
  })
  return ok({ following: true })
}
