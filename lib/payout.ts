// lib/payout.ts
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

const PLATFORM_FEE_PERCENT = 10

export async function executePayout(orderId: string): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, item_price, stripe_payment_intent_id, stripe_transfer_id')
    .eq('id', orderId)
    .single()

  if (!order) {
    console.error(`executePayout: order ${orderId} not found`)
    return
  }

  if (order.stripe_transfer_id) return // already paid out (idempotent check)

  // Atomically claim the payout slot — prevents concurrent double-payout
  const { data: locked } = await supabaseAdmin
    .from('orders')
    .update({ stripe_transfer_id: 'pending' })
    .eq('id', orderId)
    .is('stripe_transfer_id', null)
    .select('id')
    .single()

  if (!locked) return // another caller claimed it first

  // Mark delivered first — buyer UX shouldn't wait on the financial operation
  await supabaseAdmin
    .from('orders')
    .update({ status: 'delivered' })
    .eq('id', orderId)

  const { data: seller } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('id', order.seller_id)
    .single()

  if (!seller?.stripe_account_id || !seller.stripe_onboarding_complete) {
    console.error(`executePayout: seller ${order.seller_id} has not completed Stripe onboarding — manual payout required`)
    return
  }

  const sellerAmountKobo = Math.round(
    order.item_price * (1 - PLATFORM_FEE_PERCENT / 100) * 100
  )

  try {
    const transfer = await stripe.transfers.create({
      amount: sellerAmountKobo,
      currency: 'ngn',
      destination: seller.stripe_account_id,
      transfer_group: orderId,
      metadata: { order_id: orderId },
    })

    await supabaseAdmin
      .from('orders')
      .update({ stripe_transfer_id: transfer.id })
      .eq('id', orderId)
  } catch (error) {
    console.error(`executePayout: Stripe transfer failed for order ${orderId}:`, error)
    // Clear sentinel so the next retry can attempt the transfer
    await supabaseAdmin
      .from('orders')
      .update({ stripe_transfer_id: null })
      .eq('id', orderId)
      .eq('stripe_transfer_id', 'pending')
    // Status already set to delivered. Manual payout resolution needed.
  }
}
