import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('id, type, title, body, link, read, metadata, created_at')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return err('Failed to fetch notifications', 'DB_ERROR', 500)

  const unreadCount = (data ?? []).filter((n) => !n.read).length

  return ok({ notifications: data ?? [], unreadCount })
}
