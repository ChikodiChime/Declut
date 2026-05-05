import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { verifyToken } from '@/lib/jwt'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id')
    .eq('id', payload.sub)
    .single()

  if (!user?.stripe_account_id) {
    return NextResponse.redirect(new URL('/dashboard/billing?status=error', req.url))
  }

  const account = await stripe.accounts.retrieve(user.stripe_account_id)

  if (account.charges_enabled) {
    await supabaseAdmin
      .from('users')
      .update({ stripe_onboarding_complete: true })
      .eq('id', payload.sub)

    return NextResponse.redirect(new URL('/dashboard/billing?status=connected', req.url))
  }

  return NextResponse.redirect(new URL('/dashboard/billing?status=pending', req.url))
}
