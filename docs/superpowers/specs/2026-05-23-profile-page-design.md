# Profile Page — Design Spec

**Date:** 2026-05-23  
**Status:** Approved

---

## Overview

Redesign the `/dashboard/profile` page from a static read-only display into a functional, well-styled profile editor. Users can update their name, avatar, and password via focused modals. The page also surfaces email verification status and Stripe connect status as read-only information rows.

---

## API Endpoints

### `PATCH /api/users/me`

Updates mutable profile fields.

**Request body** (at least one field required):
```ts
{ name?: string; avatar_url?: string }
```

**Validation:**
- `name`: non-empty string, max 100 characters
- `avatar_url`: valid Cloudinary public_id string
- At least one field must be present; reject empty body with 400

**Response:** safe user object via existing `formatUserResponse` util (strips `password_hash`, `stripe_account_id`, `otp_*` fields).

**Auth:** requires valid JWT (`getAuthUser`). Returns 401 if unauthenticated.

---

### `POST /api/users/me/password`

Changes the authenticated user's password.

**Request body:**
```ts
{ current_password: string; new_password: string }
```

**Validation:**
- Both fields required, non-empty
- `new_password` min 8 characters

**Logic:**
1. Fetch user row from DB to get `password_hash`
2. `bcrypt.compare(current_password, password_hash)` — return 400 `INVALID_PASSWORD` if mismatch
3. `bcrypt.hash(new_password, 12)` — update `password_hash` in DB
4. Return 200 `{ success: true }`

**Auth:** requires valid JWT. Returns 401 if unauthenticated.

---

## Frontend

### Page Layout

```
/dashboard/profile
│
├── Hero card
│   ├── Avatar (CldImage or initials fallback) + [Change photo] button
│   ├── Name + [Edit] button
│   ├── Email + verified/unverified badge
│   └── Account type chip + Member since date
│
├── Account details section
│   ├── Email verification row
│   │   └── If unverified: badge + "Resend verification email" button
│   └── Stripe connect status row (read-only, links to /dashboard/billing)
│
└── Security section
    └── Password row + [Change password] button → modal
```

### Hero Card

- Avatar: 80×80px rounded-2xl. If `avatar_url` is set, render `<CldImage>`. Otherwise, show first letter of name on a primary/10 background.
- "Change photo" button sits below/beside avatar, opens Avatar modal.
- Name rendered in `text-xl font-bold`. Pencil icon button beside it opens Name modal.
- Email shown with an inline badge: green "Verified" or amber "Unverified".
- Account type chip (existing style). "Member since" derived from `created_at`.

### Account Details Section

**Email verification row:**
- If `email_verified: true` — show green checkmark badge, no action needed.
- If `email_verified: false` — show amber "Unverified" badge + a "Resend verification email" button that calls `POST /api/auth/send-verification` (hook `useSendVerification` already exists in `useAuth.ts`). Shows rate-limit feedback if 429.

**Stripe connect status row:**
- Reads `stripe_onboarding_complete` from `useMe()` data.
- Renders same three states as billing page: connected (green), pending (amber), not connected (gray).
- Row is read-only with a "Manage →" link to `/dashboard/billing`. Does not duplicate the connect flow.

### Security Section

Single "Change password" row with a button that opens the Password modal.

---

## Modals

All three modals share a `<Modal>` wrapper component:
- Fixed overlay with `bg-black/40 backdrop-blur-sm`
- Centered card, max-w-md, framer-motion `scale` + `opacity` enter/exit animation
- Rendered via React `createPortal` to `document.body` to clear the sidebar z-index

### Name Modal

- Text input pre-filled with `me.name`
- Client validation: non-empty, ≤100 chars
- Save → `PATCH /api/users/me` with `{ name }`
- On success: invalidate `['me']` query, close modal, show inline success state on the field

### Avatar Modal

- Shows current avatar (or initials) as preview
- Cloudinary upload widget (same pattern as listing image upload)
- After upload completes, preview updates immediately with the new `public_id`
- Save → `PATCH /api/users/me` with `{ avatar_url: publicId }`
- On success: invalidate `['me']`, close modal

### Password Modal

- Three fields: "Current password", "New password", "Confirm new password"
- All inputs are `type="password"` with show/hide toggle
- Client validation: new password ≥ 8 chars, new === confirm before submitting
- Submit → `POST /api/users/me/password` with `{ current_password, new_password }`
- On 400 `INVALID_PASSWORD`: show "Current password is incorrect" error under that field
- On success: close modal, clear fields

---

## Hooks (additions to `lib/hooks/useAuth.ts`)

```ts
useUpdateProfile()
// useMutation → PATCH /api/users/me
// onSuccess: queryClient.invalidateQueries({ queryKey: ['me'] })

useChangePassword()
// useMutation → POST /api/users/me/password
// No cache invalidation needed (password change doesn't affect user data)
```

---

## Files Touched

| File | Change |
|---|---|
| `app/api/users/me/route.ts` | Add `PATCH` handler |
| `app/api/users/me/password/route.ts` | New file — password change endpoint |
| `lib/hooks/useAuth.ts` | Add `useUpdateProfile`, `useChangePassword` |
| `app/dashboard/profile/page.tsx` | Full redesign |
| `components/ui/Modal.tsx` | New shared modal wrapper component |

---

## Out of Scope

- Email change (requires re-verification flow — separate feature)
- Account type upgrade (individual → business — separate feature)  
- 2FA (separate feature)
- Activity stats (total listings, sales count — not requested)
