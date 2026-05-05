import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth endpoints are public — no token required
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // UUID pattern — all listing IDs are UUIDs
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

  // Public browse: GET /api/listings or GET /api/listings/<uuid>
  if (request.method === 'GET' && pathname === '/api/listings') {
    return NextResponse.next()
  }
  if (request.method === 'GET' && new RegExp(`^/api/listings/${UUID}$`).test(pathname)) {
    return NextResponse.next()
  }

  // Public pages: /listings and /listings/<uuid> (named routes like /mine stay protected)
  if (pathname === '/listings') {
    return NextResponse.next()
  }
  if (new RegExp(`^/listings/${UUID}$`).test(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Check email verification
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email_verified')
    .eq('id', payload.sub)
    .single()

  if (!user?.email_verified) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/verify-email', request.url))
  }

  // Forward user identity to route handlers via request headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.sub)
  requestHeaders.set('x-user-email', payload.email)
  requestHeaders.set('x-user-account-type', payload.account_type)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    '/api/listings/:path*',
    '/api/users/:path*',
    '/api/upload',
    '/listings/:path*',
    '/dashboard/:path*',
  ],
}
