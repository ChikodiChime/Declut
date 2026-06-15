# Dispatcher Wallet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing seller wallet infrastructure so dispatchers earn a credited `delivery_fee` on every delivery, can view their wallet balance, set up a bank account, and request withdrawals — with admins handling both seller and dispatcher payouts in one page.

**Architecture:** Reuse `wallet_balance`, `credit_wallet`/`debit_wallet` RPCs, Paystack bank fields on `users`, and `withdrawal_requests` table with minimal generalisation (make `seller_id` nullable, add `dispatcher_id`). Credit dispatcher atomically in the verify route using a write-once `dispatcher_credited_at` sentinel on `orders`. New dispatcher-scoped API routes mirror the seller pattern.

**Tech Stack:** Next.js 16 App Router, Supabase (supabaseAdmin, service-role RLS), Paystack, TanStack Query v5, Framer Motion, Tailwind CSS 4, Sonner toasts.

---

## File Map

| Action | Path |
|--------|------|
| Create | `supabase/migrations/025_dispatcher_wallet.sql` |
| Modify | `app/api/dispatch/orders/[id]/verify/route.ts` |
| Modify | `app/api/paystack/recipient/route.ts` |
| Create | `app/api/dispatch/wallet/route.ts` |
| Create | `app/api/dispatch/withdrawals/route.ts` |
| Modify | `app/api/admin/withdrawals/route.ts` |
| Modify | `app/api/admin/withdrawals/[id]/route.ts` |
| Create | `lib/hooks/useDispatchWallet.ts` |
| Modify | `app/dispatch/(portal)/stats/page.tsx` |
| Modify | `app/dispatch/(portal)/profile/page.tsx` |
| Modify | `app/admin/withdrawals/page.tsx` |

---

### Task 1: DB Migration — generalise withdrawal_requests + add dispatcher_credited_at

**Files:**
- Create: `supabase/migrations/025_dispatcher_wallet.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/025_dispatcher_wallet.sql
-- Extend wallet system to cover dispatchers.

-- ── Forward ───────────────────────────────────────────────────────────────────

-- 1. Make seller_id nullable and add dispatcher_id
ALTER TABLE withdrawal_requests
  ALTER COLUMN seller_id DROP NOT NULL;

ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS dispatcher_id uuid REFERENCES users(id);

-- Exactly one of seller_id / dispatcher_id must be set
ALTER TABLE withdrawal_requests
  ADD CONSTRAINT withdrawal_requests_one_owner
  CHECK (
    (seller_id IS NOT NULL AND dispatcher_id IS NULL) OR
    (seller_id IS NULL    AND dispatcher_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS withdrawal_requests_dispatcher_id_idx
  ON withdrawal_requests(dispatcher_id);

-- 2. Write-once sentinel to prevent double-crediting dispatcher wallet
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS dispatcher_credited_at timestamptz;

-- ── Rollback ──────────────────────────────────────────────────────────────────
-- ALTER TABLE orders DROP COLUMN IF EXISTS dispatcher_credited_at;
-- ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_one_owner;
-- ALTER TABLE withdrawal_requests DROP COLUMN IF EXISTS dispatcher_id;
-- ALTER TABLE withdrawal_requests ALTER COLUMN seller_id SET NOT NULL;
```

- [ ] **Step 2: Apply the migration via Supabase dashboard or CLI**

Run in Supabase SQL editor or:
```bash
supabase db push
```

Verify: `withdrawal_requests` now has a nullable `seller_id` column, a `dispatcher_id` column, and the `withdrawal_requests_one_owner` CHECK constraint. `orders` now has `dispatcher_credited_at timestamptz`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/025_dispatcher_wallet.sql
git commit -m "feat: generalise withdrawal_requests for dispatchers, add dispatcher_credited_at sentinel"
```

---

### Task 2: Credit dispatcher wallet in verify route

**Files:**
- Modify: `app/api/dispatch/orders/[id]/verify/route.ts`

Context: `executePayout(id)` credits the *seller* wallet. After it succeeds we need to credit the *dispatcher* using the same `credit_wallet` RPC. The `dispatcher_credited_at` column acts as a write-once guard against double-credit on retries.

- [ ] **Step 1: Replace the verify route**

```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { computeDeliveryCode } from '@/lib/delivery-code'
import { executePayout } from '@/lib/payout'
import { ok, err } from '@/lib/api-response'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { id } = await params

  let body: { code?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const code = typeof body.code === 'string' ? body.code.trim() : null
  if (!code || !/^\d{4}$/.test(code)) {
    return err('A 4-digit code is required', 'VALIDATION_ERROR', 400)
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, status, delivery_type, dispatcher_id, code_attempts, delivery_fee, dispatcher_credited_at')
    .eq('id', id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (order.delivery_type !== 'delivery') return err('Not a delivery order', 'INVALID_STATE', 409)
  if (order.status !== 'shipped') return err('Order is not in transit', 'INVALID_STATE', 409)
  if (order.dispatcher_id !== authUser.id) return err('Forbidden', 'FORBIDDEN', 403)
  if (order.code_attempts >= 5) return err('Too many incorrect attempts. Contact support.', 'TOO_MANY_ATTEMPTS', 429)

  const expected = computeDeliveryCode(id)
  if (code !== expected) {
    await supabaseAdmin.from('orders').update({ code_attempts: order.code_attempts + 1 }).eq('id', id)
    return err('Incorrect code', 'INVALID_CODE', 400)
  }

  await executePayout(id)

  // Credit dispatcher wallet (idempotent — skip if already credited)
  if (!order.dispatcher_credited_at && order.delivery_fee > 0) {
    await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: order.dispatcher_id,
      p_amount: order.delivery_fee,
    })
    await supabaseAdmin
      .from('orders')
      .update({ dispatcher_credited_at: new Date().toISOString() })
      .eq('id', id)
  }

  return ok({ delivered: true })
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no new errors in this file.

- [ ] **Step 3: Commit**

```bash
git add app/api/dispatch/orders/[id]/verify/route.ts
git commit -m "feat: credit dispatcher wallet on delivery verify"
```

---

### Task 3: Fix Paystack recipient route for dispatchers

**Files:**
- Modify: `app/api/paystack/recipient/route.ts`

Context: After saving bank details the route publishes all the user's draft listings. Dispatchers have no listings — skip that step for them.

- [ ] **Step 1: Replace the route**

```ts
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { createTransferRecipient } from '@/lib/paystack'

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const body = await req.json()
  const { bank_code, bank_name, account_number, account_name } = body

  if (!bank_code || !bank_name || !account_number || !account_name) {
    return err('All bank fields are required', 'VALIDATION_ERROR', 400)
  }

  try {
    const recipient = await createTransferRecipient({
      type: 'nuban',
      name: account_name,
      account_number,
      bank_code,
      currency: 'NGN',
    })

    await supabaseAdmin
      .from('users')
      .update({
        paystack_recipient_code: recipient.recipient_code,
        paystack_bank_code: bank_code,
        paystack_bank_name: bank_name,
        paystack_account_number: account_number,
        paystack_account_name: account_name,
        paystack_onboarding_complete: true,
      })
      .eq('id', authUser.id)

    // Only sellers have draft listings to publish
    if (authUser.account_type !== 'dispatcher') {
      await supabaseAdmin
        .from('listings')
        .update({ status: 'available' })
        .eq('seller_id', authUser.id)
        .eq('status', 'draft')
    }

    return ok({ recipient_code: recipient.recipient_code })
  } catch (error) {
    console.error('Paystack recipient error:', error)
    return err(
      error instanceof Error ? error.message : 'Failed to save payout account',
      'PAYSTACK_ERROR',
      500
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/paystack/recipient/route.ts
git commit -m "fix: skip listing publish for dispatchers in paystack recipient route"
```

---

### Task 4: New dispatcher API routes — wallet + withdrawals

**Files:**
- Create: `app/api/dispatch/wallet/route.ts`
- Create: `app/api/dispatch/withdrawals/route.ts`

- [ ] **Step 1: Create wallet GET route**

`app/api/dispatch/wallet/route.ts`:
```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('wallet_balance, paystack_onboarding_complete, paystack_account_name, paystack_bank_name, paystack_account_number')
    .eq('id', authUser.id)
    .single()

  if (!user) return err('User not found', 'NOT_FOUND', 404)

  return ok(user)
}
```

- [ ] **Step 2: Create withdrawals route (GET + POST)**

`app/api/dispatch/withdrawals/route.ts`:
```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { createNotification } from '@/lib/notifications'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: requests } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('id, amount, status, admin_note, requested_at, processed_at, bank_snapshot')
    .eq('dispatcher_id', authUser.id)
    .order('requested_at', { ascending: false })

  return ok(requests ?? [])
}

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'dispatcher') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  let body: { amount?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const amount = typeof body.amount === 'number' ? Math.floor(body.amount) : null
  if (!amount || amount <= 0) {
    return err('amount must be a positive integer', 'VALIDATION_ERROR', 400)
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('wallet_balance, paystack_onboarding_complete, paystack_recipient_code, paystack_bank_name, paystack_account_number, paystack_account_name')
    .eq('id', authUser.id)
    .single()

  if (!user) return err('User not found', 'NOT_FOUND', 404)
  if (!user.paystack_onboarding_complete) {
    return err('Bank account not configured', 'BANK_NOT_CONFIGURED', 409)
  }
  if (amount > user.wallet_balance) {
    return err('Insufficient wallet balance', 'INSUFFICIENT_BALANCE', 400)
  }

  const debited = await supabaseAdmin.rpc('debit_wallet', {
    p_user_id: authUser.id,
    p_amount: amount,
  })

  if (!debited.data) {
    return err('Insufficient wallet balance', 'INSUFFICIENT_BALANCE', 400)
  }

  const bank_snapshot = {
    bank_name: user.paystack_bank_name,
    account_number: user.paystack_account_number,
    account_name: user.paystack_account_name,
  }

  const { data: request, error: insertError } = await supabaseAdmin
    .from('withdrawal_requests')
    .insert({ dispatcher_id: authUser.id, amount, bank_snapshot })
    .select('id')
    .single()

  if (insertError || !request) {
    // Refund on insert failure
    await supabaseAdmin.rpc('credit_wallet', { p_user_id: authUser.id, p_amount: amount })
    return err('Failed to create withdrawal request', 'SERVER_ERROR', 500)
  }

  const { data: admins } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('account_type', 'admin')

  await Promise.all(
    (admins ?? []).map((admin) =>
      createNotification({
        user_id: admin.id,
        type: 'payout_update',
        title: 'New dispatcher withdrawal request',
        body: `A dispatcher requested a withdrawal of ₦${amount.toLocaleString('en-NG')}.`,
        link: '/admin/withdrawals',
      })
    )
  )

  return ok({ id: request.id })
}
```

- [ ] **Step 3: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors in the new files.

- [ ] **Step 4: Commit**

```bash
git add app/api/dispatch/wallet/route.ts app/api/dispatch/withdrawals/route.ts
git commit -m "feat: add dispatcher wallet and withdrawals API routes"
```

---

### Task 5: Update admin withdrawal routes to support dispatchers

**Files:**
- Modify: `app/api/admin/withdrawals/route.ts`
- Modify: `app/api/admin/withdrawals/[id]/route.ts`

- [ ] **Step 1: Update admin GET route to accept ?type param**

`app/api/admin/withdrawals/route.ts`:
```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'seller'

  let query = supabaseAdmin
    .from('withdrawal_requests')
    .select(
      type === 'dispatcher'
        ? 'id, amount, status, admin_note, payment_reference, requested_at, processed_at, bank_snapshot, dispatcher:users!dispatcher_id(id, name, email, account_type, wallet_balance, created_at, paystack_onboarding_complete)'
        : 'id, amount, status, admin_note, payment_reference, requested_at, processed_at, bank_snapshot, seller:users!seller_id(id, name, email, account_type, wallet_balance, created_at, paystack_onboarding_complete)'
    )
    .order('requested_at', { ascending: false })

  if (type === 'dispatcher') {
    query = query.not('dispatcher_id', 'is', null)
  } else {
    query = query.not('seller_id', 'is', null)
  }

  const { data: requests } = await query

  return ok(requests ?? [])
}
```

- [ ] **Step 2: Update admin PATCH route to handle dispatcher_id**

`app/api/admin/withdrawals/[id]/route.ts`:
```ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { createNotification } from '@/lib/notifications'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  let body: { action?: unknown; note?: unknown; payment_reference?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'PARSE_ERROR', 400)
  }

  const { action, note, payment_reference } = body
  if (action !== 'process' && action !== 'reject') {
    return err('action must be "process" or "reject"', 'VALIDATION_ERROR', 400)
  }

  const { data: request } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('id, seller_id, dispatcher_id, amount, status')
    .eq('id', id)
    .single()

  if (!request) return err('Withdrawal request not found', 'NOT_FOUND', 404)
  if (request.status !== 'pending') return err('Request already resolved', 'INVALID_STATE', 409)

  const userId = (request.seller_id ?? request.dispatcher_id) as string
  const notifLink = request.seller_id ? '/dashboard/billing' : '/dispatch/stats'
  const now = new Date().toISOString()
  const adminNote = typeof note === 'string' && note.trim() ? note.trim() : null
  const paymentRef = typeof payment_reference === 'string' && payment_reference.trim() ? payment_reference.trim() : null
  const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`

  if (action === 'reject') {
    await supabaseAdmin
      .from('withdrawal_requests')
      .update({ status: 'rejected', admin_note: adminNote, processed_at: now })
      .eq('id', id)

    await supabaseAdmin.rpc('credit_wallet', { p_user_id: userId, p_amount: request.amount })

    await createNotification({
      user_id: userId,
      type: 'payout_update',
      title: 'Withdrawal request rejected',
      body: adminNote
        ? `Your withdrawal of ${fmt(request.amount)} was rejected: ${adminNote}`
        : `Your withdrawal of ${fmt(request.amount)} was rejected. Funds returned to your wallet.`,
      link: notifLink,
    })
  } else {
    await supabaseAdmin
      .from('withdrawal_requests')
      .update({ status: 'processed', processed_at: now, payment_reference: paymentRef })
      .eq('id', id)

    await createNotification({
      user_id: userId,
      type: 'payout_update',
      title: 'Withdrawal sent',
      body: `Your withdrawal of ${fmt(request.amount)} has been sent to your bank account.`,
      link: notifLink,
    })
  }

  return ok({ ok: true })
}
```

- [ ] **Step 3: Check TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/withdrawals/route.ts app/api/admin/withdrawals/[id]/route.ts
git commit -m "feat: update admin withdrawals routes to support dispatcher requests"
```

---

### Task 6: Dispatcher wallet hooks

**Files:**
- Create: `lib/hooks/useDispatchWallet.ts`

- [ ] **Step 1: Create the hooks file**

```ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type DispatchWallet = {
  wallet_balance: number
  paystack_onboarding_complete: boolean
  paystack_account_name: string | null
  paystack_bank_name: string | null
  paystack_account_number: string | null
}

export type DispatchWithdrawal = {
  id: string
  amount: number
  status: 'pending' | 'processed' | 'rejected'
  admin_note: string | null
  requested_at: string
  processed_at: string | null
  bank_snapshot: {
    bank_name: string
    account_number: string
    account_name: string
  }
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

export function useDispatchWallet() {
  return useQuery<DispatchWallet>({
    queryKey: ['dispatch', 'wallet'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/dispatch/wallet')
      return json.data
    },
  })
}

export function useDispatchWithdrawals() {
  return useQuery<DispatchWithdrawal[]>({
    queryKey: ['dispatch', 'withdrawals'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/dispatch/withdrawals')
      return json.data
    },
  })
}

export function useRequestWithdrawal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (amount: number) =>
      apiRequest('POST', '/api/dispatch/withdrawals', { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'wallet'] })
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'withdrawals'] })
      toast.success('Withdrawal request sent')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useDispatchWallet.ts
git commit -m "feat: add dispatcher wallet hooks"
```

---

### Task 7: Earnings page — wallet card + withdrawal drawer + history

**Files:**
- Modify: `app/dispatch/(portal)/stats/page.tsx`

This is a full rewrite of the file. The existing delivery history section is preserved; we prepend a wallet balance card and a withdrawal drawer, and append a withdrawal history section.

- [ ] **Step 1: Replace the Earnings page**

```tsx
'use client'

import { useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListingImage } from '@/components/ui'
import { Button } from '@/components/ui'
import { Package, ArrowRight, CheckCircle2, X, Wallet, Building2, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCompletedDeliveries,
  type CompletedDelivery,
} from '@/lib/hooks/useDispatch'
import {
  useDispatchWallet,
  useDispatchWithdrawals,
  useRequestWithdrawal,
  type DispatchWithdrawal,
} from '@/lib/hooks/useDispatchWallet'
import { DispatchHeader } from '@/app/dispatch/(portal)/DispatchHeader'

function groupByMonth(deliveries: CompletedDelivery[]) {
  const groups: Record<string, CompletedDelivery[]> = {}
  for (const d of deliveries) {
    const key = d.created_at.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(d)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, orders]) => ({ key, orders }))
}

function monthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-')
  return new Date(+y, +m - 1).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  })
}

function WithdrawalStatusBadge({ status }: { status: DispatchWithdrawal['status'] }) {
  if (status === 'processed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
        <CheckCircle2 size={10} strokeWidth={2.5} />
        Processed
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
        <XCircle size={10} strokeWidth={2.5} />
        Rejected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
      <Clock size={10} strokeWidth={2.5} />
      Pending
    </span>
  )
}

function WithdrawDrawer({
  balance,
  bankName,
  accountName,
  onClose,
}: {
  balance: number
  bankName: string
  accountName: string
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const { mutate: requestWithdrawal, isPending } = useRequestWithdrawal()
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed = parseInt(amount, 10)
  const isValid = !isNaN(parsed) && parsed > 0 && parsed <= balance

  function handleSubmit() {
    if (!isValid) return
    requestWithdrawal(parsed, {
      onSuccess: () => onClose(),
    })
  }

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[55] bg-black/40"
      />
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[56] bg-card rounded-t-2xl max-w-xl mx-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold text-text">Request withdrawal</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-surface text-text-muted hover:text-text transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <p className="text-sm text-text-muted">
            Available balance:{' '}
            <span className="font-semibold text-text">₦{balance.toLocaleString()}</span>
          </p>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-text-muted block mb-2">
              Amount (₦)
            </label>
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base font-semibold text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <p className="text-xs text-text-muted mb-0.5">Paying to</p>
            <p className="text-sm font-semibold text-text">{accountName}</p>
            <p className="text-xs text-text-muted">{bankName}</p>
          </div>

          <Button
            size="md"
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            loading={isPending}
            className="w-full"
          >
            Submit request
          </Button>
        </div>
      </motion.div>
    </>
  )
}

function WalletCard() {
  const { data: wallet, isLoading } = useDispatchWallet()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="h-3 w-28 rounded bg-border mb-3" />
        <div className="h-8 w-36 rounded bg-border mb-4" />
        <div className="h-9 w-32 rounded-lg bg-border" />
      </div>
    )
  }

  if (!wallet) return null

  const hasBank = wallet.paystack_onboarding_complete

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">
          Wallet balance
        </p>
        <p className="text-4xl font-extrabold text-text mb-4">
          ₦{wallet.wallet_balance.toLocaleString()}
        </p>
        {hasBank ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDrawerOpen(true)}
            disabled={wallet.wallet_balance === 0}
          >
            Withdraw
          </Button>
        ) : (
          <a
            href="/dispatch/profile"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <Building2 size={14} strokeWidth={2} />
            Add bank account
          </a>
        )}
      </div>

      <AnimatePresence>
        {drawerOpen && hasBank && (
          <WithdrawDrawer
            balance={wallet.wallet_balance}
            bankName={wallet.paystack_bank_name ?? ''}
            accountName={wallet.paystack_account_name ?? ''}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function WithdrawalHistory() {
  const { data: withdrawals, isLoading } = useDispatchWithdrawals()

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 flex gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-border" />
              <div className="h-3 w-16 rounded bg-border" />
            </div>
            <div className="h-5 w-16 rounded bg-border self-center" />
          </div>
        ))}
      </div>
    )
  }

  const list = withdrawals ?? []

  if (list.length === 0) return null

  return (
    <section>
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-subtle mb-4">
        Withdrawal requests
      </h2>
      <div className="flex flex-col gap-2">
        {list.map((w) => (
          <motion.div
            key={w.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text">₦{w.amount.toLocaleString()}</p>
              <p className="text-xs text-text-muted">
                {new Date(w.requested_at).toLocaleDateString('en-NG', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
              {w.admin_note && (
                <p className="text-xs text-text-subtle mt-0.5 truncate">{w.admin_note}</p>
              )}
            </div>
            <WithdrawalStatusBadge status={w.status} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function HistorySkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-4 flex gap-3">
      <div className="w-14 h-14 rounded-xl shrink-0 bg-border" />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <div className="h-3 w-2/3 rounded bg-border" />
        <div className="h-3 w-1/2 rounded bg-border" />
      </div>
      <div className="h-5 w-16 rounded bg-border self-center" />
    </div>
  )
}

function CompletedCard({ order }: { order: CompletedDelivery }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-border bg-card p-4 flex gap-3"
    >
      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface">
        {order.listing.images?.[0] ? (
          <ListingImage
            src={order.listing.images[0]}
            fill
            sizes="56px"
            className="object-cover"
            alt={order.listing.title}
          />
        ) : (
          <Package size={16} strokeWidth={1.5} className="text-text-subtle" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{order.listing.title}</p>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-text-muted">
          <span className="truncate max-w-[70px]">{order.listing.area ?? 'Unknown'}</span>
          <ArrowRight size={10} strokeWidth={2} className="shrink-0" />
          <span className="truncate max-w-[70px]">{order.buyer_area}</span>
        </div>
        <p className="text-xs mt-1 text-text-subtle">
          {new Date(order.created_at).toLocaleDateString('en-NG', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
      </div>

      <div className="shrink-0 text-right self-center">
        <p className="text-sm font-bold text-success">+₦{order.delivery_fee.toLocaleString()}</p>
        <p className="text-[10px] mt-0.5 text-text-subtle">earned</p>
      </div>
    </motion.div>
  )
}

export default function EarningsPage() {
  const { data: completed, isLoading } = useCompletedDeliveries()

  const now = new Date()
  const nowKey = now.toISOString().slice(0, 7)
  const allCompleted = completed ?? []

  const thisMonth = allCompleted.filter((d) => d.created_at.slice(0, 7) === nowKey)

  const monthlyEarnings = thisMonth.reduce((sum, d) => sum + d.delivery_fee, 0)
  const avgPerJob = thisMonth.length > 0 ? Math.round(monthlyEarnings / thisMonth.length) : 0
  const allTimeEarnings = allCompleted.reduce((sum, d) => sum + d.delivery_fee, 0)

  const monthGroups = useMemo(() => groupByMonth(allCompleted), [allCompleted])

  return (
    <main className="min-h-screen bg-surface">
      <DispatchHeader />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
        {/* Wallet balance */}
        <WalletCard />

        {/* Earnings summary */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-subtle mb-4">
            {now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
          </p>

          <div className="rounded-2xl border border-border bg-card p-5 mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">
              Earnings this month
            </p>
            <p className="text-4xl font-extrabold text-text">
              ₦{monthlyEarnings.toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">
                Deliveries
              </p>
              <p className="text-2xl font-extrabold text-text">{thisMonth.length}</p>
              <p className="text-xs text-text-subtle mt-0.5">this month</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">
                Avg / job
              </p>
              <p className="text-2xl font-extrabold text-text">
                {avgPerJob > 0 ? `₦${avgPerJob.toLocaleString()}` : '—'}
              </p>
              <p className="text-xs text-text-subtle mt-0.5">this month</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-around">
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-subtle mb-0.5">
                All time
              </p>
              <p className="text-sm font-bold text-text">{allCompleted.length} deliveries</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-subtle mb-0.5">
                Total earned
              </p>
              <p className="text-sm font-bold text-success">₦{allTimeEarnings.toLocaleString()}</p>
            </div>
          </div>
        </section>

        {/* Withdrawal history */}
        <WithdrawalHistory />

        {/* Delivery history */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-subtle mb-4">
            Completed Deliveries
          </h2>

          {isLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <HistorySkeleton key={i} />)}
            </div>
          )}

          {!isLoading && allCompleted.length === 0 && (
            <div className="py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} className="text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-text mb-1">No completed deliveries yet</p>
              <p className="text-xs text-text-subtle max-w-xs mx-auto">
                Claim a job to get started and start earning.
              </p>
            </div>
          )}

          {monthGroups.map(({ key, orders }) => (
            <div key={key} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-text-muted">{monthLabel(key)}</p>
                <p className="text-xs font-bold text-success">
                  ₦{orders.reduce((s, d) => s + d.delivery_fee, 0).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {orders.map((order) => <CompletedCard key={order.id} order={order} />)}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/dispatch/(portal)/stats/page.tsx
git commit -m "feat: add wallet balance card, withdrawal drawer, and withdrawal history to Earnings page"
```

---

### Task 8: Profile page — bank account section + BankSetupDrawer

**Files:**
- Modify: `app/dispatch/(portal)/profile/page.tsx`

Add a bank account card below "Account" and above "Sign out". When no bank is set, show a placeholder with an "Add bank account" button that opens a 3-step drawer. When configured, show the masked account details with an "Update" button.

The drawer reuses `/api/paystack/banks`, `/api/paystack/resolve-account`, and `/api/paystack/recipient` — all existing routes that work for any authenticated user.

- [ ] **Step 1: Replace the Profile page**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Truck, Mail, User, Calendar, Building2, X, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { useMe, useSignOut } from '@/lib/hooks/useAuth'
import { useDispatchWallet } from '@/lib/hooks/useDispatchWallet'
import { Button } from '@/components/ui'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35 },
  }
}

function initials(name?: string | null): string {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

type Bank = { name: string; code: string }

function BankSetupDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'select-bank' | 'account-number' | 'confirm'>('select-bank')
  const [banks, setBanks] = useState<Bank[]>([])
  const [banksLoading, setBanksLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
  const [accountNumber, setAccountNumber] = useState('')
  const [resolvedName, setResolvedName] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    fetch('/api/paystack/banks')
      .then((r) => r.json())
      .then((j) => { setBanks(j.data ?? []); setBanksLoading(false) })
      .catch(() => { setBanksLoading(false) })
  }, [])

  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      setResolving(true)
      setResolveError(null)
      setResolvedName(null)
      fetch(`/api/paystack/resolve-account?account_number=${accountNumber}&bank_code=${selectedBank.code}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.data?.account_name) {
            setResolvedName(j.data.account_name)
          } else {
            setResolveError('Could not verify account. Check the number and try again.')
          }
        })
        .catch(() => setResolveError('Could not verify account. Check your connection.'))
        .finally(() => setResolving(false))
    } else {
      setResolvedName(null)
      setResolveError(null)
    }
  }, [accountNumber, selectedBank])

  async function handleSave() {
    if (!selectedBank || !resolvedName) return
    setSaving(true)
    try {
      const res = await fetch('/api/paystack/recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_code: selectedBank.code,
          bank_name: selectedBank.name,
          account_number: accountNumber,
          account_name: resolvedName,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to save bank account')
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'wallet'] })
      toast.success('Bank account saved')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save bank account')
    } finally {
      setSaving(false)
    }
  }

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[55] bg-black/40"
      />
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[56] bg-card rounded-t-2xl max-w-xl mx-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 py-4 border-b border-border flex items-center gap-3 shrink-0">
          {step !== 'select-bank' && (
            <button
              type="button"
              onClick={() => {
                if (step === 'account-number') setStep('select-bank')
                if (step === 'confirm') setStep('account-number')
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-surface text-text-muted hover:text-text transition-colors"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
          )}
          <h2 className="text-base font-bold text-text flex-1">
            {step === 'select-bank' ? 'Select bank' : step === 'account-number' ? 'Account number' : 'Confirm account'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-surface text-text-muted hover:text-text transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'select-bank' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search banks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {banksLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-text-muted" />
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
                  {filteredBanks.map((bank) => (
                    <button
                      key={bank.code}
                      type="button"
                      onClick={() => { setSelectedBank(bank); setStep('account-number') }}
                      className="w-full text-left px-4 py-3.5 text-sm font-medium text-text hover:bg-card transition-colors"
                    >
                      {bank.name}
                    </button>
                  ))}
                  {filteredBanks.length === 0 && (
                    <p className="px-4 py-6 text-sm text-text-subtle text-center">No banks found</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 'account-number' && selectedBank && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface px-4 py-3">
                <p className="text-xs text-text-muted mb-0.5">Selected bank</p>
                <p className="text-sm font-semibold text-text">{selectedBank.name}</p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-text-muted block mb-2">
                  Account number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0000000000"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base font-semibold text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {resolving && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 size={14} className="animate-spin" />
                  Verifying account…
                </div>
              )}

              {resolvedName && (
                <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/8 px-4 py-3">
                  <CheckCircle2 size={16} className="text-success shrink-0" strokeWidth={2} />
                  <div>
                    <p className="text-xs text-text-muted">Account name</p>
                    <p className="text-sm font-semibold text-text">{resolvedName}</p>
                  </div>
                </div>
              )}

              {resolveError && (
                <p className="text-sm text-destructive">{resolveError}</p>
              )}

              {resolvedName && (
                <Button size="md" onClick={handleSave} loading={saving} disabled={saving} className="w-full">
                  Save bank account
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

function BankAccountSection() {
  const { data: wallet, isLoading } = useDispatchWallet()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl px-5 py-4 animate-pulse">
        <div className="h-3 w-24 rounded bg-border mb-2" />
        <div className="h-4 w-40 rounded bg-border" />
      </div>
    )
  }

  const hasBank = wallet?.paystack_onboarding_complete

  return (
    <>
      <motion.section {...fadeUp(0.15)}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
          Bank account
        </h2>
        <div className="bg-card rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
            <Building2 size={15} strokeWidth={1.75} className="text-text-muted" />
          </div>
          {hasBank && wallet ? (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">{wallet.paystack_account_name}</p>
              <p className="text-xs text-text-muted truncate">
                {wallet.paystack_bank_name} · ••••{wallet.paystack_account_number?.slice(-4)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-muted flex-1">No bank account added</p>
          )}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="text-xs font-semibold text-primary hover:underline shrink-0"
          >
            {hasBank ? 'Update' : 'Add'}
          </button>
        </div>
      </motion.section>

      <AnimatePresence>
        {drawerOpen && (
          <BankSetupDrawer onClose={() => setDrawerOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl p-6 h-28" style={{ background: '#1e1a15' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 rounded bg-white/10" />
            <div className="h-3 w-48 rounded bg-white/10" />
            <div className="h-3 w-24 rounded bg-white/10" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl divide-y divide-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-border shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 w-12 rounded bg-border" />
              <div className="h-3.5 w-36 rounded bg-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DispatchProfilePage() {
  const { data: user, isLoading } = useMe()
  const { mutate: signOut } = useSignOut('/dispatch/login')

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <main className="min-h-screen bg-surface">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-7" />
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            <Truck size={10} strokeWidth={2.5} />
            Dispatcher
          </span>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <ProfileSkeleton />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl p-6"
              style={{
                background: 'linear-gradient(135deg, #16130f 0%, #1e1a15 60%, #252019 100%)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.08), 0 20px 48px rgba(0,0,0,0.22)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-white">{initials(user?.name)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-white truncate">{user?.name ?? '—'}</p>
                  <p className="text-sm mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{user?.email ?? '—'}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Member since {memberSince}</p>
                </div>
              </div>
            </motion.div>

            <motion.section {...fadeUp(0.1)}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
                Account
              </h2>
              <div className="bg-card rounded-xl divide-y divide-border">
                {[
                  { icon: User,     label: 'Name',         value: user?.name ?? '—' },
                  { icon: Mail,     label: 'Email',        value: user?.email ?? '—' },
                  { icon: Truck,    label: 'Account type', value: 'Dispatcher' },
                  { icon: Calendar, label: 'Member since', value: memberSince },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-5 py-4">
                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                      <Icon size={15} strokeWidth={1.75} className="text-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-muted">{label}</p>
                      <p className="text-sm font-medium text-text truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            <BankAccountSection />

            <motion.div {...fadeUp(0.2)}>
              <Button
                variant="outline"
                size="md"
                onClick={() => signOut()}
                className="w-full"
              >
                Sign out
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/dispatch/(portal)/profile/page.tsx
git commit -m "feat: add bank setup section and drawer to dispatcher profile page"
```

---

### Task 9: Admin withdrawals page — Sellers / Dispatchers tab switcher

**Files:**
- Modify: `app/admin/withdrawals/page.tsx`

Read the file first to understand the current structure, then add a `type` state variable (`'seller' | 'dispatcher'`), render a tab bar at the top, and thread `?type=${type}` into the fetch URL.

- [ ] **Step 1: Read the current file**

```bash
# Read app/admin/withdrawals/page.tsx to understand current structure
```

The file uses `useWithdrawals()` or similar — identify the fetch URL and where the component mounts the request list.

- [ ] **Step 2: Add type state and tab switcher**

At the top of the page component, add:

```tsx
const [type, setType] = useState<'seller' | 'dispatcher'>('seller')
```

Replace the hardcoded fetch URL (e.g. `/api/admin/withdrawals`) with `/api/admin/withdrawals?type=${type}`.

Add this tab bar immediately below the page header, before the table/list:

```tsx
<div className="flex border-b border-border mb-6">
  {(['seller', 'dispatcher'] as const).map((t) => (
    <button
      key={t}
      type="button"
      onClick={() => setType(t)}
      className={`px-5 py-3 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
        type === t
          ? 'border-primary text-primary'
          : 'border-transparent text-text-muted hover:text-text'
      }`}
    >
      {t === 'seller' ? 'Sellers' : 'Dispatchers'}
    </button>
  ))}
</div>
```

If the page uses React Query, add `type` to the query key so it refetches on tab change:
```tsx
queryKey: ['admin', 'withdrawals', type]
```

If it uses a plain `useEffect` fetch, add `type` to the dependency array.

The table columns and approve/reject actions are identical for both types — no further changes needed.

- [ ] **Step 3: Check TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/withdrawals/page.tsx
git commit -m "feat: add Sellers/Dispatchers tabs to admin withdrawals page"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Migration: `withdrawal_requests` generalised, `dispatcher_credited_at` added (Task 1)
- ✅ Dispatcher credited on verify (Task 2) with `dispatcher_credited_at` sentinel
- ✅ Paystack recipient route fixed for dispatchers — no listing publish (Task 3)
- ✅ `GET /api/dispatch/wallet` (Task 4)
- ✅ `GET /api/dispatch/withdrawals` (Task 4)
- ✅ `POST /api/dispatch/withdrawals` with debit→insert→notify→credit-on-failure (Task 4)
- ✅ Admin GET with `?type` param (Task 5)
- ✅ Admin PATCH handles `dispatcher_id` — unified `userId`, correct `notifLink` (Task 5)
- ✅ All four hooks: `useDispatchWallet`, `useDispatchWithdrawals`, `useRequestWithdrawal` (Task 6)
- ✅ Wallet card with "Add bank account" link when not configured (Task 7)
- ✅ `WithdrawDrawer` with amount input, bank summary, submit (Task 7)
- ✅ Withdrawal history section (Task 7)
- ✅ Bank account section on Profile with configured/unconfigured states (Task 8)
- ✅ `BankSetupDrawer` 3-step flow: select bank → account number + resolve → save (Task 8)
- ✅ Sellers/Dispatchers tab switcher on admin page (Task 9)

**Placeholder scan:** No TBD, TODO, or vague steps. Task 9 Step 1 intentionally defers to reading the current file because it's 700 lines — the subsequent steps give complete instructions for the change.

**Type consistency:** `DispatchWallet`, `DispatchWithdrawal` defined in Task 6 and imported in Tasks 7 and 8. `Bank` type is local to `BankSetupDrawer`. All API response shapes match between routes and hooks.
