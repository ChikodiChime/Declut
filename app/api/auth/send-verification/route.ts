// app/api/auth/send-verification/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { getAuthUserFromCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const authUser = await getAuthUserFromCookie(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('email, email_verified, otp_resend_after')
    .eq('id', authUser.sub)
    .single()

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Already verified — no-op
  if (dbUser.email_verified) {
    return NextResponse.json({ sent: true })
  }

  // Enforce resend cooldown
  if (dbUser.otp_resend_after && new Date(dbUser.otp_resend_after) > new Date()) {
    const retryAfter = Math.ceil(
      (new Date(dbUser.otp_resend_after).getTime() - Date.now()) / 1000
    )
    return NextResponse.json(
      { error: 'Please wait before requesting a new code', retryAfter },
      { status: 429 }
    )
  }

  const code = generateOtp()
  const otp_code = await hashOtp(code)
  const otp_expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const otp_resend_after = new Date(Date.now() + 2 * 60 * 1000).toISOString()

  await supabaseAdmin
    .from('users')
    .update({ otp_code, otp_expires_at, otp_resend_after })
    .eq('id', authUser.sub)

  await sendOtpEmail(dbUser.email, code)

  return NextResponse.json({ sent: true })
}
