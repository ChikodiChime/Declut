// app/api/auth/verify-email/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyOtp } from '@/lib/otp'
import { getAuthUserFromCookie } from '@/lib/auth'
import { validateVerifyEmailBody } from './utils'
import { ok, err } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  const authUser = await getAuthUserFromCookie(req)
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }
  const validated = validateVerifyEmailBody(body as Record<string, unknown>)
  if ('error' in validated) {
    return err(validated.error, 'VALIDATION_ERROR', 400)
  }

  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('email_verified, otp_code, otp_expires_at')
    .eq('id', authUser.sub)
    .single()

  if (!dbUser) {
    return err('User not found', 'NOT_FOUND', 404)
  }

  // Idempotent — already verified
  if (dbUser.email_verified) {
    return ok({ verified: true })
  }

  if (!dbUser.otp_code || !dbUser.otp_expires_at) {
    return err('No verification code found. Request a new one.', 'VALIDATION_ERROR', 400)
  }

  if (new Date(dbUser.otp_expires_at) < new Date()) {
    return err('Code expired. Request a new one.', 'VALIDATION_ERROR', 400)
  }

  const match = await verifyOtp(validated.code, dbUser.otp_code)
  if (!match) {
    return err('Invalid code. Please try again.', 'VALIDATION_ERROR', 400)
  }

  await supabaseAdmin
    .from('users')
    .update({ email_verified: true, otp_code: null, otp_expires_at: null, otp_resend_after: null })
    .eq('id', authUser.sub)

  return ok({ verified: true })
}
