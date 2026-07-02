'use client'

import { useChat } from '@ai-sdk/react'
import { useEffect, useRef, useState } from 'react'
import { Send, X, Maximize2, AlertCircle, Search, Gift, Package, Tag, Bot } from 'lucide-react'
import Link from 'next/link'
import { ListingCard, type ChatListing } from './ListingCard'
import { VoiceMicButton } from './VoiceMicButton'
import { ImageAttachButton } from './ImageAttachButton'
import { compressImageToDataUrl } from '@/lib/image-compress'

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>

const SUGGESTED_PROMPTS = [
  'Show me free items near me',
  "Looking for a laptop under ₦50,000",
  'What orders do I have pending?',
  'Show my active listings',
]

const SUGGESTION_CARDS: Array<{
  icon: LucideIcon
  label: string
  sub: string
  prompt: string
}> = [
  {
    icon: Search,
    label: 'Browse listings',
    sub: 'Search by keyword, price, or area',
    prompt: 'Show me available listings',
  },
  {
    icon: Gift,
    label: 'Free items',
    sub: 'Claim something at no cost',
    prompt: 'Show me free items near me',
  },
  {
    icon: Package,
    label: 'My orders',
    sub: 'Track your purchases',
    prompt: 'What orders do I have pending?',
  },
  {
    icon: Tag,
    label: 'My listings',
    sub: 'See what you have active',
    prompt: 'Show my active listings',
  },
]

interface ChatWidgetProps {
  fullPage?: boolean
  onClose?: () => void
}

export function ChatWidget({ fullPage = false, onClose }: ChatWidgetProps) {
  const { messages, sendMessage, status, error } = useChat()
  const [input, setInput] = useState('')
  const [attachedImage, setAttachedImage] = useState<{ dataUrl: string; mediaType: string } | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [input])

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

  return (
    <div className="flex flex-col h-full">
      {/* Header — widget mode only */}
      {!fullPage && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Bot size={13} className="text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border-2 border-card" />
            </div>
            <span className="font-semibold text-sm text-text">Declutter AI</span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/chat"
              className="p-1.5 rounded-lg hover:bg-background text-text-muted hover:text-text transition-colors"
              title="Open full page"
            >
              <Maximize2 size={15} />
            </Link>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-background text-text-muted hover:text-text transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-background" data-lenis-prevent>
        <div className={fullPage ? 'max-w-2xl mx-auto w-full px-4 py-6' : 'px-4 py-4'}>
          {messages.length === 0 && fullPage ? (
            <FullPageEmptyState onSelect={selectSuggestedPrompt} />
          ) : messages.length === 0 ? (
            <WidgetEmptyState onSelect={selectSuggestedPrompt} />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
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

                const textContent = getTextFromParts(message.parts)
                const listings = extractListingsFromParts(message.parts)

                return (
                  <div key={message.id} className="flex gap-2.5 items-start">
                    <AssistantAvatar />
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      {textContent && (
                        <div className="bg-card text-text text-xs rounded-2xl rounded-tl-sm px-3 py-2 whitespace-pre-wrap leading-relaxed border border-border shadow-sm">
                          {textContent}
                        </div>
                      )}
                      {listings.length > 0 && <ListingSlider listings={listings} />}
                    </div>
                  </div>
                )
              })}

              {isLoading && (
                <div className="flex gap-2.5 items-start">
                  <AssistantAvatar />
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-error text-sm bg-error-bg rounded-xl px-3 py-2">
                  <AlertCircle size={14} />
                  <span>Something went wrong. Please try again.</span>
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

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
    </div>
  )
}

function AssistantAvatar() {
  return (
    <div className="shrink-0 mt-0.5 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
      <Bot size={11} className="text-primary" />
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary"
          style={{
            animation: 'dot-bounce 1.1s ease-in-out infinite',
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
  )
}

function ListingSlider({ listings }: { listings: ChatListing[] }) {
  return (
    <div className="overflow-x-auto no-scrollbar snap-x snap-mandatory">
      <div className="flex gap-2 pb-0.5">
        {listings.map((listing) => (
          <div key={listing.id} className="shrink-0 snap-start w-[280px]">
            <ListingCard listing={listing} />
          </div>
        ))}
      </div>
    </div>
  )
}

function WidgetEmptyState({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-5 pt-4 pb-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
          <Bot size={18} className="text-white" />
        </div>
        <p className="text-sm text-text-muted max-w-[200px] leading-relaxed">
          Ask me anything about listings, orders, or your account.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-text-muted hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

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

function getTextFromParts(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')
}

function getImageFromParts(parts: Array<{ type: string; url?: string }>): string | null {
  const filePart = parts.find((p) => p.type === 'file' && typeof p.url === 'string')
  return filePart ? (filePart.url as string) : null
}

function extractListingsFromParts(
  parts: Array<{ type: string; state?: string; output?: unknown }>
): ChatListing[] {
  const listings: ChatListing[] = []

  for (const part of parts) {
    if (part.state !== 'output-available' || !part.output) continue
    const result = part.output as Record<string, unknown>

    if (part.type === 'tool-search_listings' && Array.isArray(result.listings)) {
      listings.push(...(result.listings as ChatListing[]))
    } else if (part.type === 'tool-get_listing' && result.listing) {
      listings.push(result.listing as ChatListing)
    } else if (part.type === 'tool-get_my_listings' && Array.isArray(result.listings)) {
      listings.push(...(result.listings as ChatListing[]))
    }
  }

  return listings
}
