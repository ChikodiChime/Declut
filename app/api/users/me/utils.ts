import type { User } from '@/types'

export function formatUserResponse(user: User) {
  const { password_hash, otp_code, otp_expires_at, paystack_recipient_code, ...safeUser } = user
  return safeUser
}
