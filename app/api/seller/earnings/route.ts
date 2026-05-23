// app/api/seller/earnings/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { ok, err } from '@/lib/api-response'
import type { TransferStatus, EarningsOrder, EarningsSummary } from '@/lib/types/earnings'

const PLATFORM_FEE_PERCENT = 10

function deriveTransferStatus(stripe_transfer_id: string | null): TransferStatus {
  if (!stripe_transfer_id) return 'pending'
  if (stripe_transfer_id === 'pending') return 'processing'
  return 'transferred'
}

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)
  if (authUser.account_type === 'dispatcher') return err('Forbidden', 'FORBIDDEN', 403)

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select(
      'id, item_price, stripe_transfer_id, created_at, order_items(listing:listings(title, images))'
    )
    .eq('seller_id', authUser.id)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error('Fetch seller earnings error:', ordersError)
    return err('Failed to fetch earnings', 'SERVER_ERROR', 500)
  }

  const earningsOrders: EarningsOrder[] = (orders ?? []).map((o) => {
    type OrderItemRow = { listing: { title: string; images: string[] } | null }
    const firstItem = (o.order_items as OrderItemRow[] | null)?.[0]
    const fee = Math.round((o.item_price * PLATFORM_FEE_PERCENT) / 100)
    const net = o.item_price - fee
    return {
      id: o.id,
      listing_title: firstItem?.listing?.title ?? 'Deleted listing',
      listing_image: firstItem?.listing?.images?.[0] ?? null,
      created_at: o.created_at,
      item_price: o.item_price,
      fee,
      net,
      transfer_status: deriveTransferStatus(o.stripe_transfer_id as string | null),
    }
  })

  const total_gross = earningsOrders.reduce((s, o) => s + o.item_price, 0)
  const total_fee = earningsOrders.reduce((s, o) => s + o.fee, 0)
  const total_net = total_gross - total_fee

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('id', authUser.id)
    .single()

  if (userError) {
    console.error('Fetch user stripe fields error:', userError)
  }

  let stripe_available = 0
  let stripe_pending = 0
  let next_payout_date: string | null = null

  if (user?.stripe_account_id && user.stripe_onboarding_complete) {
    try {
      const [balance, payouts] = await Promise.all([
        stripe.balance.retrieve({ stripeAccount: user.stripe_account_id }),
        stripe.payouts.list(
          { limit: 1, status: 'pending' },
          { stripeAccount: user.stripe_account_id }
        ),
      ])
      stripe_available = balance.available.find((b) => b.currency === 'ngn')?.amount ?? 0
      stripe_pending = balance.pending.find((b) => b.currency === 'ngn')?.amount ?? 0
      if (payouts.data[0]?.arrival_date) {
        next_payout_date = new Date(payouts.data[0].arrival_date * 1000).toISOString()
      }
    } catch (e) {
      console.error('Stripe balance/payout fetch error:', e)
      // Stripe fields stay at zero defaults — don't fail the whole request
    }
  }

  const summary: EarningsSummary = {
    total_gross,
    total_fee,
    total_net,
    stripe_available,
    stripe_pending,
    next_payout_date,
  }

  return ok({ summary, orders: earningsOrders })
}
