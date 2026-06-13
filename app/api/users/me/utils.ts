import type { User } from '@/types'

export function formatUserResponse(user: User) {
  const { password_hash, otp_code, otp_expires_at, ...safeUser } = user
  return safeUser
}
