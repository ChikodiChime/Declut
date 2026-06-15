# Dispatcher Wallet & Withdrawals

**Date:** 2026-06-15
**Status:** Approved

## Problem

Dispatchers earn a `delivery_fee` on every completed delivery, but the fee currently goes nowhere — it is never credited to anyone. There is no way for a dispatcher to see their balance, set up a bank account, or request a payout.

## Solution

Extend the existing seller wallet infrastructure to cover dispatchers. The same `wallet_balance` column, `credit_wallet`/`debit_wallet` RPCs, Paystack bank fields on `users`, and `withdrawal_requests` table are all reused. The data model is generalised minimally so both roles co-exist cleanly.

---

## Data Model

### Migration (new file: `025_dispatcher_wallet.sql`)

**1. Generalize `withdrawal_requests`**

Make `seller_id` nullable. Add `dispatcher_id uuid REFERENCES users(id)` nullable. Add a CHECK constraint ensuring exactly one of the two is non-null. Add an index on `dispatcher_id`.

```sql
ALTER TABLE withdrawal_requests
  ALTER COLUMN seller_id DROP NOT NULL;

ALTER TABLE withdrawal_requests
  ADD COLUMN dispatcher_id uuid REFERENCES users(id);

ALTER TABLE withdrawal_requests
  ADD CONSTRAINT withdrawal_requests_one_owner
  CHECK (
    (seller_id IS NOT NULL AND dispatcher_id IS NULL) OR
    (seller_id IS NULL AND dispatcher_id IS NOT NULL)
  );

CREATE INDEX withdrawal_requests_dispatcher_id_idx
  ON withdrawal_requests(dispatcher_id);
```

Existing seller rows are unaffected. New dispatcher rows use `dispatcher_id` with `seller_id = NULL`.

**2. Add `dispatcher_credited_at` to `orders`**

Acts as a write-once sentinel to prevent double-crediting the dispatcher wallet on repeated verify calls.

```sql
ALTER TABLE orders
  ADD COLUMN dispatcher_credited_at timestamptz;
```

**3. No changes to `users`**

`wallet_balance`, `paystack_onboarding_complete`, `paystack_bank_name`, `paystack_bank_code`, `paystack_account_number`, `paystack_account_name`, and `paystack_recipient_code` are already generic columns on `users`. They serve dispatchers without modification.

---

## API Layer

### Modified: `app/api/dispatch/orders/[id]/verify/route.ts`

After `executePayout(id)` succeeds, credit the dispatcher:

1. Re-fetch the order: `delivery_fee`, `dispatcher_id`, `dispatcher_credited_at`
2. If `dispatcher_credited_at IS NOT NULL` — skip (already credited)
3. Call `credit_wallet(dispatcher_id, delivery_fee)`
4. Set `dispatcher_credited_at = now()` on the order

Both operations run sequentially in the same request. No separate transaction needed — `credit_wallet` is already an atomic SQL update.

### New: `app/api/dispatch/wallet/route.ts` — `GET`

Auth: dispatcher only.

Returns:
```ts
{
  wallet_balance: number
  paystack_onboarding_complete: boolean
  paystack_account_name: string | null
  paystack_bank_name: string | null
  paystack_account_number: string | null
}
```

Source: single `SELECT` from `users` for the authenticated dispatcher.

### New: `app/api/dispatch/withdrawals/route.ts` — `GET` + `POST`

**GET** — Auth: dispatcher only. Returns withdrawal history ordered by `requested_at DESC`:
```ts
Array<{
  id: string
  amount: number
  status: 'pending' | 'processed' | 'rejected'
  admin_note: string | null
  requested_at: string
  processed_at: string | null
  bank_snapshot: { bank_name: string; account_number: string; account_name: string }
}>
```

**POST** — Auth: dispatcher only. Body: `{ amount: number }`.

Flow:
1. Validate `amount` is a positive integer
2. Fetch dispatcher: `wallet_balance`, `paystack_onboarding_complete`, `paystack_recipient_code`, `paystack_bank_*` fields
3. Return 409 if `paystack_onboarding_complete` is false
4. Return 400 if `amount > wallet_balance`
5. Call `debit_wallet(dispatcher_id, amount)` — returns false if balance insufficient (guards race condition)
6. Insert `withdrawal_requests` row with `dispatcher_id`, `amount`, `bank_snapshot`
7. Notify all admins (same notification pattern as seller withdrawals)
8. Return `{ id: request.id }`
9. On insert failure: call `credit_wallet(dispatcher_id, amount)` to refund, return 500

### Modified: existing Paystack routes

`/api/paystack/banks`, `/api/paystack/resolve-account`, `/api/paystack/recipient` — remove any auth guards that block `account_type === 'dispatcher'`. These routes only require authentication, not a specific role.

### Modified: `app/api/admin/withdrawals/route.ts`

Accept optional `?type=seller|dispatcher` query param.

- `type=seller` (or default): filter `seller_id IS NOT NULL`, join user via `seller_id`
- `type=dispatcher`: filter `dispatcher_id IS NOT NULL`, join user via `dispatcher_id`

Response shape is identical for both; the admin UI handles them the same way.

---

## UI

### Hooks: `lib/hooks/useDispatchWallet.ts` (new file)

```ts
useDispatchWallet()         // GET /api/dispatch/wallet
useDispatchWithdrawals()    // GET /api/dispatch/withdrawals
useRequestWithdrawal()      // POST /api/dispatch/withdrawals (mutation)
```

Standard React Query pattern — same shape as `useDispatch.ts`.

### Earnings page: `app/dispatch/(portal)/stats/page.tsx`

**Wallet balance card** — inserted above the monthly earnings headline:

```
┌─────────────────────────────────┐
│  Wallet balance                 │
│  ₦12,500          [Withdraw →]  │
└─────────────────────────────────┘
```

Two states:
- **Bank not configured** (`paystack_onboarding_complete = false`): "Withdraw" replaced by "Add bank account →" (link to `/dispatch/profile`)
- **Bank configured**: "Withdraw" button opens the withdrawal drawer

**Withdrawal drawer** — bottom-sheet, same Framer Motion spring pattern as `DeliveryDetailsDrawer`:
- Drag handle
- "Request withdrawal" heading + available balance subtext
- Numeric amount input (max enforced client-side = wallet balance)
- Read-only bank summary (account name + bank name)
- "Submit request" button — disabled until `0 < amount ≤ balance`
- On success: toast "Withdrawal request sent", drawer closes, wallet balance refetched

**Withdrawal history** — below the delivery history section:
- Section heading "Withdrawal requests"
- List of past requests: date, amount, status badge (`Pending` / `Processed` / `Rejected`), admin note if rejected
- Empty state if none

### Profile page: `app/dispatch/(portal)/profile/page.tsx`

**Bank account section** — below the Account details card, above Sign out:

Not configured state:
```
┌─────────────────────────────────────┐
│  🏦  No bank account added          │
│      [Add bank account]             │
└─────────────────────────────────────┘
```

Configured state:
```
┌─────────────────────────────────────┐
│  Chike Obi                          │
│  Access Bank · ••••••1234  [Update] │
└─────────────────────────────────────┘
```

**Bank setup drawer** — 3-step flow, single bottom-sheet (no navigation):

1. **Select bank** — searchable list from `/api/paystack/banks`; tap to select
2. **Enter account number** — 10-digit input; on completing 10 digits, auto-resolve via `/api/paystack/resolve-account`; shows resolved account name as confirmation or inline error if unresolvable
3. **Save** — calls `/api/paystack/recipient` to create Paystack transfer recipient and persist `paystack_*` fields + `paystack_onboarding_complete = true` on the user record (the recipient route handles both operations)

Errors: unresolvable account number → inline error under field. Network/Paystack failure → toast.

### Admin: `app/admin/withdrawals/page.tsx`

Add **Sellers / Dispatchers** tab switcher at the top of the page. Selected tab is tracked in local state (default: Sellers). Each tab fetches `/api/admin/withdrawals?type=seller` or `?type=dispatcher`. Table layout, approve/reject actions, and status updates are identical for both tabs — no new admin action endpoints needed.

---

## Data Flow Summary

```
Dispatcher verifies delivery
  → executePayout(id)              ← credits seller wallet (existing)
  → credit_wallet(dispatcher, fee) ← credits dispatcher wallet (new)
  → dispatcher_credited_at = now()  ← prevents double-credit

Dispatcher requests withdrawal
  → debit_wallet(dispatcher, amount)
  → insert withdrawal_requests(dispatcher_id, ...)
  → notify admins

Admin approves
  → marks withdrawal_requests.status = 'processed'
  → pays out via Paystack (existing manual flow)
```

---

## Out of Scope

- Automatic Paystack transfer to dispatcher on withdrawal approval (admin processes manually, same as sellers)
- Dispatcher balance visible to admin before a withdrawal is requested
- Push notifications to dispatcher when withdrawal is processed
- Minimum withdrawal amount (no floor enforced — any positive integer is valid)
