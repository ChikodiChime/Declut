// app/api/auth/send-verification/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { getAuthUserFromCookie } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const OTP_TTL_MS = 30 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 2 * 60 * 1000

export async function POST(req: NextRequest) {
  const authUser = await getAuthUserFromCookie(req)
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('email, email_verified, otp_resend_after')
    .eq('id', authUser.sub)
    .single()

  if (!dbUser) {
    return err('User not found', 'NOT_FOUND', 404)
  }

  // Already verified — no-op
  if (dbUser.email_verified) {
    return ok({ sent: true })
  }

  // Enforce resend cooldown
  if (dbUser.otp_resend_after && new Date(dbUser.otp_resend_after) > new Date()) {
    const retryAfter = Math.ceil(
      (new Date(dbUser.otp_resend_after).getTime() - Date.now()) / 1000
    )
    return err('Please wait before requesting a new code', 'RATE_LIMITED', 429, { retryAfter })
  }

  const code = generateOtp()
  const otp_code = await hashOtp(code)
  const otp_expires_at = new Date(Date.now() + OTP_TTL_MS).toISOString()
  const otp_resend_after = new Date(Date.now() + OTP_RESEND_COOLDOWN_MS).toISOString()

  await supabaseAdmin
    .from('users')
    .update({ otp_code, otp_expires_at, otp_resend_after })
    .eq('id', authUser.sub)

  await sendOtpEmail(dbUser.email, code)

  return ok({ sent: true })
}
