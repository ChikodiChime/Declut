import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'seller'

  const selectFields =
    type === 'dispatcher'
      ? 'id, amount, status, admin_note, payment_reference, requested_at, processed_at, bank_snapshot, dispatcher:users!dispatcher_id(id, name, email, account_type, wallet_balance, created_at, paystack_onboarding_complete)'
      : 'id, amount, status, admin_note, payment_reference, requested_at, processed_at, bank_snapshot, seller:users!seller_id(id, name, email, account_type, wallet_balance, created_at, paystack_onboarding_complete)'

  let query = supabaseAdmin
    .from('withdrawal_requests')
    .select(selectFields)
    .order('requested_at', { ascending: false })

  if (type === 'dispatcher') {
    query = query.not('dispatcher_id', 'is', null)
  } else {
    query = query.not('seller_id', 'is', null)
  }

  const { data: requests } = await query

  return ok(requests ?? [])
}
