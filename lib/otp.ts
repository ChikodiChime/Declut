import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000)).padStart(6, '0')
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 10)
}

export async function verifyOtp(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash)
}
