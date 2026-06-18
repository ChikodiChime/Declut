'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { ChatWidget } from './ChatWidget'

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Slide-up panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] h-[480px] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden">
          <ChatWidget onClose={() => setIsOpen(false)} />
        </div>
      )}

      {/* Floating bubble button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  )
}
