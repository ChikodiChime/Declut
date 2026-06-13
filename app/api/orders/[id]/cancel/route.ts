import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { refundTransaction } from '@/lib/paystack'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, buyer_id, listing_id, paystack_reference, total_price, status')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.buyer_id !== authUser.id) return err('Only the buyer can cancel', 'FORBIDDEN', 403)
  if (order.status === 'cancelled') return err('Order already cancelled', 'INVALID_STATE', 409)
  if (order.status === 'completed') return err('Completed orders cannot be cancelled', 'INVALID_STATE', 409)
  if (order.status === 'shipped') return err('Orders in transit cannot be cancelled', 'INVALID_STATE', 409)
  if (order.status === 'delivered') return err('Delivered orders cannot be cancelled', 'INVALID_STATE', 409)

  if (order.paystack_reference) {
    try {
      await refundTransaction({
        transaction: order.paystack_reference,
        amount: Math.round((order.total_price ?? 0) * 100),
      })
    } catch (paystackError) {
      console.error('Paystack refund error:', paystackError)
      return err('Refund failed, please contact support', 'PAYSTACK_ERROR', 500)
    }
  }

  await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', id)

  await supabaseAdmin
    .from('listings')
    .update({ status: 'available' })
    .eq('id', order.listing_id)

  return ok({ ok: true })
}
