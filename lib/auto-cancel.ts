import { supabaseAdmin } from '@/lib/supabase'
import { refundTransaction } from '@/lib/paystack'
import { createNotification } from '@/lib/notifications'

const RETRY_DELAY_MS = 15 * 60 * 1000

export async function executeAutoCancel(orderId: string): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, buyer_id, seller_id, total_price, paystack_reference, listing_id')
    .eq('id', orderId)
    .single()

  if (!order) {
    console.error(`executeAutoCancel: order ${orderId} not found`)
    return
  }

  // Atomically claim: clearing auto_cancel_at stops a concurrent run (or the
  // seller confirming mid-flight) from double-processing this order.
  const { data: claimed } = await supabaseAdmin
    .from('orders')
    .update({ auto_cancel_at: null })
    .eq('id', orderId)
    .eq('status', 'paid')
    .lt('auto_cancel_at', new Date().toISOString())
    .select('id')
    .single()

  if (!claimed) return

  try {
    if (order.paystack_reference) {
      await refundTransaction({
        transaction: order.paystack_reference,
        amount: Math.round(order.total_price * 100),
      })
    }
  } catch (error) {
    console.error(`executeAutoCancel: refund failed for order ${orderId}:`, error)
    await supabaseAdmin
      .from('orders')
      .update({ auto_cancel_at: new Date(Date.now() + RETRY_DELAY_MS).toISOString() })
      .eq('id', orderId)
      .is('auto_cancel_at', null)
    return
  }

  await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)

  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select('listing_id')
    .eq('order_id', orderId)

  const listingIds = (orderItems ?? []).map((i) => i.listing_id).filter(Boolean)

  if (listingIds.length > 0) {
    await supabaseAdmin.from('listings').update({ status: 'available' }).in('id', listingIds)
  } else if (order.listing_id) {
    await supabaseAdmin.from('listings').update({ status: 'available' }).eq('id', order.listing_id)
  }

  if (order.buyer_id) {
    createNotification({
      user_id: order.buyer_id,
      type: 'order_update',
      title: 'Order auto-cancelled and refunded',
      body: 'The seller did not respond in time, so your order was automatically cancelled and refunded.',
      link: `/dashboard/orders/${orderId}`,
    }).catch(() => {})
  }

  createNotification({
    user_id: order.seller_id,
    type: 'order_update',
    title: 'Order auto-cancelled',
    body: 'You did not confirm this order within 24 hours, so it was automatically cancelled and refunded to the buyer.',
    link: `/dashboard/orders/${orderId}`,
  }).catch(() => {})
}
