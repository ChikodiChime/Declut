// app/api/auth/buyer/verify/route.ts
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyOtp, hashOtp } from '@/lib/otp'
import { signToken } from '@/lib/jwt'
import { ok, err } from '@/lib/api-response'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export async function POST(req: Request) {
  let body: { email?: unknown; code?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : null
  const code = typeof body.code === 'string' ? body.code.trim() : null

  if (!email || !EMAIL_REGEX.test(email)) {
    return err('Valid email is required', 'VALIDATION_ERROR', 400)
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return err('A 6-digit code is required', 'VALIDATION_ERROR', 400)
  }

  // Find the most recent unused, unexpired code for this email
  const { data: otpRow } = await supabaseAdmin
    .from('otp_codes')
    .select('id, code_hash, expires_at')
    .eq('email', email)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!otpRow) {
    return err('Code is invalid or expired', 'INVALID_CODE', 401)
  }

  const valid = await verifyOtp(code, otpRow.code_hash)
  if (!valid) {
    return err('Code is invalid or expired', 'INVALID_CODE', 401)
  }

  // Mark code as used — must succeed or the code remains replayable
  const { error: markUsedError } = await supabaseAdmin
    .from('otp_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', otpRow.id)

  if (markUsedError) {
    console.error('Failed to mark OTP as used:', markUsedError)
    return err('Verification failed, please try again', 'SERVER_ERROR', 500)
  }

  // Check if email belongs to an existing seller
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, account_type')
    .eq('email', email)
    .single()

  if (existingUser && existingUser.account_type !== 'buyer') {
    return err('This email is registered as a seller.', 'SELLER_ACCOUNT', 409)
  }

  let userId: string
  if (existingUser) {
    userId = existingUser.id
  } else {
    // Placeholder hash — buyers never use password auth
    const password_hash = await hashOtp(crypto.randomBytes(32).toString('hex'))
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password_hash,
        account_type: 'buyer',
        email_verified: true,
      })
      .select('id')
      .single()

    if (insertError || !newUser) {
      console.error('Buyer upsert error:', insertError)
      return err('Failed to create account', 'SERVER_ERROR', 500)
    }
    userId = newUser.id
  }

  // Backfill anonymous orders placed with this email
  await supabaseAdmin
    .from('orders')
    .update({ buyer_id: userId })
    .eq('buyer_email', email)
    .is('buyer_id', null)

  const token = await signToken({ sub: userId, email, account_type: 'buyer' })

  const response = ok({ success: true })
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )
  return response
}
