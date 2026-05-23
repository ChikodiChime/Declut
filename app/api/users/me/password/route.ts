// app/api/users/me/password/route.ts
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  let body: { current_password?: unknown; new_password?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'PARSE_ERROR', 400)
  }

  const { current_password, new_password } = body

  if (typeof current_password !== 'string' || current_password.length === 0) {
    return err('current_password is required', 'VALIDATION_ERROR', 400)
  }
  if (typeof new_password !== 'string' || new_password.length < 8) {
    return err('new_password must be at least 8 characters', 'VALIDATION_ERROR', 400)
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('password_hash')
    .eq('id', authUser.id)
    .single()

  if (error || !user) return err('User not found', 'NOT_FOUND', 404)

  const valid = await bcrypt.compare(current_password, user.password_hash)
  if (!valid) return err('Current password is incorrect', 'INVALID_PASSWORD', 400)

  const hash = await bcrypt.hash(new_password, 12)

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ password_hash: hash })
    .eq('id', authUser.id)

  if (updateError) return err('Failed to update password', 'DB_ERROR', 500)

  return ok({ success: true })
}
