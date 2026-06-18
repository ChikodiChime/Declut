'use client'

import { useChat } from '@ai-sdk/react'
import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, X, Maximize2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { ListingCard, type ChatListing } from './ListingCard'

const SUGGESTED_PROMPTS = [
  'Show me free items near me',
  "I'm looking for a laptop under ₦50,000",
  'What orders do I have pending?',
  'Show my active listings',
]

interface ChatWidgetProps {
  fullPage?: boolean
  onClose?: () => void
}

export function ChatWidget({ fullPage = false, onClose }: ChatWidgetProps) {
  const { messages, sendMessage, status, error } = useChat()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function submitMessage() {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    sendMessage({ text })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitMessage()
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitMessage()
  }

  function selectSuggestedPrompt(prompt: string) {
    if (isLoading) return
    sendMessage({ text: prompt })
  }

  const containerClass = fullPage
    ? 'flex flex-col h-full max-w-3xl mx-auto w-full'
    : 'flex flex-col h-full'

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-semibold text-sm">Declutter Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          {!fullPage && (
            <Link
              href="/chat"
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
              title="Open full page"
            >
              <Maximize2 size={15} />
            </Link>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center pt-4">
              Ask me anything about listings, orders, or your account.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => selectSuggestedPrompt(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          if (message.role === 'user') {
            const textContent = getTextFromParts(message.parts)
            return (
              <div key={message.id} className="flex justify-end">
                <div className="bg-primary text-primary-foreground text-sm rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] whitespace-pre-wrap">
                  {textContent}
                </div>
              </div>
            )
          }

          // Assistant message — extract text and tool result listings
          const textContent = getTextFromParts(message.parts)
          const listings = extractListingsFromParts(message.parts)

          return (
            <div key={message.id} className="flex flex-col gap-2">
              {textContent && (
                <div className="bg-muted text-sm rounded-2xl rounded-tl-sm px-4 py-2 max-w-[90%] whitespace-pre-wrap">
                  {textContent}
                </div>
              )}
              {listings.length > 0 && (
                <div
                  className={
                    fullPage
                      ? 'grid grid-cols-2 gap-3'
                      : 'flex gap-3 overflow-x-auto pb-1 scrollbar-none'
                  }
                >
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 size={14} className="animate-spin" />
            <span>Thinking…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-xl px-3 py-2">
            <AlertCircle size={14} />
            <span>Something went wrong. Please try again.</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about listings, orders…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 max-h-32 overflow-y-auto"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

// Extract plain text from UIMessage parts
function getTextFromParts(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')
}

// Extract ChatListing objects from dynamic tool result parts in an assistant message
function extractListingsFromParts(
  parts: Array<{ type: string; state?: string; toolName?: string; output?: unknown }>
): ChatListing[] {
  const listings: ChatListing[] = []

  for (const part of parts) {
    if (part.type !== 'dynamic-tool') continue
    if (part.state !== 'output-available' || !part.output) continue

    const result = part.output as Record<string, unknown>

    if (part.toolName === 'search_listings' && Array.isArray(result.listings)) {
      listings.push(...(result.listings as ChatListing[]))
    }

    if (part.toolName === 'get_listing' && result.listing) {
      listings.push(result.listing as ChatListing)
    }

    if (part.toolName === 'get_my_listings' && Array.isArray(result.listings)) {
      listings.push(...(result.listings as ChatListing[]))
    }
  }

  return listings
}
