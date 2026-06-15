// app/api/user/addresses/[id]/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  let body: { label?: unknown; address?: unknown; address_state?: unknown; is_default?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'PARSE_ERROR', 400)
  }

  const { label, address, address_state, is_default } = body

  const updates: Record<string, unknown> = {}

  if (label !== undefined) {
    if (typeof label !== 'string' || label.trim().length === 0 || label.trim().length > 30) {
      return err('Label must be 1–30 characters', 'VALIDATION_ERROR', 400)
    }
    updates.label = label.trim()
  }

  if (address !== undefined) {
    if (typeof address !== 'string' || address.trim().length === 0 || address.trim().length > 300) {
      return err('Address must be 1–300 characters', 'VALIDATION_ERROR', 400)
    }
    updates.address = address.trim()
  }

  if (address_state !== undefined) {
    updates.address_state = address_state === null ? null : String(address_state).trim() || null
  }

  if (is_default === true) {
    // Clear existing default for this user before setting the new one
    await supabaseAdmin
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', authUser.id)
    updates.is_default = true
  }

  if (Object.keys(updates).length === 0) {
    return err('At least one field required', 'VALIDATION_ERROR', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('user_addresses')
    .update(updates)
    .eq('id', id)
    .eq('user_id', authUser.id)
    .select('*')
    .single()

  if (error || !data) return err('Address not found or update failed', 'NOT_FOUND', 404)

  return ok(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('user_addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', authUser.id)

  if (error) return err('Failed to delete address', 'DB_ERROR', 500)

  return ok({ deleted: true })
}
