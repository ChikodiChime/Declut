'use client'

import { useQuery } from '@tanstack/react-query'
import { Users, Package, ShoppingBag, CheckCircle, TrendingUp, UserPlus, PackagePlus } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalListings: number
  activeOrders: number
  completedOrders: number
  gmv: number
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

function StatCard({ label, value, icon: Icon, accent }: {
  label: string
  value: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="bg-card rounded-2xl shadow-card p-6 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={20} strokeWidth={1.75} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-text">{value}</p>
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { data: s, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchStats })

  if (isLoading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-text mb-8">Dashboard</h1>
        <p className="text-text-muted text-sm">Loading…</p>
      </div>
    )
  }

  if (!s) return null

  const fmt = (n: number) => n.toLocaleString('en-NG')
  const fmtMoney = (n: number) => `₦${n.toLocaleString('en-NG')}`

  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="text-2xl font-bold text-text">Dashboard</h1>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Platform health</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total users"       value={fmt(s.totalUsers)}      icon={Users}       accent="bg-primary" />
          <StatCard label="Total listings"    value={fmt(s.totalListings)}   icon={Package}     accent="bg-violet-500" />
          <StatCard label="Active orders"     value={fmt(s.activeOrders)}    icon={ShoppingBag} accent="bg-amber-500" />
          <StatCard label="Completed orders"  value={fmt(s.completedOrders)} icon={CheckCircle} accent="bg-green-500" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Money</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <StatCard label="Total GMV" value={fmtMoney(s.gmv)} icon={TrendingUp} accent="bg-blue-500" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">This week</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="New signups"       value={fmt(s.newUsersThisWeek)}  icon={UserPlus}    accent="bg-rose-500" />
          <StatCard label="Listings posted"   value={fmt(s.listingsThisWeek)}  icon={PackagePlus} accent="bg-orange-500" />
          <StatCard label="Orders completed"  value={fmt(s.ordersThisWeek)}    icon={CheckCircle} accent="bg-teal-500" />
        </div>
      </section>
    </div>
  )
}
