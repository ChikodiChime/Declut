'use client'

import { Truck, LogOut } from 'lucide-react'
import { useMe, useSignOut } from '@/lib/hooks/useAuth'

export function DispatchHeader() {
  const { data: user } = useMe()
  const { mutate: signOut } = useSignOut('/dispatch/login')
  const firstName = user?.name?.split(' ')[0] || 'Hi'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="declut" className="h-7" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text hidden sm:inline">{greeting}, {firstName}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            <Truck size={10} strokeWidth={2.5} />
            Dispatcher
          </span>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-subtle hover:text-text hover:bg-card transition-colors"
          >
            <LogOut size={13} strokeWidth={2} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
