import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { headers } from 'next/headers'

export async function GET() {
  const headersList = await headers()
  const buyerId = headersList.get('x-user-id')
  const buyerEmail = headersList.get('x-user-email')

  if (!buyerId) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, item_price, delivery_fee, total_price,
      created_at, stripe_payment_intent_id, buyer_id,
      seller:users!orders_seller_id_fkey(id, name),
      order_items(id, item_price, listing:listings(id, title, images))
    `)
    .or(
      buyerEmail
        ? `buyer_id.eq.${buyerId},and(buyer_email.eq.${buyerEmail},buyer_id.is.null)`
        : `buyer_id.eq.${buyerId}`
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Buyer orders fetch error:', error)
    return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  }

  const result = orders ?? []

  // Backfill buyer_id on any anonymous orders we just claimed so future
  // queries find them by buyer_id without needing the email match.
  const unlinked = result.filter((o) => o.buyer_id === null).map((o) => o.id)
  if (unlinked.length > 0) {
    await supabaseAdmin
      .from('orders')
      .update({ buyer_id: buyerId })
      .in('id', unlinked)
  }

  return ok(result)
}
