// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './lib/jwt'
import { supabaseAdmin } from './lib/supabase'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  if (!token) return NextResponse.redirect(new URL('/sign-in', request.url))

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  // Check email verification
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email_verified')
    .eq('id', payload.sub)
    .single()

  if (!user?.email_verified) {
    const { pathname } = request.nextUrl
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/verify-email', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('x-user-id', payload.sub)
  response.headers.set('x-user-email', payload.email)
  response.headers.set('x-user-account-type', payload.account_type)
  return response
}

export const config = {
  matcher: ['/api/listings/:path*', '/api/users/:path*', '/dashboard/:path*'],
}
