# Address Book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single profile address field with a full address book — users can save up to 10 named addresses, set a default, and pick from saved addresses (or add a new one) in both the listing creation and buying flows.

**Architecture:** New `user_addresses` table with label/default support; API routes at `/api/user/addresses`; a shared `AddressPickerModal` component consumed by the listing form and the listing detail buy flow; address book management page at `/dashboard/address-book`. Existing `users.address` / `users.address_state` columns are migrated and dropped.

**Tech Stack:** Next.js 16 App Router, Supabase (supabaseAdmin), React Query (TanStack), Tailwind 4, Framer Motion, Google Places (existing PlacesAddressInput component)

---

## File Map

| Action | Path |
|---|---|
| Create | `supabase/migrations/026_address_book.sql` |
| Create | `app/api/user/addresses/route.ts` |
| Create | `app/api/user/addresses/[id]/route.ts` |
| Create | `lib/hooks/useAddresses.ts` |
| Create | `components/ui/AddressPickerModal.tsx` |
| Create | `app/dashboard/address-book/page.tsx` |
| Modify | `types/index.ts` |
| Modify | `app/api/users/me/route.ts` |
| Modify | `lib/hooks/useAuth.ts` |
| Modify | `components/dashboard/Sidebar.tsx` |
| Modify | `app/dashboard/profile/page.tsx` |
| Modify | `components/listings/steps/StepPricing.tsx` |
| Modify | `components/listings/EditListingDrawer.tsx` |
| Modify | `app/listings/[id]/page.tsx` |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/026_address_book.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/026_address_book.sql

-- 1. Create user_addresses table
create table if not exists user_addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  label        text not null check (char_length(label) between 1 and 30),
  address      text not null check (char_length(address) between 1 and 300),
  address_state text,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- 2. RLS
alter table user_addresses enable row level security;

create policy "users can manage their own addresses"
  on user_addresses
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3. Migrate existing profile addresses
insert into user_addresses (user_id, label, address, address_state, is_default)
select id, 'Home', address, address_state, true
from users
where address is not null and address != '';

-- 4. Drop old columns from users
alter table users drop column if exists address;
alter table users drop column if exists address_state;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration runs without errors. Confirm `user_addresses` table exists in the Supabase dashboard and `users` no longer has `address` or `address_state` columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/026_address_book.sql
git commit -m "feat: add user_addresses table and migrate profile addresses"
```

---

## Task 2: TypeScript types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add `UserAddress` type and update `User`**

In `types/index.ts`:

Remove the `address` and `address_state` fields from the `User` interface:
```typescript
// Before (remove these two lines from User):
  address: string | null
  address_state: string | null
```

Add the `UserAddress` interface after the `User` interface:
```typescript
export interface UserAddress {
  id: string
  user_id: string
  label: string
  address: string
  address_state: string | null
  is_default: boolean
  created_at: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: build errors only from files that used `user.address` or `user.address_state` — these will be fixed in later tasks. If there are unrelated errors, fix them now.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add UserAddress type, remove address fields from User"
```

---

## Task 3: API routes — list and create addresses

**Files:**
- Create: `app/api/user/addresses/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// app/api/user/addresses/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const MAX_ADDRESSES = 10

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data, error } = await supabaseAdmin
    .from('user_addresses')
    .select('*')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: true })

  if (error) return err('Failed to fetch addresses', 'DB_ERROR', 500)

  return ok(data ?? [])
}

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  let body: { label?: unknown; address?: unknown; address_state?: unknown; is_default?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'PARSE_ERROR', 400)
  }

  const { label, address, address_state, is_default } = body

  if (!label || typeof label !== 'string' || label.trim().length === 0 || label.trim().length > 30) {
    return err('Label must be 1–30 characters', 'VALIDATION_ERROR', 400)
  }
  if (!address || typeof address !== 'string' || address.trim().length === 0 || address.trim().length > 300) {
    return err('Address must be 1–300 characters', 'VALIDATION_ERROR', 400)
  }
  if (address_state !== undefined && address_state !== null && typeof address_state !== 'string') {
    return err('Invalid address_state', 'VALIDATION_ERROR', 400)
  }

  // Enforce 10-address limit
  const { count } = await supabaseAdmin
    .from('user_addresses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authUser.id)

  if ((count ?? 0) >= MAX_ADDRESSES) {
    return err('Address limit reached (max 10)', 'LIMIT_EXCEEDED', 422)
  }

  // If setting as default, clear existing default first
  if (is_default) {
    await supabaseAdmin
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', authUser.id)
  }

  const { data, error } = await supabaseAdmin
    .from('user_addresses')
    .insert({
      user_id: authUser.id,
      label: label.trim(),
      address: address.trim(),
      address_state: typeof address_state === 'string' ? address_state.trim() || null : null,
      is_default: Boolean(is_default),
    })
    .select('*')
    .single()

  if (error || !data) return err('Failed to create address', 'DB_ERROR', 500)

  return ok(data, 201)
}
```

- [ ] **Step 2: Verify the route is reachable**

Start the dev server (`npm run dev`), then open a browser and go to `/dashboard`. Open DevTools → Network tab. Navigate to any page that would call this endpoint (we'll test it properly after adding hooks in Task 5).

- [ ] **Step 3: Commit**

```bash
git add app/api/user/addresses/route.ts
git commit -m "feat: add GET/POST /api/user/addresses route"
```

---

## Task 4: API routes — update and delete address

**Files:**
- Create: `app/api/user/addresses/[id]/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// app/api/user/addresses/[id]/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  let body: { label?: unknown; address?: unknown; address_state?: unknown; is_default?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'PARSE_ERROR', 400)
  }

  const { label, address, address_state, is_default } = body

  const updates: Record<string, unknown> = {}

  if (label !== undefined) {
    if (typeof label !== 'string' || label.trim().length === 0 || label.trim().length > 30) {
      return err('Label must be 1–30 characters', 'VALIDATION_ERROR', 400)
    }
    updates.label = label.trim()
  }

  if (address !== undefined) {
    if (typeof address !== 'string' || address.trim().length === 0 || address.trim().length > 300) {
      return err('Address must be 1–300 characters', 'VALIDATION_ERROR', 400)
    }
    updates.address = address.trim()
  }

  if (address_state !== undefined) {
    updates.address_state = address_state === null ? null : String(address_state).trim() || null
  }

  if (is_default === true) {
    // Clear existing default for this user before setting the new one
    await supabaseAdmin
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', authUser.id)
    updates.is_default = true
  }

  if (Object.keys(updates).length === 0) {
    return err('At least one field required', 'VALIDATION_ERROR', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('user_addresses')
    .update(updates)
    .eq('id', id)
    .eq('user_id', authUser.id)  // Prevent updating another user's address
    .select('*')
    .single()

  if (error || !data) return err('Address not found or update failed', 'NOT_FOUND', 404)

  return ok(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('user_addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', authUser.id)

  if (error) return err('Failed to delete address', 'DB_ERROR', 500)

  return ok({ deleted: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/user/addresses/[id]/route.ts"
git commit -m "feat: add PATCH/DELETE /api/user/addresses/[id] route"
```

---

## Task 5: React Query hooks

**Files:**
- Create: `lib/hooks/useAddresses.ts`

- [ ] **Step 1: Create the hooks file**

```typescript
// lib/hooks/useAddresses.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserAddress } from '@/types'

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Something went wrong')
  return json
}

export function useAddresses() {
  return useQuery<UserAddress[]>({
    queryKey: ['user-addresses'],
    queryFn: async () => {
      const json = await apiFetch('/api/user/addresses')
      return json.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { label: string; address: string; address_state: string | null; is_default?: boolean }) =>
      apiFetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-addresses'] }),
  })
}

export function useUpdateAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; label?: string; address?: string; address_state?: string | null; is_default?: boolean }) =>
      apiFetch(`/api/user/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-addresses'] }),
  })
}

export function useDeleteAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/user/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-addresses'] }),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/useAddresses.ts
git commit -m "feat: add useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress hooks"
```

---

## Task 6: Update profile API and auth hook

**Files:**
- Modify: `app/api/users/me/route.ts`
- Modify: `lib/hooks/useAuth.ts`

- [ ] **Step 1: Strip address/address_state from the PATCH route**

In `app/api/users/me/route.ts`, replace the PATCH handler body type and logic. Remove all `address` and `address_state` handling:

```typescript
// app/api/users/me/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { formatUserResponse } from './utils'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error || !user) return err('User not found', 'NOT_FOUND', 404)

  return ok(formatUserResponse(user))
}

export async function PATCH(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  let body: { name?: unknown; avatar_url?: unknown; phone?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'PARSE_ERROR', 400)
  }

  const { name, avatar_url, phone } = body

  if (name === undefined && avatar_url === undefined && phone === undefined) {
    return err('At least one field required', 'VALIDATION_ERROR', 400)
  }

  const updates: Record<string, string | null> = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      return err('Name must be 1–100 characters', 'VALIDATION_ERROR', 400)
    }
    updates.name = name.trim()
  }

  if (avatar_url !== undefined) {
    if (typeof avatar_url !== 'string') {
      return err('Invalid avatar_url', 'VALIDATION_ERROR', 400)
    }
    const trimmedUrl = avatar_url.trim()
    const isCloudinaryId = /^[\w\-/]+$/.test(trimmedUrl)
    const isHttpsUrl = trimmedUrl.startsWith('https://')
    if (!trimmedUrl || trimmedUrl.length > 500 || (!isCloudinaryId && !isHttpsUrl)) {
      return err('Invalid avatar_url', 'VALIDATION_ERROR', 400)
    }
    updates.avatar_url = trimmedUrl
  }

  if (phone !== undefined) {
    if (phone !== null && (typeof phone !== 'string' || phone.trim().length === 0 || phone.trim().length > 30)) {
      return err('Phone must be 1–30 characters', 'VALIDATION_ERROR', 400)
    }
    updates.phone = phone === null ? null : (phone as string).trim()
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', authUser.id)
    .select('*')
    .single()

  if (error || !user) return err('Failed to update profile', 'DB_ERROR', 500)

  return ok(formatUserResponse(user))
}
```

- [ ] **Step 2: Update `useUpdateProfile` in `lib/hooks/useAuth.ts`**

Find the `useUpdateProfile` function and replace its `mutationFn` input type — remove `address` and `address_state`:

```typescript
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name?: string; avatar_url?: string; phone?: string }) => {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message ?? 'Failed to update profile')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | head -60
```

Expected: errors only in files that still reference `me.address` (profile page ContactCard) — those get fixed in Task 8. No new unrelated errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/users/me/route.ts lib/hooks/useAuth.ts
git commit -m "feat: remove address fields from profile API and useUpdateProfile hook"
```

---

## Task 7: AddressPickerModal component

**Files:**
- Create: `components/ui/AddressPickerModal.tsx`
- Modify: `components/ui/index.ts`

- [ ] **Step 1: Create the modal component**

```typescript
// components/ui/AddressPickerModal.tsx
'use client'

import { useState } from 'react'
import { Check, MapPin, Plus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Modal } from './Modal'
import PlacesAddressInput, { type PlaceResult } from '@/components/checkout/PlacesAddressInput'
import { useAddresses, useCreateAddress } from '@/lib/hooks/useAddresses'
import type { UserAddress } from '@/types'

const MAX_ADDRESSES = 10

type Props = {
  open: boolean
  onClose: () => void
  title: string
  currentAddress?: string | null
  onConfirm: (address: string, state: string | null) => void
}

function AddressCard({
  addr,
  selected,
  onSelect,
}: {
  addr: UserAddress
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-150',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-border-strong',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-text'}`}>
              {addr.label}
            </span>
            {addr.is_default && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Default
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted leading-snug">{addr.address}</p>
          {addr.address_state && (
            <p className="text-[11px] text-text-subtle mt-0.5">{addr.address_state}</p>
          )}
        </div>
        {selected && (
          <div className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Check size={11} strokeWidth={3} className="text-white" />
          </div>
        )}
      </div>
    </button>
  )
}

export function AddressPickerModal({ open, onClose, title, currentAddress, onConfirm }: Props) {
  const { data: addresses = [], isLoading } = useAddresses()
  const { mutate: createAddress, isPending: saving } = useCreateAddress()

  const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0] ?? null
  const initialSelected = addresses.find((a) => a.address === currentAddress) ?? defaultAddr

  const [selectedId, setSelectedId] = useState<string | null>(initialSelected?.id ?? null)
  const [showNew, setShowNew] = useState(addresses.length === 0)
  const [newResult, setNewResult] = useState<PlaceResult | null>(null)
  const [saveToBook, setSaveToBook] = useState(addresses.length < MAX_ADDRESSES)
  const [newLabel, setNewLabel] = useState('Home')
  const [labelError, setLabelError] = useState('')

  const INPUT_CLS =
    'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'

  function handleConfirm() {
    if (selectedId) {
      const addr = addresses.find((a) => a.id === selectedId)
      if (addr) onConfirm(addr.address, addr.address_state)
      onClose()
      return
    }
    if (newResult) {
      if (saveToBook) {
        if (!newLabel.trim()) { setLabelError('Label is required'); return }
        createAddress(
          { label: newLabel.trim(), address: newResult.formatted_address, address_state: newResult.state, is_default: false },
          {
            onSuccess: () => {
              onConfirm(newResult.formatted_address, newResult.state)
              onClose()
            },
          },
        )
      } else {
        onConfirm(newResult.formatted_address, newResult.state)
        onClose()
      }
    }
  }

  const canConfirm = Boolean(selectedId) || Boolean(newResult)

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-text-subtle" />
          </div>
        ) : (
          <>
            {addresses.length > 0 && (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <AddressCard
                    key={addr.id}
                    addr={addr}
                    selected={selectedId === addr.id}
                    onSelect={() => { setSelectedId(addr.id); setNewResult(null) }}
                  />
                ))}
              </div>
            )}

            {/* Use a different address */}
            <div className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => { setShowNew((v) => !v); setSelectedId(null) }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text hover:bg-surface transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Plus size={14} strokeWidth={2.5} />
                  {addresses.length === 0 ? 'Enter an address' : 'Use a different address'}
                </span>
                {showNew ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
              </button>

              {showNew && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  <PlacesAddressInput
                    placeholder="Search for an address"
                    onSelect={(r) => { setNewResult(r); setSelectedId(null) }}
                    onClear={() => setNewResult(null)}
                  />

                  {newResult && addresses.length < MAX_ADDRESSES && (
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveToBook}
                        onChange={(e) => setSaveToBook(e.target.checked)}
                        className="rounded border-border text-primary"
                      />
                      <span className="text-sm text-text">Save to address book</span>
                    </label>
                  )}

                  {newResult && saveToBook && (
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">
                        Label <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => { setNewLabel(e.target.value); setLabelError('') }}
                        maxLength={30}
                        placeholder="e.g. Home, Office"
                        className={INPUT_CLS}
                      />
                      {labelError && <p className="mt-1 text-xs text-error">{labelError}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm button */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm || saving}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />}
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Export from the UI barrel**

In `components/ui/index.ts`, add:
```typescript
export { AddressPickerModal } from './AddressPickerModal'
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/AddressPickerModal.tsx components/ui/index.ts
git commit -m "feat: add AddressPickerModal shared component"
```

---

## Task 8: Address Book page

**Files:**
- Create: `app/dashboard/address-book/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/dashboard/address-book/page.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Plus, Pencil, Trash2, Star, Loader2, BookMarked } from 'lucide-react'
import { Modal } from '@/components/ui'
import PlacesAddressInput, { type PlaceResult } from '@/components/checkout/PlacesAddressInput'
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
} from '@/lib/hooks/useAddresses'
import type { UserAddress } from '@/types'

const MAX_ADDRESSES = 10

const INPUT_CLS =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'

// ─── Add/Edit modal ───────────────────────────────────────────────────────────

function AddressForm({
  existing,
  onClose,
}: {
  existing?: UserAddress
  onClose: () => void
}) {
  const [label, setLabel] = useState(existing?.label ?? '')
  const [labelError, setLabelError] = useState('')
  const [selectedResult, setSelectedResult] = useState<PlaceResult | null>(null)
  const [addressError, setAddressError] = useState('')

  const { mutate: create, isPending: creating } = useCreateAddress()
  const { mutate: update, isPending: updating } = useUpdateAddress()
  const isPending = creating || updating

  function save() {
    let valid = true
    if (!label.trim()) { setLabelError('Label is required'); valid = false }
    if (!existing && !selectedResult) { setAddressError('Please search for and select an address'); valid = false }
    if (!valid) return

    if (existing) {
      const patch: Parameters<typeof update>[0] = { id: existing.id, label: label.trim() }
      if (selectedResult) {
        patch.address = selectedResult.formatted_address
        patch.address_state = selectedResult.state
      }
      update(patch, { onSuccess: onClose })
    } else {
      create(
        {
          label: label.trim(),
          address: selectedResult!.formatted_address,
          address_state: selectedResult!.state,
          is_default: false,
        },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          Label <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => { setLabel(e.target.value); setLabelError('') }}
          maxLength={30}
          placeholder="e.g. Home, Office, Warehouse"
          autoFocus
          className={INPUT_CLS}
        />
        {labelError && <p className="mt-1.5 text-xs text-error">{labelError}</p>}
      </div>

      <PlacesAddressInput
        label="Address"
        placeholder="Search for an address"
        defaultValue={existing?.address ?? ''}
        onSelect={(r) => { setSelectedResult(r); setAddressError('') }}
        onClear={() => setSelectedResult(null)}
        error={addressError}
        required
      />

      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />}
          {isPending ? 'Saving…' : existing ? 'Save changes' : 'Add address'}
        </button>
      </div>
    </div>
  )
}

// ─── Address card ─────────────────────────────────────────────────────────────

function AddressCard({ addr }: { addr: UserAddress }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { mutate: update, isPending: settingDefault } = useUpdateAddress()
  const { mutate: del, isPending: deleting } = useDeleteAddress()

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold text-text">{addr.label}</p>
              {addr.is_default && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Star size={8} strokeWidth={2.5} />
                  Default
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted leading-snug">{addr.address}</p>
            {addr.address_state && (
              <p className="text-xs text-text-subtle mt-0.5">{addr.address_state}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="p-2 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-text"
              aria-label="Edit"
            >
              <Pencil size={14} strokeWidth={2} />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-2 rounded-lg hover:bg-error/10 transition-colors text-text-muted hover:text-error"
              aria-label="Delete"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {!addr.is_default && (
          <button
            onClick={() => update({ id: addr.id, is_default: true })}
            disabled={settingDefault}
            className="mt-3 text-xs font-semibold text-primary hover:text-primary-hover disabled:opacity-50 transition-colors inline-flex items-center gap-1"
          >
            {settingDefault ? <Loader2 size={10} className="animate-spin" /> : <Star size={10} strokeWidth={2.5} />}
            Set as default
          </button>
        )}
      </motion.div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit address">
        <AddressForm existing={addr} onClose={() => setEditOpen(false)} />
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete address">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to delete <span className="font-semibold text-text">{addr.label}</span>? This cannot be undone.
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={() => setDeleteOpen(false)}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => del(addr.id, { onSuccess: () => setDeleteOpen(false) })}
              disabled={deleting}
              className="flex-1 rounded-xl bg-error px-4 py-2.5 text-sm font-semibold text-white hover:bg-error/90 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
            >
              {deleting && <Loader2 size={13} className="animate-spin" />}
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddressBookPage() {
  const [addOpen, setAddOpen] = useState(false)
  const { data: addresses = [], isLoading } = useAddresses()
  const atLimit = addresses.length >= MAX_ADDRESSES

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Address Book</h1>
          <p className="text-sm text-text-muted mt-1">Manage your saved pickup and delivery addresses.</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          disabled={atLimit}
          title={atLimit ? "You've reached the 10-address limit" : undefined}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add address
        </button>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin text-text-subtle" />
        </div>
      ) : addresses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-20 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-1">
            <BookMarked size={24} strokeWidth={1.5} className="text-primary" />
          </div>
          <p className="text-base font-semibold text-text">No saved addresses yet</p>
          <p className="text-sm text-text-muted max-w-xs">Add addresses you use for pickup or delivery so you can select them quickly when listing or buying.</p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            <MapPin size={14} strokeWidth={2} />
            Add your first address
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3 max-w-lg">
          {addresses.map((addr) => (
            <AddressCard key={addr.id} addr={addr} />
          ))}
          {atLimit && (
            <p className="text-xs text-text-subtle text-center pt-1">
              10-address limit reached. Delete an address to add a new one.
            </p>
          )}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add address">
        <AddressForm onClose={() => setAddOpen(false)} />
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Run the dev server and verify the page loads**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard/address-book` while signed in. Verify:
- Page renders with header and "Add address" button
- Empty state shows when no addresses exist
- Clicking "Add address" opens the modal
- Adding an address saves it and shows in the list
- Editing updates the label/address
- "Set as default" works — default badge moves to the new default
- Delete confirmation + delete works

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/address-book/page.tsx
git commit -m "feat: add address book management page"
```

---

## Task 9: Add Address Book to sidebar and fix profile page

**Files:**
- Modify: `components/dashboard/Sidebar.tsx`
- Modify: `app/dashboard/profile/page.tsx`

- [ ] **Step 1: Add nav item to sidebar**

In `components/dashboard/Sidebar.tsx`, add `BookMarked` to the lucide-react import:
```typescript
import {
  LayoutDashboard,
  Package,
  LogOut,
  ShoppingCart,
  CreditCard,
  Store,
  X,
  Search,
  User,
  BookMarked,
} from "lucide-react";
```

Then add the address book entry to `NAV_ITEMS`:
```typescript
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/listings", label: "My Listings", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/billing", label: "Payouts", icon: CreditCard },
  { href: "/dashboard/address-book", label: "Address Book", icon: BookMarked },
  { href: "/", label: "Browse Listings", icon: Store },
];
```

- [ ] **Step 2: Update ContactCard in profile page**

In `app/dashboard/profile/page.tsx`, find the `ContactCard` component and replace it entirely:

```typescript
function ContactCard({ me }: { me: ReturnType<typeof useMe>['data'] }) {
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [saveError, setSaveError] = useState('')
  const { mutate, isPending } = useUpdateProfile()

  function startEdit() {
    setPhone(me?.phone ?? '')
    setPhoneError('')
    setSaveError('')
    setEditing(true)
  }

  function cancel() { setEditing(false); setPhoneError(''); setSaveError('') }

  function save() {
    const trimmedPhone = phone.trim()
    if (trimmedPhone && trimmedPhone.length > 30) { setPhoneError('Phone must be 30 characters or less'); return }
    setPhoneError('')
    setSaveError('')
    mutate(
      { phone: trimmedPhone || undefined },
      { onSuccess: () => setEditing(false), onError: e => setSaveError(e.message) }
    )
  }

  return (
    <InfoCard title="Contact" subtitle="Phone number and delivery addresses" editing={editing} onEdit={startEdit} onCancel={cancel} onSave={save} saving={isPending} delay={0.1}>
      {editing ? (
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Phone number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoFocus maxLength={30} placeholder="+234 800 000 0000" className={INPUT_CLS} />
            {phoneError && <p className="mt-1.5 text-xs text-error">{phoneError}</p>}
          </div>
          {saveError && <p className="text-xs text-error">{saveError}</p>}
        </div>
      ) : (
        <>
          <InfoRow label="Phone" value={me?.phone ?? <span className="text-text-subtle">—</span>} />
          <div className="flex items-center justify-between px-5 py-3.5 gap-4">
            <span className="text-sm text-text-muted shrink-0">Delivery addresses</span>
            <Link href="/dashboard/address-book" className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors">
              Manage addresses →
            </Link>
          </div>
        </>
      )}
    </InfoCard>
  )
}
```

Also ensure `Link` from `next/link` is imported at the top of the file (it already is — check the existing imports).

Also remove the `PlacesAddressInput` import from the profile page since it's no longer used there:
```typescript
// Remove this line:
import PlacesAddressInput from "@/components/checkout/PlacesAddressInput"
```

- [ ] **Step 3: Verify**

Visit `http://localhost:3000/dashboard/profile`. Confirm:
- Contact card shows only Phone + "Manage addresses →" link
- "Manage addresses →" link navigates to `/dashboard/address-book`
- "Address Book" appears in the sidebar nav

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/Sidebar.tsx app/dashboard/profile/page.tsx
git commit -m "feat: add Address Book to sidebar, update profile Contact card"
```

---

## Task 10: Update listing creation flow (StepPricing)

**Files:**
- Modify: `components/listings/steps/StepPricing.tsx`

- [ ] **Step 1: Replace PlacesAddressInput with AddressPickerModal**

Replace the entire file content with:

```typescript
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  ArrowRight,
  Banknote,
  Bike,
  Car,
  Truck,
  Package,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { Input, Button, AddressPickerModal } from "@/components/ui";
import { useAddresses } from "@/lib/hooks/useAddresses";
import type { ListingType, SizeCategory } from "@/types";

interface StepPricingData {
  price: number | null;
  area: string;
  size_category: SizeCategory;
  pickup_address: string;
}

const SIZE_OPTIONS: {
  value: SizeCategory;
  label: string;
  description: string;
  vehicle: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    strokeWidth?: number;
  }>;
}[] = [
  {
    value: "small",
    label: "Small",
    description: "Fits in a bag — clothes, phones, accessories",
    vehicle: "Motorbike",
    icon: Bike,
  },
  {
    value: "medium",
    label: "Medium",
    description: "Boxed items — small appliances, shoes",
    vehicle: "Car",
    icon: Car,
  },
  {
    value: "large",
    label: "Large",
    description: "Bulky items — TVs, large appliances",
    vehicle: "Van",
    icon: Truck,
  },
  {
    value: "extra_large",
    label: "Extra Large",
    description: "Heavy/oversized — furniture, fridges",
    vehicle: "Large Van",
    icon: Package,
  },
];

interface StepPricingProps {
  listingType: ListingType;
  defaultValues?: Partial<StepPricingData>;
  onNext: (data: StepPricingData) => void;
  onBack: () => void;
}

export function StepPricing({
  listingType,
  defaultValues,
  onNext,
  onBack,
}: StepPricingProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<StepPricingData>({ defaultValues });

  const { data: addresses = [] } = useAddresses();
  const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;

  const [pickupAddress, setPickupAddress] = useState(
    defaultValues?.pickup_address ?? defaultAddr?.address ?? ""
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickupError, setPickupError] = useState("");

  const [priceDisplay, setPriceDisplay] = useState(
    defaultValues?.price != null
      ? defaultValues.price.toLocaleString("en-NG")
      : "",
  );

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, "");
    const numeric = raw === "" ? null : parseInt(raw, 10);
    setValue("price", numeric, { shouldValidate: true });
    setPriceDisplay(raw === "" ? "" : parseInt(raw, 10).toLocaleString("en-NG"));
  }

  function handleAddressConfirm(address: string, state: string | null) {
    setPickupAddress(address);
    setValue("pickup_address", address, { shouldValidate: true });
    const area = state ?? "";
    setValue("area", area);
    setPickupError("");
  }

  function onSubmit(data: StepPricingData) {
    if (!pickupAddress) {
      setPickupError("Please select a pickup address");
      return;
    }
    onNext({ ...data, pickup_address: pickupAddress });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-text">Pricing &amp; location</h2>
        <p className="text-sm text-text-muted mt-1">
          {listingType === "for_sale"
            ? "Set your price and where pickup is."
            : "Let buyers know where to collect."}
        </p>
      </div>

      {listingType === "for_sale" && (
        <>
          <input
            type="hidden"
            {...register("price", {
              required: "Price is required for For Sale listings",
              min: { value: 1, message: "Price must be greater than 0" },
              setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
            })}
          />
          <Input
            label="Price (₦)"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 15,000"
            value={priceDisplay}
            onChange={handlePriceChange}
            error={errors.price?.message}
            leadingIcon={<Banknote size={16} className="text-text-muted" />}
          />
        </>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-text">
          Item size{" "}
          <span className="text-text-muted text-xs font-normal">
            — determines delivery vehicle
          </span>
        </label>
        <Controller
          name="size_category"
          control={control}
          rules={{ required: "Please select a size" }}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {SIZE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = field.value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={[
                      "flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-border-strong",
                    ].join(" ")}
                  >
                    <div
                      className={`mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-text-muted"}`}
                    >
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-text"}`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-text-muted leading-snug">
                        {opt.description}
                      </p>
                      <p
                        className={`text-xs font-medium mt-1 ${isSelected ? "text-primary" : "text-text-muted"}`}
                      >
                        via {opt.vehicle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.size_category && (
          <p className="text-sm text-error">{errors.size_category.message}</p>
        )}
      </div>

      {/* Hidden fields — set programmatically */}
      <input type="hidden" {...register("pickup_address")} />
      <input type="hidden" {...register("area")} />

      {/* Pickup address picker */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">
          Pickup address <span className="text-error">*</span>
        </label>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={[
            "w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
            pickupError ? "border-error" : "border-border hover:border-border-strong",
          ].join(" ")}
        >
          <MapPin size={16} className="text-text-muted shrink-0" />
          <span className={`flex-1 text-sm truncate ${pickupAddress ? "text-text" : "text-text-subtle"}`}>
            {pickupAddress || "Select a pickup address"}
          </span>
          <ChevronRight size={14} className="text-text-subtle shrink-0" />
        </button>
        {pickupError && <p className="text-sm text-error">{pickupError}</p>}
      </div>

      <AddressPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose pickup address"
        currentAddress={pickupAddress || null}
        onConfirm={handleAddressConfirm}
      />

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
        >
          Back
        </Button>
        <Button type="submit" className="flex-1 gap-2">
          Next <ArrowRight size={16} strokeWidth={2} />
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify listing creation flow**

Go to `http://localhost:3000/dashboard/listings/new`. Advance to the Pricing & location step. Confirm:
- The address field shows "Select a pickup address" initially (unless you have a saved default, in which case it's pre-filled)
- Clicking the address field opens the AddressPickerModal
- Selecting an address and confirming updates the field display
- Submitting without selecting an address shows the "Please select a pickup address" error
- Submitting with an address proceeds to the next step

- [ ] **Step 3: Commit**

```bash
git add components/listings/steps/StepPricing.tsx
git commit -m "feat: integrate AddressPickerModal into listing creation flow"
```

---

## Task 11: Update edit listing flow (EditListingDrawer)

**Files:**
- Modify: `components/listings/EditListingDrawer.tsx`

- [ ] **Step 1: Replace PlacesAddressInput with AddressPickerModal**

In `components/listings/EditListingDrawer.tsx`:

1. Replace the `PlacesAddressInput` import with:
```typescript
import { AddressPickerModal } from "@/components/ui";
import { MapPin, ChevronRight } from "lucide-react";
```
(Add `MapPin` and `ChevronRight` to the existing lucide-react import if they aren't already there, or add them as a separate import from `lucide-react`.)

2. Near the top of the `EditListingDrawer` component function, add state for the picker and pre-fill the address:
```typescript
// Add after other useState declarations (around line where pickup_address is set):
const [pickerOpen, setPickerOpen] = useState(false)
const [pickupDisplay, setPickupDisplay] = useState(listing?.pickup_address ?? "")
```

3. Add a handler for address selection (alongside `handlePickupSelect` or replacing it):
```typescript
function handleAddressConfirm(address: string, state: string | null) {
  setPickupDisplay(address)
  setValue("pickup_address", address, { shouldValidate: true })
  const area = state ?? ""
  setValue("area", area)
}
```

4. Find the `PlacesAddressInput` block (around lines 416–425) and replace it with:
```tsx
{/* Hidden fields — set programmatically */}
<input type="hidden" {...register("pickup_address")} />
<input type="hidden" {...register("area")} />

{/* Pickup address picker */}
<div className="space-y-1.5">
  <label className="block text-sm font-medium text-text">
    Pickup address <span className="text-error">*</span>
  </label>
  <button
    type="button"
    onClick={() => setPickerOpen(true)}
    className="w-full flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-left hover:border-border-strong transition-colors"
  >
    <MapPin size={16} className="text-text-muted shrink-0" />
    <span className={`flex-1 text-sm truncate ${pickupDisplay ? "text-text" : "text-text-subtle"}`}>
      {pickupDisplay || "Select a pickup address"}
    </span>
    <ChevronRight size={14} className="text-text-subtle shrink-0" />
  </button>
</div>

<AddressPickerModal
  open={pickerOpen}
  onClose={() => setPickerOpen(false)}
  title="Choose pickup address"
  currentAddress={pickupDisplay || null}
  onConfirm={handleAddressConfirm}
/>
```

5. Remove the now-unused `handlePickupSelect` function and the `PlacesAddressInput` import line.

- [ ] **Step 2: Verify edit listing flow**

Open any existing listing in the dashboard, open the edit drawer. Confirm:
- The pickup address field shows the existing address
- Clicking it opens the modal
- Selecting a different address updates the field
- Saving the listing persists the new address

- [ ] **Step 3: Commit**

```bash
git add components/listings/EditListingDrawer.tsx
git commit -m "feat: integrate AddressPickerModal into edit listing drawer"
```

---

## Task 12: Update buying flow (listing detail page)

**Files:**
- Modify: `app/listings/[id]/page.tsx`

- [ ] **Step 1: Add delivery address picker before checkout**

The buying flow for `for_sale` listings is handled by a buy/cart button that we need to locate. Search for the buy/payment button in `app/listings/[id]/page.tsx`.

Find the section where `for_sale` listings show a "Buy" or "Add to Cart" button. Add delivery address state and wrap the purchase action with an address selection step.

Add these imports at the top of the file:
```typescript
import { AddressPickerModal } from "@/components/ui"
import { useAddresses } from "@/lib/hooks/useAddresses"
```

Find the `BuyCTA` component or equivalent buy button component (search for the `for_sale` purchase handler). Add state for the address modal:

```typescript
// Inside the buy CTA component:
const { data: addresses = [] } = useAddresses()
const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0] ?? null

const [deliveryAddress, setDeliveryAddress] = useState<string | null>(defaultAddr?.address ?? null)
const [deliveryState, setDeliveryState] = useState<string | null>(defaultAddr?.address_state ?? null)
const [addressPickerOpen, setAddressPickerOpen] = useState(false)
```

Wrap the buy action so it first opens the address picker if delivery is selected, then proceeds:

```typescript
function handleBuyClick() {
  if (deliveryType === 'delivery' && !deliveryAddress) {
    setAddressPickerOpen(true)
    return
  }
  // existing buy/cart logic here, passing deliveryAddress
}
```

Add the modal near the buy button JSX:
```tsx
<AddressPickerModal
  open={addressPickerOpen}
  onClose={() => setAddressPickerOpen(false)}
  title="Choose delivery address"
  currentAddress={deliveryAddress}
  onConfirm={(address, state) => {
    setDeliveryAddress(address)
    setDeliveryState(state)
    setAddressPickerOpen(false)
    // trigger the actual buy action
  }}
/>
```

**Note:** The exact integration depends on the structure of the buy CTA component. Read the file carefully around the for_sale buy button, understand the existing flow (cart, Paystack, etc.) and integrate the address modal as a pre-step before initiating payment. The delivery address should be passed through to the order creation payload as `pickup_address`.

- [ ] **Step 2: Verify buying flow**

Browse to a for-sale listing while signed in. Confirm:
- If you have a saved default address, it pre-fills in the delivery address area
- The address picker modal opens when needed
- Selecting an address and confirming proceeds to checkout with the address attached

- [ ] **Step 3: Commit**

```bash
git add "app/listings/[id]/page.tsx"
git commit -m "feat: integrate address picker into buying flow on listing detail page"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `user_addresses` table with label, default, 10-limit — Task 1
- [x] Migration of existing `users.address` — Task 1
- [x] Drop `users.address` / `users.address_state` — Task 1
- [x] GET/POST/PATCH/DELETE API routes — Tasks 3 & 4
- [x] React Query hooks — Task 5
- [x] Profile page removes address, adds "Manage addresses →" link — Task 9
- [x] Address Book page with add/edit/delete/set-default — Task 8
- [x] Address Book nav item in sidebar — Task 9
- [x] AddressPickerModal shared component — Task 7
- [x] Listing creation flow (StepPricing) — Task 10
- [x] Edit listing flow (EditListingDrawer) — Task 11
- [x] Buying flow (listing detail page) — Task 12
- [x] Pre-fill with default address in both flows — Tasks 10 & 12
- [x] "Save to address book" checkbox in modal — Task 7
- [x] Empty address book → go straight to form — Task 7 (addresses.length === 0 condition)

**Type consistency:**
- `UserAddress` defined in Task 2, used in Tasks 5, 7, 8 — consistent
- `useAddresses()` returns `UserAddress[]` — matches modal and page consumption
- `onConfirm: (address: string, state: string | null) => void` — consistent across Task 7 definition and Tasks 10/11/12 usage

**No placeholders:** Task 12 Step 1 has a "Note" about exact integration depending on the buy button structure — this is intentional because the buying flow may vary and the implementer needs to read the file to find the right integration point. All other steps have complete code.
