import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) return err('Order not found', 'NOT_FOUND', 404)

  if (order.buyer_id !== authUser.id && order.seller_id !== authUser.id) {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  return ok(order)
}
