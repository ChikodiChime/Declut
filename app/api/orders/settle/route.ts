import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { ok, err } from '@/lib/api-response'
import { verifyTransaction } from '@/lib/paystack'

export async function POST(req: Request) {
  const body = await req.json()
  const { reference } = body

  if (!reference || typeof reference !== 'string') {
    return err('reference is required', 'VALIDATION_ERROR', 400)
  }

  let transaction
  try {
    transaction = await verifyTransaction(reference)
  } catch {
    return err('Failed to verify payment', 'PAYSTACK_ERROR', 500)
  }

  if (transaction.status !== 'success') {
    return err('Payment not confirmed', 'PAYMENT_INCOMPLETE', 402)
  }

  const orderIdsRaw = transaction.metadata?.order_ids
  if (!orderIdsRaw) {
    return err('No orders associated with this payment', 'NOT_FOUND', 404)
  }

  const orderIds = orderIdsRaw.split(',').map((id) => id.trim()).filter(Boolean)

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, status, delivery_type, item_price, delivery_fee, total_price')
    .in('id', orderIds)

  if (!orders || orders.length === 0) {
    return err('Orders not found', 'NOT_FOUND', 404)
  }

  const alreadySettled = orders.every((o) => o.status !== 'pending')

  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select('order_id, listing_id, item_price, listing:listings(id, title, price, listing_type, status, seller_id, area, images, condition, category)')
    .in('order_id', orderIds)

  const listingIds = (orderItems ?? []).map((i) => i.listing_id)

  const buyerEmail = transaction.metadata?.buyer_email
  const buyerId = transaction.metadata?.buyer_id

  if (!alreadySettled) {
    await Promise.all([
      supabaseAdmin.from('orders').update({ status: 'paid' }).in('id', orderIds).eq('status', 'pending'),
      listingIds.length > 0
        ? supabaseAdmin.from('listings').update({ status: 'sold' }).in('id', listingIds)
        : Promise.resolve(),
      listingIds.length > 0
        ? supabaseAdmin.from('cart_items').delete().in('listing_id', listingIds)
        : Promise.resolve(),
    ])

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
  }

  return ok({ settled: !alreadySettled })
}
