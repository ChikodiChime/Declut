import { JwtPayload, AccountType } from '@/types'
import { jwtVerify, SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret)

  const customPayload: JwtPayload = {
    sub: payload.sub as string,
    email: payload.email as string,
    account_type: payload.account_type as AccountType,
    iat: payload.iat,
    exp: payload.exp
  }

  return customPayload
}