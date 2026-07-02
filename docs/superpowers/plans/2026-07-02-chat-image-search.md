# Search Listings by Photo in Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users attach a photo in the chat widget instead of typing text, so Declutter Assistant can find visually similar listings using Gemini vision + the existing keyword search tool.

**Architecture:** No new API route, no new tool, no image storage. The photo is compressed client-side, sent as an ephemeral base64 `FileUIPart` through the existing `useChat().sendMessage`, and `convertToModelMessages` (already used in `app/api/chat/route.ts`) passes it to Gemini as multimodal input. A new system-prompt instruction tells Gemini to infer search terms from the image and call the existing `search_listings` tool.

**Tech Stack:** Next.js 16 / React 19, `ai` v6 (`FileUIPart`, `convertToModelMessages`), `@ai-sdk/react` v3 (`useChat`), `@ai-sdk/google` (`gemini-2.5-flash`), Tailwind 4, vitest.

## Global Constraints

- No embedding/vector search, no pgvector, no new DB columns — matching stays keyword-based via `search_listings`. (Spec: Non-goals)
- Searched photos are never uploaded to Cloudinary or persisted anywhere — base64 only, for the single request. (Spec: Non-goals)
- One photo per message for v1. No combined voice+image input. (Spec: Non-goals)
- This codebase has no component-testing harness (`vitest.config.ts` runs `environment: 'node'`, no jsdom/@testing-library/react installed, no existing `*.test.tsx` files). Do not add one for this feature — follow the existing precedent set by `VoiceMicButton` (`docs/superpowers/specs/2026-06-25-voice-to-text-design.md`), which shipped with manual browser verification only. Pure, DOM-free logic gets real vitest unit tests; DOM-dependent code gets a manual verification step.

---

## Task 1: Image compression utility

**Files:**
- Create: `lib/image-compress.ts`
- Test: `__tests__/lib/image-compress.test.ts`

**Interfaces:**
- Produces: `computeScaledDimensions(width: number, height: number, maxEdge?: number): { width: number; height: number }` — pure, unit-tested.
- Produces: `estimateDataUrlBytes(dataUrl: string): number` — pure, unit-tested.
- Produces: `compressImageToDataUrl(file: File): Promise<{ dataUrl: string; mediaType: string }>` — DOM-dependent (canvas/Image), consumed by Task 3. Throws `Error` if the file can't be decoded or is still over 4MB after compression.

- [ ] **Step 1: Write the failing tests for the pure functions**

Create `__tests__/lib/image-compress.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeScaledDimensions, estimateDataUrlBytes } from '@/lib/image-compress'

describe('computeScaledDimensions', () => {
  it('returns the original size when already within maxEdge', () => {
    expect(computeScaledDimensions(800, 600, 1024)).toEqual({ width: 800, height: 600 })
  })

  it('scales down proportionally when width exceeds maxEdge', () => {
    expect(computeScaledDimensions(2048, 1024, 1024)).toEqual({ width: 1024, height: 512 })
  })

  it('scales down proportionally when height exceeds maxEdge', () => {
    expect(computeScaledDimensions(1024, 2048, 1024)).toEqual({ width: 512, height: 1024 })
  })
})

describe('estimateDataUrlBytes', () => {
  it('estimates byte size from the base64 payload length', () => {
    const dataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(100)
    expect(estimateDataUrlBytes(dataUrl)).toBe(75)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/image-compress.test.ts`
Expected: FAIL with "Failed to resolve import '@/lib/image-compress'" (module doesn't exist yet)

- [ ] **Step 3: Implement `lib/image-compress.ts`**

```ts
export interface ScaledDimensions {
  width: number
  height: number
}

const MAX_EDGE = 1024
const JPEG_QUALITY = 0.8
const MAX_DATA_URL_BYTES = 4 * 1024 * 1024

export function computeScaledDimensions(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE
): ScaledDimensions {
  if (width <= maxEdge && height <= maxEdge) return { width, height }
  const scale = maxEdge / Math.max(width, height)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.ceil((base64.length * 3) / 4)
}

export async function compressImageToDataUrl(file: File): Promise<{ dataUrl: string; mediaType: string }> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = objectUrl
    })

    const { width, height } = computeScaledDimensions(image.naturalWidth, image.naturalHeight)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(image, 0, 0, width, height)

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    if (estimateDataUrlBytes(dataUrl) > MAX_DATA_URL_BYTES) {
      throw new Error('Image is too large even after compression')
    }

    return { dataUrl, mediaType: 'image/jpeg' }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/image-compress.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/image-compress.ts __tests__/lib/image-compress.test.ts
git commit -m "feat: add image compression utility for chat photo search"
```

---

## Task 2: ImageAttachButton component

**Files:**
- Create: `components/chat/ImageAttachButton.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ImageAttachButton({ onSelect: (file: File) => void, disabled?: boolean })` — consumed by Task 3. Renders a hidden `<input type="file" accept="image/*" capture="environment">` behind a button matching `VoiceMicButton`'s visual style (`components/chat/VoiceMicButton.tsx:103-120`); calls `onSelect(file)` when a file is picked and resets the input value so the same file can be re-selected later.

- [ ] **Step 1: Implement `components/chat/ImageAttachButton.tsx`**

```tsx
'use client'

import { useRef } from 'react'
import { ImagePlus } from 'lucide-react'

interface ImageAttachButtonProps {
  onSelect: (file: File) => void
  disabled?: boolean
}

export function ImageAttachButton({ onSelect, disabled }: ImageAttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onSelect(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label="Attach a photo"
        className="p-2.5 rounded-xl bg-background border border-border text-text-muted hover:text-text hover:border-border-strong transition-all shrink-0 disabled:opacity-40"
      >
        <ImagePlus size={15} />
      </button>
    </>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors involving `ImageAttachButton.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/chat/ImageAttachButton.tsx
git commit -m "feat: add ImageAttachButton for chat photo search"
```

---

## Task 3: Wire photo attach/preview/send into ChatWidget

**Files:**
- Modify: `components/chat/ChatWidget.tsx`

**Interfaces:**
- Consumes: `compressImageToDataUrl` from `lib/image-compress.ts` (Task 1), `ImageAttachButton` from `components/chat/ImageAttachButton.tsx` (Task 2).
- Produces: nothing new consumed by later tasks — this is the last code task.

- [ ] **Step 1: Add imports and attached-image state**

In `components/chat/ChatWidget.tsx`, replace the import block (lines 1-8) and the top of the component (lines 56-62):

```tsx
'use client'

import { useChat } from '@ai-sdk/react'
import { useEffect, useRef, useState } from 'react'
import { Send, X, Maximize2, AlertCircle, Search, Gift, Package, Tag, Bot } from 'lucide-react'
import Link from 'next/link'
import { ListingCard, type ChatListing } from './ListingCard'
import { VoiceMicButton } from './VoiceMicButton'
import { ImageAttachButton } from './ImageAttachButton'
import { compressImageToDataUrl } from '@/lib/image-compress'
```

```tsx
export function ChatWidget({ fullPage = false, onClose }: ChatWidgetProps) {
  const { messages, sendMessage, status, error } = useChat()
  const [input, setInput] = useState('')
  const [attachedImage, setAttachedImage] = useState<{ dataUrl: string; mediaType: string } | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isLoading = status === 'streaming' || status === 'submitted'
```

- [ ] **Step 2: Add image select/remove handlers and update `submitMessage`**

Replace the existing `submitMessage` function (original lines 75-80):

```tsx
  async function handleImageSelect(file: File) {
    setImageError(null)
    try {
      const { dataUrl, mediaType } = await compressImageToDataUrl(file)
      setAttachedImage({ dataUrl, mediaType })
    } catch {
      setImageError('Could not attach that photo — try a different one.')
    }
  }

  function removeAttachedImage() {
    setAttachedImage(null)
  }

  function submitMessage() {
    const text = input.trim()
    if ((!text && !attachedImage) || isLoading) return
    setInput('')
    const image = attachedImage
    setAttachedImage(null)
    sendMessage({
      text,
      files: image ? [{ type: 'file', mediaType: image.mediaType, url: image.dataUrl }] : undefined,
    })
  }
```

- [ ] **Step 3: Render the sent image in the user's chat bubble**

Replace the user-message branch inside the `messages.map` block (original lines 141-149):

```tsx
                if (message.role === 'user') {
                  const textContent = getTextFromParts(message.parts)
                  const imageUrl = getImageFromParts(message.parts)
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="flex flex-col items-end gap-1.5 max-w-[80%]">
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt="Searched photo"
                            className="w-32 h-32 object-cover rounded-2xl rounded-tr-sm border border-border"
                          />
                        )}
                        {textContent && (
                          <div className="bg-primary text-white text-xs rounded-2xl rounded-tr-sm px-3 py-2 whitespace-pre-wrap leading-relaxed">
                            {textContent}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
```

- [ ] **Step 4: Add the attach button, preview chip, and error message to the input row**

Replace the input form block (original lines 192-224):

```tsx
      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card">
        <div className={fullPage ? 'max-w-2xl mx-auto px-4 py-3' : 'px-4 py-3'}>
          {attachedImage && (
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <img
                  src={attachedImage.dataUrl}
                  alt="Attached preview"
                  className="w-14 h-14 object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={removeAttachedImage}
                  aria-label="Remove photo"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-text text-white flex items-center justify-center hover:bg-error transition-colors"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
              <span className="text-xs text-text-muted">Photo attached — add a note or just send</span>
            </div>
          )}
          {imageError && <p className="text-xs text-error mb-2">{imageError}</p>}
          <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={fullPage ? 'Ask about listings, free items, your orders…' : 'Ask about listings, orders…'}
              style={{ minHeight: '2.5rem' }}
              className="flex-1 resize-none rounded-xl border border-border bg-background text-text placeholder:text-text-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 max-h-32 overflow-y-auto transition-colors leading-relaxed"
            />
            <ImageAttachButton onSelect={handleImageSelect} disabled={isLoading} />
            <VoiceMicButton
              onTranscript={(t) => setInput((prev) => (prev ? prev + ' ' + t : t))}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachedImage)}
              className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary-hover active:scale-95 transition-all shrink-0"
            >
              <Send size={15} />
            </button>
          </form>
          {fullPage && (
            <p className="text-[10px] text-text-subtle mt-1.5 text-center">
              Enter to send · Shift+Enter for new line
            </p>
          )}
        </div>
      </div>
```

- [ ] **Step 5: Add the `getImageFromParts` helper**

Add next to `getTextFromParts` (original lines 333-338):

```tsx
function getImageFromParts(parts: Array<{ type: string; url?: string }>): string | null {
  const filePart = parts.find((p) => p.type === 'file' && typeof p.url === 'string')
  return filePart ? (filePart.url as string) : null
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors involving `ChatWidget.tsx` (the pre-existing unrelated error in `__tests__/api/users/me.test.ts` is fine)

- [ ] **Step 7: Lint**

Run: `npx eslint components/chat/ChatWidget.tsx`
Expected: no errors

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open `/chat` (or the floating widget).
- Click the new attach button (image icon between the textarea and the mic button) → file picker opens.
- Pick a photo → a 56px thumbnail with a ✕ appears above the input; the send button becomes enabled even with no typed text.
- Click ✕ → thumbnail disappears, send button disables again if the textarea is also empty.
- Pick a photo and click send → your own chat bubble shows the photo thumbnail (and any typed caption below it); the input clears.
Expected: all four behaviors match; no console errors.

- [ ] **Step 9: Commit**

```bash
git add components/chat/ChatWidget.tsx
git commit -m "feat: let users attach a photo to search listings in chat"
```

---

## Task 4: Teach the assistant to search from images

**Files:**
- Modify: `app/api/chat/route.ts`

**Interfaces:**
- Consumes: nothing new — `convertToModelMessages` already forwards file parts to Gemini generically; no code change needed there.
- Produces: nothing consumed by later tasks — this is the last task in the plan.

- [ ] **Step 1: Add an "Image search" section to `buildSystemPrompt`**

In `app/api/chat/route.ts`, insert a new section after the `## Rules` block and before `## Formatting` (between original lines 36 and 38):

```ts
## Image search
- If the user's message includes a photo, look at it and infer what kind of item it shows (category, type, color, brand if visible).
- Call search_listings using what you infer as \`q\` and/or \`category\`. Combine your inference with any text the user typed alongside the photo.
- If the photo is unclear or you can't confidently tell what it is, ask a short clarifying question instead of guessing.

## Formatting
```

(This replaces the standalone `## Formatting` line at original line 38 with the two sections in sequence — the rest of the `## Formatting` block underneath is unchanged.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `/chat`.
- Attach a photo of a real item category that exists in your seed/test listings (e.g. a shoe, a laptop) with no caption, and send.
- Expected: the assistant's reply references the item type it inferred, and if matching listings exist, a `ListingSlider` of results renders.
- Attach a photo of something ambiguous (e.g. a blank wall) and send.
- Expected: the assistant asks a clarifying question instead of returning unrelated results.

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: teach chat assistant to search listings from an attached photo"
```
