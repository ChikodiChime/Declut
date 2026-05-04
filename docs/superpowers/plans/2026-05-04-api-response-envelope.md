# API Response Envelope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap every API response in a consistent `{ data }` / `{ data, meta }` / `{ error }` envelope and update client hooks to unwrap it so component code is unchanged.

**Architecture:** A single helper module (`lib/api-response.ts`) exposes `ok`, `list`, and `err`. Every route replaces bare `Response.json()` calls with these helpers. The two hook files (`useAuth.ts`, `useListings.ts`) update their error-reading path from `data.error` to `data.error?.message` and their data-reading path from named keys (`data.listing`) to `json.data`.

**Tech Stack:** Next.js App Router, TypeScript, @tanstack/react-query

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| **Create** | `lib/api-response.ts` | `ok`, `list`, `err` helpers |
| **Modify** | `app/api/auth/signup/route.ts` | use helpers, add error codes |
| **Modify** | `app/api/auth/signin/route.ts` | use helpers, add error codes |
| **Modify** | `app/api/auth/signout/route.ts` | use helpers |
| **Modify** | `app/api/auth/verify-email/route.ts` | use helpers, add error codes |
| **Modify** | `app/api/auth/send-verification/route.ts` | use helpers, add error codes |
| **Modify** | `app/api/users/me/route.ts` | use helpers, add error codes |
| **Modify** | `app/api/listings/route.ts` | use helpers, add error codes |
| **Modify** | `app/api/listings/[id]/route.ts` | use helpers, add error codes |
| **Modify** | `app/api/listings/mine/route.ts` | use helpers, add error codes |
| **Modify** | `app/api/upload/route.ts` | use helpers, add error codes |
| **Modify** | `lib/hooks/useAuth.ts` | read `data.error?.message`, unwrap `data.data` |
| **Modify** | `lib/hooks/useListings.ts` | read `data.error?.message`, unwrap `data.data` / `data.meta` |

---

### Task 1: Create `lib/api-response.ts`

**Files:**
- Create: `lib/api-response.ts`

- [ ] **Create the helper module**

```ts
// lib/api-response.ts
export function ok(data: unknown, status = 200): Response {
  return Response.json({ data }, { status })
}

export function list(
  items: unknown[],
  meta: { total: number; limit: number; offset: number },
  status = 200
): Response {
  return Response.json({ data: items, meta }, { status })
}

export function err(
  message: string,
  code: string,
  status: number,
  extra?: Record<string, unknown>
): Response {
  return Response.json({ error: { message, code, ...extra } }, { status })
}
```

- [ ] **Commit**

```bash
git add lib/api-response.ts
git commit -m "feat: add api-response envelope helpers"
```

---

### Task 2: Migrate auth routes

**Files:**
- Modify: `app/api/auth/signup/route.ts`
- Modify: `app/api/auth/signin/route.ts`
- Modify: `app/api/auth/signout/route.ts`
- Modify: `app/api/auth/verify-email/route.ts`
- Modify: `app/api/auth/send-verification/route.ts`

- [ ] **Replace `app/api/auth/signup/route.ts`**

```ts
// app/api/auth/signup/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/password'
import { signToken } from '@/lib/jwt'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { validateSignupBody } from './utils'
import { ok, err } from '@/lib/api-response'

const OTP_TTL_MS = 30 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 2 * 60 * 1000
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }
  const validated = validateSignupBody(body as Record<string, unknown>)

  if ('error' in validated) {
    return err(validated.error, 'VALIDATION_ERROR', 400)
  }

  const { email, password, name, account_type } = validated

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return err('Email already in use', 'EMAIL_TAKEN', 409)
  }

  const password_hash = await hashPassword(password)
  const code = generateOtp()
  const otp_code = await hashOtp(code)
  const otp_expires_at = new Date(Date.now() + OTP_TTL_MS).toISOString()
  const otp_resend_after = new Date(Date.now() + OTP_RESEND_COOLDOWN_MS).toISOString()

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({ email, name, password_hash, account_type, otp_code, otp_expires_at, otp_resend_after })
    .select('id, email, name, account_type, stripe_onboarding_complete, avatar_url, created_at, email_verified, otp_resend_after')
    .single()

  if (error || !user) {
    console.error('Signup DB error:', error)
    return err('Failed to create account', 'SERVER_ERROR', 500)
  }

  try {
    await sendOtpEmail(email, code)
  } catch (emailError) {
    console.error('Failed to send OTP email:', emailError)
    // Don't fail signup — user can request a resend from /verify-email
  }

  const token = await signToken({ sub: user.id, email: user.email, account_type: user.account_type })

  const response = ok(user, 201)
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )

  return response
}
```

- [ ] **Replace `app/api/auth/signin/route.ts`**

```ts
// app/api/auth/signin/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { comparePassword } from '@/lib/password'
import { signToken } from '@/lib/jwt'
import { ok, err } from '@/lib/api-response'

const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export async function POST(req: Request) {
  let body: { email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }
  const { email, password } = body

  if (!email || !password) {
    return err('email and password are required', 'VALIDATION_ERROR', 400)
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', (email as string).toLowerCase().trim())
    .single()

  if (!user) {
    return err('Invalid credentials', 'INVALID_CREDENTIALS', 401)
  }

  const passwordMatch = await comparePassword(password as string, user.password_hash)
  if (!passwordMatch) {
    return err('Invalid credentials', 'INVALID_CREDENTIALS', 401)
  }

  const token = await signToken({ sub: user.id, email: user.email, account_type: user.account_type })

  const { password_hash, stripe_account_id, otp_code, otp_expires_at, ...safeUser } = user

  const response = ok({ user: safeUser, emailVerified: user.email_verified })
  response.headers.set(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  )

  return response
}
```

- [ ] **Replace `app/api/auth/signout/route.ts`**

```ts
// app/api/auth/signout/route.ts
import { ok } from '@/lib/api-response'

export async function POST() {
  const response = ok({ ok: true })
  response.headers.set('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  return response
}
```

- [ ] **Replace `app/api/auth/verify-email/route.ts`**

```ts
// app/api/auth/verify-email/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyOtp } from '@/lib/otp'
import { getAuthUserFromCookie } from '@/lib/auth'
import { validateVerifyEmailBody } from './utils'
import { ok, err } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  const authUser = await getAuthUserFromCookie(req)
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }
  const validated = validateVerifyEmailBody(body as Record<string, unknown>)
  if ('error' in validated) {
    return err(validated.error, 'VALIDATION_ERROR', 400)
  }

  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('email_verified, otp_code, otp_expires_at')
    .eq('id', authUser.sub)
    .single()

  if (!dbUser) {
    return err('User not found', 'NOT_FOUND', 404)
  }

  // Idempotent — already verified
  if (dbUser.email_verified) {
    return ok({ verified: true })
  }

  if (!dbUser.otp_code || !dbUser.otp_expires_at) {
    return err('No verification code found. Request a new one.', 'VALIDATION_ERROR', 400)
  }

  if (new Date(dbUser.otp_expires_at) < new Date()) {
    return err('Code expired. Request a new one.', 'VALIDATION_ERROR', 400)
  }

  const match = await verifyOtp(validated.code, dbUser.otp_code)
  if (!match) {
    return err('Invalid code. Please try again.', 'VALIDATION_ERROR', 400)
  }

  await supabaseAdmin
    .from('users')
    .update({ email_verified: true, otp_code: null, otp_expires_at: null, otp_resend_after: null })
    .eq('id', authUser.sub)

  return ok({ verified: true })
}
```

- [ ] **Replace `app/api/auth/send-verification/route.ts`**

```ts
// app/api/auth/send-verification/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { getAuthUserFromCookie } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const OTP_TTL_MS = 30 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 2 * 60 * 1000

export async function POST(req: NextRequest) {
  const authUser = await getAuthUserFromCookie(req)
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('email, email_verified, otp_resend_after')
    .eq('id', authUser.sub)
    .single()

  if (!dbUser) {
    return err('User not found', 'NOT_FOUND', 404)
  }

  // Already verified — no-op
  if (dbUser.email_verified) {
    return ok({ sent: true })
  }

  // Enforce resend cooldown
  if (dbUser.otp_resend_after && new Date(dbUser.otp_resend_after) > new Date()) {
    const retryAfter = Math.ceil(
      (new Date(dbUser.otp_resend_after).getTime() - Date.now()) / 1000
    )
    return err('Please wait before requesting a new code', 'RATE_LIMITED', 429, { retryAfter })
  }

  const code = generateOtp()
  const otp_code = await hashOtp(code)
  const otp_expires_at = new Date(Date.now() + OTP_TTL_MS).toISOString()
  const otp_resend_after = new Date(Date.now() + OTP_RESEND_COOLDOWN_MS).toISOString()

  await supabaseAdmin
    .from('users')
    .update({ otp_code, otp_expires_at, otp_resend_after })
    .eq('id', authUser.sub)

  await sendOtpEmail(dbUser.email, code)

  return ok({ sent: true })
}
```

- [ ] **Commit**

```bash
git add app/api/auth/signup/route.ts app/api/auth/signin/route.ts app/api/auth/signout/route.ts app/api/auth/verify-email/route.ts app/api/auth/send-verification/route.ts
git commit -m "feat: envelope auth routes"
```

---

### Task 3: Migrate `/api/users/me`

**Files:**
- Modify: `app/api/users/me/route.ts`

- [ ] **Replace `app/api/users/me/route.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { formatUserResponse } from './utils'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()

  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error || !user) {
    return err('User not found', 'NOT_FOUND', 404)
  }

  return ok(formatUserResponse(user))
}
```

- [ ] **Commit**

```bash
git add app/api/users/me/route.ts
git commit -m "feat: envelope users/me route"
```

---

### Task 4: Migrate listing routes

**Files:**
- Modify: `app/api/listings/route.ts`
- Modify: `app/api/listings/[id]/route.ts`
- Modify: `app/api/listings/mine/route.ts`

- [ ] **Replace `app/api/listings/route.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { validateListingBody, VALID_LISTING_TYPES, VALID_CONDITIONS, VALID_CATEGORIES } from './utils'
import { ok, list, err } from '@/lib/api-response'
import type { ListingType, Condition } from '@/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const q = searchParams.get('q')?.trim()
  const category = searchParams.get('category')
  const listing_type = searchParams.get('listing_type')
  const condition = searchParams.get('condition')
  const area = searchParams.get('area')?.trim()
  const sort = searchParams.get('sort') ?? 'newest'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '24', 10), 48)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0)

  let query = supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('status', 'available')

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  }
  if (category && VALID_CATEGORIES.includes(category)) {
    query = query.eq('category', category)
  }
  if (listing_type && VALID_LISTING_TYPES.includes(listing_type as ListingType)) {
    query = query.eq('listing_type', listing_type)
  }
  if (condition && VALID_CONDITIONS.includes(condition as Condition)) {
    query = query.eq('condition', condition)
  }
  if (area) {
    query = query.ilike('area', `%${area}%`)
  }

  if (sort === 'price_asc') {
    query = query.order('price', { ascending: true, nullsFirst: false })
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false, nullsFirst: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data: listings, error, count } = await query

  if (error) {
    console.error('Browse listings error:', error)
    return err('Failed to fetch listings', 'SERVER_ERROR', 500)
  }

  return list(listings ?? [], { total: count ?? 0, limit, offset })
}

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }
  const validated = validateListingBody(body as Record<string, unknown>)

  if ('error' in validated) {
    return err(validated.error, 'VALIDATION_ERROR', 400)
  }

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .insert({ ...validated.data, seller_id: authUser.id })
    .select('*')
    .single()

  if (error || !listing) {
    console.error('Create listing error:', error)
    return err('Failed to create listing', 'SERVER_ERROR', 500)
  }

  return ok(listing, 201)
}
```

- [ ] **Replace `app/api/listings/[id]/route.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { validateUpdateBody } from './utils'
import { ok, err } from '@/lib/api-response'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('*, seller:users(id, name, account_type, avatar_url)')
    .eq('id', id)
    .single()

  if (error || !listing) {
    return err('Listing not found', 'NOT_FOUND', 404)
  }

  return ok(listing)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { id } = await params

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('seller_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return err('Listing not found', 'NOT_FOUND', 404)
  }

  if (existing.seller_id !== authUser.id) {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }
  const validated = validateUpdateBody(body as Record<string, unknown>)

  if ('error' in validated) {
    return err(validated.error, 'VALIDATION_ERROR', 400)
  }

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .update(validated.data)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !listing) {
    console.error('Update listing error:', error)
    return err('Failed to update listing', 'SERVER_ERROR', 500)
  }

  return ok(listing)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { id } = await params

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('seller_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return err('Listing not found', 'NOT_FOUND', 404)
  }

  if (existing.seller_id !== authUser.id) {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { error } = await supabaseAdmin
    .from('listings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Delete listing error:', error)
    return err('Failed to delete listing', 'SERVER_ERROR', 500)
  }

  return ok({ ok: true })
}
```

- [ ] **Replace `app/api/listings/mine/route.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('seller_id', authUser.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get my listings error:', error)
    return err('Failed to fetch listings', 'SERVER_ERROR', 500)
  }

  return ok(listings ?? [])
}
```

- [ ] **Commit**

```bash
git add app/api/listings/route.ts "app/api/listings/[id]/route.ts" app/api/listings/mine/route.ts
git commit -m "feat: envelope listing routes"
```

---

### Task 5: Migrate `/api/upload`

**Files:**
- Modify: `app/api/upload/route.ts`

- [ ] **Replace `app/api/upload/route.ts`**

```ts
import { v2 as cloudinary } from 'cloudinary'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return err('Invalid form data', 'BAD_REQUEST', 400)
  }
  const file = formData.get('file') as File | null

  if (!file) {
    return err('No file provided', 'VALIDATION_ERROR', 400)
  }

  if (!file.type.startsWith('image/')) {
    return err('File must be an image', 'VALIDATION_ERROR', 400)
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  let result: { public_id: string }
  try {
    result = await new Promise<{ public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'declut/listings', resource_type: 'image' },
          (uploadError, res) => {
            if (uploadError || !res) return reject(uploadError ?? new Error('Upload failed'))
            resolve({ public_id: res.public_id })
          }
        )
        .end(buffer)
    })
  } catch (uploadErr) {
    console.error('Cloudinary upload error:', uploadErr)
    const message = uploadErr instanceof Error ? uploadErr.message : 'Upload failed'
    return err(message, 'SERVER_ERROR', 500)
  }

  return ok(result, 201)
}
```

- [ ] **Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: envelope upload route"
```

---

### Task 6: Update `lib/hooks/useAuth.ts`

**Files:**
- Modify: `lib/hooks/useAuth.ts`

- [ ] **Replace `lib/hooks/useAuth.ts`**

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
  if (!res.ok) throw new Error(data.error?.message ?? 'Something went wrong')
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
    onSuccess: (json) => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      if (!json.data.emailVerified) {
        router.push('/verify-email')
      } else {
        router.push('/dashboard')
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
      router.push('/auth/login')
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
      router.push('/dashboard')
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
      const json = await res.json()
      if (res.status === 429) return { sent: false, retryAfter: json.error?.retryAfter }
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to send code')
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
      const json = await res.json()
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Commit**

```bash
git add lib/hooks/useAuth.ts
git commit -m "feat: update useAuth hooks for response envelope"
```

---

### Task 7: Update `lib/hooks/useListings.ts`

**Files:**
- Modify: `lib/hooks/useListings.ts`

- [ ] **Replace `lib/hooks/useListings.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Listing, ListingFormData, ListingStatus, ListingType, Condition } from '@/types'

export interface BrowseParams {
  q?: string
  category?: string
  listing_type?: ListingType | ''
  condition?: Condition | ''
  area?: string
  sort?: 'newest' | 'price_asc' | 'price_desc'
  limit?: number
  offset?: number
}

async function apiRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Something went wrong')
  return json
}

export function usePublicListings(params: BrowseParams = {}) {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.category) query.set('category', params.category)
  if (params.listing_type) query.set('listing_type', params.listing_type)
  if (params.condition) query.set('condition', params.condition)
  if (params.area) query.set('area', params.area)
  if (params.sort) query.set('sort', params.sort)
  if (params.limit) query.set('limit', String(params.limit))
  if (params.offset) query.set('offset', String(params.offset))

  return useQuery<{ listings: Listing[]; total: number; limit: number; offset: number }>({
    queryKey: ['listings', 'browse', params],
    queryFn: async () => {
      const json = await apiRequest('GET', `/api/listings?${query.toString()}`)
      return {
        listings: json.data,
        total: json.meta.total,
        limit: json.meta.limit,
        offset: json.meta.offset,
      }
    },
  })
}

export function useMyListings() {
  return useQuery<{ listings: Listing[] }>({
    queryKey: ['listings', 'mine'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/listings/mine')
      return { listings: json.data }
    },
  })
}

export function useListing(id: string) {
  return useQuery<{ listing: Listing }>({
    queryKey: ['listings', id],
    queryFn: async () => {
      const json = await apiRequest('GET', `/api/listings/${id}`)
      return { listing: json.data }
    },
    enabled: !!id,
  })
}

export function useCreateListing() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ListingFormData) => apiRequest('POST', '/api/listings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
      toast.success('Listing published!')
      router.push('/listings/mine')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateListing(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<ListingFormData & { status: ListingStatus }>) =>
      apiRequest('PATCH', `/api/listings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['listings', id] })
      toast.success('Listing updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/listings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
      toast.success('Listing deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (blob: Blob): Promise<{ public_id: string }> => {
      const form = new FormData()
      form.append('file', blob, 'image.jpg')

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Upload failed')
      return json.data
    },
    onError: () => toast.error('Upload failed — please try again'),
  })
}
```

- [ ] **Commit**

```bash
git add lib/hooks/useListings.ts
git commit -m "feat: update useListings hooks for response envelope"
```
