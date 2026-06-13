import { ok, err } from '@/lib/api-response'
import { listBanks } from '@/lib/paystack'

export async function GET() {
  try {
    const banks = await listBanks()
    return ok(banks)
  } catch (error) {
    console.error('List banks error:', error)
    return err('Failed to fetch banks', 'PAYSTACK_ERROR', 500)
  }
}
