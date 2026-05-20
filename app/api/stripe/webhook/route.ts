import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type !== 'payment_intent.succeeded') {
    return new Response('OK', { status: 200 })
  }

  const paymentIntent = event.data.object
  const orderIdsRaw = paymentIntent.metadata?.order_ids
  if (!orderIdsRaw) {
    console.error('Webhook: payment_intent.succeeded missing order_ids metadata', paymentIntent.id)
    return new Response('OK', { status: 200 })
  }

  const orderIds = orderIdsRaw.split(',').map((id) => id.trim()).filter(Boolean)

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('id, listing_id')
    .in('id', orderIds)

  if (ordersError || !orders || orders.length === 0) {
    console.error('Webhook: failed to fetch orders', ordersError)
    return new Response('OK', { status: 200 })
  }

  const listingIds = orders.map((o) => o.listing_id)

  const [listingsResult, cartResult] = await Promise.all([
    supabaseAdmin
      .from('listings')
      .update({ status: 'sold' })
      .in('id', listingIds),
    supabaseAdmin
      .from('cart_items')
      .delete()
      .in('listing_id', listingIds),
  ])

  if (listingsResult.error) {
    console.error('Webhook: failed to mark listings sold', listingsResult.error)
  }
  if (cartResult.error) {
    console.error('Webhook: failed to clear cart items', cartResult.error)
  }

  await supabaseAdmin
    .from('orders')
    .update({ status: 'paid' })
    .in('id', orderIds)

  return new Response('OK', { status: 200 })
}
