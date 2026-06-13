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
      id, delivery_fee, buyer_address, created_at,
      listing:listings(title, images, area),
      order_items(listing:listings(title, images, area))
    `)
    .eq('dispatcher_id', authUser.id)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch completed deliveries error:', error)
    return err('Failed to fetch completed deliveries', 'SERVER_ERROR', 500)
  }

  const mapped = (orders ?? []).map(({ buyer_address, order_items, listing, ...order }) => ({
    ...order,
    listing: listing ?? order_items?.[0]?.listing ?? { title: 'Order', images: [], area: null },
    buyer_area: deriveBuyerArea(buyer_address),
  }))

  return ok(mapped)
}
