import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword } from '@/lib/password'

describe('hashPassword', () => {
  it('returns a hash that is not the original password', async () => {
    const hash = await hashPassword('mypassword')
    expect(hash).not.toBe('mypassword')
    expect(hash.startsWith('$2')).toBe(true) // bcrypt hashes start with $2a$ or $2b$
  })

  it('produces different hashes for the same password (salting)', async () => {
    const hash1 = await hashPassword('same')
    const hash2 = await hashPassword('same')
    expect(hash1).not.toBe(hash2)
  })
})

describe('comparePassword', () => {
  it('returns true for the correct password', async () => {
    const hash = await hashPassword('correct')
    expect(await comparePassword('correct', hash)).toBe(true)
  })

  it('returns false for the wrong password', async () => {
    const hash = await hashPassword('correct')
    expect(await comparePassword('wrong', hash)).toBe(false)
  })
})
