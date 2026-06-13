import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { refundTransaction } from '@/lib/paystack'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, listing_id, paystack_reference, total_price, status')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (!['pending', 'paid'].includes(order.status)) {
    return err('Only pending or paid orders can be force-cancelled', 'INVALID_STATE', 409)
  }

  if (order.paystack_reference) {
    try {
      await refundTransaction({
        transaction: order.paystack_reference,
        amount: Math.round((order.total_price ?? 0) * 100),
      })
    } catch (paystackError) {
      console.error('Admin force-cancel refund error:', paystackError)
      return err('Refund failed', 'PAYSTACK_ERROR', 500)
    }
  }

  const { error: orderErr } = await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', id)
  const { error: listingErr } = await supabaseAdmin.from('listings').update({ status: 'available' }).eq('id', order.listing_id)

  if (orderErr || listingErr) {
    console.error('Force-cancel state update error:', orderErr ?? listingErr)
    return err('State update failed after refund — please check order manually', 'SERVER_ERROR', 500)
  }

  return ok({ ok: true })
}
