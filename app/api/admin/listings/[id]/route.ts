import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('listings')
    .update({ status: 'removed' })
    .eq('id', id)
    .select('id')
    .single()

  if (error || !data) return err('Listing not found', 'NOT_FOUND', 404)
  return ok({ ok: true })
}
