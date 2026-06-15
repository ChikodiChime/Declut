import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { createNotification } from '@/lib/notifications'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  let body: { action?: unknown; note?: unknown; payment_reference?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'PARSE_ERROR', 400)
  }

  const { action, note, payment_reference } = body
  if (action !== 'process' && action !== 'reject') {
    return err('action must be "process" or "reject"', 'VALIDATION_ERROR', 400)
  }

  const { data: request } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('id, seller_id, dispatcher_id, amount, status')
    .eq('id', id)
    .single()

  if (!request) return err('Withdrawal request not found', 'NOT_FOUND', 404)
  if (request.status !== 'pending') return err('Request already resolved', 'INVALID_STATE', 409)

  const userId = (request.seller_id ?? request.dispatcher_id) as string
  const notifLink = request.seller_id ? '/dashboard/billing' : '/dispatch/stats'
  const now = new Date().toISOString()
  const adminNote = typeof note === 'string' && note.trim() ? note.trim() : null
  const paymentRef = typeof payment_reference === 'string' && payment_reference.trim() ? payment_reference.trim() : null
  const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`

  if (action === 'reject') {
    await supabaseAdmin
      .from('withdrawal_requests')
      .update({ status: 'rejected', admin_note: adminNote, processed_at: now })
      .eq('id', id)

    await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: userId,
      p_amount: request.amount,
    })

    await createNotification({
      user_id: userId,
      type: 'payout_update',
      title: 'Withdrawal request rejected',
      body: adminNote
        ? `Your withdrawal of ${fmt(request.amount)} was rejected: ${adminNote}`
        : `Your withdrawal of ${fmt(request.amount)} was rejected. Funds returned to your wallet.`,
      link: notifLink,
    })
  } else {
    await supabaseAdmin
      .from('withdrawal_requests')
      .update({ status: 'processed', processed_at: now, payment_reference: paymentRef })
      .eq('id', id)

    await createNotification({
      user_id: userId,
      type: 'payout_update',
      title: 'Withdrawal sent',
      body: `Your withdrawal of ${fmt(request.amount)} has been sent to your bank account.`,
      link: notifLink,
    })
  }

  return ok({ ok: true })
}
