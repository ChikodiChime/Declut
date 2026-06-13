import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { initializeTransaction } from '@/lib/paystack'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'
import {
  validateCartItems,
  groupBySeller,
  calculateGrandTotal,
  type CartItemWithListing,
} from './utils'

export async function POST(req: Request) {
  const authUser = await getAuthUser()

  const body = await req.json()
  const { delivery_type, listing_ids, buyer_info, delivery_address, delivery_state } = body

  if (delivery_type !== 'delivery' && delivery_type !== 'pickup') {
    return err('delivery_type must be delivery or pickup', 'VALIDATION_ERROR', 400)
  }

  if (authUser && delivery_type === 'delivery' && (!delivery_address || typeof delivery_address !== 'string' || !delivery_address.trim())) {
    return err('Delivery address is required', 'VALIDATION_ERROR', 400)
  }

  let items: CartItemWithListing[] = []

  if (authUser) {
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from('cart_items')
      .select(
        'id, listing_id, listing:listings(id, title, price, listing_type, status, seller_id, area, size_category, images)'
      )
      .eq('user_id', authUser.id)

    if (cartError) return err('Failed to fetch cart', 'DB_ERROR', 500)
    items = (cartItems ?? []) as unknown as CartItemWithListing[]
  } else {
    if (!buyer_info || !buyer_info.name || !buyer_info.email || !buyer_info.phone || !buyer_info.address) {
      return err('Buyer contact information is required', 'VALIDATION_ERROR', 400)
    }

    if (!listing_ids || !Array.isArray(listing_ids) || listing_ids.length === 0) {
      return err('listing_ids is required for anonymous checkout', 'VALIDATION_ERROR', 400)
    }

    const { data: listings, error: listingsError } = await supabaseAdmin
      .from('listings')
      .select('id, title, price, listing_type, status, seller_id, area, size_category, images')
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

  const buyerState: string | null =
    delivery_type === 'delivery'
      ? (authUser
          ? (typeof delivery_state === 'string' ? delivery_state : null)
          : (typeof buyer_info?.address_state === 'string' ? buyer_info.address_state : null))
      : null
  const groups = groupBySeller(items, delivery_type, buyerState)
  const grandTotal = calculateGrandTotal(groups)

  const orderInserts = groups.map((group) => ({
    buyer_id: authUser?.id ?? null,
    seller_id: group.seller_id,
    listing_id: null,
    status: 'pending' as const,
    delivery_type,
    item_price: group.subtotal,
    delivery_fee: group.delivery_fee,
    total_price: group.total,
    platform_fee: Math.round(group.subtotal * PLATFORM_FEE_PERCENT),
    ...(buyer_info && {
      buyer_name: buyer_info.name,
      buyer_email: buyer_info.email,
      buyer_phone: buyer_info.phone,
      buyer_address: buyer_info.address,
    }),
    ...(authUser && delivery_type === 'delivery' && delivery_address && { buyer_address: delivery_address.trim() }),
  }))

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .insert(orderInserts)
    .select('id, seller_id, total_price')

  if (ordersError || !orders) {
    console.error('Orders insert error:', JSON.stringify(ordersError))
    return err('Failed to create orders', 'DB_ERROR', 500)
  }

  // Insert one order_item per listing, matched by seller_id (each seller appears once)
  const orderItemInserts = groups.flatMap((group) => {
    const order = orders.find((o) => o.seller_id === group.seller_id)!
    return group.items.map((item) => ({
      order_id: order.id,
      listing_id: item.listing_id,
      item_price: item.listing.price,
    }))
  })

  await supabaseAdmin.from('order_items').insert(orderItemInserts)

  const reference = `declut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const origin = new URL(req.url).origin

  let paystackData: { authorization_url: string; reference: string }
  try {
    paystackData = await initializeTransaction({
      email: authUser?.email ?? buyer_info?.email ?? '',
      amount: Math.round(grandTotal * 100),
      reference,
      metadata: {
        order_ids: orders.map((o) => o.id).join(','),
        buyer_id: authUser?.id ?? 'anonymous',
        buyer_email: authUser?.email ?? buyer_info?.email ?? '',
      },
      callback_url: `${origin}/checkout/success`,
    })
  } catch (paystackError) {
    await supabaseAdmin
      .from('orders')
      .delete()
      .in('id', orders.map((o) => o.id))
    console.error('Paystack initialize error:', JSON.stringify(paystackError, Object.getOwnPropertyNames(paystackError)))
    return err('Payment setup failed, please try again', 'PAYSTACK_ERROR', 500)
  }

  await supabaseAdmin
    .from('orders')
    .update({ paystack_reference: paystackData.reference })
    .in('id', orders.map((o) => o.id))

  return ok({
    authorization_url: paystackData.authorization_url,
    reference: paystackData.reference,
    order_ids: orders.map((o) => o.id),
    total: grandTotal,
  })
}
