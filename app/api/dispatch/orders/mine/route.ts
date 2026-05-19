import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, total_price, buyer_name, buyer_phone, buyer_address, created_at,
      listing:listings(id, title, images)
    `)
    .eq('dispatcher_id', authUser.id)
    .eq('status', 'shipped')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetch my deliveries error:', error)
    return err('Failed to fetch deliveries', 'SERVER_ERROR', 500)
  }

  return ok(orders ?? [])
}
