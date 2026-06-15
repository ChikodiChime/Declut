import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, phone, suspended, created_at')
    .eq('account_type', 'dispatcher')
    .order('created_at', { ascending: false })

  if (error) return err('Failed to fetch dispatchers', 'SERVER_ERROR', 500)
  return ok({ dispatchers: data })
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

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

  const { data: created, error } = await supabaseAdmin
    .from('users')
    .insert({ name, email, password_hash, account_type: 'dispatcher', email_verified: true })
    .select('id, name, email, created_at')
    .single()

  if (error || !created) {
    console.error('Create dispatcher error:', error)
    return err('Failed to create dispatcher account', 'SERVER_ERROR', 500)
  }

  return ok({ dispatcher: created }, 201)
}
