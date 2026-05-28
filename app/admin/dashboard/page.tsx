'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Package, ShoppingBag, CheckCircle,
  TrendingUp, DollarSign, UserPlus, PackagePlus,
  ListFilter, Truck, Heart, ArrowRight,
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

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-card animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-border mb-4" />
      <div className="h-8 w-20 bg-border rounded-lg mb-2" />
      <div className="h-4 w-28 bg-border rounded" />
    </div>
  )
}

function WeekBadge({ label, value, icon: Icon, color }: {
  label: string
  value: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-card rounded-xl shadow-card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} strokeWidth={1.75} className="text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-text">{value}</p>
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}

const QUICK_LINKS = [
  { href: '/admin/users',       icon: Users,      label: 'Users',       desc: 'Manage accounts & suspensions' },
  { href: '/admin/listings',    icon: Package,    label: 'Listings',    desc: 'Moderate marketplace items' },
  { href: '/admin/orders',      icon: ShoppingBag,label: 'Orders',      desc: 'Oversee & force-cancel orders' },
  { href: '/admin/dispatchers', icon: Truck,      label: 'Dispatchers', desc: 'Add & manage dispatchers' },
  { href: '/admin/charities',   icon: Heart,      label: 'Charities',   desc: 'CRUD donation recipients' },
]

export default function AdminDashboardPage() {
  const { data: s, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchStats })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-5xl space-y-8">

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
        <p className="text-text-muted text-sm">
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </motion.div>

      {/* Revenue hero */}
      <motion.div {...fadeUp(0.05)}>
        {isLoading ? (
          <div className="rounded-2xl animate-pulse h-44" style={{ background: '#1a1714' }} />
        ) : (
          <div
            className="rounded-2xl p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-8"
            style={{
              background: 'linear-gradient(135deg, #16130f 0%, #1e1a15 60%, #252019 100%)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.08), 0 20px 48px rgba(0,0,0,0.22)',
            }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Total GMV
              </p>
              <p className="text-4xl font-bold tracking-tight" style={{ color: '#ffffff' }}>
                {fmtMoney(s?.gmv ?? 0)}
              </p>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Gross merchandise value — completed orders
              </p>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }} className="sm:pl-8">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Platform revenue
              </p>
              <p className="text-4xl font-bold tracking-tight" style={{ color: '#a78bfa' }}>
                {fmtMoney(s?.platformRevenue ?? 0)}
              </p>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                10% fee on item price per completed sale
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Platform health */}
      <section>
        <motion.h2 {...fadeUp(0.1)} className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
          Platform health
        </motion.h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <motion.div {...fadeUp(0.12)}>
                <StatCard label="Total users"      value={fmt(s?.totalUsers ?? 0)}      icon={Users}       color="text-primary"     bgColor="bg-primary/10"     lineColor="bg-primary" />
              </motion.div>
              <motion.div {...fadeUp(0.18)}>
                <StatCard label="Total listings"   value={fmt(s?.totalListings ?? 0)}   icon={Package}     color="text-violet-600"  bgColor="bg-violet-500/10"  lineColor="bg-violet-500" />
              </motion.div>
              <motion.div {...fadeUp(0.24)}>
                <StatCard label="Active orders"    value={fmt(s?.activeOrders ?? 0)}    icon={ShoppingBag} color="text-amber-600"   bgColor="bg-amber-500/10"   lineColor="bg-amber-500" />
              </motion.div>
              <motion.div {...fadeUp(0.30)}>
                <StatCard label="Completed orders" value={fmt(s?.completedOrders ?? 0)} icon={CheckCircle} color="text-green-600"   bgColor="bg-green-500/10"   lineColor="bg-green-500" />
              </motion.div>
            </>
          )}
        </div>
      </section>

      {/* This week */}
      <section>
        <motion.h2 {...fadeUp(0.32)} className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
          This week
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-5 animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-border shrink-0" />
                <div className="space-y-2">
                  <div className="h-5 w-12 bg-border rounded" />
                  <div className="h-3 w-20 bg-border rounded" />
                </div>
              </div>
            ))
          ) : (
            <>
              <motion.div {...fadeUp(0.34)}><WeekBadge label="New signups"      value={fmt(s?.newUsersThisWeek ?? 0)}  icon={UserPlus}    color="bg-rose-500" /></motion.div>
              <motion.div {...fadeUp(0.38)}><WeekBadge label="Listings posted"  value={fmt(s?.listingsThisWeek ?? 0)}  icon={PackagePlus} color="bg-orange-500" /></motion.div>
              <motion.div {...fadeUp(0.42)}><WeekBadge label="Orders completed" value={fmt(s?.ordersThisWeek ?? 0)}    icon={ListFilter}  color="bg-teal-500" /></motion.div>
            </>
          )}
        </div>
      </section>

      {/* Quick links */}
      <motion.section {...fadeUp(0.46)}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Quick access</h2>
        <div className="bg-card rounded-xl shadow-card p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUICK_LINKS.map(({ href, icon: Icon, label, desc }) => (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/4 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <Icon size={17} strokeWidth={1.75} className="text-text-muted group-hover:text-primary transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">{label}</p>
                    <p className="text-xs text-text-muted truncate">{desc}</p>
                  </div>
                  <ArrowRight size={14} strokeWidth={1.75} className="ml-auto shrink-0 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </motion.section>

    </div>
  )
}
