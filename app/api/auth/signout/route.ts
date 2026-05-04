// app/api/auth/signout/route.ts
import { ok } from '@/lib/api-response'

export async function POST() {
  const response = ok({ ok: true })
  response.headers.set('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  return response
}
