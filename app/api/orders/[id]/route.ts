import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const VALID_TRANSITIONS: Record<string, string> = {
  paid: 'confirmed',
  confirmed: 'delivered',
}

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const body = await req.json()
  const { status: nextStatus } = body

  if (!nextStatus || !Object.values(VALID_TRANSITIONS).includes(nextStatus)) {
    return err('status must be confirmed or delivered', 'VALIDATION_ERROR', 400)
  }

  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !order) return err('Order not found', 'NOT_FOUND', 404)

  if (order.seller_id !== authUser.id) {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  if (VALID_TRANSITIONS[order.status] !== nextStatus) {
    return err(
      `Cannot transition from ${order.status} to ${nextStatus}`,
      'INVALID_TRANSITION',
      409
    )
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ status: nextStatus })
    .eq('id', id)
    .select('id, status')
    .single()

  if (updateError || !updated) {
    return err('Failed to update order', 'SERVER_ERROR', 500)
  }

  return ok(updated)
}
