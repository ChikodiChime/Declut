import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  let body: { suspended?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  if (typeof body.suspended !== 'boolean') {
    return err('suspended must be a boolean', 'VALIDATION_ERROR', 400)
  }

  if (id === authUser.id) {
    return err('Cannot suspend your own account', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ suspended: body.suspended })
    .eq('id', id)
    .select('id, name, email, suspended')
    .single()

  if (error || !data) return err('User not found', 'NOT_FOUND', 404)
  return ok({ user: data })
}
