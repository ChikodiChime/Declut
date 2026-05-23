import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { formatUserResponse } from './utils'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error || !user) return err('User not found', 'NOT_FOUND', 404)

  return ok(formatUserResponse(user))
}

export async function PATCH(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const body = await req.json()
  const { name, avatar_url } = body as { name?: unknown; avatar_url?: unknown }

  if (name === undefined && avatar_url === undefined) {
    return err('At least one field required', 'VALIDATION_ERROR', 400)
  }

  const updates: Record<string, string> = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      return err('Name must be 1–100 characters', 'VALIDATION_ERROR', 400)
    }
    updates.name = name.trim()
  }

  if (avatar_url !== undefined) {
    if (typeof avatar_url !== 'string' || avatar_url.trim().length === 0) {
      return err('Invalid avatar_url', 'VALIDATION_ERROR', 400)
    }
    updates.avatar_url = avatar_url.trim()
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', authUser.id)
    .select('*')
    .single()

  if (error || !user) return err('Failed to update profile', 'DB_ERROR', 500)

  return ok(formatUserResponse(user))
}
