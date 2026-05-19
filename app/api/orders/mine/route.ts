import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const VALID_STATUSES = ['paid', 'confirmed', 'shipped', 'delivered'] as const
type OrderStatus = (typeof VALID_STATUSES)[number]

export async function GET(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as OrderStatus | null

  if (!status || !VALID_STATUSES.includes(status)) {
    return err('status must be paid, confirmed, shipped, or delivered', 'VALIDATION_ERROR', 400)
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id, listing_id, status, delivery_type, item_price, delivery_fee, total_price, buyer_name, buyer_email, buyer_phone, buyer_address, created_at, listing:listings(id, title, images)'
    )
    .eq('seller_id', authUser.id)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch seller orders error:', error)
    return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  }

  return ok(orders ?? [])
}
