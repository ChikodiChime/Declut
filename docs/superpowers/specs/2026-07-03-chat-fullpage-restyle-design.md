# Restyle /chat Full-Page Layout

**Date:** 2026-07-03
**Status:** Approved

## Overview

The full-page chat experience (`/chat`, `ChatWidget` in `fullPage` mode) feels like the small floating widget just stretched into a narrow centered column on a lot of empty gray space, rather than a considered full-page layout. This restyles the page-level layout only — width and empty-state arrangement — while leaving the conversation UI (message bubbles, listing-result horizontal scroll) untouched.

Along the way, fixes a real bug found during review: `/chat` is missing from `NavbarWrapper`'s `HIDDEN_PREFIXES`, so the site's sticky main navbar (`z-50`) renders on top of the chat page's own header (`z-40`), hiding the page's "← Back / Declutter AI" header entirely.

## Non-goals

- No changes to message bubble styling, sizing, or the listing-result horizontal scroll slider — validated against the current design and kept as-is.
- No changes to the floating widget mode (`fullPage={false}`) — this is a `fullPage`-only restyle.
- No changes to the header's content or actions (no "New chat" button, no redesign) — only fixing the layering bug that currently hides it.
- No sidebar / conversation history — chat state doesn't persist across reloads today, so there's nothing to browse.

## Changes

### 1. Fix header visibility bug

**File:** `components/layout/NavbarWrapper.tsx`

Add `/chat` to `HIDDEN_PREFIXES` (currently `["/dashboard", "/auth", "/login", "/dispatch", "/verify-email", "/admin"]`), so the main site navbar stops rendering above the chat page's own `fixed inset-0 z-40` header on `/chat`.

### 2. Widen the full-page column

**File:** `components/chat/ChatWidget.tsx`

In the `fullPage` branch only, change the container width from `max-w-2xl` (672px) to `max-w-4xl` (896px) in both the messages area and the input area wrappers (the two places that currently read `className={fullPage ? 'max-w-2xl mx-auto ...' : ...}`).

### 3. Redesign the empty state (`FullPageEmptyState`)

**File:** `components/chat/ChatWidget.tsx`

- Hero icon grows from `w-16 h-16` to a visually larger treatment appropriate for the wider column (target: comparable proportional weight to the current version, scaled up — implementer's judgment within the existing design-token system, no new colors).
- Hero title/subtitle unchanged in content, may grow in size to match the larger hero.
- `SUGGESTION_CARDS` grid changes from `grid-cols-2` (2×2) to a single full-width row (4 columns) at the `max-w-4xl` container width — matches the approved "Option C" mockup (full-width single row of 4 cards).
- This grid must remain responsive: collapse back to fewer columns (e.g. 2, matching today's mobile behavior) below the width where 4 columns would compress the cards unreadably — use the existing responsive breakpoint conventions already present elsewhere in the codebase (e.g. `sm:`/`md:` prefixes as used in `StepPhotos`/other grid layouts), not a new breakpoint scheme.

### 4. Widget mode is untouched

`fullPage={false}` (the floating `ChatBubble` widget) keeps its current width, empty state (`WidgetEmptyState`, 2×2 `SUGGESTED_PROMPTS` as pill buttons — note this is a different component from `FullPageEmptyState`/`SUGGESTION_CARDS` and is not touched), and all conversation styling. Only the `fullPage` branch's JSX/classes change.

## Testing Plan

- Manual browser verification (per this codebase's existing convention — no component test harness exists): load `/chat`, confirm the page's own "← Back / Declutter AI" header is visible (not covered by the site navbar), confirm the empty state shows 4 suggestion cards in a single row at desktop width, confirm the column reads as ~896px wide rather than the current ~672px, and confirm mobile width still collapses the suggestion grid sensibly.
- Confirm the floating widget (`ChatBubble` → `ChatWidget fullPage={false}`) is visually unchanged after the edit — its empty state and width must not be affected since the changes are scoped to the `fullPage` branch only.

## Out of Scope

- Message bubble redesign
- Listing-result grid vs. horizontal-scroll change
- Header content/action changes beyond the visibility fix
- Conversation history / sidebar
