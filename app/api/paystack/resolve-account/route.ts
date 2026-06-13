import { ok, err } from '@/lib/api-response'
import { resolveAccount } from '@/lib/paystack'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const accountNumber = searchParams.get('account_number') ?? ''
  const bankCode = searchParams.get('bank_code') ?? ''

  if (!accountNumber || !bankCode) {
    return err('account_number and bank_code are required', 'VALIDATION_ERROR', 400)
  }

  try {
    const result = await resolveAccount(accountNumber, bankCode)
    return ok(result)
  } catch {
    return err('Could not verify account. Check the account number and bank.', 'PAYSTACK_ERROR', 400)
  }
}
