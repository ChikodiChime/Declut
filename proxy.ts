import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth endpoints and Stripe webhook are public — no token required
  if (pathname.startsWith('/api/auth/') || pathname === '/api/stripe/webhook') {
    return NextResponse.next()
  }

  // UUID pattern — all listing/order IDs are UUIDs
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

  // Public browse: GET /api/listings or GET /api/listings/<uuid>
  if (request.method === 'GET' && pathname === '/api/listings') {
    return NextResponse.next()
  }
  if (request.method === 'GET' && new RegExp(`^/api/listings/${UUID}$`).test(pathname)) {
    return NextResponse.next()
  }

  // Public cart API endpoints for anonymous buyers
  // Only the base /api/orders POST (buyer checkout) is public — sub-routes need seller auth
  if (pathname.startsWith('/api/cart') || pathname === '/api/orders') {
    return NextResponse.next()
  }

  // Public pages: /listings and /listings/<uuid>
  if (pathname === '/listings') {
    return NextResponse.next()
  }
  if (new RegExp(`^/listings/${UUID}$`).test(pathname)) {
    return NextResponse.next()
  }

  // Public cart and checkout pages for anonymous buyers
  if (pathname === '/cart' || pathname.startsWith('/checkout')) {
    return NextResponse.next()
  }

  // Buyer login page is public
  if (pathname === '/login') {
    return NextResponse.next()
  }

  // Dispatcher register page is public
  if (pathname === '/dispatch/register') {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value

  // Unauthenticated: route to correct login page based on destination
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let loginPath = '/auth/login'
    if (pathname.startsWith('/orders')) loginPath = '/login'
    if (pathname.startsWith('/dispatch')) loginPath = '/auth/login'
    return NextResponse.redirect(
      new URL(`${loginPath}?next=${encodeURIComponent(pathname)}`, request.url)
    )
  }

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginPath = pathname.startsWith('/orders') ? '/login' : '/auth/login'
    return NextResponse.redirect(new URL(loginPath, request.url))
  }

  // Sellers must verify email; buyers skip this (OTP already proves email)
  if (payload.account_type !== 'buyer') {
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
  }

  // Account-type route gates
  const isBuyer = payload.account_type === 'buyer'
  const isDispatcher = payload.account_type === 'dispatcher'

  // Dispatchers can only access /dispatch and /api/dispatch
  if (isDispatcher && !pathname.startsWith('/dispatch') && !pathname.startsWith('/api/dispatch')) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dispatch', request.url))
  }

  // Non-dispatchers cannot access dispatcher routes
  if (!isDispatcher && (pathname.startsWith('/dispatch') || pathname.startsWith('/api/dispatch'))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Buyers must not access seller dashboard
  if (isBuyer && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/orders', request.url))
  }
  if (isBuyer && pathname.startsWith('/api/users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Sellers must not access buyer orders area
  if (!isBuyer && (pathname.startsWith('/orders') || pathname.startsWith('/api/buyer'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Forward user identity to route handlers
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
    '/api/cart/:path*',
    '/api/orders/:path*',
    '/api/buyer/:path*',
    '/api/dispatch/:path*',
    '/api/stripe/:path*',
    '/api/cron/:path*',
    '/listings/:path*',
    '/dashboard/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/dispatch/:path*',
    '/login',
  ],
}
