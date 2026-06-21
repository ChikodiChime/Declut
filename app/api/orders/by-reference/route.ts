import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { computeDeliveryCode } from '@/lib/delivery-code'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ref = searchParams.get('ref')

  if (!ref) return err('ref is required', 'VALIDATION_ERROR', 400)

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, item_price, delivery_fee, total_price,
      buyer_name, buyer_address, created_at, confirmed_at, shipped_at, delivered_at,
      seller:users!orders_seller_id_fkey(id, name, email, avatar_url),
      order_items(id, item_price, listing:listings(id, title, images, price))
    `)
    .eq('paystack_reference', ref)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('by-reference fetch error:', error)
    return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  }

  if (!orders || orders.length === 0) return ok([])

  const orderIds = orders.map(o => o.id)
  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('order_id')
    .in('order_id', orderIds)

  const reviewedSet = new Set((reviews ?? []).map(r => r.order_id))

  const result = orders.map(order => {
    const showCode = !['delivered', 'completed', 'cancelled'].includes(order.status)
    return {
      ...order,
      delivery_code: showCode ? computeDeliveryCode(order.id) : null,
      has_review: reviewedSet.has(order.id),
    }
  })

  return ok(result)
}
