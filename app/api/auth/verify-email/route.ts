// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyOtp } from '@/lib/otp'
import { getAuthUserFromCookie } from '@/lib/auth'
import { validateVerifyEmailBody } from './utils'

export async function POST(req: NextRequest) {
  const authUser = await getAuthUserFromCookie(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const validated = validateVerifyEmailBody(body)
  if ('error' in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('email_verified, otp_code, otp_expires_at')
    .eq('id', authUser.sub)
    .single()

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Idempotent — already verified
  if (dbUser.email_verified) {
    return NextResponse.json({ verified: true })
  }

  if (!dbUser.otp_code || !dbUser.otp_expires_at) {
    return NextResponse.json({ error: 'No verification code found. Request a new one.' }, { status: 400 })
  }

  if (new Date(dbUser.otp_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 })
  }

  const match = await verifyOtp(validated.code, dbUser.otp_code)
  if (!match) {
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
  }

  await supabaseAdmin
    .from('users')
    .update({ email_verified: true, otp_code: null, otp_expires_at: null, otp_resend_after: null })
    .eq('id', authUser.sub)

  return NextResponse.json({ verified: true })
}
