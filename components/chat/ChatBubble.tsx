'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatWidget } from './ChatWidget'

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  if (pathname.startsWith('/dispatch')) return null

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated bottom-20 left-2 right-2 h-[calc(100dvh-90px)] max-h-[480px] sm:left-auto sm:right-4 sm:w-[380px] sm:h-[520px] sm:max-h-[520px]"
          >
            <ChatWidget onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-primary text-white shadow-elevated flex items-center justify-center hover:bg-primary-hover active:scale-95 transition-all"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={20} />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle size={20} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </>
  )
}
