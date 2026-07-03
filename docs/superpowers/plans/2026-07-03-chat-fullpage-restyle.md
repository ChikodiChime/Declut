# Restyle /chat Full-Page Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the full-page `/chat` experience — wider column, a full-width single-row empty-state suggestion grid — and fix the pre-existing bug where the site navbar renders on top of the page's own header.

**Architecture:** Two independent, small CSS/JSX-only changes: (1) add `/chat` to the navbar's hidden-route list so the page's own header becomes visible, (2) widen the `fullPage` branch of `ChatWidget` and change its empty-state suggestion grid from 2×2 to a responsive single row. No logic, state, or data-flow changes in either task.

**Tech Stack:** Next.js 16 / React 19, Tailwind CSS 4.

## Global Constraints

- No changes to message bubble styling, sizing, or the listing-result horizontal scroll — keep exactly as-is. (Spec: Non-goals)
- No changes to the floating widget mode (`fullPage={false}`) — only the `fullPage` branch's JSX/classes change. (Spec: Non-goals, Change 4)
- No changes to header content/actions — only fix its visibility. (Spec: Non-goals)
- No new responsive breakpoint scheme — follow the existing `grid-cols-2 ... sm:grid-cols-4` convention already used in `components/landing/FeaturedListingsSection.tsx:188`. (Spec: Change 3)
- This codebase has no component-testing harness (vitest runs `environment: 'node'`, no jsdom/@testing-library/react, no `*.test.tsx` files exist). Verify these changes manually in a browser, per existing project convention — do not add test infrastructure for this.

---

## Task 1: Fix /chat header visibility (navbar z-index bug)

**Files:**
- Modify: `components/layout/NavbarWrapper.tsx:23-30`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by Task 2 — this task is fully independent and can be done in either order.

- [ ] **Step 1: Add `/chat` to the hidden-route list**

In `components/layout/NavbarWrapper.tsx`, the current code (lines 23-30) is:

```ts
const HIDDEN_PREFIXES = [
  "/dashboard",
  "/auth",
  "/login",
  "/dispatch",
  "/verify-email",
  "/admin",
];
```

Change it to:

```ts
const HIDDEN_PREFIXES = [
  "/dashboard",
  "/auth",
  "/login",
  "/dispatch",
  "/verify-email",
  "/admin",
  "/chat",
];
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (a pre-existing, unrelated failure in `__tests__/api/users/me.test.ts` may still appear — ignore it)

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/chat`.
Expected: the page's own header is visible at the top — a centered "Declutter AI" label with a small bot icon, and a "← Back" link on the left that returns to `/`. The site's main navbar (logo, Browse/Requests links, cart/account icons) must NOT be visible on this page.
Also check: navigate to `/` (or any other page), confirm the main site navbar still renders normally there — this change must not hide the navbar anywhere except `/chat`.

- [ ] **Step 4: Commit**

```bash
git add components/layout/NavbarWrapper.tsx
git commit -m "fix: hide site navbar on /chat so the page's own header shows"
```

---

## Task 2: Widen full-page chat column and redesign empty-state grid

**Files:**
- Modify: `components/chat/ChatWidget.tsx:158` (messages container width)
- Modify: `components/chat/ChatWidget.tsx:231` (input container width)
- Modify: `components/chat/ChatWidget.tsx:353-390` (`FullPageEmptyState` function)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: nothing consumed by later tasks — this is the last task in the plan.

- [ ] **Step 1: Widen the messages container**

In `components/chat/ChatWidget.tsx`, line 158 currently reads:

```tsx
        <div className={fullPage ? 'max-w-2xl mx-auto w-full px-4 py-6' : 'px-4 py-4'}>
```

Change to:

```tsx
        <div className={fullPage ? 'max-w-4xl mx-auto w-full px-4 py-6' : 'px-4 py-4'}>
```

- [ ] **Step 2: Widen the input container**

Line 231 currently reads:

```tsx
        <div className={fullPage ? 'max-w-2xl mx-auto px-4 py-3' : 'px-4 py-3'}>
```

Change to:

```tsx
        <div className={fullPage ? 'max-w-4xl mx-auto px-4 py-3' : 'px-4 py-3'}>
```

- [ ] **Step 3: Redesign `FullPageEmptyState`**

The current function (lines 353-390) is:

```tsx
function FullPageEmptyState({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10 py-8 px-2">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-elevated">
          <Bot size={28} className="text-white" />
        </div>
        <div className="max-w-xs">
          <h2 className="text-xl font-semibold text-text tracking-tight">What are you looking for?</h2>
          <p className="text-sm text-text-muted mt-2 leading-relaxed">
            I can search listings, help you claim free items, or pull up your orders and active listings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {SUGGESTION_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.prompt}
              onClick={() => onSelect(card.prompt)}
              className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-card hover:bg-primary/[0.02] transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/[0.07] flex items-center justify-center group-hover:bg-primary/[0.12] transition-colors">
                <Icon size={17} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text leading-tight">{card.label}</p>
                <p className="text-xs text-text-muted mt-1 leading-snug">{card.sub}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

Replace it with:

```tsx
function FullPageEmptyState({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10 py-8 px-2">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-elevated">
          <Bot size={32} className="text-white" />
        </div>
        <div className="max-w-sm">
          <h2 className="text-2xl font-semibold text-text tracking-tight">What are you looking for?</h2>
          <p className="text-sm text-text-muted mt-2 leading-relaxed">
            I can search listings, help you claim free items, or pull up your orders and active listings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 w-full">
        {SUGGESTION_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.prompt}
              onClick={() => onSelect(card.prompt)}
              className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-card hover:bg-primary/[0.02] transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/[0.07] flex items-center justify-center group-hover:bg-primary/[0.12] transition-colors">
                <Icon size={17} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text leading-tight">{card.label}</p>
                <p className="text-xs text-text-muted mt-1 leading-snug">{card.sub}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

(Changes: hero icon `w-16 h-16` → `w-20 h-20`, icon glyph `size={28}` → `size={32}`, text wrapper `max-w-xs` → `max-w-sm`, heading `text-xl` → `text-2xl`, suggestion grid `grid-cols-2 gap-3 w-full max-w-sm` → `grid-cols-2 gap-3 sm:grid-cols-4 w-full` — 2 columns below the `sm` breakpoint, 4 columns at `sm` and above, filling the now-wider `max-w-4xl` parent container instead of being capped at `max-w-sm`.)

- [ ] **Step 4: Confirm widget mode is untouched**

Read `components/chat/ChatWidget.tsx` and confirm `WidgetEmptyState` (a separate function from `FullPageEmptyState`) and the `!fullPage` branches of the two container `className` expressions from Steps 1-2 were not modified — they must still read `'px-4 py-4'` and `'px-4 py-3'` respectively for the `false` branch.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (ignore the pre-existing unrelated `__tests__/api/users/me.test.ts` failure)

- [ ] **Step 6: Lint**

Run: `npx eslint components/chat/ChatWidget.tsx`
Expected: no new errors (the two pre-existing `@next/next/no-img-element` warnings are expected and unrelated to this change)

- [ ] **Step 7: Manual verification — full page**

Run: `npm run dev`, open `http://localhost:3000/chat` at a desktop viewport width (≥1280px).
Expected:
- The column (messages area and input bar) is visibly wider than before — reads as roughly 896px rather than 672px.
- The empty state shows a larger hero icon/title, and all 4 suggestion cards ("Browse listings", "Free items", "My orders", "My listings") appear in a single row, not a 2×2 grid.
- Clicking a suggestion card still sends that card's prompt (existing `onSelect` behavior unchanged).

- [ ] **Step 8: Manual verification — mobile width and widget mode**

In the same browser session, resize the viewport to a mobile width (e.g. 375px) on `/chat`.
Expected: the suggestion grid collapses back to 2 columns (not 4) and remains usable — no horizontal overflow or squeezed cards.

Then navigate to `/` and open the floating chat bubble (bottom-right button).
Expected: the floating widget's empty state (pill-shaped `SUGGESTED_PROMPTS` buttons, `WidgetEmptyState`) and width are unchanged from before this plan — this confirms the `fullPage={false}` path was not affected.

- [ ] **Step 9: Commit**

```bash
git add components/chat/ChatWidget.tsx
git commit -m "feat: widen /chat full-page layout and redesign empty-state grid"
```
