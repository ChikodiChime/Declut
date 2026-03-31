# Email Verification Design

**Date:** 2026-03-31
**Status:** Approved
**Feature:** 6-digit OTP email verification for new user accounts

---

## Overview

After signup, users receive a 6-digit OTP via email. They must verify their email before they can use the app (hard gate). The OTP expires in 30 minutes and can be resent with a 2-minute cooldown.

---

## 1. Database Changes

One migration adds four columns to the `users` table:

```sql
ALTER TABLE users
  ADD COLUMN email_verified        boolean      NOT NULL DEFAULT false,
  ADD COLUMN otp_code              text,
  ADD COLUMN otp_expires_at        timestamptz,
  ADD COLUMN otp_resend_after      timestamptz;
```

| Column | Type | Notes |
|---|---|---|
| `email_verified` | `boolean DEFAULT false` | Hard gate flag — checked by middleware |
| `otp_code` | `text` | Bcrypt hash of the 6-digit code |
| `otp_expires_at` | `timestamptz` | 30 min from when OTP was sent |
| `otp_resend_after` | `timestamptz` | 2 min cooldown enforced server-side |

The raw OTP code is never stored — only its bcrypt hash. This is consistent with how passwords are stored.

---

## 2. Email Service

**Provider:** Resend
**Package:** `resend` npm package
**Template:** Branded HTML email (indigo palette, clean card layout)

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@declut.ng
```

The `lib/email.ts` module will expose a single `sendOtpEmail(to, code)` function. All Resend API calls are centralised here.

---

## 3. API Routes

### `POST /api/auth/signup` (updated)
After creating the user, immediately generate and send an OTP. The response still returns the user and sets the auth cookie — the client then redirects to `/verify-email`.

### `POST /api/auth/send-verification`
Authenticated route (token cookie required). Generates a new 6-digit OTP, hashes and stores it, sends it via Resend.

**Resend cooldown enforcement:**
- If `otp_resend_after` is set and is in the future, return `429` with `{ retryAfter: <seconds> }`.
- Otherwise, generate new OTP, update `otp_code`, `otp_expires_at`, `otp_resend_after`, send email.

**Request:** No body needed (user identity comes from the auth cookie).
**Response:** `200 { sent: true }` or `429 { error, retryAfter }`.

### `POST /api/auth/verify-email`
Authenticated route. Accepts `{ code: string }`.

**Verification logic:**
1. Fetch user's `otp_code` and `otp_expires_at` from DB.
2. If `otp_expires_at` is in the past → `400 { error: "Code expired" }`.
3. `bcrypt.compare(code, otp_code)` — if no match → `400 { error: "Invalid code" }`.
4. On match: set `email_verified = true`, clear `otp_code`, `otp_expires_at`, `otp_resend_after`.
5. Return `200 { verified: true }`.

### `POST /api/auth/signin` (updated)
After successful sign-in, if `email_verified = false`, return `200` with `{ emailVerified: false }` in the response body alongside the auth cookie. The client uses this flag to redirect to `/verify-email`.

---

## 4. Middleware Update

In `middleware.ts`, after verifying the JWT token, add a DB lookup to check `email_verified`:

- If the route is in `publicRoutes` (sign-in, sign-up, verify-email, send-verification) → skip check.
- If `email_verified = false` → redirect to `/verify-email`.
- Otherwise → pass through as normal.

**Public routes (bypass verification gate):**
```
/sign-in
/sign-up
/auth/login
/auth/signup
/verify-email
/api/auth/signup
/api/auth/signin
/api/auth/signout
/api/auth/send-verification
/api/auth/verify-email
```

---

## 5. Frontend

### `/verify-email` page
- Six individual digit input boxes — auto-advances focus on each keystroke.
- Auto-submits when all 6 digits are filled (no manual button press).
- Shows a loading spinner while verifying.
- Shows inline error for wrong/expired code.
- "Resend code" button:
  - Disabled on initial load (2-min cooldown starts at signup).
  - Shows countdown: `Resend in 1:47`.
  - Becomes active when cooldown expires; clicking it calls `POST /api/auth/send-verification`.

### `/auth/login` (updated)
After successful sign-in, check the `emailVerified` flag in the response. If `false`, redirect to `/verify-email` instead of `/`.

### `useVerifyEmail()` hook
New React Query mutation in `lib/hooks/useAuth.ts`:
- Calls `POST /api/auth/verify-email`.
- On success: invalidates `['me']` query, redirects to `/`.

### `useSendVerification()` hook
New React Query mutation in `lib/hooks/useAuth.ts`:
- Calls `POST /api/auth/send-verification`.
- Returns `retryAfter` seconds on `429` so the client can restart the countdown.

---

## 6. Email Template

Branded HTML email sent via Resend:

- **Palette:** Indigo (`#4F46E5`) primary, white card on light grey background.
- **Content:**
  - Declutter logo / wordmark at top.
  - Heading: "Verify your email address"
  - Body: "Enter the code below in the app. It expires in 30 minutes."
  - Large, bold OTP code displayed centre-aligned (letter-spacing for readability).
  - Footer: "If you didn't create a Declutter account, you can safely ignore this email."
- Inline styles only (email client compatibility).
- Plain-text fallback included.

---

## 7. Error Handling Summary

| Scenario | HTTP Status | Message |
|---|---|---|
| Resend cooldown active | 429 | `{ error: "Please wait", retryAfter: <seconds> }` |
| Code expired | 400 | `{ error: "Code expired. Request a new one." }` |
| Code wrong | 400 | `{ error: "Invalid code. Please try again." }` |
| Already verified | 200 | `{ verified: true }` (idempotent) |
| Resend API failure | 500 | `{ error: "Failed to send email. Try again." }` |

---

## 8. Out of Scope

- Email change verification (future feature).
- Phone/SMS verification.
- Magic link alternative.
- Rate limiting beyond the 2-min resend cooldown (can add later).
