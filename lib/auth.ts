import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { AccountType, JwtPayload } from '@/types'
import { verifyToken } from '@/lib/jwt'

export async function getAuthUser(): Promise<{ id: string; email: string; account_type: AccountType } | null> {
  const headerList = await headers()
  const userId = headerList.get('x-user-id')

  if (!userId) return null

  return {
    id: userId,
    email: headerList.get('x-user-email')!,
    account_type: headerList.get('x-user-account-type') as AccountType,
  }
}

export async function getAuthUserFromCookie(req: NextRequest): Promise<JwtPayload | null> {
  const token = req.cookies.get('token')?.value
  if (!token) return null
  try {
    return await verifyToken(token)
  } catch {
    return null
  }
}
