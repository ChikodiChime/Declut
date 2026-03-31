import { describe, it, expect } from 'vitest'
import { generateOtp, hashOtp, verifyOtp } from '@/lib/otp'

describe('generateOtp', () => {
  it('returns a 6-digit string', () => {
    const code = generateOtp()
    expect(code).toMatch(/^\d{6}$/)
  })

  it('generates different codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateOtp()))
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe('verifyOtp', () => {
  it('returns true for matching code', async () => {
    const code = '123456'
    const hash = await hashOtp(code)
    expect(await verifyOtp(code, hash)).toBe(true)
  })

  it('returns false for wrong code', async () => {
    const hash = await hashOtp('123456')
    expect(await verifyOtp('999999', hash)).toBe(false)
  })
})
