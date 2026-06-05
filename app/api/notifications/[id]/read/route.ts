import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', authUser.id)
    .select('id')

  if (error) return err('Failed to mark notification read', 'DB_ERROR', 500)
  if (!data || data.length === 0) return err('Notification not found', 'NOT_FOUND', 404)

  return ok({ ok: true })
}
