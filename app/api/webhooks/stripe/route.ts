import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'
import type Stripe from 'stripe'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'account.updated') {
    await handleAccountUpdated(event.data.object as Stripe.Account)
  }

  if (event.type === 'payment_intent.succeeded') {
    await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
  }

  return Response.json({ received: true })
}

async function handleAccountUpdated(account: Stripe.Account) {
  if (!account.charges_enabled) return

  await supabaseAdmin
    .from('users')
    .update({ stripe_onboarding_complete: true })
    .eq('stripe_account_id', account.id)
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const orderIds = (paymentIntent.metadata.order_ids ?? '').split(',').filter(Boolean)
  if (orderIds.length === 0) return

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, item_price, delivery_fee, total_price')
    .in('id', orderIds)

  if (!orders) return

  const autoCancelAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  for (const order of orders) {
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        stripe_payment_intent_id: paymentIntent.id,
        auto_cancel_at: autoCancelAt,
      })
      .eq('id', order.id)

    const { data: seller } = await supabaseAdmin
      .from('users')
      .select('stripe_account_id')
      .eq('id', order.seller_id)
      .single()

    if (!seller?.stripe_account_id) {
      // NOTE: seller has no Stripe account — transfer skipped, requires manual resolution
      console.error(`No stripe_account_id for seller ${order.seller_id} on order ${order.id}`)
      continue
    }

    const sellerTotal = order.total_price
    const transferAmount = Math.round(sellerTotal * (1 - PLATFORM_FEE_PERCENT) * 100)

    try {
      const transfer = await stripe.transfers.create({
        amount: transferAmount,
        currency: 'ngn',
        destination: seller.stripe_account_id,
        transfer_group: paymentIntent.id,
      })

      await supabaseAdmin
        .from('orders')
        .update({ stripe_transfer_id: transfer.id })
        .eq('id', order.id)
    } catch (transferError) {
      // NOTE: transfer failed — order is paid but seller payout pending manual resolution
      console.error(`Transfer failed for order ${order.id}:`, transferError)
    }
  }

  const buyerId = paymentIntent.metadata.buyer_id
  if (buyerId) {
    await supabaseAdmin.from('cart_items').delete().eq('user_id', buyerId)
  }
}
