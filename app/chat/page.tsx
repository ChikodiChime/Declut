import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Bot } from 'lucide-react'
import { ChatWidget } from '@/components/chat/ChatWidget'

export const metadata: Metadata = {
  title: 'AI Assistant — Unstash',
  description: 'Browse listings, claim free items, and manage your account through chat.',
}

export default function ChatPage() {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <header className="relative shrink-0 flex items-center justify-center h-14 border-b border-border bg-card/90 backdrop-blur-sm">
        <Link
          href="/"
          className="absolute left-4 flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Bot size={14} className="text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border-2 border-card" />
          </div>
          <span className="font-semibold text-sm text-text tracking-tight">Unstash AI</span>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ChatWidget fullPage />
      </div>
    </div>
  )
}
