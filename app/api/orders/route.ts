import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { stripe } from '@/lib/stripe'
import { sendOrderConfirmationEmail } from '@/lib/email'
import {
  validateCartItems,
  groupBySeller,
  calculateGrandTotal,
  type CartItemWithListing,
} from './utils'

export async function POST(req: Request) {
  const authUser = await getAuthUser()

  const body = await req.json()
  const { delivery_type, listing_ids, buyer_info } = body

  if (delivery_type !== 'delivery' && delivery_type !== 'pickup') {
    return err('delivery_type must be delivery or pickup', 'VALIDATION_ERROR', 400)
  }

  let items: CartItemWithListing[] = []

  if (authUser) {
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from('cart_items')
      .select(
        'id, listing_id, listing:listings(id, title, price, listing_type, status, seller_id, area, images)'
      )
      .eq('user_id', authUser.id)

    if (cartError) return err('Failed to fetch cart', 'DB_ERROR', 500)
    items = (cartItems ?? []) as CartItemWithListing[]
  } else {
    if (!buyer_info || !buyer_info.name || !buyer_info.email || !buyer_info.phone || !buyer_info.address) {
      return err('Buyer contact information is required', 'VALIDATION_ERROR', 400)
    }

    if (!listing_ids || !Array.isArray(listing_ids) || listing_ids.length === 0) {
      return err('listing_ids is required for anonymous checkout', 'VALIDATION_ERROR', 400)
    }

    const { data: listings, error: listingsError } = await supabaseAdmin
      .from('listings')
      .select('id, title, price, listing_type, status, seller_id, area, images')
      .in('id', listing_ids)

    if (listingsError) return err('Failed to fetch listings', 'DB_ERROR', 500)

    items = (listings ?? []).map((listing) => ({
      id: listing.id,
      listing_id: listing.id,
      listing: listing as unknown as CartItemWithListing['listing'],
    })) as CartItemWithListing[]
  }

  const validation = validateCartItems(items)
  if ('error' in validation) return err(validation.error, 'VALIDATION_ERROR', 409)

  const groups = groupBySeller(items, delivery_type)
  const grandTotal = calculateGrandTotal(groups)

  const orderInserts = groups.map((group) => ({
    buyer_id: authUser?.id ?? null,
    seller_id: group.seller_id,
    listing_id: group.items[0].listing_id,
    status: 'pending' as const,
    delivery_type,
    item_price: group.subtotal,
    delivery_fee: group.delivery_fee,
    total_price: group.total,
    ...(buyer_info && {
      buyer_name: buyer_info.name,
      buyer_email: buyer_info.email,
      buyer_phone: buyer_info.phone,
      buyer_address: buyer_info.address,
    }),
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
        buyer_id: authUser?.id ?? 'anonymous',
        buyer_email: authUser?.email ?? buyer_info?.email ?? '',
        order_ids: orders.map((o) => o.id).join(','),
      },
      receipt_email: authUser?.email ?? buyer_info?.email ?? undefined,
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

  const buyerEmail = buyer_info?.email ?? authUser?.email
  const buyerName  = buyer_info?.name  ?? 'Customer'

  if (buyerEmail) {
    sendOrderConfirmationEmail({
      to: buyerEmail,
      buyerName,
      orderIds: orders.map((o) => o.id),
      groups,
      grandTotal,
      deliveryType: delivery_type,
    }).catch((e) => console.error('Order confirmation email failed:', e))
  }

  return ok({
    client_secret: paymentIntent.client_secret,
    order_ids: orders.map((o) => o.id),
    total: grandTotal,
  })
}
