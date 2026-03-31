// app/api/auth/signin/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { comparePassword } from '@/lib/password'
import { signToken } from '@/lib/jwt'

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password } = body

  if (!email || !password) {
    return Response.json({ error: 'email and password are required' }, { status: 400 })
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', (email as string).toLowerCase().trim())
    .single()

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const passwordMatch = await comparePassword(password, user.password_hash)
  if (!passwordMatch) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signToken({ sub: user.id, email: user.email, account_type: user.account_type })

  const { password_hash, stripe_account_id, otp_code, otp_expires_at, ...safeUser } = user

  const response = Response.json({ user: safeUser, emailVerified: user.email_verified })
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )

  return response
}
