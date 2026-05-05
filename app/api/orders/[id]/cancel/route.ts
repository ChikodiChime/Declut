import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, buyer_id, stripe_payment_intent_id, status')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.buyer_id !== authUser.id) return err('Only the buyer can cancel', 'FORBIDDEN', 403)
  if (order.status === 'cancelled') return err('Order already cancelled', 'INVALID_STATE', 409)
  if (order.status === 'completed') return err('Completed orders cannot be cancelled', 'INVALID_STATE', 409)

  if (order.stripe_payment_intent_id) {
    try {
      await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
    } catch (stripeError) {
      console.error('Stripe refund error:', stripeError)
      return err('Refund failed, please contact support', 'STRIPE_ERROR', 500)
    }
  }

  await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('stripe_payment_intent_id', order.stripe_payment_intent_id)

  return ok({ ok: true })
}
