// app/api/auth/buyer/otp/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { ok, err } from '@/lib/api-response'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_TTL_MINUTES = 15

export async function POST(req: Request) {
  let body: { email?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : null
  if (!email || !EMAIL_REGEX.test(email)) {
    return err('Valid email is required', 'VALIDATION_ERROR', 400)
  }

  // Reject sellers trying to use buyer OTP flow
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('account_type')
    .eq('email', email)
    .single()

  if (existing && existing.account_type !== 'buyer') {
    return err('This email is registered as a seller. Use the seller login page.', 'SELLER_ACCOUNT', 409)
  }

  // Invalidate previous unused codes for this email
  await supabaseAdmin
    .from('otp_codes')
    .delete()
    .eq('email', email)
    .is('used_at', null)

  const code = generateOtp()
  const code_hash = await hashOtp(code)
  const expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()

  const { error } = await supabaseAdmin
    .from('otp_codes')
    .insert({ email, code_hash, expires_at })

  if (error) {
    console.error('otp_codes insert error:', error)
    return err('Failed to create verification code', 'SERVER_ERROR', 500)
  }

  try {
    await sendOtpEmail(email, code)
  } catch (emailError) {
    console.error('Failed to send OTP email:', emailError)
    return err('Failed to send verification email', 'EMAIL_ERROR', 500)
  }

  return ok({ sent: true })
}
