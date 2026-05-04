# API Response Structure Design

**Date:** 2026-05-04  
**Status:** Approved  
**Scope:** All routes under `app/api/`; both client hook files

---

## Goal

Standardise every API response behind a single envelope so the client has one predictable contract regardless of which route it calls.

---

## Response Shapes

### Single resource
```json
{ "data": { ... } }
```

### List (paginated)
```json
{
  "data": [...],
  "meta": { "total": 100, "limit": 24, "offset": 0 }
}
```

### Action (no resource to return)
```json
{ "data": { "ok": true } }
```

### Error
```json
{ "error": { "message": "Human-readable string", "code": "SCREAMING_SNAKE" } }
```

### Error with extra field (rate-limit only)
```json
{ "error": { "message": "Please wait", "code": "RATE_LIMITED", "retryAfter": 120 } }
```

---

## Helper Module — `lib/api-response.ts`

Three functions; every route uses them. No bare `Response.json()` calls remain in `app/api/`.

```ts
ok(data: unknown, status = 200): Response
list(items: unknown[], meta: { total: number; limit: number; offset: number }, status = 200): Response
err(message: string, code: string, status: number, extra?: Record<string, unknown>): Response
```

`err` merges `extra` into the `error` object (used only for `retryAfter`).

---

## Error Codes

| Situation | `code` | HTTP status |
|---|---|---|
| Malformed JSON / form data | `BAD_REQUEST` | 400 |
| Validation failure | `VALIDATION_ERROR` | 400 |
| Invalid credentials | `INVALID_CREDENTIALS` | 401 |
| Missing / invalid auth token | `UNAUTHORIZED` | 401 |
| Ownership check failed | `FORBIDDEN` | 403 |
| Resource not found | `NOT_FOUND` | 404 |
| Email already registered | `EMAIL_TAKEN` | 409 |
| OTP resend rate-limited | `RATE_LIMITED` | 429 |
| Database / upstream failure | `SERVER_ERROR` | 500 |

---

## Route Migration

| Route | Method | `data` payload |
|---|---|---|
| `/api/auth/signup` | POST | user object |
| `/api/auth/signin` | POST | `{ user, emailVerified }` |
| `/api/auth/signout` | POST | `{ ok: true }` |
| `/api/auth/verify-email` | POST | `{ verified: true }` |
| `/api/auth/send-verification` | POST | `{ sent: true }` |
| `/api/users/me` | GET | user object |
| `/api/listings` | GET | listings array + `meta` |
| `/api/listings` | POST | listing object |
| `/api/listings/[id]` | GET | listing object |
| `/api/listings/[id]` | PATCH | listing object |
| `/api/listings/[id]` | DELETE | `{ ok: true }` |
| `/api/listings/mine` | GET | listings array (no `meta` — not paginated) |
| `/api/upload` | POST | `{ public_id }` |

---

## Client Hook Changes

### Principle: hooks unwrap the envelope — component code does not change

`apiRequest` and `apiPost` return the full JSON object on success. Each hook's `queryFn`/`mutationFn` maps `json.data` to the shape components already expect. This means zero changes to any component.

The only change to the shared helpers is error reading:
- Before: `throw new Error(data.error ?? 'Something went wrong')`
- After: `throw new Error(data.error?.message ?? 'Something went wrong')`

### Per-hook mapping

| Hook | `queryFn` / `mutationFn` returns | Notes |
|---|---|---|
| `useMe` | `json.data` (user object) | Components still access `useMe().data.name` etc. |
| `usePublicListings` | `{ listings: json.data, total: json.meta.total, limit: json.meta.limit, offset: json.meta.offset }` | Same shape as today |
| `useMyListings` | `{ listings: json.data }` | Same shape as today |
| `useListing` | `{ listing: json.data }` | Same shape as today |
| `useCreateListing` | `json.data` (listing) | onSuccess doesn't use the value |
| `useUpdateListing` | `json.data` (listing) | onSuccess doesn't use the value |
| `useDeleteListing` | `json.data` (`{ ok: true }`) | onSuccess doesn't use the value |
| `useUploadImage` | `json.data` (`{ public_id }`) | Was `json` directly |
| `useSignIn` | full `json` returned | `onSuccess` reads `json.data.emailVerified` (was `json.emailVerified`) |
| `useSendVerification` | custom — reads `json.data` or `json.error.retryAfter` | Rate-limit path reads `json.error.retryAfter` |

---

## Out of Scope

- No changes to validation logic or business rules.
- No changes to HTTP status codes — only the body shape changes.
- No new routes or fields.
- No component changes — hooks absorb all envelope differences.
