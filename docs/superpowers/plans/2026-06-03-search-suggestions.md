# Search Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an autocomplete dropdown to the navbar search bar showing recent searches (localStorage) and live listing suggestions (title + image + type badge) fetched from the API as the user types.

**Architecture:** A new `/api/listings/suggestions` route returns lightweight listing matches. A `useSearchSuggestions` hook encapsulates debouncing + fetch. The `NavbarSearch` component in `NavbarWrapper.tsx` is extracted into its own file and extended with the dropdown UI. Recent searches are stored in `localStorage` as a capped array and managed by a `useRecentSearches` hook.

**Tech Stack:** Next.js App Router API routes, Supabase, React hooks, Tailwind CSS 4, `ListingImage` component (handles Cloudinary + external URLs), lucide-react icons.

---

### Task 1: Suggestions API route

**Files:**
- Create: `app/api/listings/suggestions/route.ts`

- [ ] **Step 1: Create the route file**

```ts
// app/api/listings/suggestions/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'

export type Suggestion = {
  id: string
  title: string
  listing_type: 'for_sale' | 'free' | 'donate'
  images: string[]
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) return ok([])

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, listing_type, images')
    .eq('status', 'available')
    .ilike('title', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) {
    console.error('Suggestions error:', error)
    return err('Failed to fetch suggestions', 'SERVER_ERROR', 500)
  }

  return ok(data ?? [])
}
```

- [ ] **Step 2: Smoke-test the route**

Start the dev server (`npm run dev`) and open:
```
http://localhost:3000/api/listings/suggestions?q=iphone
```
Expected: `{ "data": [ { "id": "...", "title": "iPhone ...", "listing_type": "for_sale", "images": [...] }, ... ] }`

If `data` is an empty array, try a word that matches one of your seeded listing titles.

- [ ] **Step 3: Commit**

```bash
git add app/api/listings/suggestions/route.ts
git commit -m "feat: add /api/listings/suggestions endpoint"
```

---

### Task 2: `useRecentSearches` hook

**Files:**
- Create: `lib/hooks/useRecentSearches.ts`

- [ ] **Step 1: Create the hook**

```ts
// lib/hooks/useRecentSearches.ts
import { useState, useCallback } from 'react'

const KEY = 'declut:recent-searches'
const MAX = 5

function load(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(items: string[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>(load)

  const add = useCallback((query: string) => {
    const q = query.trim()
    if (!q) return
    setRecents((prev) => {
      const next = [q, ...prev.filter((r) => r !== q)].slice(0, MAX)
      save(next)
      return next
    })
  }, [])

  const remove = useCallback((query: string) => {
    setRecents((prev) => {
      const next = prev.filter((r) => r !== query)
      save(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    save([])
    setRecents([])
  }, [])

  return { recents, add, remove, clear }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/useRecentSearches.ts
git commit -m "feat: useRecentSearches hook with localStorage persistence"
```

---

### Task 3: `useSearchSuggestions` hook

**Files:**
- Create: `lib/hooks/useSearchSuggestions.ts`

- [ ] **Step 1: Create the hook**

```ts
// lib/hooks/useSearchSuggestions.ts
import { useState, useEffect, useRef } from 'react'
import type { Suggestion } from '@/app/api/listings/suggestions/route'

export function useSearchSuggestions(query: string, enabled: boolean) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const q = query.trim()
    if (!enabled || q.length < 2) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/listings/suggestions?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const body = await res.json()
          setSuggestions(body.data ?? [])
        }
      } catch {
        // network error — fail silently, suggestions are non-critical
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, enabled])

  return { suggestions, loading }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/useSearchSuggestions.ts
git commit -m "feat: useSearchSuggestions hook with 300ms debounce"
```

---

### Task 4: Extract `NavbarSearch` into its own file and add the suggestions dropdown

**Files:**
- Create: `components/layout/NavbarSearch.tsx`
- Modify: `components/layout/NavbarWrapper.tsx` (remove inline `NavbarSearch`, import from new file)

The `NavbarSearch` component currently lives inline in `NavbarWrapper.tsx` (lines ~213–306). Extract it, extend it with the dropdown, then replace the inline version with an import.

- [ ] **Step 1: Create `components/layout/NavbarSearch.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, ArrowUpLeft } from "lucide-react";
import { ListingImage } from "@/components/ui";
import { useRecentSearches } from "@/lib/hooks/useRecentSearches";
import { useSearchSuggestions } from "@/lib/hooks/useSearchSuggestions";
import type { Suggestion } from "@/app/api/listings/suggestions/route";

const TYPE_LABEL: Record<string, { text: string; color: string }> = {
  for_sale: { text: "For Sale", color: "#4f46e5" },
  free:     { text: "Free",     color: "#10b981" },
  donate:   { text: "Donate",   color: "#f59e0b" },
};

export function NavbarSearch({
  onSearch,
  autoFocus,
}: {
  onSearch?: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const { recents, add: addRecent, remove: removeRecent } = useRecentSearches();
  const { suggestions } = useSearchSuggestions(value, open);

  const showRecents = recents.length > 0 && value.trim().length < 2;
  const showSuggestions = suggestions.length > 0 && value.trim().length >= 2;
  const hasDropdown = open && (showRecents || showSuggestions);

  // All navigable items flattened for keyboard nav
  const allItems: Array<{ kind: "recent"; text: string } | { kind: "suggestion"; item: Suggestion }> =
    showRecents
      ? recents.map((text) => ({ kind: "recent" as const, text }))
      : showSuggestions
      ? suggestions.map((item) => ({ kind: "suggestion" as const, item }))
      : [];

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Reset active index when items change
  useEffect(() => {
    setActiveIdx(-1);
  }, [value, open]);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function navigate(q: string) {
    addRecent(q);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setValue("");
    setOpen(false);
    onSearch?.();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIdx >= 0 && allItems[activeIdx]) {
      const item = allItems[activeIdx];
      navigate(item.kind === "recent" ? item.text : item.item.title);
      return;
    }
    const q = value.trim();
    if (q) navigate(q);
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!hasDropdown) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, -1));
      } else if (e.key === "Escape") {
        setOpen(false);
        setActiveIdx(-1);
      }
    },
    [hasDropdown, allItems.length]
  );

  return (
    <div ref={containerRef} className="relative w-full" style={{ maxWidth: 440 }}>
      <form
        onSubmit={handleSubmit}
        className="flex items-stretch w-full overflow-hidden"
        style={{
          borderRadius: hasDropdown ? "10px 10px 0 0" : "10px",
          border: "1.5px solid #c7d2fe",
          borderBottom: hasDropdown ? "1.5px solid #e0e7ff" : "1.5px solid #c7d2fe",
          background: "#eef2ff",
          transition: "border-radius 150ms, border-color 180ms, box-shadow 180ms",
          boxShadow: open ? "0 0 0 3px rgba(79,70,229,0.12)" : "none",
          borderColor: open ? "#4f46e5" : "#c7d2fe",
        }}
      >
        <div className="relative flex-1 flex items-center" style={{ minWidth: 0 }}>
          <Search
            size={14}
            strokeWidth={2}
            className="absolute left-3.5 pointer-events-none shrink-0"
            style={{ color: "#6366f1" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search listings…"
            autoComplete="off"
            className="w-full h-10 pl-9 pr-3 text-[13.5px] bg-transparent focus:outline-none"
            style={{ color: "#16130f" }}
          />
          {value && (
            <button
              type="button"
              onClick={() => { setValue(""); inputRef.current?.focus(); }}
              className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full shrink-0"
              style={{ color: "#6366f1" }}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="h-10 w-10 flex shrink-0 items-center justify-center transition-all duration-150"
          style={{ background: "#4f46e5", color: "#ffffff" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#4338ca"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#4f46e5"; }}
        >
          <Search size={14} strokeWidth={2.5} />
        </button>
      </form>

      {/* Dropdown */}
      {hasDropdown && (
        <div
          className="absolute left-0 right-0 z-50 overflow-hidden"
          style={{
            background: "#ffffff",
            border: "1.5px solid #4f46e5",
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            boxShadow: "0 8px 24px -4px rgba(79,70,229,0.15), 0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          {showRecents && (
            <>
              <div
                className="flex items-center justify-between px-3.5 pt-2.5 pb-1"
              >
                <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "#a8a09a" }}>
                  Recent
                </span>
                <button
                  onClick={() => removeRecent}
                  className="text-[11px] transition-colors"
                  style={{ color: "#a8a09a" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#4f46e5"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#a8a09a"; }}
                >
                  Clear all
                </button>
              </div>
              {recents.map((text, i) => (
                <RecentRow
                  key={text}
                  text={text}
                  active={activeIdx === i}
                  onSelect={() => navigate(text)}
                  onRemove={(e) => { e.stopPropagation(); removeRecent(text); }}
                />
              ))}
            </>
          )}

          {showSuggestions && (
            <>
              <div className="px-3.5 pt-2.5 pb-1">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: "#a8a09a" }}>
                  Suggestions
                </span>
              </div>
              {suggestions.map((item, i) => (
                <SuggestionRow
                  key={item.id}
                  item={item}
                  active={activeIdx === i}
                  onSelect={() => navigate(item.title)}
                />
              ))}
            </>
          )}
          <div className="h-1.5" />
        </div>
      )}
    </div>
  );
}

function RecentRow({
  text,
  active,
  onSelect,
  onRemove,
}: {
  text: string;
  active: boolean;
  onSelect: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full flex items-center gap-3 px-3.5 py-2 text-left transition-colors duration-100"
      style={{ background: active ? "#f5f3ff" : "transparent" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f5f3ff"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = active ? "#f5f3ff" : "transparent"; }}
    >
      <Clock size={13} strokeWidth={1.8} style={{ color: "#a8a09a", flexShrink: 0 }} />
      <span className="flex-1 truncate text-[13px]" style={{ color: "#16130f" }}>{text}</span>
      <span
        onClick={onRemove}
        className="flex items-center justify-center w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ color: "#a8a09a" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#4f46e5"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#a8a09a"; }}
        role="button"
        aria-label={`Remove ${text}`}
      >
        <X size={11} strokeWidth={2.5} />
      </span>
      <ArrowUpLeft size={13} strokeWidth={1.8} style={{ color: "#c7d2fe", flexShrink: 0 }} />
    </button>
  );
}

function SuggestionRow({
  item,
  active,
  onSelect,
}: {
  item: Suggestion;
  active: boolean;
  onSelect: () => void;
}) {
  const typeConfig = TYPE_LABEL[item.listing_type] ?? TYPE_LABEL.for_sale;
  const thumb = item.images[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3.5 py-2 text-left transition-colors duration-100"
      style={{ background: active ? "#f5f3ff" : "transparent" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f5f3ff"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = active ? "#f5f3ff" : "transparent"; }}
    >
      {/* Thumbnail */}
      <div
        className="relative shrink-0 rounded-lg overflow-hidden"
        style={{ width: 36, height: 36, background: "#f0ece4" }}
      >
        {thumb ? (
          <ListingImage
            src={thumb}
            fill
            sizes="36px"
            className="object-cover"
            alt={item.title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Search size={14} strokeWidth={1.5} style={{ color: "#c0b9b2" }} />
          </div>
        )}
      </div>

      {/* Title */}
      <span className="flex-1 truncate text-[13px] font-medium" style={{ color: "#16130f" }}>
        {item.title}
      </span>

      {/* Type badge */}
      <span
        className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: `${typeConfig.color}18`, color: typeConfig.color }}
      >
        {typeConfig.text}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Fix the "Clear all" button — it's missing the `clear` function**

The `useRecentSearches` hook exports `clear`. Import it and wire it up. Replace the `onClick` on the Clear all button:

```tsx
// At the top of NavbarSearch function body, destructure clear:
const { recents, add: addRecent, remove: removeRecent, clear: clearRecents } = useRecentSearches();

// Then update the Clear all button's onClick:
<button onClick={clearRecents} ...>
  Clear all
</button>
```

- [ ] **Step 3: Remove the inline `NavbarSearch` from `NavbarWrapper.tsx` and import the new one**

In `components/layout/NavbarWrapper.tsx`:

1. Remove the entire `function NavbarSearch(...)` block (lines ~213–306).
2. Add this import at the top:
```tsx
import { NavbarSearch } from "@/components/layout/NavbarSearch";
```

The two usages of `<NavbarSearch ... />` in the file stay unchanged.

- [ ] **Step 4: Verify the app renders**

```bash
npm run dev
```

Open `http://localhost:3000`. Scroll down so the navbar search bar appears. Click into it — the dropdown should open. Type 2+ characters — suggestions should appear after 300ms.

- [ ] **Step 5: Commit**

```bash
git add components/layout/NavbarSearch.tsx components/layout/NavbarWrapper.tsx lib/hooks/useRecentSearches.ts lib/hooks/useSearchSuggestions.ts
git commit -m "feat: search suggestions dropdown with recent searches and live listing results"
```

---

### Task 5: Mobile search panel wiring

The mobile search panel in `NavbarWrapper.tsx` also renders `<NavbarSearch>`. Because it's already using the same component (imported in Task 4 Step 3), the dropdown works there automatically. This task just verifies it.

- [ ] **Step 1: Test on mobile viewport**

In Chrome DevTools, set viewport to 390×844 (iPhone 14). Tap the search icon in the navbar. The panel slides down. Tap the input — the suggestions dropdown should appear inside the panel.

Confirm the dropdown doesn't overflow outside the panel (it has `overflow-hidden` on the panel wrapper — if it clips, remove `overflow-hidden` from the mobile panel wrapper div in `NavbarWrapper.tsx`):

```tsx
// Find this in NavbarWrapper.tsx (~line 622):
className="md:hidden sticky top-[76px] z-40 w-full overflow-hidden"
// Change to:
className="md:hidden sticky top-[76px] z-40 w-full"
```

- [ ] **Step 2: Commit if changed**

```bash
git add components/layout/NavbarWrapper.tsx
git commit -m "fix: allow search suggestions dropdown to overflow mobile search panel"
```
