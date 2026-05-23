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

  let body: { name?: unknown; avatar_url?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'PARSE_ERROR', 400)
  }

  const { name, avatar_url } = body

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
    if (typeof avatar_url !== 'string') {
      return err('Invalid avatar_url', 'VALIDATION_ERROR', 400)
    }
    const trimmedUrl = avatar_url.trim()
    const isCloudinaryId = /^[\w\-/]+$/.test(trimmedUrl)
    const isHttpsUrl = trimmedUrl.startsWith('https://')
    if (!trimmedUrl || trimmedUrl.length > 500 || (!isCloudinaryId && !isHttpsUrl)) {
      return err('Invalid avatar_url', 'VALIDATION_ERROR', 400)
    }
    updates.avatar_url = trimmedUrl
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
