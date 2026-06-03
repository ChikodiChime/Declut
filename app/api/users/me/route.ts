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

  let body: { name?: unknown; avatar_url?: unknown; phone?: unknown; address?: unknown; address_state?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'PARSE_ERROR', 400)
  }

  const { name, avatar_url, phone, address, address_state } = body

  if (name === undefined && avatar_url === undefined && phone === undefined && address === undefined && address_state === undefined) {
    return err('At least one field required', 'VALIDATION_ERROR', 400)
  }

  const updates: Record<string, string | null> = {}

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

  if (phone !== undefined) {
    if (phone !== null && (typeof phone !== 'string' || phone.trim().length === 0 || phone.trim().length > 30)) {
      return err('Phone must be 1–30 characters', 'VALIDATION_ERROR', 400)
    }
    updates.phone = phone === null ? null : (phone as string).trim()
  }

  if (address !== undefined) {
    if (address !== null && (typeof address !== 'string' || address.trim().length === 0 || address.trim().length > 300)) {
      return err('Address must be 1–300 characters', 'VALIDATION_ERROR', 400)
    }
    updates.address = address === null ? null : (address as string).trim()
  }

  if (address_state !== undefined) {
    if (address_state !== null && (typeof address_state !== 'string' || address_state.trim().length > 100)) {
      return err('address_state must be 100 characters or less', 'VALIDATION_ERROR', 400)
    }
    updates.address_state = address_state === null ? null : (address_state as string).trim()
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
