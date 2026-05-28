import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  let body: { name?: unknown; description?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const updates: { name?: string; description?: string } = {}
  if (typeof body.name === 'string' && body.name.trim().length >= 2) {
    updates.name = body.name.trim()
  }
  if (typeof body.description === 'string') {
    updates.description = body.description.trim()
  }

  if (Object.keys(updates).length === 0) {
    return err('No valid fields to update', 'VALIDATION_ERROR', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('charities')
    .update(updates)
    .eq('id', id)
    .select('id, name, description, active')
    .single()

  if (error || !data) return err('Charity not found', 'NOT_FOUND', 404)
  return ok({ charity: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  const { error } = await supabaseAdmin.from('charities').delete().eq('id', id)

  if (error) return err('Failed to delete charity', 'SERVER_ERROR', 500)
  return ok({ ok: true })
}
