// app/api/auth/signin/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { comparePassword } from '@/lib/password'
import { signToken } from '@/lib/jwt'
import { ok, err } from '@/lib/api-response'

const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export async function POST(req: Request) {
  let body: { email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }
  const { email, password } = body

  if (!email || !password) {
    return err('email and password are required', 'VALIDATION_ERROR', 400)
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', (email as string).toLowerCase().trim())
    .single()

  if (!user) {
    return err('Invalid credentials', 'INVALID_CREDENTIALS', 401)
  }

  if (!user.password_hash) {
    return err('Invalid credentials', 'INVALID_CREDENTIALS', 401)
  }

  let passwordMatch = false
  try {
    passwordMatch = await comparePassword(password as string, user.password_hash)
  } catch {
    return err('Invalid credentials', 'INVALID_CREDENTIALS', 401)
  }
  if (!passwordMatch) {
    return err('Invalid credentials', 'INVALID_CREDENTIALS', 401)
  }

  const token = await signToken({ sub: user.id, email: user.email, account_type: user.account_type })

  const { password_hash, paystack_recipient_code, otp_code, otp_expires_at, ...safeUser } = user

  const response = ok({ user: safeUser, emailVerified: user.email_verified })
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )

  return response
}
