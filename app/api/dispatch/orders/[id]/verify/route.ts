import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { computeDeliveryCode } from '@/lib/delivery-code'
import { executePayout } from '@/lib/payout'
import { ok, err } from '@/lib/api-response'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { id } = await params

  let body: { code?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const code = typeof body.code === 'string' ? body.code.trim() : null
  if (!code || !/^\d{4}$/.test(code)) {
    return err('A 4-digit code is required', 'VALIDATION_ERROR', 400)
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, status, delivery_type, dispatcher_id')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.delivery_type !== 'delivery') return err('Not a delivery order', 'INVALID_STATE', 409)
  if (order.status !== 'shipped') return err('Order is not in transit', 'INVALID_STATE', 409)
  if (order.dispatcher_id !== authUser.id) return err('Forbidden', 'FORBIDDEN', 403)

  const expected = computeDeliveryCode(id)
  if (code !== expected) {
    return err('Incorrect code', 'INVALID_CODE', 400)
  }

  await executePayout(id)

  return ok({ delivered: true })
}
