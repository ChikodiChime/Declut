import { supabaseAdmin } from '@/lib/supabase'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'
import { createNotification } from '@/lib/notifications'

export async function executePayout(orderId: string): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, buyer_id, item_price, paystack_transfer_id, seller:users!orders_seller_id_fkey(name)')
    .eq('id', orderId)
    .single()

  if (!order) {
    console.error(`executePayout: order ${orderId} not found`)
    return
  }

  if (order.paystack_transfer_id) return // already credited (idempotent)

  // Atomically claim the payout slot — prevents concurrent double-credit
  const { data: locked } = await supabaseAdmin
    .from('orders')
    .update({ paystack_transfer_id: 'pending' })
    .eq('id', orderId)
    .is('paystack_transfer_id', null)
    .select('id')
    .single()

  if (!locked) return // another caller claimed it first

  await supabaseAdmin
    .from('orders')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', orderId)

  if (order.buyer_id) {
    const sellerName = (order.seller as unknown as { name: string | null } | null)?.name
    createNotification({
      user_id: order.buyer_id,
      type: 'order_update',
      title: 'Your item has been delivered!',
      body: `How was your experience with ${sellerName ?? 'the seller'}? Tap to leave a review.`,
      link: `/dashboard/orders/${orderId}`,
    }).catch(() => {})
  }

  const { data: seller } = await supabaseAdmin
    .from('users')
    .select('paystack_recipient_code, paystack_onboarding_complete')
    .eq('id', order.seller_id)
    .single()

  if (!seller?.paystack_onboarding_complete) {
    console.error(`executePayout: seller ${order.seller_id} has not completed bank onboarding — clearing sentinel`)
    await supabaseAdmin
      .from('orders')
      .update({ paystack_transfer_id: null })
      .eq('id', orderId)
      .eq('paystack_transfer_id', 'pending')
    return
  }

  const sellerAmountNaira = Math.round(order.item_price * (1 - PLATFORM_FEE_PERCENT))

  try {
    await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: order.seller_id,
      p_amount: sellerAmountNaira,
    })

    await supabaseAdmin
      .from('orders')
      .update({ paystack_transfer_id: 'credited' })
      .eq('id', orderId)
  } catch (error) {
    console.error(`executePayout: wallet credit failed for order ${orderId}:`, error)
    await supabaseAdmin
      .from('orders')
      .update({ paystack_transfer_id: null })
      .eq('id', orderId)
      .eq('paystack_transfer_id', 'pending')
  }
}
