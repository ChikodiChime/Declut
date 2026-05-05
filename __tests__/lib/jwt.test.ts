import { describe, it, expect } from 'vitest'
import { signToken, verifyToken } from '@/lib/jwt'

describe('signToken / verifyToken', () => {
  const payload = { sub: 'user_123', email: 'a@b.com', account_type: 'individual' as const }

  it('signs and verifies a token round-trip', async () => {
    const token = await signToken(payload)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // header.payload.signature

    const decoded = await verifyToken(token)
    expect(decoded.sub).toBe('user_123')
    expect(decoded.email).toBe('a@b.com')
    expect(decoded.account_type).toBe('individual')
  })

  it('throws on a tampered token', async () => {
    const token = await signToken(payload)
    const tampered = token.slice(0, -5) + 'XXXXX'
    await expect(verifyToken(tampered)).rejects.toThrow()
  })
})
