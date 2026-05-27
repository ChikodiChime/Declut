import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { deriveBuyerArea } from '@/lib/address'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, total_price, delivery_fee, buyer_address, created_at,
      listing:listings(id, title, images, area)
    `)
    .eq('status', 'confirmed')
    .eq('delivery_type', 'delivery')
    .is('dispatcher_id', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetch available orders error:', error)
    return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  }

  const mapped = (orders ?? []).map(({ buyer_address, ...order }) => ({
    ...order,
    buyer_area: deriveBuyerArea(buyer_address),
  }))

  return ok(mapped)
}
