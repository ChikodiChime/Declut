# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the project foundation — database schema, custom JWT authentication, and protected routes — so every subsequent phase has a working base to build on.

**Architecture:** Supabase (Postgres) for data. Custom JWT auth: passwords hashed with bcrypt, tokens signed with HS256 and stored in HTTP-only cookies, Next.js middleware verifies the token on every protected request and forwards the user ID via request headers. No third-party auth provider.

**Tech Stack:** Next.js 16 App Router, Supabase JS client, `bcryptjs` (password hashing), `jose` (JWT — edge-compatible), Vitest

> Check `node_modules/next/dist/docs/` before writing any Next.js-specific code — this project uses v16 which has breaking changes from prior versions.

---

## How JWT Auth Works (read this first)

```
SIGN UP
  client → POST /api/auth/signup { email, password, name, account_type }
         → server hashes password with bcrypt
         → inserts user row into DB
         → signs a JWT: { sub: userId, email, account_type }
         → sets JWT in HTTP-only cookie
         ← 201 { user }

SIGN IN
  client → POST /api/auth/signin { email, password }
         → server fetches user by email
         → bcrypt.compare(password, hash)
         → signs a new JWT
         → sets JWT in HTTP-only cookie
         ← 200 { user }

PROTECTED REQUEST
  client → GET /api/listings/mine  (cookie sent automatically by browser)
         → middleware reads cookie, calls jose.jwtVerify()
         → on success: forwards x-user-id header to route handler
         → on failure: redirects to /sign-in
  route handler → reads x-user-id from headers → handles request
```

**Why HTTP-only cookies?** JavaScript cannot read them — prevents XSS attacks from stealing tokens. The browser sends them automatically on every request to your domain.

**Why `jose` and not `jsonwebtoken`?** Next.js middleware runs in the Edge runtime. `jsonwebtoken` uses Node.js APIs unavailable there. `jose` is fully edge-compatible.

---

## Project Phases (full picture)

| Phase | What it builds |
|-------|---------------|
| **1 — Foundation** (this plan) | DB schema, JWT auth, protected routes |
| 2 — Listings | Create/read listings, Cloudinary image upload |
| 3 — Search | Browse, search, filter |
| 4 — Payments | Stripe Connect, seller onboarding |
| 5 — Cart & Checkout | Cart, delivery fees, order creation |
| 6 — Order Lifecycle | Status transitions, 12h auto-cancel, pickup reveal |
| 7 — Reviews | Ratings tied to buyer-confirmed delivery |

---

## File Map

```
lib/
  supabase.ts                       — server-side Supabase clients (admin + anon)
  supabase-browser.ts               — browser singleton Supabase client
  jwt.ts                            — signToken(), verifyToken(), JWT payload type
  password.ts                       — hashPassword(), comparePassword()
  auth.ts                           — getAuthUser() reads x-user-id from request headers
middleware.ts                       — verifies JWT cookie on every protected request
types/
  index.ts                          — shared TypeScript types for all DB tables
supabase/
  migrations/
    001_initial_schema.sql          — full DB schema
app/
  layout.tsx                        — root layout (no auth provider needed)
  (auth)/
    layout.tsx                      — centered layout for auth pages
    sign-in/
      page.tsx                      — sign-in form (calls POST /api/auth/signin)
    sign-up/
      page.tsx                      — sign-up form (calls POST /api/auth/signup)
  api/
    auth/
      signup/route.ts               — POST: create user, return JWT cookie
      signin/route.ts               — POST: verify credentials, return JWT cookie
      signout/route.ts              — POST: clear JWT cookie
    users/
      me/route.ts                   — GET: return current user profile
vitest.config.ts                    — test config
__tests__/
  lib/
    jwt.test.ts                     — signToken / verifyToken tests
    password.test.ts                — hashPassword / comparePassword tests
    auth.test.ts                    — getAuthUser tests
  api/
    auth/
      signup.test.ts                — buildNewUser() helper tests
    users/
      me.test.ts                    — formatUserResponse() tests
```

---

### Task 1: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install @supabase/supabase-js bcryptjs jose
npm install -D vitest @vitejs/plugin-react @types/bcryptjs
```

- [ ] **Step 2: Verify installations**

```bash
node -e "require('bcryptjs'); require('jose'); require('@supabase/supabase-js'); console.log('all ok')"
```

Expected: `all ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add supabase, bcryptjs, jose, vitest dependencies"
```

---

### Task 2: Configure environment variables

**Files:** `.env.local`, `.gitignore`

- [ ] **Step 1: Create `.env.local`**

```env
# JWT — generate a strong secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_64_char_hex_string_here
JWT_EXPIRES_IN=7d

# Supabase — supabase.com → your project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [ ] **Step 2: Generate a real JWT secret**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as the value of `JWT_SECRET` in `.env.local`.

- [ ] **Step 3: Verify `.env.local` is git-ignored**

```bash
grep ".env.local" .gitignore
```

If not listed, add `.env.local` to `.gitignore` manually.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: configure env vars (jwt secret, supabase)"
```

---

### Task 3: Database schema

**Files:** `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Create `supabase/migrations/001_initial_schema.sql`**

```sql
-- Users table
-- id is a UUID we generate (not a Clerk ID)
-- password_hash stores the bcrypt hash — never the plain password
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  password_hash text not null,
  account_type text not null default 'individual'
    check (account_type in ('individual', 'business')),
  stripe_account_id text,
  stripe_onboarding_complete boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Listings table
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  price numeric(10,2),                   -- null for free/donate listings
  category text not null,
  condition text not null
    check (condition in ('new', 'like_new', 'good', 'fair', 'poor')),
  listing_type text not null
    check (listing_type in ('for_sale', 'free', 'donate')),
  area text not null,                    -- e.g. "Ajah, Lagos"
  images text[] not null default '{}',  -- Cloudinary public_ids
  status text not null default 'available'
    check (status in ('available', 'sold', 'claimed', 'donated')),
  created_at timestamptz not null default now()
);

-- Orders table (for_sale listings only)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.users(id),
  seller_id uuid not null references public.users(id),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled')),
  delivery_type text not null
    check (delivery_type in ('delivery', 'pickup')),
  item_price numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total_price numeric(10,2) not null,
  stripe_payment_intent_id text,
  pickup_address text,                   -- revealed only after payment confirmed
  auto_cancel_at timestamptz,            -- 12h after payment; auto-cancel if seller silent
  created_at timestamptz not null default now()
);

-- Cart items
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, listing_id)
);

-- Reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id),
  reviewer_id uuid not null references public.users(id),
  seller_id uuid not null references public.users(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Indexes for common query patterns
create index listings_seller_id_idx on public.listings(seller_id);
create index listings_status_idx on public.listings(status);
create index listings_listing_type_idx on public.listings(listing_type);
create index orders_buyer_id_idx on public.orders(buyer_id);
create index orders_seller_id_idx on public.orders(seller_id);
create index orders_status_idx on public.orders(status);
```

- [ ] **Step 3: Run migration in Supabase**

1. Go to your Supabase project → SQL Editor
2. Paste the full contents of `001_initial_schema.sql` → Run

Verify: Table Editor → confirm all 5 tables appear: `users`, `listings`, `orders`, `cart_items`, `reviews`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add initial database schema"
```

---

### Task 4: TypeScript types

**Files:** `types/index.ts`

- [ ] **Step 1: Create `types/index.ts`**

```ts
export type AccountType = 'individual' | 'business'
export type ListingType = 'for_sale' | 'free' | 'donate'
export type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'
export type ListingStatus = 'available' | 'sold' | 'claimed' | 'donated'
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
export type DeliveryType = 'delivery' | 'pickup'

export interface User {
  id: string
  email: string
  name: string | null
  password_hash: string
  account_type: AccountType
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  avatar_url: string | null
  created_at: string
}

export interface Listing {
  id: string
  seller_id: string
  title: string
  description: string | null
  price: number | null
  category: string
  condition: Condition
  listing_type: ListingType
  area: string
  images: string[]
  status: ListingStatus
  created_at: string
}

export interface Order {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  status: OrderStatus
  delivery_type: DeliveryType
  item_price: number
  delivery_fee: number
  total_price: number
  stripe_payment_intent_id: string | null
  pickup_address: string | null
  auto_cancel_at: string | null
  created_at: string
}

export interface CartItem {
  id: string
  user_id: string
  listing_id: string
  created_at: string
}

export interface Review {
  id: string
  order_id: string
  reviewer_id: string
  seller_id: string
  rating: number
  comment: string | null
  created_at: string
}

// What we embed in the JWT payload
export interface JwtPayload {
  sub: string        // user UUID
  email: string
  account_type: AccountType
  iat?: number       // issued at (set by jose automatically)
  exp?: number       // expiry (set by jose automatically)
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 5: Supabase clients

**Files:** `lib/supabase.ts`, `lib/supabase-browser.ts`

- [ ] **Step 1: Create `lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

// Admin client — uses service role key, bypasses Row Level Security.
// Use ONLY in server-side code (route handlers). Never import in client components.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Anon client — respects Row Level Security. Safe for server components.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

- [ ] **Step 2: Create `lib/supabase-browser.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient> | null = null

// One client instance per browser session.
// Import this in Client Components instead of lib/supabase.ts.
export function getSupabaseBrowser() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts lib/supabase-browser.ts
git commit -m "feat: add supabase server and browser clients"
```

---

### Task 6: JWT utilities

**Files:** `lib/jwt.ts`, `__tests__/lib/jwt.test.ts`

- [ ] **Step 1: Set up Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 2: Write failing tests**

Create `__tests__/lib/jwt.test.ts`:

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/jwt.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/jwt'`

- [ ] **Step 4: Create `lib/jwt.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose'
import type { JwtPayload } from '@/types'

// TextEncoder converts the string secret to a Uint8Array that jose expects
const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })  // HS256 = HMAC-SHA256 symmetric signing
    .setIssuedAt()                          // sets iat = current timestamp
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '7d')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as JwtPayload
  // jwtVerify throws if: signature invalid, token expired, or token malformed
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/jwt.test.ts
```

Expected: PASS — 2 tests passing

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts lib/jwt.ts __tests__/lib/jwt.test.ts
git commit -m "feat: add JWT sign/verify utilities with tests"
```

---

### Task 7: Password utilities

**Files:** `lib/password.ts`, `__tests__/lib/password.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/password.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/password.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/password'`

- [ ] **Step 3: Create `lib/password.ts`**

```ts
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12
// Higher = slower to hash = harder to brute-force. 12 is a good balance for 2026 hardware.

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/password.test.ts
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/password.ts __tests__/lib/password.test.ts
git commit -m "feat: add bcrypt password hash/compare utilities with tests"
```

---

### Task 8: Auth helper (reads user from request headers)

**Files:** `lib/auth.ts`, `__tests__/lib/auth.test.ts`

Route handlers need to know who is making the request. The middleware (Task 9) will verify the JWT and forward the user ID as the `x-user-id` request header. This helper reads it.

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getAuthUser } from '@/lib/auth'

describe('getAuthUser', () => {
  it('returns the user id from x-user-id header', () => {
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-user-id': 'abc-123', 'x-user-email': 'a@b.com' },
    })
    const user = getAuthUser(req)
    expect(user.id).toBe('abc-123')
    expect(user.email).toBe('a@b.com')
  })

  it('throws Unauthorized when x-user-id header is missing', () => {
    const req = new Request('http://localhost/api/test')
    expect(() => getAuthUser(req)).toThrow('Unauthorized')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/auth.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 3: Create `lib/auth.ts`**

```ts
export interface AuthUser {
  id: string
  email: string
}

// Call this at the top of any protected route handler.
// Middleware sets x-user-id and x-user-email after verifying the JWT —
// so if we reach this point in a protected route, the headers will be present.
export function getAuthUser(req: Request): AuthUser {
  const id = req.headers.get('x-user-id')
  const email = req.headers.get('x-user-email') ?? ''

  if (!id) throw new Error('Unauthorized')

  return { id, email }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/auth.test.ts
```

Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts __tests__/lib/auth.test.ts
git commit -m "feat: add getAuthUser helper with tests"
```

---

### Task 9: Middleware — JWT verification on every request

**Files:** `middleware.ts`

This runs before every request. It reads the JWT from the cookie, verifies it with `jose`, and forwards the user ID to the route handler via headers. If the token is missing or invalid, it redirects to `/sign-in`.

- [ ] **Step 1: Create `middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

// Routes that do NOT require authentication
const PUBLIC_PATHS = ['/', '/sign-in', '/sign-up', '/listings', '/api/auth']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret)

    // Forward user info as headers so route handlers don't need to re-verify
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.sub as string)
    requestHeaders.set('x-user-email', (payload.email as string) ?? '')

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    // Token expired or tampered — clear the bad cookie and redirect
    const response = NextResponse.redirect(new URL('/sign-in', request.url))
    response.cookies.delete('token')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add JWT verification middleware"
```

---

### Task 10: Sign-up API route

**Files:** `app/api/auth/signup/route.ts`, `__tests__/api/auth/signup.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/auth/signup.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateSignupBody } from '@/app/api/auth/signup/utils'

describe('validateSignupBody', () => {
  it('returns error when email is missing', () => {
    const result = validateSignupBody({ password: 'pass123', name: 'John', account_type: 'individual' })
    expect(result.error).toBe('email is required')
  })

  it('returns error when password is shorter than 8 characters', () => {
    const result = validateSignupBody({ email: 'a@b.com', password: 'short', name: 'John', account_type: 'individual' })
    expect(result.error).toBe('password must be at least 8 characters')
  })

  it('returns error for invalid account_type', () => {
    const result = validateSignupBody({ email: 'a@b.com', password: 'longpass', name: 'John', account_type: 'admin' })
    expect(result.error).toBe('account_type must be individual or business')
  })

  it('returns valid:true for correct input', () => {
    const result = validateSignupBody({ email: 'a@b.com', password: 'longpass', name: 'John', account_type: 'individual' })
    expect(result.valid).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/auth/signup.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/auth/signup/utils'`

- [ ] **Step 3: Create `app/api/auth/signup/utils.ts`**

```ts
interface SignupBody {
  email?: unknown
  password?: unknown
  name?: unknown
  account_type?: unknown
}

export function validateSignupBody(body: SignupBody):
  | { valid: true; email: string; password: string; name: string | null; account_type: 'individual' | 'business' }
  | { error: string } {

  if (!body.email || typeof body.email !== 'string') return { error: 'email is required' }
  if (!body.password || typeof body.password !== 'string') return { error: 'password is required' }
  if (body.password.length < 8) return { error: 'password must be at least 8 characters' }
  if (body.account_type !== 'individual' && body.account_type !== 'business') {
    return { error: 'account_type must be individual or business' }
  }

  return {
    valid: true,
    email: body.email.toLowerCase().trim(),
    password: body.password,
    name: typeof body.name === 'string' ? body.name.trim() || null : null,
    account_type: body.account_type,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/api/auth/signup.test.ts
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Create `app/api/auth/signup/route.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'
import { signToken } from '@/lib/jwt'
import { validateSignupBody } from './utils'

export async function POST(req: Request) {
  const body = await req.json()
  const validated = validateSignupBody(body)

  if ('error' in validated) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  const { email, password, name, account_type } = validated

  // Check if email already exists
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return Response.json({ error: 'Email already in use' }, { status: 409 })
  }

  const password_hash = await hashPassword(password)

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({ email, name, password_hash, account_type })
    .select('id, email, name, account_type, stripe_onboarding_complete, avatar_url, created_at')
    .single()

  if (error || !user) {
    console.error('Signup DB error:', error)
    return Response.json({ error: 'Failed to create account' }, { status: 500 })
  }

  const token = await signToken({ sub: user.id, email: user.email, account_type: user.account_type })

  const response = Response.json({ user }, { status: 201 })
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )

  return response
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/auth/signup/ __tests__/api/auth/signup.test.ts
git commit -m "feat: add POST /api/auth/signup route"
```

---

### Task 11: Sign-in API route

**Files:** `app/api/auth/signin/route.ts`

- [ ] **Step 1: Create `app/api/auth/signin/route.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { comparePassword } from '@/lib/password'
import { signToken } from '@/lib/jwt'

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password } = body

  if (!email || !password) {
    return Response.json({ error: 'email and password are required' }, { status: 400 })
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', (email as string).toLowerCase().trim())
    .single()

  // Use a generic error — never tell the client whether email or password was wrong
  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const passwordMatch = await comparePassword(password, user.password_hash)
  if (!passwordMatch) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signToken({ sub: user.id, email: user.email, account_type: user.account_type })

  const { password_hash, stripe_account_id, ...safeUser } = user

  const response = Response.json({ user: safeUser })
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )

  return response
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/signin/route.ts
git commit -m "feat: add POST /api/auth/signin route"
```

---

### Task 12: Sign-out API route

**Files:** `app/api/auth/signout/route.ts`

- [ ] **Step 1: Create `app/api/auth/signout/route.ts`**

```ts
export async function POST() {
  // Clear the cookie by setting Max-Age=0
  const response = Response.json({ ok: true })
  response.headers.set('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  return response
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/signout/route.ts
git commit -m "feat: add POST /api/auth/signout route"
```

---

### Task 13: Current user API route

**Files:** `app/api/users/me/route.ts`, `__tests__/api/users/me.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/api/users/me.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatUserResponse } from '@/app/api/users/me/utils'
import type { User } from '@/types'

describe('formatUserResponse', () => {
  it('strips password_hash and stripe_account_id from the response', () => {
    const user: User = {
      id: 'abc-123',
      email: 'test@test.com',
      name: 'Test User',
      password_hash: '$2b$12$hashedpassword',
      account_type: 'individual',
      stripe_account_id: 'acct_secret_123',
      stripe_onboarding_complete: false,
      avatar_url: null,
      created_at: '2026-01-01T00:00:00Z',
    }

    const result = formatUserResponse(user)

    expect(result).not.toHaveProperty('password_hash')
    expect(result).not.toHaveProperty('stripe_account_id')
    expect(result.id).toBe('abc-123')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/users/me.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/users/me/utils'`

- [ ] **Step 3: Create `app/api/users/me/utils.ts`**

```ts
import type { User } from '@/types'

export function formatUserResponse(user: User) {
  const { password_hash, stripe_account_id, ...safeUser } = user
  return safeUser
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/api/users/me.test.ts
```

Expected: PASS — 1 test passing

- [ ] **Step 5: Create `app/api/users/me/route.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { formatUserResponse } from './utils'

export async function GET(req: Request) {
  const { id } = getAuthUser(req)

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  return Response.json(formatUserResponse(user))
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/users/me/ __tests__/api/users/me.test.ts
git commit -m "feat: add GET /api/users/me route"
```

---

### Task 14: Auth UI pages

**Files:** `app/layout.tsx`, `app/(auth)/layout.tsx`, `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`

These are simple forms — the real auth work happens in the API routes above.

- [ ] **Step 1: Update `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Declutter Marketplace',
  description: 'Buy, sell, give away, and donate second-hand items in Nigeria',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create `app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(auth)/sign-in/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignInPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
      <h1 className="text-2xl font-bold mb-6">Sign in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input name="email" type="email" placeholder="Email" required className="border rounded-lg px-4 py-2" />
        <input name="password" type="password" placeholder="Password" required className="border rounded-lg px-4 py-2" />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="bg-black text-white rounded-lg py-2 font-medium disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="text-sm text-center mt-4">
        No account? <Link href="/sign-up" className="underline">Sign up</Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Create `app/(auth)/sign-up/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
        name: form.get('name'),
        account_type: form.get('account_type'),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
      <h1 className="text-2xl font-bold mb-6">Create account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input name="name" type="text" placeholder="Full name" className="border rounded-lg px-4 py-2" />
        <input name="email" type="email" placeholder="Email" required className="border rounded-lg px-4 py-2" />
        <input name="password" type="password" placeholder="Password (min 8 chars)" required className="border rounded-lg px-4 py-2" />
        <select name="account_type" required className="border rounded-lg px-4 py-2">
          <option value="">Account type...</option>
          <option value="individual">Individual</option>
          <option value="business">Business</option>
        </select>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="bg-black text-white rounded-lg py-2 font-medium disabled:opacity-50">
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-center mt-4">
        Have an account? <Link href="/sign-in" className="underline">Sign in</Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/(auth)/
git commit -m "feat: add sign-in and sign-up pages"
```

---

### Task 15: Smoke test

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (9 total across 4 test files).

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Test sign-up**

1. Go to `http://localhost:3000/sign-up`
2. Fill in name, email, password, account type → Submit
3. Expected: redirected to `/`
4. In Supabase → Table Editor → `users` — confirm a row was created with your email and a `password_hash` starting with `$2b$`

- [ ] **Step 4: Test that password is hashed**

In Supabase, confirm the `password_hash` column contains a bcrypt hash (starts with `$2b$12$`), not your actual password.

- [ ] **Step 5: Test sign-in**

1. Go to `http://localhost:3000/sign-in`
2. Sign in with the account you just created
3. Expected: redirected to `/`

- [ ] **Step 6: Test protected route**

1. Clear cookies in DevTools (Application → Cookies → delete `token`)
2. Try to go to `http://localhost:3000/cart`
3. Expected: redirected to `/sign-in`

- [ ] **Step 7: Test API route**

In the browser while signed in, go to `http://localhost:3000/api/users/me`.
Expected: JSON with your user profile. No `password_hash` or `stripe_account_id` in the response.

- [ ] **Step 8: Inspect the JWT**

In DevTools → Application → Cookies → copy the `token` value.
Paste it at https://jwt.io to see the decoded header, payload, and signature.
You should see your `sub`, `email`, `account_type`, `iat`, and `exp` fields.

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "feat: phase 1 complete — jwt auth, db schema, protected routes"
```

---

## Self-Review

**Spec coverage:**
- ✅ Sign up / log in — custom JWT routes
- ✅ Account type: Individual or Business — validated on signup, stored in DB and JWT
- ✅ All 5 DB tables with correct relationships and constraints
- ✅ Order lifecycle statuses encoded in DB check constraints
- ✅ All 3 listing types encoded in DB check constraints
- ✅ Stripe fields in schema — populated in Phase 4

**Deferred intentionally:**
- Stripe Connect onboarding → Phase 4
- Image uploads → Phase 2
- Listing CRUD → Phase 2
