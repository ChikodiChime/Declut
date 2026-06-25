# Voice-to-Text Chat Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mic button to the chat input that transcribes speech into the textarea using the browser Web Speech API.

**Architecture:** A self-contained `VoiceMicButton` component owns all SpeechRecognition lifecycle logic and exposes a single `onTranscript(text)` callback. ChatWidget renders it between the textarea and the send button, appending the result to its existing `input` state. The component renders `null` on unsupported browsers — no fallback UI needed.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Lucide React, Web Speech API (browser-native)

## Global Constraints

- No new npm dependencies — Web Speech API is browser-native
- Tailwind 4 CSS-first config — add theme tokens in `globals.css` under `@theme inline`, not a JS config
- Path alias `@/` resolves to the project root
- `'use client'` directive required on all interactive components (Next.js App Router)
- Lucide React icons only — no other icon libraries

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `components/chat/VoiceMicButton.tsx` | SpeechRecognition lifecycle, visual states, `onTranscript` callback |
| Modify | `components/chat/ChatWidget.tsx` | Import and render `VoiceMicButton` in the input form row |

---

### Task 1: VoiceMicButton component

**Files:**
- Create: `components/chat/VoiceMicButton.tsx`

**Interfaces:**
- Produces: `VoiceMicButton({ onTranscript: (text: string) => void, disabled?: boolean })`

- [ ] **Step 1: Create the file with the complete implementation**

Create `components/chat/VoiceMicButton.tsx` with this exact content:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function VoiceMicButton({ onTranscript, disabled }: VoiceMicButtonProps) {
  const [supported, setSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: typeof SpeechRecognition | undefined =
      window.SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return
    setSupported(true)

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-NG'

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('')
      onTranscriptRef.current(transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [])

  if (!supported) return null

  function toggle() {
    if (disabled) return
    const r = recognitionRef.current
    if (!r) return
    if (isListening) {
      r.stop()
    } else {
      r.start()
      setIsListening(true)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={isListening ? 'Stop recording' : 'Start voice input'}
      className={`relative p-2.5 rounded-xl transition-all shrink-0 disabled:opacity-40 ${
        isListening
          ? 'text-red-500'
          : 'bg-background border border-border text-text-muted hover:text-text hover:border-border-strong'
      }`}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-xl animate-ping bg-red-400/30" />
      )}
      <Mic size={15} className="relative" />
    </button>
  )
}
```

**Why `onTranscriptRef`:** `onTranscript` is an inline arrow in ChatWidget so it changes reference every render. Storing it in a ref lets the `onresult` handler always call the latest version without recreating the `SpeechRecognition` instance.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors in `components/chat/VoiceMicButton.tsx`. If you see "Property 'SpeechRecognition' does not exist on type 'Window'", the `tsconfig.json` may be missing `"lib": ["dom"]`. Check `tsconfig.json` — it should already include DOM types for a Next.js project. If `webkitSpeechRecognition` still errors, the `(window as any)` cast handles it.

- [ ] **Step 3: Manual smoke test — unsupported browser path**

Open the browser DevTools console and run:

```js
delete window.SpeechRecognition
delete window.webkitSpeechRecognition
```

Then navigate to `/chat`. The mic button should be completely absent from the input row. Refresh to restore normal browser state.

- [ ] **Step 4: Commit**

```bash
git add components/chat/VoiceMicButton.tsx
git commit -m "feat: add VoiceMicButton component with Web Speech API"
```

---

### Task 2: Wire VoiceMicButton into ChatWidget

**Files:**
- Modify: `components/chat/ChatWidget.tsx`

**Interfaces:**
- Consumes: `VoiceMicButton({ onTranscript: (text: string) => void, disabled?: boolean })` from Task 1

- [ ] **Step 1: Add the import**

At the top of `components/chat/ChatWidget.tsx`, the existing import from `'lucide-react'` is on line 5. Add the VoiceMicButton import directly after the ListingCard import (around line 8):

```tsx
import { VoiceMicButton } from './VoiceMicButton'
```

So the top of the file looks like:

```tsx
'use client'

import { useChat } from '@ai-sdk/react'
import { useEffect, useRef, useState } from 'react'
import { Send, X, Maximize2, AlertCircle, Search, Gift, Package, Tag, Bot } from 'lucide-react'
import Link from 'next/link'
import { ListingCard, type ChatListing } from './ListingCard'
import { VoiceMicButton } from './VoiceMicButton'
```

- [ ] **Step 2: Add VoiceMicButton to the input form**

Find the `<form>` element in the `return` of `ChatWidget` (around line 194). It currently looks like:

```tsx
<form onSubmit={handleFormSubmit} className="flex items-end gap-2">
  <textarea
    ref={textareaRef}
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder={fullPage ? 'Ask about listings, free items, your orders…' : 'Ask about listings, orders…'}
    style={{ minHeight: '2.5rem' }}
    className="flex-1 resize-none rounded-xl border border-border bg-background text-text placeholder:text-text-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 max-h-32 overflow-y-auto transition-colors leading-relaxed"
  />
  <button
    type="submit"
    disabled={isLoading || !input.trim()}
    className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary-hover active:scale-95 transition-all shrink-0"
  >
    <Send size={15} />
  </button>
</form>
```

Replace it with:

```tsx
<form onSubmit={handleFormSubmit} className="flex items-end gap-2">
  <textarea
    ref={textareaRef}
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder={fullPage ? 'Ask about listings, free items, your orders…' : 'Ask about listings, orders…'}
    style={{ minHeight: '2.5rem' }}
    className="flex-1 resize-none rounded-xl border border-border bg-background text-text placeholder:text-text-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 max-h-32 overflow-y-auto transition-colors leading-relaxed"
  />
  <VoiceMicButton
    onTranscript={(t) => setInput((prev) => (prev ? prev + ' ' + t : t))}
    disabled={isLoading}
  />
  <button
    type="submit"
    disabled={isLoading || !input.trim()}
    className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary-hover active:scale-95 transition-all shrink-0"
  >
    <Send size={15} />
  </button>
</form>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no new errors.

- [ ] **Step 4: Manual end-to-end test**

Start the dev server (`npm run dev`) and navigate to `http://localhost:3000/chat`.

1. **Idle state** — A mic icon button should appear between the textarea and the send button. It should have a muted border-box style.
2. **Click mic** — Browser asks for microphone permission (first time only). Grant it. Button turns red with a pulsing ring. Speak a short phrase, e.g. "show me free items".
3. **Auto-stop** — After a short pause the recognition ends automatically. The button reverts to its idle style. The spoken phrase appears in the textarea.
4. **Edit before send** — The text is editable. Modify it if needed, then press Enter or click Send to confirm the message sends correctly.
5. **While AI is responding** — Click the mic button. It should be `disabled` and non-interactive (opacity 40%).
6. **Toggle off manually** — Click mic, speak, click mic again before the pause auto-stops. Recording should stop immediately and partial transcript should land in textarea.
7. **Widget mode** — Navigate to the home page and open the floating chat widget. Repeat steps 1–4 to confirm the mic appears there too.

- [ ] **Step 5: Commit**

```bash
git add components/chat/ChatWidget.tsx
git commit -m "feat: wire VoiceMicButton into chat input"
```
