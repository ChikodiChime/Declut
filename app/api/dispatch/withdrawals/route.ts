import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { createNotification } from '@/lib/notifications'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: requests } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('id, amount, status, admin_note, requested_at, processed_at, bank_snapshot')
    .eq('dispatcher_id', authUser.id)
    .order('requested_at', { ascending: false })

  return ok(requests ?? [])
}

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  let body: { amount?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const amount = typeof body.amount === 'number' ? Math.floor(body.amount) : null
  if (!amount || amount <= 0) {
    return err('amount must be a positive integer', 'VALIDATION_ERROR', 400)
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('wallet_balance, paystack_onboarding_complete, paystack_recipient_code, paystack_bank_name, paystack_account_number, paystack_account_name')
    .eq('id', authUser.id)
    .single()

  if (!user) return err('User not found', 'NOT_FOUND', 404)
  if (!user.paystack_onboarding_complete) {
    return err('Bank account not configured', 'BANK_NOT_CONFIGURED', 409)
  }
  if (amount > user.wallet_balance) {
    return err('Insufficient wallet balance', 'INSUFFICIENT_BALANCE', 400)
  }

  const debited = await supabaseAdmin.rpc('debit_wallet', {
    p_user_id: authUser.id,
    p_amount: amount,
  })

  if (!debited.data) {
    return err('Insufficient wallet balance', 'INSUFFICIENT_BALANCE', 400)
  }

  const bank_snapshot = {
    bank_name: user.paystack_bank_name,
    account_number: user.paystack_account_number,
    account_name: user.paystack_account_name,
  }

  const { data: request, error: insertError } = await supabaseAdmin
    .from('withdrawal_requests')
    .insert({ dispatcher_id: authUser.id, amount, bank_snapshot })
    .select('id')
    .single()

  if (insertError || !request) {
    await supabaseAdmin.rpc('credit_wallet', { p_user_id: authUser.id, p_amount: amount })
    return err('Failed to create withdrawal request', 'SERVER_ERROR', 500)
  }

  const { data: admins } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('account_type', 'admin')

  await Promise.all(
    (admins ?? []).map((admin) =>
      createNotification({
        user_id: admin.id,
        type: 'payout_update',
        title: 'New dispatcher withdrawal request',
        body: `A dispatcher requested a withdrawal of ₦${amount.toLocaleString('en-NG')}.`,
        link: '/admin/withdrawals',
      })
    )
  )

  return ok({ id: request.id })
}
