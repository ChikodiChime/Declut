import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { headers } from 'next/headers'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const headersList = await headers()
  const buyerId = headersList.get('x-user-id')
  const accountType = headersList.get('x-user-account-type')

  if (!buyerId || accountType !== 'buyer') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, item_price, delivery_fee, total_price,
      buyer_name, buyer_address, created_at,
      listing:listings(id, title, images, price),
      seller:users!orders_seller_id_fkey(id, name, email)
    `)
    .eq('id', id)
    .eq('buyer_id', buyerId)
    .single()

  if (error || !order) {
    return err('Order not found', 'NOT_FOUND', 404)
  }

  return ok(order)
}
