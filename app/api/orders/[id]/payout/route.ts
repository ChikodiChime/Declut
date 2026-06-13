import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { executePayout } from '@/lib/payout'
import { ok, err } from '@/lib/api-response'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, status, seller_id, paystack_transfer_id')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.seller_id !== authUser.id) return err('Forbidden', 'FORBIDDEN', 403)
  if (order.status !== 'delivered') return err('Order has not been delivered yet', 'INVALID_STATE', 409)

  // Already has a real transfer code (not just the sentinel)
  if (order.paystack_transfer_id && order.paystack_transfer_id !== 'pending') {
    return err('Payout already processed', 'INVALID_STATE', 409)
  }

  await executePayout(id)

  return ok({ message: 'Payout initiated' })
}
