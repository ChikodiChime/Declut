import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'
import { createNotification } from '@/lib/notifications'
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

  if (event.type === 'account.application.deauthorized') {
    await handleAccountDeauthorized(event.account ?? null)
  }

  if (event.type === 'payment_intent.succeeded') {
    await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
  }

  if (event.type === 'payment_intent.payment_failed') {
    await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
  }

  if (event.type === 'charge.refunded') {
    await handleChargeRefunded(event.data.object as Stripe.Charge)
  }

  if (event.type === 'charge.dispute.created') {
    await handleDisputeCreated(event.data.object as Stripe.Dispute)
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

async function handleAccountDeauthorized(stripeAccountId: string | null) {
  if (!stripeAccountId) return
  await supabaseAdmin
    .from('users')
    .update({ stripe_onboarding_complete: false, stripe_account_id: null })
    .eq('stripe_account_id', stripeAccountId)
  // TODO(owner): also set the seller's active listings to unavailable so buyers can't checkout
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderIds = (paymentIntent.metadata.order_ids ?? '').split(',').filter(Boolean)
  if (orderIds.length === 0) return

  const failureMessage = paymentIntent.last_payment_error?.message ?? 'Payment failed'
  console.error(`PaymentIntent ${paymentIntent.id} failed: ${failureMessage} — orders: ${orderIds.join(', ')}`)

  // Orders stay pending so the buyer can retry with a different payment method.
  // TODO(owner): send a "payment failed" email to the buyer using paymentIntent.metadata.buyer_email
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  // The cancel route already marks orders cancelled and listings available synchronously.
  // This handler is for reconciliation — confirm the refund landed.
  if (!charge.payment_intent) return
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, status')
    .eq('stripe_payment_intent_id', charge.payment_intent as string)

  if (!orders || orders.length === 0) return

  const uncancelled = orders.filter((o) => o.status !== 'cancelled')
  if (uncancelled.length > 0) {
    // Refund arrived but order wasn't cancelled via the API — mark it now
    await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled' })
      .in('id', uncancelled.map((o) => o.id))
  }
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  if (!dispute.payment_intent) return
  console.error(`Dispute opened on PaymentIntent ${dispute.payment_intent} — amount: ${dispute.amount}, reason: ${dispute.reason}`)
  // TODO(owner): flag the affected orders in the DB and notify admins
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const orderIds = (paymentIntent.metadata.order_ids ?? '').split(',').filter(Boolean)
  if (orderIds.length === 0) return

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, item_price, delivery_fee, total_price, platform_fee, delivery_type')
    .in('id', orderIds)

  if (!orders || orders.length === 0) return

  // Listing IDs come from order_items (one order may have multiple listings)
  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select('order_id, listing_id, item_price, listing:listings(id, title, price, listing_type, status, seller_id, area, images, condition, category)')
    .in('order_id', orderIds)

  const listingIds = (orderItems ?? []).map((i) => i.listing_id)

  const autoCancelAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  // Mark orders paid and listings sold, clear cart items
  await Promise.all([
    supabaseAdmin
      .from('orders')
      .update({ status: 'paid', stripe_payment_intent_id: paymentIntent.id, auto_cancel_at: autoCancelAt })
      .in('id', orderIds),
    listingIds.length > 0
      ? supabaseAdmin.from('listings').update({ status: 'sold' }).in('id', listingIds)
      : Promise.resolve(),
    listingIds.length > 0
      ? supabaseAdmin.from('cart_items').delete().in('listing_id', listingIds)
      : Promise.resolve(),
  ])

  // Notify buyer that their orders are confirmed/paid
  const buyerIdForNotif = paymentIntent.metadata?.buyer_id
  if (buyerIdForNotif && buyerIdForNotif !== 'anonymous') {
    for (const order of orders) {
      await createNotification({
        user_id: buyerIdForNotif,
        type: 'order_update',
        title: 'Payment confirmed',
        body: 'Your order has been placed and payment received.',
        link: `/dashboard/orders/${order.id}`,
      })
    }
  }

  // Stripe Connect transfer: one per seller order
  for (const order of orders) {
    const { data: seller } = await supabaseAdmin
      .from('users')
      .select('stripe_account_id')
      .eq('id', order.seller_id)
      .single()

    if (!seller?.stripe_account_id) {
      // NOTE: no Stripe account — transfer skipped, requires manual resolution
      console.error(`No stripe_account_id for seller ${order.seller_id} on order ${order.id}`)
      continue
    }

    // seller receives item_price minus platform fee; delivery fee stays in platform account
    const sellerAmount = order.item_price - (order.platform_fee ?? Math.round(order.item_price * PLATFORM_FEE_PERCENT))
    const transferAmount = Math.round(sellerAmount * 100)

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
      await createNotification({
        user_id: order.seller_id,
        type: 'payout_update',
        title: 'Payout sent',
        body: `Your payout for order has been transferred to your Stripe account.`,
        link: `/dashboard/billing`,
      })
    } catch (transferError) {
      // NOTE: transfer failed — order is paid but seller payout pending manual resolution
      console.error(`Transfer failed for order ${order.id}:`, transferError)
    }
  }

  // Send buyer confirmation email
  const buyerEmail = paymentIntent.metadata?.buyer_email
  const buyerId = paymentIntent.metadata?.buyer_id

  if (buyerEmail) {
    let buyerName = 'Customer'
    if (buyerId && buyerId !== 'anonymous') {
      const { data: buyer } = await supabaseAdmin
        .from('users')
        .select('name')
        .eq('id', buyerId)
        .single()
      if (buyer?.name) buyerName = buyer.name
    }

    const deliveryType = (orders[0].delivery_type ?? 'delivery') as 'delivery' | 'pickup'
    const grandTotal = orders.reduce((sum, o) => sum + (o.total_price ?? 0), 0)
    const groups = orders.map((o) => {
      const items = (orderItems ?? [])
        .filter((i) => i.order_id === o.id)
        .map((i) => ({ id: i.listing_id, listing_id: i.listing_id, listing: i.listing as never }))
      return {
        seller_id: o.seller_id,
        items,
        subtotal: o.item_price ?? 0,
        delivery_fee: o.delivery_fee ?? 0,
        total: o.total_price ?? 0,
      }
    })

    sendOrderConfirmationEmail({ to: buyerEmail, buyerName, orderIds, groups, grandTotal, deliveryType })
      .catch((e) => console.error('Confirmation email failed:', e))
  }

  // Also clear DB cart by buyer_id as a fallback for any items not covered by listing_ids
  const buyerIdMeta = paymentIntent.metadata?.buyer_id
  if (buyerIdMeta && buyerIdMeta !== 'anonymous') {
    await supabaseAdmin.from('cart_items').delete().eq('user_id', buyerIdMeta)
  }
}
