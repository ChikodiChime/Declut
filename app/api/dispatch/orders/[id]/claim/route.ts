import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, status, delivery_type, dispatcher_id')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.delivery_type !== 'delivery') return err('Only delivery orders can be claimed', 'INVALID_STATE', 409)
  if (order.status !== 'confirmed') return err('Order is not available for claiming', 'INVALID_STATE', 409)
  if (order.dispatcher_id) return err('Order already claimed', 'INVALID_STATE', 409)

  const { data: updated, error } = await supabaseAdmin
    .from('orders')
    .update({ dispatcher_id: authUser.id, status: 'shipped', shipped_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'confirmed')
    .is('dispatcher_id', null)
    .select('id, status')
    .single()

  if (error || !updated) {
    return err('Order was already claimed by another dispatcher', 'CONFLICT', 409)
  }

  return ok(updated)
}
