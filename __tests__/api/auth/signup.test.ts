import { describe, it, expect } from 'vitest'
import { validateSignupBody } from '@/app/api/auth/signup/utils'

describe('validateSignupBody', () => {
  it('returns error when email is missing', () => {
    const result = validateSignupBody({ password: 'pass123', name: 'John', account_type: 'individual' })
    expect(result).toHaveProperty('error', 'email is required')
  })

  it('returns error when password is shorter than 8 characters', () => {
    const result = validateSignupBody({ email: 'a@b.com', password: 'short', name: 'John', account_type: 'individual' })
    expect(result).toHaveProperty('error', 'password must be at least 8 characters')
  })

  it('returns error for invalid account_type', () => {
    const result = validateSignupBody({ email: 'a@b.com', password: 'longpass', name: 'John', account_type: 'admin' })
    expect(result).toHaveProperty('error', 'account_type must be individual or business')
  })

  it('returns valid:true for correct input', () => {
    const result = validateSignupBody({ email: 'a@b.com', password: 'longpass', name: 'John', account_type: 'individual' })
    expect(result).toHaveProperty('valid', true)
  })
})
