'use client'

import { LayoutDashboard, Users, Package, ShoppingBag, Truck, Heart, Wallet } from 'lucide-react'
import { Sidebar } from '@/components/dashboard/Sidebar'

const ADMIN_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/admin/users',     label: 'Users',        icon: Users },
  { href: '/admin/listings',  label: 'Listings',     icon: Package },
  { href: '/admin/orders',    label: 'Orders',       icon: ShoppingBag },
  { href: '/admin/dispatchers', label: 'Dispatchers', icon: Truck },
  { href: '/admin/charities',    label: 'Charities',    icon: Heart },
  { href: '/admin/withdrawals',  label: 'Withdrawals',  icon: Wallet },
]

export function AdminSidebar() {
  return (
    <Sidebar
      navItems={ADMIN_NAV_ITEMS}
      logoHref="/admin/dashboard"
      sectionLabel="Admin"
      layoutIdPrefix="admin-sidebar"
    />
  )
}
