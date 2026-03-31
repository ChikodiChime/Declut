# Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6-digit OTP email verification that hard-gates the entire app until a user's email is confirmed.

**Architecture:** On signup, a 6-digit OTP is generated, bcrypt-hashed, stored in the `users` table, and emailed via Resend. The `/verify-email` page collects the code and calls `POST /api/auth/verify-email`. The middleware blocks protected routes for unverified users. Sign-in also checks `email_verified` and redirects accordingly.

**Tech Stack:** Resend (email), bcryptjs (OTP hashing), crypto.randomInt (OTP generation), React Query mutations (client hooks), Next.js App Router API routes.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `supabase/migrations/002_email_verification.sql` | Add 4 columns to users table |
| Modify | `types/index.ts` | Add new User fields |
| Modify | `app/api/users/me/utils.ts` | Strip `otp_code` from response |
| Create | `lib/otp.ts` | Generate and verify OTP codes |
| Create | `lib/email.ts` | Send branded email via Resend |
| Modify | `lib/auth.ts` | Add `getAuthUserFromCookie` helper |
| Modify | `app/api/auth/signup/route.ts` | Send OTP after user creation |
| Create | `app/api/auth/send-verification/route.ts` | Generate + resend OTP with cooldown |
| Create | `app/api/auth/verify-email/route.ts` | Validate OTP, mark email verified |
| Modify | `app/api/auth/signin/route.ts` | Return `emailVerified` flag |
| Modify | `middleware.ts` | Block unverified users on protected routes |
| Modify | `lib/hooks/useAuth.ts` | Add `useVerifyEmail`, `useSendVerification`; update `useSignUp`/`useSignIn` |
| Create | `components/auth/VerifyEmailForm.tsx` | 6-box OTP input with resend button |
| Create | `app/verify-email/page.tsx` | Verify email page |
| Create | `__tests__/lib/otp.test.ts` | Unit tests for OTP utility |
| Create | `__tests__/api/auth/verify-email.test.ts` | Unit tests for verify-email utils |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/002_email_verification.sql`
- Modify: `types/index.ts`
- Modify: `app/api/users/me/utils.ts`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/002_email_verification.sql
alter table public.users
  add column email_verified    boolean      not null default false,
  add column otp_code          text,
  add column otp_expires_at    timestamptz,
  add column otp_resend_after  timestamptz;
```

- [ ] **Step 2: Apply migration in Supabase dashboard**

Go to your Supabase project → SQL Editor → paste the migration → Run.

- [ ] **Step 3: Update User type**

In `types/index.ts`, replace the `User` interface:

```ts
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
  email_verified: boolean
  otp_code: string | null
  otp_expires_at: string | null
  otp_resend_after: string | null
}
```

- [ ] **Step 4: Update formatUserResponse to strip otp_code**

In `app/api/users/me/utils.ts`:

```ts
import type { User } from '@/types'

export function formatUserResponse(user: User) {
  const { password_hash, stripe_account_id, otp_code, ...safeUser } = user
  return safeUser
}
```

This exposes `email_verified` and `otp_resend_after` to the client (needed by the verify-email page) while keeping sensitive fields hidden.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/002_email_verification.sql types/index.ts app/api/users/me/utils.ts
git commit -m "feat: add email verification columns to users table"
```

---

## Task 2: OTP Utility

**Files:**
- Create: `lib/otp.ts`
- Create: `__tests__/lib/otp.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/lib/otp.test.ts
import { describe, it, expect } from 'vitest'
import { generateOtp, hashOtp, verifyOtp } from '@/lib/otp'

describe('generateOtp', () => {
  it('returns a 6-digit string', () => {
    const code = generateOtp()
    expect(code).toMatch(/^\d{6}$/)
  })

  it('generates different codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateOtp()))
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe('verifyOtp', () => {
  it('returns true for matching code', async () => {
    const code = '123456'
    const hash = await hashOtp(code)
    expect(await verifyOtp(code, hash)).toBe(true)
  })

  it('returns false for wrong code', async () => {
    const hash = await hashOtp('123456')
    expect(await verifyOtp('999999', hash)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/otp.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/otp'`

- [ ] **Step 3: Create lib/otp.ts**

```ts
// lib/otp.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/otp.test.ts
```

Expected: PASS — 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/otp.ts __tests__/lib/otp.test.ts
git commit -m "feat: add OTP generation and verification utility"
```

---

## Task 3: Email Utility

**Files:**
- Create: `lib/email.ts`

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

- [ ] **Step 2: Add environment variables**

Add to `.env.local`:

```
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

Get your API key at resend.com. For local dev you can use `onboarding@resend.dev` as the from address (Resend's test sender, no domain needed).

- [ ] **Step 3: Create lib/email.ts**

```ts
// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Your Declutter verification code',
    html: buildOtpHtml(code),
    text: `Your Declutter verification code is: ${code}\n\nThis code expires in 30 minutes.\n\nIf you didn't create a Declutter account, you can safely ignore this email.`,
  })
}

function buildOtpHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);" cellpadding="0" cellspacing="0" role="presentation">

          <!-- Header -->
          <tr>
            <td style="background:#4F46E5;padding:32px 40px;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Declutter</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Verify your email address</h1>
              <p style="margin:0 0 32px;font-size:15px;color:#6B7280;line-height:1.6;">
                Enter the code below in the app to complete your registration. It expires in <strong>30 minutes</strong>.
              </p>

              <!-- OTP Code -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding:0 0 32px;">
                    <div style="display:inline-block;background:#EEF2FF;border:2px solid #C7D2FE;border-radius:12px;padding:20px 32px;">
                      <span style="font-size:44px;font-weight:800;letter-spacing:16px;color:#4F46E5;font-variant-numeric:tabular-nums;">${code}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;border-top:1px solid #F3F4F6;padding-top:24px;">
                If you didn't create a Declutter account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; 2026 Declutter. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/email.ts package.json package-lock.json
git commit -m "feat: add Resend email utility with branded OTP template"
```

---

## Task 4: Add Cookie Auth Helper to lib/auth.ts

**Files:**
- Modify: `lib/auth.ts`

The `/api/auth/send-verification` and `/api/auth/verify-email` routes are not in the middleware matcher, so middleware won't inject user headers. These routes need to read the JWT cookie directly.

- [ ] **Step 1: Update lib/auth.ts**

```ts
// lib/auth.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: add getAuthUserFromCookie helper for auth routes"
```

---

## Task 5: Update Signup Route to Send OTP

**Files:**
- Modify: `app/api/auth/signup/route.ts`

- [ ] **Step 1: Update route.ts**

```ts
// app/api/auth/signup/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'
import { signToken } from '@/lib/jwt'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { validateSignupBody } from './utils'

export async function POST(req: Request) {
  const body = await req.json()
  const validated = validateSignupBody(body)

  if ('error' in validated) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  const { email, password, name, account_type } = validated

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return Response.json({ error: 'Email already in use' }, { status: 409 })
  }

  const password_hash = await hashPassword(password)
  const code = generateOtp()
  const otp_code = await hashOtp(code)
  const otp_expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const otp_resend_after = new Date(Date.now() + 2 * 60 * 1000).toISOString()

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({ email, name, password_hash, account_type, otp_code, otp_expires_at, otp_resend_after })
    .select('id, email, name, account_type, stripe_onboarding_complete, avatar_url, created_at, email_verified, otp_resend_after')
    .single()

  if (error || !user) {
    console.error('Signup DB error:', error)
    return Response.json({ error: 'Failed to create account' }, { status: 500 })
  }

  await sendOtpEmail(email, code)

  const token = await signToken({ sub: user.id, email: user.email, account_type: user.account_type })

  const response = Response.json({ user }, { status: 201 })
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )

  return response
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/signup/route.ts
git commit -m "feat: generate and send OTP on signup"
```

---

## Task 6: POST /api/auth/send-verification Route

**Files:**
- Create: `app/api/auth/send-verification/route.ts`

- [ ] **Step 1: Create route**

```ts
// app/api/auth/send-verification/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { getAuthUserFromCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const authUser = await getAuthUserFromCookie(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('email, email_verified, otp_resend_after')
    .eq('id', authUser.sub)
    .single()

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Already verified — no-op
  if (dbUser.email_verified) {
    return NextResponse.json({ sent: true })
  }

  // Enforce resend cooldown
  if (dbUser.otp_resend_after && new Date(dbUser.otp_resend_after) > new Date()) {
    const retryAfter = Math.ceil(
      (new Date(dbUser.otp_resend_after).getTime() - Date.now()) / 1000
    )
    return NextResponse.json(
      { error: 'Please wait before requesting a new code', retryAfter },
      { status: 429 }
    )
  }

  const code = generateOtp()
  const otp_code = await hashOtp(code)
  const otp_expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const otp_resend_after = new Date(Date.now() + 2 * 60 * 1000).toISOString()

  await supabaseAdmin
    .from('users')
    .update({ otp_code, otp_expires_at, otp_resend_after })
    .eq('id', authUser.sub)

  await sendOtpEmail(dbUser.email, code)

  return NextResponse.json({ sent: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/send-verification/route.ts
git commit -m "feat: add POST /api/auth/send-verification route"
```

---

## Task 7: POST /api/auth/verify-email Route

**Files:**
- Create: `app/api/auth/verify-email/route.ts`
- Create: `app/api/auth/verify-email/utils.ts`
- Create: `__tests__/api/auth/verify-email.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/api/auth/verify-email.test.ts
import { describe, it, expect } from 'vitest'
import { validateVerifyEmailBody } from '@/app/api/auth/verify-email/utils'

describe('validateVerifyEmailBody', () => {
  it('returns error when code is missing', () => {
    expect(validateVerifyEmailBody({})).toHaveProperty('error', 'code is required')
  })

  it('returns error when code is not 6 digits', () => {
    expect(validateVerifyEmailBody({ code: '123' })).toHaveProperty('error', 'code must be exactly 6 digits')
    expect(validateVerifyEmailBody({ code: 'abcdef' })).toHaveProperty('error', 'code must be exactly 6 digits')
  })

  it('returns code for valid 6-digit input', () => {
    expect(validateVerifyEmailBody({ code: '123456' })).toEqual({ code: '123456' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/api/auth/verify-email.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/auth/verify-email/utils'`

- [ ] **Step 3: Create utils.ts**

```ts
// app/api/auth/verify-email/utils.ts
interface VerifyEmailBody {
  code?: unknown
}

export function validateVerifyEmailBody(body: VerifyEmailBody):
  | { code: string }
  | { error: string } {
  if (!body.code || typeof body.code !== 'string') return { error: 'code is required' }
  if (!/^\d{6}$/.test(body.code)) return { error: 'code must be exactly 6 digits' }
  return { code: body.code }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/api/auth/verify-email.test.ts
```

Expected: PASS — 3 tests pass

- [ ] **Step 5: Create route.ts**

```ts
// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyOtp } from '@/lib/otp'
import { getAuthUserFromCookie } from '@/lib/auth'
import { validateVerifyEmailBody } from './utils'

export async function POST(req: NextRequest) {
  const authUser = await getAuthUserFromCookie(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const validated = validateVerifyEmailBody(body)
  if ('error' in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('email_verified, otp_code, otp_expires_at')
    .eq('id', authUser.sub)
    .single()

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Idempotent — already verified
  if (dbUser.email_verified) {
    return NextResponse.json({ verified: true })
  }

  if (!dbUser.otp_code || !dbUser.otp_expires_at) {
    return NextResponse.json({ error: 'No verification code found. Request a new one.' }, { status: 400 })
  }

  if (new Date(dbUser.otp_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 })
  }

  const match = await verifyOtp(validated.code, dbUser.otp_code)
  if (!match) {
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
  }

  await supabaseAdmin
    .from('users')
    .update({ email_verified: true, otp_code: null, otp_expires_at: null, otp_resend_after: null })
    .eq('id', authUser.sub)

  return NextResponse.json({ verified: true })
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/auth/verify-email/ __tests__/api/auth/verify-email.test.ts
git commit -m "feat: add POST /api/auth/verify-email route"
```

---

## Task 8: Update Signin Route

**Files:**
- Modify: `app/api/auth/signin/route.ts`

The signin response needs to tell the client whether the user's email is verified, so the client can redirect to `/verify-email` if not.

- [ ] **Step 1: Update route.ts**

```ts
// app/api/auth/signin/route.ts
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

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const passwordMatch = await comparePassword(password, user.password_hash)
  if (!passwordMatch) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signToken({ sub: user.id, email: user.email, account_type: user.account_type })

  const { password_hash, stripe_account_id, otp_code, ...safeUser } = user

  const response = Response.json({ user: safeUser, emailVerified: user.email_verified })
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
git commit -m "feat: return emailVerified flag from signin response"
```

---

## Task 9: Update Middleware

**Files:**
- Modify: `middleware.ts`

After JWT verification, check `email_verified` in the DB. For unverified users:
- API routes (`/api/*`): return `403`
- Page routes (`/dashboard/*`): redirect to `/verify-email`

- [ ] **Step 1: Update middleware.ts**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: block unverified users in middleware"
```

---

## Task 10: Update Auth Hooks

**Files:**
- Modify: `lib/hooks/useAuth.ts`

Add `useVerifyEmail` and `useSendVerification`. Update `useSignIn` to redirect to `/verify-email` when `emailVerified` is false.

- [ ] **Step 1: Replace lib/hooks/useAuth.ts**

```ts
// lib/hooks/useAuth.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SignUpInput {
  email: string
  password: string
  name: string
  account_type: 'individual' | 'business'
}

interface SignInInput {
  email: string
  password: string
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiPost(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
  return data
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useSignUp() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SignUpInput) => apiPost('/api/auth/signup', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      router.push('/verify-email')
      router.refresh()
    },
  })
}

export function useSignIn() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SignInInput) => apiPost('/api/auth/signin', input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      if (!data.emailVerified) {
        router.push('/verify-email')
      } else {
        router.push('/')
      }
      router.refresh()
    },
  })
}

export function useSignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiPost('/api/auth/signout', {}),
    onSuccess: () => {
      queryClient.clear()
      router.push('/sign-in')
      router.refresh()
    },
  })
}

export function useVerifyEmail() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => apiPost('/api/auth/verify-email', { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      router.push('/')
      router.refresh()
    },
  })
}

export function useSendVerification() {
  return useMutation({
    mutationFn: async (): Promise<{ sent: boolean; retryAfter?: number }> => {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.status === 429) return { sent: false, retryAfter: data.retryAfter }
      if (!res.ok) throw new Error(data.error ?? 'Failed to send code')
      return { sent: true }
    },
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/users/me')
      if (res.status === 401) return null
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/useAuth.ts
git commit -m "feat: add useVerifyEmail and useSendVerification hooks"
```

---

## Task 11: VerifyEmailForm Component

**Files:**
- Create: `components/auth/VerifyEmailForm.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/auth/VerifyEmailForm.tsx
'use client'

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react'

interface Props {
  onSubmit: (code: string) => void
  onResend: () => void
  isPending: boolean
  isResending: boolean
  error: string | null
  resendCooldownSeconds: number
}

export default function VerifyEmailForm({
  onSubmit,
  onResend,
  isPending,
  isResending,
  error,
  resendCooldownSeconds,
}: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [secondsLeft, setSecondsLeft] = useState(resendCooldownSeconds)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  // Sync cooldown from parent (e.g. after resend returns a new retryAfter)
  useEffect(() => {
    setSecondsLeft(resendCooldownSeconds)
  }, [resendCooldownSeconds])

  // Countdown tick
  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value
    setDigits(newDigits)
    if (value && index < 5) {
      inputs.current[index + 1]?.focus()
    }
    const code = newDigits.join('')
    if (newDigits.every((d) => d !== '')) {
      onSubmit(code)
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 0) return
    const newDigits = Array(6).fill('')
    pasted.split('').forEach((ch, i) => { newDigits[i] = ch })
    setDigits(newDigits)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) onSubmit(pasted)
  }

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Check your email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We sent a 6-digit code to your email address. Enter it below.
        </p>
      </div>

      <div className="space-y-6">
        {/* OTP inputs */}
        <div className="flex justify-center gap-3" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(i, e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(i, e)}
              disabled={isPending}
              className="h-14 w-11 rounded-lg border border-gray-300 text-center text-xl font-semibold text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}

        {/* Loading */}
        {isPending && (
          <p className="text-center text-sm text-gray-500">Verifying…</p>
        )}

        {/* Resend */}
        <div className="text-center">
          {secondsLeft > 0 ? (
            <p className="text-sm text-gray-500">
              Resend code in{' '}
              <span className="font-medium text-gray-700">{formatCountdown(secondsLeft)}</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={isResending}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
            >
              {isResending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add export to components/auth/index.ts**

```ts
// components/auth/index.ts — add this line
export { default as VerifyEmailForm } from './VerifyEmailForm'
```

The file already exports `SignupForm` and `LoginForm`, so append only this line.

- [ ] **Step 3: Commit**

```bash
git add components/auth/VerifyEmailForm.tsx components/auth/
git commit -m "feat: add VerifyEmailForm OTP input component"
```

---

## Task 12: /verify-email Page

**Files:**
- Create: `app/verify-email/page.tsx`

- [ ] **Step 1: Create page**

```tsx
// app/verify-email/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useVerifyEmail, useSendVerification, useMe } from '@/lib/hooks/useAuth'
import VerifyEmailForm from '@/components/auth/VerifyEmailForm'

export default function VerifyEmailPage() {
  const { data: me } = useMe()
  const { mutate: verify, isPending, error } = useVerifyEmail()
  const { mutate: resend, isPending: isResending, data: resendData } = useSendVerification()
  const [resendCooldown, setResendCooldown] = useState(0)

  // Initialise countdown from the otp_resend_after stored on the user
  useEffect(() => {
    if (me?.otp_resend_after) {
      const diff = Math.ceil((new Date(me.otp_resend_after).getTime() - Date.now()) / 1000)
      if (diff > 0) setResendCooldown(diff)
    }
  }, [me])

  // Update countdown when a resend returns a new retryAfter
  useEffect(() => {
    if (resendData?.retryAfter) {
      setResendCooldown(resendData.retryAfter)
    }
  }, [resendData])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <VerifyEmailForm
        onSubmit={(code) => verify(code)}
        onResend={() => resend()}
        isPending={isPending}
        isResending={isResending}
        error={error?.message ?? null}
        resendCooldownSeconds={resendCooldown}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify the route renders**

Start the dev server and navigate to `http://localhost:3000/verify-email`. You should see the OTP input form.

```bash
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add app/verify-email/page.tsx
git commit -m "feat: add /verify-email page"
```

---

## Task 13: End-to-End Smoke Test

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Manual signup flow**

1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000/auth/signup`
3. Fill in name, email, password, account type → submit
4. Should redirect to `/verify-email`
5. Check email inbox for the OTP code
6. Enter the 6-digit code → should redirect to `/`

- [ ] **Step 3: Manual resend flow**

1. On `/verify-email`, wait for the 2-minute cooldown to expire
2. Click "Resend code" → new email should arrive
3. Enter new code → should verify and redirect

- [ ] **Step 4: Manual signin flow (unverified)**

1. Create a second account but don't verify it
2. Sign out, then sign in with that account's credentials
3. Should redirect to `/verify-email`

- [ ] **Step 5: Manual signin flow (verified)**

1. Sign in with a verified account
2. Should redirect to `/`

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete email verification flow"
```
