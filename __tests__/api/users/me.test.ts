import { describe, it, expect } from 'vitest'
import { formatUserResponse } from '@/app/api/users/me/utils'
import type { User } from '@/types'

describe('formatUserResponse', () => {
  it('strips password_hash and stripe_account_id from the response', () => {
    const user: User = {
      id: 'abc-123',
      email: 'test@test.com',
      name: 'Test User',
      password_hash: '$2b$12$hashedpassword',
      account_type: 'individual',
      stripe_account_id: 'acct_secret_123',
      stripe_onboarding_complete: false,
      avatar_url: null,
      phone: null,
      address: null,
      address_state: null,
      created_at: '2026-01-01T00:00:00Z',
      email_verified: false,
      otp_code: null,
      otp_expires_at: null,
      otp_resend_after: null,
    }

    const result = formatUserResponse(user)

    expect(result).not.toHaveProperty('password_hash')
    expect(result).not.toHaveProperty('stripe_account_id')
    expect(result.id).toBe('abc-123')
  })
})
