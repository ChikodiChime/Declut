// app/api/chat/utils.ts
import type { UIMessage } from 'ai'

/**
 * Photo attachments are meant to be ephemeral (single request only — see
 * docs/superpowers/specs/2026-07-02-chat-image-search-design.md): used once to infer
 * search terms, not resent on every later turn. `useChat` keeps every past message
 * (including its base64 `file` part, ~5MB per image) in memory, so without this we'd
 * re-transmit and re-process stale images to Gemini on every subsequent turn.
 *
 * Keeps `file` parts only on the most recent message that has any; strips `file`
 * parts from every earlier message while leaving their other parts (e.g. `text`)
 * untouched.
 */
export function stripStaleImageParts(messages: UIMessage[]): UIMessage[] {
  const lastImageIndex = messages.findLastIndex((message) =>
    message.parts.some((part) => part.type === 'file')
  )

  if (lastImageIndex === -1) return messages

  return messages.map((message, index) => {
    if (index >= lastImageIndex) return message
    return {
      ...message,
      parts: message.parts.filter((part) => part.type !== 'file'),
    }
  })
}
