import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { headers } from 'next/headers'
import { computeDeliveryCode } from '@/lib/delivery-code'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const headersList = await headers()
  const buyerId = headersList.get('x-user-id')
  const buyerEmail = headersList.get('x-user-email')

  if (!buyerId) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, item_price, delivery_fee, total_price,
      buyer_id, buyer_name, buyer_address, buyer_email,
      created_at, confirmed_at, shipped_at, delivered_at,
      seller:users!orders_seller_id_fkey(id, name, email),
      order_items(id, item_price, listing:listings(id, title, images, price))
    `)
    .eq('id', id)
    .or(
      buyerEmail
        ? `buyer_id.eq.${buyerId},and(buyer_email.eq.${buyerEmail},buyer_id.is.null)`
        : `buyer_id.eq.${buyerId}`
    )
    .single()

  if (error || !order) {
    return err('Order not found', 'NOT_FOUND', 404)
  }

  // Backfill buyer_id if this was an anonymous order now being claimed
  if (order.buyer_id === null) {
    await supabaseAdmin
      .from('orders')
      .update({ buyer_id: buyerId })
      .eq('id', id)
  }

  const showCode = !['delivered', 'completed', 'cancelled'].includes(order.status)

  const { data: existingReview } = await supabaseAdmin
    .from('reviews')
    .select('id')
    .eq('order_id', id)
    .maybeSingle()

  return ok({
    ...order,
    delivery_code: showCode ? computeDeliveryCode(order.id) : null,
    has_review: !!existingReview,
  })
}
