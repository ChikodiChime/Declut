# AI Listing Assistant — Design Spec

**Date:** 2026-07-02
**Status:** Approved

---

## Overview

An AI-assisted "Quick Start" step added to the existing listing-creation wizard. A seller uploads photos of an item and Gemini drafts the title, description, category, condition, and listing type (for_sale / free / donate); a price is then suggested from real comparable listings already in the marketplace. Every field remains editable — the seller reviews and confirms through the existing wizard steps exactly as before. This closes a gap explicitly called out as out-of-scope in the original chatbot spec (`2026-06-18-ai-chatbot-design.md`): "seller listing creation via chat."

---

## Architecture

```
Browser                         Next.js App Router                 External
──────                          ──────────────────                 ────────
StepQuickStart (photos) ──▶  /api/upload (existing)  ──▶  Cloudinary
                                     │
                              public_ids[]
                                     │
                                     ▼
                       POST /api/listings/ai-draft
                                     │
                        ┌────────────┴────────────┐
                        ▼                          ▼
                 generateObject()           supabaseAdmin query
                 (Gemini Flash, vision)     (comp listings by
                        │                    category/condition)
                        ▼                          │
              { title, description,                ▼
                category, condition,      { suggested_price,
                listing_type }              price_range, comp_count }
                        │                          │
                        └────────────┬─────────────┘
                                     ▼
                     merged draft → pre-fills wizard state
```

**Key principle:** This is a one-shot structured task, not a conversation — it uses `generateObject` (not the existing chat route's `streamText` + tool-calling loop). Price is computed server-side from real DB data, not guessed by the model.

**Stack:** Same as the existing chatbot — `@ai-sdk/google` (`gemini-2.5-flash`), Vercel AI SDK, `supabaseAdmin`. No new dependencies.

---

## New Files

| File | Purpose |
|------|---------|
| `app/api/listings/ai-draft/route.ts` | Auth-gated POST route — takes uploaded image public_ids, returns AI-drafted listing fields + price suggestion |
| `components/listings/steps/StepQuickStart.tsx` | New optional first wizard step — photo upload + "Generate draft" trigger |
| `lib/listings/priceComp.ts` | Pure function: given category/condition + a list of comparable listings, returns `{ suggested_price, price_range, comp_count }` |

**Modified files:**

| File | Change |
|------|--------|
| `components/listings/ListingForm.tsx` | Add `StepQuickStart` as step 0 (skippable); wire its output into the existing reducer state; track which fields came from AI as local component state (`Set<keyof ListingFormData>`), not part of `ListingFormData` itself — it's a transient UI badge, not data that gets submitted or persisted |
| `components/ui/CategoryPicker.tsx` | Replace its hardcoded 9-category list with an import from `app/api/listings/utils.ts`'s `VALID_CATEGORIES`, closing the existing duplication now that both the AI schema and the picker must agree on the same list |

---

## Data Flow / UX

1. User starts a new listing → wizard opens on the new **"Quick Start with AI"** step (step 0 of 5), with a visible "Skip, I'll fill this in myself" option that drops straight into the current `StepType` flow unchanged.
2. User drags in up to 5 photos. Each uploads immediately via the existing `useUploadImage` hook → `/api/upload` (untouched), same `declut/listings` Cloudinary folder, same public_id storage.
3. User clicks **"Generate draft"** → `POST /api/listings/ai-draft` with `{ public_ids: string[] }`.
4. Route (auth-gated via `getAuthUser`, same as `/api/upload`):
   - Builds Cloudinary secure URLs from the public_ids.
   - Calls `generateObject` with Gemini, passing the images as multimodal content plus instructions. Output schema is a Zod object built from `VALID_CATEGORIES`, `VALID_CONDITIONS`, `VALID_LISTING_TYPES` (imported from `app/api/listings/utils.ts` — reused, not redefined, unlike the chat route's independent enum copies).
   - Once category + condition come back, queries `supabaseAdmin` for `status='available' AND listing_type='for_sale'` listings matching category (weighted toward matching condition), and computes a suggested price via `lib/listings/priceComp.ts`.
   - Returns the merged draft: `{ title, description, category, condition, listing_type, suggested_price, price_range, comp_count, images: public_ids }`.
5. Client pre-fills the wizard's `useReducer` state with the full draft, including images — `StepPhotos` opens already populated, no re-upload needed.
6. User proceeds through `StepType → StepDetails → StepPricing → StepPhotos` as today. Every AI-sourced field shows a small "AI suggested" badge and is fully editable/overridable.
7. Submission (`useCreateListing`) is unchanged — the AI step only seeds initial state; final validation still runs through the existing `validateListingBody()` on submit.

---

## Price Suggestion Logic (`lib/listings/priceComp.ts`)

- Input: target `category`, target `condition`, list of comparable `for_sale`/`available` listings.
- Weight listings with matching `condition` more heavily than category-only matches.
- Output: `{ suggested_price: number | null, price_range: { min, max } | null, comp_count: number }`.
- If `comp_count < 3`: return `suggested_price: null` — not enough data for a confident number. The UI shows "Not enough similar listings yet — set your own price" instead of a fabricated figure.
- Pure function, no I/O — the DB query itself lives in the route handler.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Gemini call fails/times out | Toast error; user proceeds with an empty manual flow (AI step never blocks listing creation) |
| Model output fails Zod validation | `generateObject` throws → caught, same fallback as above |
| Fewer than 3 comparable listings | `suggested_price: null`, UI explains why instead of guessing |
| Unauthenticated user reaches Quick Start | Same gate as `/api/upload` — 401, prompts sign-in |
| AI suggests an invalid enum value (shouldn't happen given schema, but defense-in-depth) | Existing `validateListingBody()` at submit time is the real gate — AI output is only ever a pre-fill, never trusted directly |

---

## Testing

- Unit tests for `lib/listings/priceComp.ts` — pure function, mock listing arrays, assert correct median/range/comp_count including the `< 3 comps` fallback.
- Route test for `/api/listings/ai-draft` — 401 when unauthenticated, mirroring existing `/api/upload` test pattern (if one exists; otherwise this establishes the pattern).
- Manual browser pass: real photos through the real wizard, verify pre-fill, edit, and submit end-to-end before calling this done.

---

## Out of Scope

- A second LLM call to refine the price suggestion in natural language — price is pure server-side math from comps.
- Editing an *existing* listing via AI re-analysis (this spec covers creation only).
- Cross-posting or multi-item batch drafting from one photo set.
- Persisting which fields were AI-suggested vs. hand-edited beyond the wizard session (no DB column for provenance) — tracked only as local component state in `ListingForm.tsx` for the badge UI, discarded on submit.
