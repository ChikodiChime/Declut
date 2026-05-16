import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('stripe_account_id')
      .eq('id', authUser.id)
      .single()

    if (!user) return err('User not found', 'NOT_FOUND', 404)

    let accountId = user.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: authUser.email,
        capabilities: { transfers: { requested: true } },
      })
      accountId = account.id

      await supabaseAdmin
        .from('users')
        .update({ stripe_account_id: accountId })
        .eq('id', authUser.id)
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:3000'

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/api/stripe/connect`,
      return_url: `${origin}/api/stripe/connect/return`,
      type: 'account_onboarding',
    })

    return ok({ url: accountLink.url })
  } catch (error) {
    console.error('Stripe Connect error:', error)
    return err(
      error instanceof Error ? error.message : 'Failed to create Stripe account link',
      'STRIPE_ERROR',
      500
    )
  }
}
