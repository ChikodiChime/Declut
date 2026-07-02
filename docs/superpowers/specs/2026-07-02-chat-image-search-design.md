# Search Listings by Photo in Chat

**Date:** 2026-07-02
**Status:** Approved

## Overview

Let users attach a photo in the chat widget/page instead of (or alongside) typing text, so Declutter Assistant can find visually similar listings. No new API route, no new tool, no image storage — this rides on the existing `/api/chat` endpoint and `search_listings` tool, with Gemini's vision reading the photo and inferring search keywords/category.

## Non-goals

- No embedding/vector similarity search (no pgvector, no new DB columns). Matching stays keyword-based via the existing `search_listings` tool — Gemini vision bridges "photo" to "keywords."
- No persistence of searched photos. Images are sent as ephemeral base64 and never uploaded to Cloudinary or saved anywhere.
- No multi-photo messages. One photo per message for v1.
- No combined voice+image input in the same message.

## Architecture & Data Flow

1. User picks/takes a photo via a new attach button in the chat input row (`components/chat/ChatWidget.tsx`).
2. Client compresses the image (canvas resize, cap ~1024px longest edge, JPEG ~0.8 quality) and converts it to a base64 data URL. Nothing is uploaded.
3. `sendMessage({ text, files: [{ type: 'file', mediaType, url: dataUrl }] })` — `@ai-sdk/react`'s `useChat` already supports attaching files this way.
4. Server-side, `convertToModelMessages` (already used in `app/api/chat/route.ts`) converts the file part into multimodal model input — this is generic SDK behavior, no code change needed there.
5. The system prompt (`buildSystemPrompt` in `app/api/chat/route.ts`) gets a new instruction block: when a message includes an image, look at it, infer item type/category/color/notable features, and call `search_listings` with those as `q`/`category`. Same tool, same schema — no backend logic changes beyond the prompt.
6. Response renders exactly as today: a short assistant reply + `ListingSlider` of results.

The feature is not a separate code path — it's the existing chat loop with one more input modality and one more prompt instruction.

## Component Changes

**File:** `components/chat/ChatWidget.tsx`

- New `ImageAttachButton` component (or inline logic), placed in the input row next to `VoiceMicButton`. Contains a hidden `<input type="file" accept="image/*" capture="environment">` — mobile gets a native camera-or-gallery picker, desktop gets a file dialog.
- **Preview before send:** once a file is picked, show a thumbnail chip above the textarea with a ✕ to remove it. Text stays optional — user can send the photo alone or with a caption ("find something like this but blue").
- **Sent message rendering:** user's own chat bubble needs to show the image it sent. Add a `getImageFromParts` helper alongside the existing `getTextFromParts` to extract and render a thumbnail in the user bubble.
- **Client-side compression:** downscale via `<canvas>` before converting to base64 — keeps payload small for mobile data and Gemini doesn't need full resolution to identify an item.
- No changes to `SUGGESTED_PROMPTS` / `SUGGESTION_CARDS` — a "search by photo" suggestion card is a nice-to-have, left out of v1.

## System Prompt Changes

**File:** `app/api/chat/route.ts`, `buildSystemPrompt`

Add a new instruction block, roughly:

```
## Image search
- If the user's message includes a photo, look at it and infer what kind of item it shows (category, type, color, brand if visible).
- Call search_listings using what you infer as `q` and/or `category`. Combine with any text the user typed.
- If the photo is unclear or you can't confidently tell what it is, ask a short clarifying question instead of guessing.
```

## Error Handling

| Case | Behavior |
|---|---|
| Non-image file selected | Client rejects via `accept="image/*"`, no preview shown |
| Image too large after compression (>~4MB) | Inline error under the input; message not sent |
| Gemini can't identify the item | Prompted to ask a clarifying follow-up instead of guessing (existing "don't make up listings" pattern extended) |
| Zero search results | Falls through to existing "no listings found" conversational path — no new handling needed |
| Guest (unauthenticated) user | No gating — `search_listings` already works for guests |

## Testing Plan

- Component test for `ChatWidget.tsx` attach/preview/remove state: selecting a file shows a thumbnail, removing clears it, sending clears it after submit.
- Manual verification: dev server + browser, send a real photo of an item, confirm Gemini returns relevant listings and the user's own bubble renders the thumbnail.
- No new API-level tests — `/api/chat` and `search_listings` are structurally unchanged; only the system prompt text and the (already-generic) multimodal input path are new.

## Out of Scope

- Vector/embedding-based visual similarity search
- Persisting or storing searched photos
- Multiple photos per message
- Combined voice + image input
- New suggestion cards promoting the photo-search feature
