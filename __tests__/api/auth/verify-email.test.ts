// __tests__/api/auth/verify-email.test.ts
import { describe, it, expect } from 'vitest'
import { validateVerifyEmailBody } from '@/app/api/auth/verify-email/utils'

describe('validateVerifyEmailBody', () => {
  it('returns error when code is missing', () => {
    expect(validateVerifyEmailBody({})).toHaveProperty('error', 'code is required')
  })

  it('returns error when code is not 6 digits', () => {
    expect(validateVerifyEmailBody({ code: '123' })).toHaveProperty('error', 'code must be exactly 6 digits')
    expect(validateVerifyEmailBody({ code: 'abcdef' })).toHaveProperty('error', 'code must be exactly 6 digits')
  })

  it('returns code for valid 6-digit input', () => {
    expect(validateVerifyEmailBody({ code: '123456' })).toEqual({ code: '123456' })
  })
})
