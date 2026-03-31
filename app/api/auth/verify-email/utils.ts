// app/api/auth/verify-email/utils.ts
interface VerifyEmailBody {
  code?: unknown
}

export function validateVerifyEmailBody(body: VerifyEmailBody):
  | { code: string }
  | { error: string } {
  if (!body.code || typeof body.code !== 'string') return { error: 'code is required' }
  if (!/^\d{6}$/.test(body.code)) return { error: 'code must be exactly 6 digits' }
  return { code: body.code }
}
