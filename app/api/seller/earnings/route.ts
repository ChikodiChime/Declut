// app/api/seller/earnings/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { PLATFORM_FEE_PERCENT } from '@/lib/constants'
import type { TransferStatus, EarningsOrder, EarningsSummary } from '@/lib/types/earnings'

function deriveTransferStatus(paystack_transfer_id: string | null): TransferStatus {
  if (!paystack_transfer_id) return 'pending'
  if (paystack_transfer_id === 'pending') return 'processing'
  return 'transferred'
}

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)
  if (authUser.account_type === 'dispatcher') return err('Forbidden', 'FORBIDDEN', 403)

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select(
      'id, item_price, paystack_transfer_id, created_at, order_items(listing:listings(title, images))'
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
    const firstItem = (o.order_items as unknown as OrderItemRow[] | null)?.[0]
    const fee = Math.round(o.item_price * PLATFORM_FEE_PERCENT)
    const net = o.item_price - fee
    return {
      id: o.id,
      listing_title: firstItem?.listing?.title ?? 'Deleted listing',
      listing_image: firstItem?.listing?.images?.[0] ?? null,
      created_at: o.created_at,
      item_price: o.item_price,
      fee,
      net,
      transfer_status: deriveTransferStatus(o.paystack_transfer_id as string | null),
    }
  })

  const summary: EarningsSummary = {
    total_gross: earningsOrders.reduce((s, o) => s + o.item_price, 0),
    total_fee: earningsOrders.reduce((s, o) => s + o.fee, 0),
    total_net: earningsOrders.reduce((s, o) => s + o.net, 0),
  }

  return ok({ summary, orders: earningsOrders })
}
