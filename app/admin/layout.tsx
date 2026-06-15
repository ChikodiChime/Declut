"use client";

import { useEffect, useState } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminSearchModal } from '@/components/admin/AdminSearchModal'
import { NotificationBell, AvatarMenu } from '@/components/dashboard/TopBar'
import { Search } from 'lucide-react'

function AdminTopBar() {
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <header className="hidden lg:flex items-center gap-4 h-14 px-6 lg:px-8 bg-card shrink-0 sticky top-0 z-20">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex-1 max-w-xl flex items-center gap-3 transition-colors"
          style={{
            height: 38,
            paddingLeft: 14,
            paddingRight: 12,
            borderRadius: 10,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <Search size={15} strokeWidth={1.75} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
          <span className="flex-1 text-left" style={{ fontSize: 13.5, color: 'var(--color-text-subtle)' }}>
            Search users, listings, orders…
          </span>
          <kbd
            className="hidden sm:flex items-center gap-0.5 shrink-0"
            style={{
              fontSize: 11,
              color: 'var(--color-text-subtle)',
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              padding: '2px 6px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 12 }}>⌘</span>K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-0.5">
          <NotificationBell />
          <div className="mx-2 h-5 w-px bg-border shrink-0" />
          <AvatarMenu />
        </div>
      </header>

      <AdminSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopBar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 2xl:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
