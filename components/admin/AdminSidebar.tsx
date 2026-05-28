'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Package, ShoppingBag, Truck, Heart, LogOut, ChevronRight,
} from 'lucide-react'
import { useSignOut } from '@/lib/hooks/useAuth'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users',     label: 'Users',      icon: Users },
  { href: '/admin/listings',  label: 'Listings',   icon: Package },
  { href: '/admin/orders',    label: 'Orders',     icon: ShoppingBag },
  { href: '/admin/dispatchers', label: 'Dispatchers', icon: Truck },
  { href: '/admin/charities', label: 'Charities',  icon: Heart },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { mutate: signOut } = useSignOut()

  return (
    <aside className="hidden lg:flex flex-col w-(--sidebar-width) h-screen top-0 bg-primary shrink-0 rounded-r-4xl relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-white/5" />
      </div>

      <div className="relative z-10 px-6 py-5 shrink-0">
        <Link href="/admin/dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="declut" className="h-7" />
        </Link>
      </div>

      <div className="relative z-10 px-6 pb-3 shrink-0">
        <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">Admin</span>
      </div>

      <nav className="relative z-10 flex-1 flex flex-col px-3 py-2 gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/admin/dashboard'
            ? pathname === '/admin/dashboard' || pathname === '/admin'
            : pathname.startsWith(item.href)

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 relative overflow-hidden group',
                  isActive ? 'text-white' : 'text-white/60',
                ].join(' ')}
              >
                {isActive && (
                  <motion.div
                    layoutId="admin-sidebar-active"
                    className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent rounded-lg"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={false}
                />
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className={[
                    'relative z-10 transition-all duration-300',
                    isActive ? 'text-white scale-110' : 'group-hover:scale-110 group-hover:text-white/90',
                  ].join(' ')}
                />
                <span className="relative z-10 text-sm font-medium flex-1">{item.label}</span>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <ChevronRight size={14} className="relative z-10 text-white/70" />
                  </motion.div>
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="relative z-10 px-6 py-2 shrink-0">
        <div className="h-px bg-white/10" />
      </div>

      <div className="relative z-10 px-3 pb-5 shrink-0">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white/90 transition-colors duration-150"
        >
          <LogOut size={17} strokeWidth={1.75} />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
