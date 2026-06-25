# Voice-to-Text for Chat Widget

**Date:** 2026-06-25
**Status:** Approved

## Overview

Add a microphone button to the chat input area that lets users dictate their message using the browser's Web Speech API. The transcribed text lands in the textarea so the user can review and edit before sending.

## Scope

- New component: `components/chat/VoiceMicButton.tsx`
- Modify: `components/chat/ChatWidget.tsx`

No backend changes. No new dependencies.

## Component: VoiceMicButton

**File:** `components/chat/VoiceMicButton.tsx`

### Props

```ts
interface VoiceMicButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}
```

### Behavior

- On mount, check for `window.SpeechRecognition || window.webkitSpeechRecognition`. If absent, render `null` — no error UI, silent degradation on Firefox/Safari.
- **Toggle interaction:** click to start recording; click again to stop. Also auto-stops after a natural pause (via `continuous: false`).
- SpeechRecognition config:
  - `continuous: false` — stops automatically after silence
  - `interimResults: false` — only final transcript is used
  - `lang: 'en-NG'` — Nigerian English
- On `onresult`: extract the final transcript string and call `onTranscript(text)`.
- On `onend`: set `isListening` to false.
- On `onerror`: set `isListening` to false silently (no toast, no banner).

### Visual States

| State | Appearance |
|---|---|
| Idle | Mic icon, same muted style as surrounding UI |
| Listening | Mic icon, red tint, pulsing ring animation |
| Unsupported | Renders nothing (`null`) |

### Size

~60 lines.

## ChatWidget Changes

In `components/chat/ChatWidget.tsx`, inside the input form row:

1. Import `VoiceMicButton` and `Mic` from lucide-react.
2. Render `<VoiceMicButton>` between the textarea and the send button.
3. Callback appends transcript to existing input with a space separator:

```ts
onTranscript={(t) => setInput(prev => prev ? prev + ' ' + t : t)}
```

4. Pass `disabled={isLoading}` so mic is inactive while AI is responding.

## Error Handling

- Browser unsupported → render nothing.
- `onerror` (mic denied, network issue, no speech detected) → silently reset to idle. No user-visible error for now; the textarea remains unchanged.

## Out of Scope

- Auto-send after transcription
- Interim/live preview in the textarea while speaking
- Whisper/cloud transcription fallback
- Persistent mic permission prompts or user education UI
