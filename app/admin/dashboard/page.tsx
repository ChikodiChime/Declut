'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Package, ShoppingBag, CheckCircle,
  UserPlus, PackagePlus, ListFilter,
  Truck, Heart, ArrowRight,
} from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'

interface Stats {
  totalUsers: number
  totalListings: number
  activeOrders: number
  completedOrders: number
  gmv: number
  platformRevenue: number
  newUsersThisWeek: number
  listingsThisWeek: number
  ordersThisWeek: number
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/admin/stats')
  if (!res.ok) throw new Error('Failed to load stats')
  const json = await res.json()
  return json.data
}

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35 },
  }
}

function fmtMoney(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

function fmt(n: number) {
  return n.toLocaleString('en-NG')
}

const WEEK_ITEMS = [
  { key: 'newUsersThisWeek',  label: 'New signups',      icon: UserPlus,    color: 'text-rose-500',   bg: 'bg-rose-500/10' },
  { key: 'listingsThisWeek',  label: 'Listings posted',  icon: PackagePlus, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { key: 'ordersThisWeek',    label: 'Orders completed', icon: ListFilter,  color: 'text-teal-500',   bg: 'bg-teal-500/10' },
] as const

const QUICK_LINKS = [
  { href: '/admin/users',       icon: Users,       label: 'Users',       desc: 'Manage accounts & suspensions' },
  { href: '/admin/listings',    icon: Package,     label: 'Listings',    desc: 'Moderate marketplace items' },
  { href: '/admin/orders',      icon: ShoppingBag, label: 'Orders',      desc: 'Oversee & force-cancel orders' },
  { href: '/admin/dispatchers', icon: Truck,       label: 'Dispatchers', desc: 'Add & manage dispatchers' },
  { href: '/admin/charities',   icon: Heart,       label: 'Charities',   desc: 'CRUD donation recipients' },
]

export default function AdminDashboardPage() {
  const { data: s, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchStats })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-2 mb-0.5">
          <h1 className="text-2xl font-bold text-text">{greeting}</h1>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full tracking-wide uppercase"
            style={{ background: '#4f46e510', color: '#4f46e5' }}
          >
            Admin
          </span>
        </div>
        <p className="text-sm text-text-muted">
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </motion.div>

      {/* Revenue hero — full width */}
      <motion.div {...fadeUp(0.05)}>
        {isLoading ? (
          <div className="rounded-2xl animate-pulse h-40" style={{ background: '#1a1714' }} />
        ) : (
          <div
            className="rounded-2xl p-7 sm:p-9 grid grid-cols-1 sm:grid-cols-2 gap-8"
            style={{
              background: 'linear-gradient(135deg, #16130f 0%, #1e1a15 60%, #252019 100%)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.08), 0 20px 48px rgba(0,0,0,0.22)',
            }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Total GMV
              </p>
              <p className="text-4xl font-bold tracking-tight" style={{ color: '#ffffff' }}>
                {fmtMoney(s?.gmv ?? 0)}
              </p>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Gross merchandise value — completed orders
              </p>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }} className="sm:pl-8">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Platform Revenue
              </p>
              <p className="text-4xl font-bold tracking-tight" style={{ color: '#a78bfa' }}>
                {fmtMoney(s?.platformRevenue ?? 0)}
              </p>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                10% fee on item price per completed sale
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Platform health — 4 stat cards */}
      <motion.div {...fadeUp(0.12)} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 shadow-card animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-border mb-4" />
              <div className="h-8 w-20 bg-border rounded-lg mb-2" />
              <div className="h-4 w-28 bg-border rounded" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total users"      value={fmt(s?.totalUsers ?? 0)}      icon={Users}       color="text-primary"    bgColor="bg-primary/10"    lineColor="bg-primary" />
            <StatCard label="Total listings"   value={fmt(s?.totalListings ?? 0)}   icon={Package}     color="text-violet-600" bgColor="bg-violet-500/10" lineColor="bg-violet-500" />
            <StatCard label="Active orders"    value={fmt(s?.activeOrders ?? 0)}    icon={ShoppingBag} color="text-amber-600"  bgColor="bg-amber-500/10"  lineColor="bg-amber-500" />
            <StatCard label="Completed orders" value={fmt(s?.completedOrders ?? 0)} icon={CheckCircle} color="text-green-600"  bgColor="bg-green-500/10"  lineColor="bg-green-500" />
          </>
        )}
      </motion.div>

      {/* Bottom row: This week + Quick access */}
      <motion.div {...fadeUp(0.2)} className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

        {/* This week — compact card */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">This week</p>
          </div>
          {isLoading ? (
            <div className="divide-y divide-border">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-border shrink-0" />
                  <div className="flex-1 h-3 bg-border rounded" />
                  <div className="w-8 h-5 bg-border rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {WEEK_ITEMS.map(({ key, label, icon: Icon, color, bg }) => (
                <div key={key} className="flex items-center gap-3 px-5 py-4">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={15} strokeWidth={1.75} className={color} />
                  </div>
                  <p className="flex-1 text-sm text-text-muted">{label}</p>
                  <p className="text-lg font-bold text-text shrink-0">{fmt(s?.[key] ?? 0)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick access — nav list card */}
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Quick access</p>
          </div>
          <div className="divide-y divide-border">
            {QUICK_LINKS.map(({ href, icon: Icon, label, desc }) => (
              <Link key={href} href={href} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Icon size={15} strokeWidth={1.75} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">{label}</p>
                  <p className="text-xs text-text-muted truncate">{desc}</p>
                </div>
                <ArrowRight size={14} strokeWidth={1.75} className="shrink-0 text-text-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>

      </motion.div>

    </div>
  )
}
