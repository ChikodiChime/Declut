// app/api/auth/signup/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'
import { signToken } from '@/lib/jwt'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { validateSignupBody } from './utils'

export async function POST(req: Request) {
  const body = await req.json()
  const validated = validateSignupBody(body)

  if ('error' in validated) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  const { email, password, name, account_type } = validated

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return Response.json({ error: 'Email already in use' }, { status: 409 })
  }

  const password_hash = await hashPassword(password)
  const code = generateOtp()
  const otp_code = await hashOtp(code)
  const otp_expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const otp_resend_after = new Date(Date.now() + 2 * 60 * 1000).toISOString()

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({ email, name, password_hash, account_type, otp_code, otp_expires_at, otp_resend_after })
    .select('id, email, name, account_type, stripe_onboarding_complete, avatar_url, created_at, email_verified, otp_resend_after')
    .single()

  if (error || !user) {
    console.error('Signup DB error:', error)
    return Response.json({ error: 'Failed to create account' }, { status: 500 })
  }

  await sendOtpEmail(email, code)

  const token = await signToken({ sub: user.id, email: user.email, account_type: user.account_type })

  const response = Response.json({ user }, { status: 201 })
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )

  return response
}
