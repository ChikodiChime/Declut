import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { stripe } from '@/lib/stripe'
import {
  validateCartItems,
  groupBySeller,
  calculateGrandTotal,
  type CartItemWithListing,
} from './utils'

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const body = await req.json()
  const { delivery_type } = body

  if (delivery_type !== 'delivery' && delivery_type !== 'pickup') {
    return err('delivery_type must be delivery or pickup', 'VALIDATION_ERROR', 400)
  }

  const { data: cartItems, error: cartError } = await supabaseAdmin
    .from('cart_items')
    .select(
      'id, listing_id, listing:listings(id, title, price, listing_type, status, seller_id, area, images)'
    )
    .eq('user_id', authUser.id)

  if (cartError) return err('Failed to fetch cart', 'DB_ERROR', 500)

  const items = (cartItems ?? []) as CartItemWithListing[]

  const validation = validateCartItems(items)
  if ('error' in validation) return err(validation.error, 'VALIDATION_ERROR', 409)

  const groups = groupBySeller(items, delivery_type)
  const grandTotal = calculateGrandTotal(groups)

  const orderInserts = groups.map((group) => ({
    buyer_id: authUser.id,
    seller_id: group.seller_id,
    listing_id: group.items[0].listing_id,
    status: 'pending' as const,
    delivery_type,
    item_price: group.subtotal,
    delivery_fee: group.delivery_fee,
    total_price: group.total,
  }))

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .insert(orderInserts)
    .select('id, seller_id, total_price')

  if (ordersError || !orders) {
    return err('Failed to create orders', 'DB_ERROR', 500)
  }

  let paymentIntent
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(grandTotal * 100),
      currency: 'ngn',
      metadata: {
        buyer_id: authUser.id,
        order_ids: orders.map((o) => o.id).join(','),
      },
    })
  } catch (stripeError) {
    await supabaseAdmin
      .from('orders')
      .delete()
      .in('id', orders.map((o) => o.id))
    console.error('Stripe PaymentIntent error:', stripeError)
    return err('Payment setup failed, please try again', 'STRIPE_ERROR', 500)
  }

  await supabaseAdmin
    .from('orders')
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .in('id', orders.map((o) => o.id))

  return ok({
    client_secret: paymentIntent.client_secret,
    order_ids: orders.map((o) => o.id),
    total: grandTotal,
  })
}
