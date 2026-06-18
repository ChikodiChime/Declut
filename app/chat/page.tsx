import type { Metadata } from 'next'
import { ChatWidget } from '@/components/chat/ChatWidget'

export const metadata: Metadata = {
  title: 'Chat with AI',
}

export default function ChatPage() {
  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      <ChatWidget fullPage />
    </div>
  )
}
