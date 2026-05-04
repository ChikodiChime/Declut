// app/api/auth/signup/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'
import { signToken } from '@/lib/jwt'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { validateSignupBody } from './utils'
import { ok, err } from '@/lib/api-response'

const OTP_TTL_MS = 30 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 2 * 60 * 1000
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }
  const validated = validateSignupBody(body as Record<string, unknown>)

  if ('error' in validated) {
    return err(validated.error, 'VALIDATION_ERROR', 400)
  }

  const { email, password, name, account_type } = validated

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return err('Email already in use', 'EMAIL_TAKEN', 409)
  }

  const password_hash = await hashPassword(password)
  const code = generateOtp()
  const otp_code = await hashOtp(code)
  const otp_expires_at = new Date(Date.now() + OTP_TTL_MS).toISOString()
  const otp_resend_after = new Date(Date.now() + OTP_RESEND_COOLDOWN_MS).toISOString()

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({ email, name, password_hash, account_type, otp_code, otp_expires_at, otp_resend_after })
    .select('id, email, name, account_type, stripe_onboarding_complete, avatar_url, created_at, email_verified, otp_resend_after')
    .single()

  if (error || !user) {
    console.error('Signup DB error:', error)
    return err('Failed to create account', 'SERVER_ERROR', 500)
  }

  try {
    await sendOtpEmail(email, code)
  } catch (emailError) {
    console.error('Failed to send OTP email:', emailError)
    // Don't fail signup — user can request a resend from /verify-email
  }

  const token = await signToken({ sub: user.id, email: user.email, account_type: user.account_type })

  const response = ok(user, 201)
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )

  return response
}
