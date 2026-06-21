import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth endpoints and Paystack webhook are public — no token required
  if (pathname.startsWith('/api/auth/') || pathname === '/api/webhooks/paystack') {
    return NextResponse.next()
  }

  // UUID pattern — all listing/order IDs are UUIDs
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

  // Public browse: GET /api/listings, GET /api/listings/<uuid>, or GET /api/listings/suggestions
  if (request.method === 'GET' && pathname === '/api/listings') {
    return NextResponse.next()
  }
  if (request.method === 'GET' && pathname === '/api/listings/suggestions') {
    return NextResponse.next()
  }
  if (request.method === 'GET' && new RegExp(`^/api/listings/${UUID}$`).test(pathname)) {
    return NextResponse.next()
  }

  // Public: GET /api/charities (no auth needed to list charities)
  if (request.method === 'GET' && pathname === '/api/charities') {
    return NextResponse.next()
  }

  // Public: GET /api/stats (platform-wide counts, no auth needed)
  if (request.method === 'GET' && pathname === '/api/stats') {
    return NextResponse.next()
  }

  // Public: GET /api/orders/by-reference (reference acts as the access token)
  if (request.method === 'GET' && pathname === '/api/orders/by-reference') {
    return NextResponse.next()
  }

  // Public pages: /listings and /listings/<uuid>
  if (pathname === '/listings') {
    return NextResponse.next()
  }
  if (new RegExp(`^/listings/${UUID}$`).test(pathname)) {
    return NextResponse.next()
  }

  // Dispatcher login is public; register is no longer a self-serve page
  if (pathname === '/dispatch/login') {
    return NextResponse.next()
  }

  // These routes are public but benefit from knowing who the user is when
  // authenticated (e.g. is_following on requests). Still run the token path
  // below so authenticated users get x-user-id forwarded.
  const isOptionalAuth =
    pathname.startsWith('/api/cart') ||
    pathname === '/api/orders' ||
    pathname === '/api/orders/settle' ||
    pathname === '/api/chat' ||
    pathname === '/cart' ||
    pathname.startsWith('/checkout') ||
    (request.method === 'GET' && pathname === '/api/requests') ||
    (request.method === 'GET' && new RegExp(`^/api/requests/${UUID}$`).test(pathname))

  // NOTE: keep old name as alias so code below still compiles
  const isCartOrCheckout = isOptionalAuth

  const token = request.cookies.get('token')?.value

  if (!token) {
    if (isCartOrCheckout) {
      const safeHeaders = new Headers(request.headers)
      safeHeaders.delete('x-user-id')
      safeHeaders.delete('x-user-email')
      safeHeaders.delete('x-user-account-type')
      return NextResponse.next({ request: { headers: safeHeaders } })
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (pathname.startsWith('/dispatch')) {
      return NextResponse.redirect(new URL('/dispatch/login', request.url))
    }
    return NextResponse.redirect(
      new URL(`/auth/login?next=${encodeURIComponent(pathname)}`, request.url)
    )
  }

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    // Invalid token: treat cart/checkout as anonymous rather than blocking
    if (isCartOrCheckout) {
      const safeHeaders = new Headers(request.headers)
      safeHeaders.delete('x-user-id')
      safeHeaders.delete('x-user-email')
      safeHeaders.delete('x-user-account-type')
      return NextResponse.next({ request: { headers: safeHeaders } })
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // All users must verify email before accessing protected routes
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email_verified, suspended')
    .eq('id', payload.sub)
    .single()

  if (!user?.email_verified) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/verify-email', request.url))
  }

  if (user?.suspended) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/auth/login?error=suspended', request.url))
  }

  const isAdmin = payload.account_type === 'admin'
  const isDispatcher = payload.account_type === 'dispatcher'

  // Admin routes: only admins may access /admin and /api/admin
  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && !isAdmin) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admins go to /admin, not /dashboard
  if (isAdmin && (pathname === '/dashboard' || pathname === '/dispatch')) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Dispatcher home is /dispatch, not /dashboard
  if (isDispatcher && pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/dispatch', request.url))
  }

  // Dispatchers cannot access seller management or other user dashboards
  // but CAN buy things and track their own purchases
  const isDispatcherForbidden =
    isDispatcher &&
    !pathname.startsWith('/dispatch') &&
    !pathname.startsWith('/api/dispatch') &&
    !pathname.startsWith('/api/paystack') &&
    !pathname.startsWith('/api/users/me') &&
    !pathname.startsWith('/api/buyer') &&
    !pathname.startsWith('/api/cart') &&
    !pathname.startsWith('/api/orders') &&
    !pathname.startsWith('/api/requests') &&
    !pathname.startsWith('/cart') &&
    !pathname.startsWith('/checkout') &&
    !pathname.startsWith('/listings') &&
    !pathname.startsWith('/api/listings') &&
    !pathname.startsWith('/requests') &&
    pathname !== '/dashboard/orders' &&
    !pathname.startsWith('/dashboard/orders/')

  if (isDispatcherForbidden) {
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
    '/api/auth/:path*',
    '/api/listings/:path*',
    '/api/users/:path*',
    '/api/upload',
    '/api/cart/:path*',
    '/api/orders/:path*',
    '/api/claims/:path*',
    '/api/charities/:path*',
    '/api/donations/:path*',
    '/api/buyer/:path*',
    '/api/seller/:path*',
    '/api/dispatch/:path*',
    '/api/paystack/:path*',
    '/api/admin/:path*',
    '/api/user/:path*',
    '/api/withdrawals/:path*',
    '/api/notifications/:path*',
    '/api/requests',
    '/api/requests/:path*',
    '/api/cron/:path*',
    '/api/webhooks/:path*',
    '/api/reviews',
    '/api/stats',
    '/api/chat',
    '/listings/:path*',
    '/requests/new',
    '/dashboard/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/dispatch/:path*',
    '/admin/:path*',
  ],
}
