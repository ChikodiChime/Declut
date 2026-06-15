import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('wallet_balance, paystack_onboarding_complete, paystack_account_name, paystack_bank_name, paystack_account_number')
    .eq('id', authUser.id)
    .single()

  if (!user) return err('User not found', 'NOT_FOUND', 404)

  return ok(user)
}
