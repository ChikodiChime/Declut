// lib/payout.ts
import { initiateTransfer } from '@/lib/paystack'
import { supabaseAdmin } from '@/lib/supabase'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'

export async function executePayout(orderId: string): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, item_price, paystack_transfer_id')
    .eq('id', orderId)
    .single()

  if (!order) {
    console.error(`executePayout: order ${orderId} not found`)
    return
  }

  if (order.paystack_transfer_id) return // already paid out (idempotent check)

  // Atomically claim the payout slot — prevents concurrent double-payout
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

  const { data: seller } = await supabaseAdmin
    .from('users')
    .select('paystack_recipient_code, paystack_onboarding_complete')
    .eq('id', order.seller_id)
    .single()

  if (!seller?.paystack_recipient_code || !seller.paystack_onboarding_complete) {
    console.error(`executePayout: seller ${order.seller_id} has not completed Paystack onboarding — manual payout required`)
    return
  }

  const sellerAmountKobo = Math.round(
    order.item_price * (1 - PLATFORM_FEE_PERCENT) * 100
  )

  try {
    const transfer = await initiateTransfer({
      source: 'balance',
      amount: sellerAmountKobo,
      recipient: seller.paystack_recipient_code,
      reason: `Payout for order #${orderId.slice(0, 8)}`,
    })

    await supabaseAdmin
      .from('orders')
      .update({ paystack_transfer_id: transfer.transfer_code })
      .eq('id', orderId)
  } catch (error) {
    console.error(`executePayout: Paystack transfer failed for order ${orderId}:`, error)
    await supabaseAdmin
      .from('orders')
      .update({ paystack_transfer_id: null })
      .eq('id', orderId)
      .eq('paystack_transfer_id', 'pending')
  }
}
