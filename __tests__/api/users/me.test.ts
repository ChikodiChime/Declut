import { describe, it, expect } from 'vitest'
import { formatUserResponse } from '@/app/api/users/me/utils'
import type { User } from '@/types'

describe('formatUserResponse', () => {
  it('strips password_hash and paystack_recipient_code from the response', () => {
    const user: User = {
      id: 'abc-123',
      email: 'test@test.com',
      name: 'Test User',
      password_hash: '$2b$12$hashedpassword',
      account_type: 'individual',
      paystack_recipient_code: 'RCP_secret_123',
      paystack_bank_code: null,
      paystack_bank_name: null,
      paystack_account_number: null,
      paystack_account_name: null,
      paystack_onboarding_complete: false,
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
    expect(result).not.toHaveProperty('paystack_recipient_code')
    expect(result.id).toBe('abc-123')
  })
})
