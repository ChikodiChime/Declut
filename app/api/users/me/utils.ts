import type { User } from '@/types'

export function formatUserResponse(user: User) {
  const { password_hash, stripe_account_id, otp_code, otp_expires_at, ...safeUser } = user
  return safeUser
}
