import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data: requests, error } = await supabaseAdmin
    .from('item_requests')
    .select('*, follow_count:request_follows(count)')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch my requests error:', error)
    return err('Failed to fetch requests', 'SERVER_ERROR', 500)
  }

  const shaped = (requests ?? []).map((r) => ({
    ...r,
    follow_count: (r.follow_count as unknown as { count: number }[])?.[0]?.count ?? 0,
    is_following: true,
  }))

  return ok(shaped)
}
