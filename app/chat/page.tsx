import type { Metadata } from 'next'
import { ChatWidget } from '@/components/chat/ChatWidget'

export const metadata: Metadata = {
  title: 'Chat with AI',
}

export default function ChatPage() {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
      <ChatWidget fullPage />
    </div>
  )
}
