// app/api/orders/[id]/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
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

  const canView =
    order.buyer_id === authUser.id ||
    order.seller_id === authUser.id ||
    order.dispatcher_id === authUser.id

  if (!canView) return err('Forbidden', 'FORBIDDEN', 403)

  return ok(order)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  let body: { status?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const { status: nextStatus } = body

  if (nextStatus !== 'confirmed') {
    return err('status must be confirmed', 'VALIDATION_ERROR', 400)
  }

  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.seller_id !== authUser.id) return err('Forbidden', 'FORBIDDEN', 403)
  if (order.status !== 'paid') {
    return err(`Cannot confirm order in status: ${order.status}`, 'INVALID_TRANSITION', 409)
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status')
    .single()

  if (updateError || !updated) {
    return err('Failed to update order', 'SERVER_ERROR', 500)
  }

  return ok(updated)
}
