import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, total_price, delivery_type, created_at,
      buyer:users!buyer_id(name, email),
      seller:users!seller_id(name, email),
      dispatcher:users!dispatcher_id(name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  return ok({ orders: data })
}
