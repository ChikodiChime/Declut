import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken } from '@/lib/jwt'
import { ok, err } from '@/lib/api-response'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export async function POST(req: Request) {
  let body: { name?: unknown; email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : null
  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : null
  const password = typeof body.password === 'string' ? body.password : null

  if (!name || name.length < 2) return err('Name is required', 'VALIDATION_ERROR', 400)
  if (!email || !EMAIL_REGEX.test(email)) return err('Valid email is required', 'VALIDATION_ERROR', 400)
  if (!password || password.length < 8) return err('Password must be at least 8 characters', 'VALIDATION_ERROR', 400)

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) return err('An account with this email already exists', 'CONFLICT', 409)

  const password_hash = await bcrypt.hash(password, 12)

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({ name, email, password_hash, account_type: 'dispatcher', email_verified: true })
    .select('id')
    .single()

  if (error || !user) {
    console.error('Dispatcher register error:', error)
    return err('Failed to create account', 'SERVER_ERROR', 500)
  }

  const token = await signToken({ sub: user.id, email, account_type: 'dispatcher' })

  const response = ok({ success: true })
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )
  return response
}
