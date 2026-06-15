import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { createNotification } from '@/lib/notifications'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data: requests } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('id, amount, status, admin_note, requested_at, processed_at, bank_snapshot')
    .eq('seller_id', authUser.id)
    .order('requested_at', { ascending: false })

  return ok(requests ?? [])
}

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)
  if (authUser.account_type === 'dispatcher' || authUser.account_type === 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  let body: { amount?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'PARSE_ERROR', 400)
  }

  const { amount } = body
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    return err('amount must be a positive integer (Naira)', 'VALIDATION_ERROR', 400)
  }

  const { data: seller } = await supabaseAdmin
    .from('users')
    .select('wallet_balance, paystack_onboarding_complete, paystack_bank_name, paystack_bank_code, paystack_account_number, paystack_account_name, paystack_recipient_code')
    .eq('id', authUser.id)
    .single()

  if (!seller) return err('User not found', 'NOT_FOUND', 404)

  if (!seller.paystack_onboarding_complete) {
    return err('Add a bank account before requesting a withdrawal', 'INVALID_STATE', 409)
  }

  if (amount > seller.wallet_balance) {
    return err('Amount exceeds available wallet balance', 'VALIDATION_ERROR', 400)
  }

  // Debit atomically — guards against concurrent requests
  const { data: debited } = await supabaseAdmin.rpc('debit_wallet', {
    p_user_id: authUser.id,
    p_amount: amount,
  })

  if (!debited) {
    return err('Insufficient wallet balance', 'VALIDATION_ERROR', 400)
  }

  const bankSnapshot = {
    bank_name: seller.paystack_bank_name,
    bank_code: seller.paystack_bank_code,
    account_number: seller.paystack_account_number,
    account_name: seller.paystack_account_name,
    recipient_code: seller.paystack_recipient_code,
  }

  const { data: request, error: insertError } = await supabaseAdmin
    .from('withdrawal_requests')
    .insert({ seller_id: authUser.id, amount, bank_snapshot: bankSnapshot })
    .select('id')
    .single()

  if (insertError || !request) {
    // Refund if the row insert failed
    await supabaseAdmin.rpc('credit_wallet', { p_user_id: authUser.id, p_amount: amount })
    return err('Failed to create withdrawal request', 'DB_ERROR', 500)
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
        title: 'New withdrawal request',
        body: `A seller requested a withdrawal of ₦${amount.toLocaleString('en-NG')}`,
        link: '/admin/withdrawals',
      })
    )
  )

  return ok({ id: request.id })
}
