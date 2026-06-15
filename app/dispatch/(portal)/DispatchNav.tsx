'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Truck, BarChart2, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dispatch', label: 'Deliveries', icon: Truck },
  { href: '/dispatch/stats', label: 'Earnings', icon: BarChart2 },
  { href: '/dispatch/profile', label: 'Profile', icon: User },
]

export function DispatchNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/90 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-xl mx-auto flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-3 relative"
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
              <Icon
                size={20}
                strokeWidth={isActive ? 2 : 1.75}
                className={isActive ? 'text-primary' : 'text-text-subtle'}
              />
              <span className={`text-[11px] font-semibold ${isActive ? 'text-primary' : 'text-text-subtle'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
