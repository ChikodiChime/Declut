import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { createTransferRecipient } from '@/lib/paystack'

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const body = await req.json()
  const { bank_code, bank_name, account_number, account_name } = body

  if (!bank_code || !bank_name || !account_number || !account_name) {
    return err('All bank fields are required', 'VALIDATION_ERROR', 400)
  }

  try {
    const recipient = await createTransferRecipient({
      type: 'nuban',
      name: account_name,
      account_number,
      bank_code,
      currency: 'NGN',
    })

    await supabaseAdmin
      .from('users')
      .update({
        paystack_recipient_code: recipient.recipient_code,
        paystack_bank_code: bank_code,
        paystack_bank_name: bank_name,
        paystack_account_number: account_number,
        paystack_account_name: account_name,
        paystack_onboarding_complete: true,
      })
      .eq('id', authUser.id)

    await supabaseAdmin
      .from('listings')
      .update({ status: 'available' })
      .eq('seller_id', authUser.id)
      .eq('status', 'draft')

    return ok({ recipient_code: recipient.recipient_code })
  } catch (error) {
    console.error('Paystack recipient error:', error)
    return err(
      error instanceof Error ? error.message : 'Failed to save payout account',
      'PAYSTACK_ERROR',
      500
    )
  }
}
