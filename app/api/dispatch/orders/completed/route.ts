import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

// NOTE: Expects Nigerian address format "Street, Neighbourhood, LGA, State".
// Returns the second segment as a neighbourhood-level zone label.
function deriveBuyerArea(address: string | null): string {
  if (!address) return 'Unknown area'
  const parts = address.split(',')
  return parts.length > 1 ? parts[1].trim() : parts[0].trim()
}

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, delivery_fee, buyer_address, created_at,
      listing:listings(title, images, area)
    `)
    .eq('dispatcher_id', authUser.id)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch completed deliveries error:', error)
    return err('Failed to fetch completed deliveries', 'SERVER_ERROR', 500)
  }

  const mapped = (orders ?? []).map(({ buyer_address, ...order }) => ({
    ...order,
    buyer_area: deriveBuyerArea(buyer_address),
  }))

  return ok(mapped)
}
