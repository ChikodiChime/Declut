'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, User, Mail, Calendar, Phone, Wallet,
  Package, ShoppingBag, Store, ShieldOff, ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Pagination } from '@/components/admin/Pagination'
import { SearchInput } from '@/components/admin/SearchInput'
import { FilterSelect } from '@/components/admin/FilterSelect'
import { AdminDrawer } from '@/components/admin/AdminDrawer'
import { useDebounce } from '@/lib/hooks/useDebounce'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string
  name: string | null
  email: string
  account_type: string
  suspended: boolean
  created_at: string
}

interface UserDetail {
  id: string
  name: string | null
  email: string
  account_type: string
  suspended: boolean
  created_at: string
  phone: string | null
  avatar_url: string | null
  wallet_balance: number
  paystack_onboarding_complete: boolean
}

interface RecentListing {
  id: string
  title: string
  status: string
  listing_type: string
  created_at: string
}

interface RecentOrder {
  id: string
  status: string
  total_price: number
  created_at: string
}

interface UserDetailResponse {
  user:           UserDetail
  listings:       RecentListing[]
  listingsTotal:  number
  purchases:      RecentOrder[]
  purchasesTotal: number
  sales:          RecentOrder[]
  salesTotal:     number
}

interface UsersResponse {
  users: AdminUser[]
  total: number
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { value: '',           label: 'All types' },
  { value: 'individual', label: 'Individual' },
  { value: 'business',   label: 'Business' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'admin',      label: 'Admin' },
] as const

const STATUS_FILTERS = [
  { value: '',          label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
] as const

type TypeFilter   = typeof TYPE_FILTERS[number]['value']
type StatusFilter = typeof STATUS_FILTERS[number]['value']

// ─── API ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

async function fetchUsers(page: number, q: string, type: string, status: string): Promise<UsersResponse> {
  const p = new URLSearchParams({ page: String(page) })
  if (q)      p.set('q', q)
  if (type)   p.set('type', type)
  if (status) p.set('status', status)
  const res = await fetch(`/api/admin/users?${p}`)
  if (!res.ok) throw new Error('Failed to load users')
  const json = await res.json()
  return json.data
}

async function fetchUserDetail(id: string): Promise<UserDetailResponse> {
  const res = await fetch(`/api/admin/users/${id}`)
  if (!res.ok) throw new Error('Failed to load user detail')
  const json = await res.json()
  return json.data
}

async function patchUser(id: string, suspended: boolean): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspended }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to update user')
  return json.data.user
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  individual: 'Individual',
  business:   'Business',
  dispatcher: 'Dispatcher',
  admin:      'Admin',
}

const ACCOUNT_TYPE_STYLE: Record<string, string> = {
  individual: 'bg-slate-100 text-slate-600',
  business:   'bg-blue-100 text-blue-700',
  dispatcher: 'bg-amber-100 text-amber-700',
  admin:      'bg-primary/15 text-primary',
}

const LISTING_TYPE_LABEL: Record<string, string> = {
  for_sale: 'For Sale',
  free:     'Free',
  donate:   'Donate',
}

const LISTING_STATUS_STYLE: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  sold:      'bg-blue-100 text-blue-700',
  claimed:   'bg-amber-100 text-amber-700',
  donated:   'bg-rose-100 text-rose-600',
}

const ORDER_STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  shipped:   'bg-purple-100 text-purple-700',
  delivered: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border animate-pulse">
          <td className="px-6 py-[18px]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-border shrink-0" />
              <div><div className="h-4 rounded bg-border w-32" /><div className="h-3 rounded bg-border mt-1.5 w-44" /></div>
            </div>
          </td>
          <td className="px-6 py-[18px]"><div className="h-5 rounded-full bg-border w-20" /></td>
          <td className="px-6 py-[18px]"><div className="h-4 rounded bg-border w-24" /></td>
          <td className="px-6 py-[18px]"><div className="h-5 rounded-full bg-border w-16" /></td>
          <td className="px-6 py-[18px]"><div className="h-7 rounded-lg bg-border w-20 ml-auto" /></td>
        </tr>
      ))}
    </>
  )
}

function CardSkeleton() {
  return (
    <div className="px-4 py-4 animate-pulse border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-border shrink-0" />
          <div><div className="h-4 rounded bg-border w-28" /><div className="h-3 rounded bg-border mt-1.5 w-40" /></div>
        </div>
        <div className="h-5 rounded-full bg-border w-18 shrink-0" />
      </div>
      <div className="flex items-center justify-between mt-3 pl-12">
        <div className="h-5 rounded-full bg-border w-16" />
        <div className="h-7 rounded-lg bg-border w-20" />
      </div>
    </div>
  )
}

// ─── UserDrawer ───────────────────────────────────────────────────────────────

function UserDrawer({
  userId,
  onClose,
  onToggleSuspend,
  suspendPending,
}: {
  userId: string | null
  onClose: () => void
  onToggleSuspend: (user: UserDetail) => void
  suspendPending: boolean
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', userId, 'detail'],
    queryFn: () => fetchUserDetail(userId!),
    enabled: !!userId,
  })

  const d = data
  const user = d?.user

  const heroContent = user ? (
    <div className="flex items-center gap-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
        style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(8px)' }}
      >
        {getInitials(user.name, user.email)}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-white leading-snug truncate">{user.name ?? '—'}</p>
        <p className="text-sm mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>{user.email}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
            {ACCOUNT_TYPE_LABEL[user.account_type] ?? user.account_type}
          </span>
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${user.suspended ? 'bg-red-500/25 text-red-200' : 'bg-green-500/25 text-green-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${user.suspended ? 'bg-red-400' : 'bg-green-400'}`} />
            {user.suspended ? 'Suspended' : 'Active'}
          </span>
        </div>
      </div>
    </div>
  ) : null

  const footerContent = user && user.account_type !== 'admin' ? (
    <button
      onClick={() => onToggleSuspend(user)}
      disabled={suspendPending}
      className={`flex items-center gap-2 w-full justify-center rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
        user.suspended
          ? 'bg-green-600 hover:bg-green-700 text-white'
          : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
      }`}
    >
      {user.suspended
        ? <><ShieldCheck size={15} strokeWidth={2} /> Reactivate account</>
        : <><ShieldOff size={15} strokeWidth={2} /> Suspend account</>
      }
    </button>
  ) : null

  return (
    <AdminDrawer
      open={!!userId}
      onClose={onClose}
      hero={heroContent}
      footer={footerContent}
      label="User detail"
      maxWidth={480}
    >
      {isLoading || !d ? (
        <div className="flex flex-col gap-3 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-border animate-pulse" style={{ width: `${[70, 50, 85, 60, 75, 45][i]}%` }} />
          ))}
        </div>
      ) : (
        <div className="p-6 flex flex-col gap-6">

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Package,    label: 'Listings',  value: d.listingsTotal },
              { icon: ShoppingBag, label: 'Purchases', value: d.purchasesTotal },
              { icon: Store,      label: 'Sales',     value: d.salesTotal },
              { icon: Wallet,     label: 'Wallet',    value: formatCurrency(user!.wallet_balance ?? 0) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} strokeWidth={1.75} className="text-text-subtle" />
                  <span className="text-[11px] font-medium text-text-subtle">{label}</span>
                </div>
                <p className="text-base font-bold text-text">{value}</p>
              </div>
            ))}
          </div>

          {/* ── Profile details ── */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border">
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">Profile</p>
            </div>
            <div className="divide-y divide-border">
              {[
                { icon: User,     label: 'Name',    value: user!.name ?? '—' },
                { icon: Mail,     label: 'Email',   value: user!.email },
                { icon: Phone,    label: 'Phone',   value: user!.phone ?? '—' },
                { icon: Calendar, label: 'Joined',  value: formatDate(user!.created_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3">
                  <Icon size={13} strokeWidth={1.75} className="text-text-subtle shrink-0" />
                  <span className="text-xs text-text-muted w-16 shrink-0">{label}</span>
                  <span className="text-sm text-text font-medium truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Recent listings ── */}
          {d.listings.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-surface flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">Listings</p>
                {d.listingsTotal > 5 && (
                  <span className="text-[11px] text-text-subtle">{d.listingsTotal} total</span>
                )}
              </div>
              <div className="divide-y divide-border bg-card">
                {d.listings.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{l.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{formatDate(l.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-border/60 text-text-muted whitespace-nowrap">
                        {LISTING_TYPE_LABEL[l.listing_type] ?? l.listing_type}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap ${LISTING_STATUS_STYLE[l.status] ?? 'bg-border text-text-muted'}`}>
                        {l.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent purchases ── */}
          {d.purchases.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-surface flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">Purchases</p>
                {d.purchasesTotal > 5 && (
                  <span className="text-[11px] text-text-subtle">{d.purchasesTotal} total</span>
                )}
              </div>
              <div className="divide-y divide-border bg-card">
                {d.purchases.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-medium text-text">#{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-text-muted mt-0.5">{formatDate(o.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap ${ORDER_STATUS_STYLE[o.status] ?? 'bg-border text-text-muted'}`}>
                        {o.status}
                      </span>
                      <span className="text-xs font-semibold text-text">{formatCurrency(o.total_price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent sales ── */}
          {d.sales.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-surface flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-subtle">Sales</p>
                {d.salesTotal > 5 && (
                  <span className="text-[11px] text-text-subtle">{d.salesTotal} total</span>
                )}
              </div>
              <div className="divide-y divide-border bg-card">
                {d.sales.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-medium text-text">#{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-text-muted mt-0.5">{formatDate(o.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap ${ORDER_STATUS_STYLE[o.status] ?? 'bg-border text-text-muted'}`}>
                        {o.status}
                      </span>
                      <span className="text-xs font-semibold text-text">{formatCurrency(o.total_price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.listings.length === 0 && d.purchases.length === 0 && d.sales.length === 0 && (
            <p className="text-sm text-text-subtle text-center py-4">No activity yet</p>
          )}
        </div>
      )}
    </AdminDrawer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminUsersContent() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState(() => searchParams.get('q') ?? '')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearch(searchParams.get('q') ?? '') }, [searchParams])
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')

  const q = useDebounce(search)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, q, typeFilter, statusFilter],
    queryFn: () => fetchUsers(page, q, typeFilter, statusFilter),
  })

  const users = data?.users ?? []
  const total = data?.total ?? 0

  function handleSearch(v: string) { setSearch(v); setPage(1) }
  function handleType(v: TypeFilter) { setTypeFilter(v); setPage(1) }
  function handleStatus(v: StatusFilter) { setStatusFilter(v); setPage(1) }

  const mutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) => patchUser(id, suspended),
    onSuccess: (updated) => {
      toast.success(updated.suspended ? 'Account suspended' : 'Account reactivated')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function handleToggleSuspend(user: UserDetail) {
    mutation.mutate({ id: user.id, suspended: !user.suspended })
  }

  const DARK_HEADER = { background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)' }
  const TH = 'text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap'
  const TH_COLOR = { color: 'rgba(255,255,255,0.55)' }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Users size={19} strokeWidth={1.75} className="text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text">Users</h1>
            {total > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {total.toLocaleString('en-NG')}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">Manage accounts & suspensions</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={handleSearch} placeholder="Search by name or email…" />
        </div>
        <FilterSelect value={typeFilter} onChange={(v) => handleType(v as TypeFilter)} options={TYPE_FILTERS} />
        <FilterSelect value={statusFilter} onChange={(v) => handleStatus(v as StatusFilter)} options={STATUS_FILTERS} />
      </div>

      <div className="rounded-2xl overflow-hidden shadow-elevated">

        {/* ── Desktop table ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={DARK_HEADER}>
                <th className={TH} style={TH_COLOR}>User</th>
                <th className={TH} style={TH_COLOR}>Type</th>
                <th className={TH} style={TH_COLOR}>Joined</th>
                <th className={TH} style={TH_COLOR}>Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {isLoading ? (
                <TableSkeleton />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center bg-card">
                    <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
                      <Users size={22} strokeWidth={1.25} className="text-text-subtle" />
                    </div>
                    <p className="text-sm font-medium text-text-muted">No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className="transition-all hover:bg-primary/[0.035] hover:[box-shadow:inset_4px_0_0_#3730a3] cursor-pointer"
                  >
                    <td className="px-6 py-[18px]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-primary">
                          {getInitials(u.name, u.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text truncate">{u.name ?? '—'}</p>
                          <p className="text-xs text-text-muted truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-[18px]">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${ACCOUNT_TYPE_STYLE[u.account_type] ?? 'bg-border text-text-muted'}`}>
                        {ACCOUNT_TYPE_LABEL[u.account_type] ?? u.account_type}
                      </span>
                    </td>
                    <td className="px-6 py-[18px] text-sm text-text-muted whitespace-nowrap">{formatDate(u.created_at)}</td>
                    <td className="px-6 py-[18px]">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${u.suspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.suspended ? 'bg-red-500' : 'bg-green-500'}`} />
                        {u.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-[18px] text-right">
                      {u.account_type !== 'admin' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); mutation.mutate({ id: u.id, suspended: !u.suspended }) }}
                          disabled={mutation.isPending}
                          className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${u.suspended ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100' : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'}`}
                        >
                          {u.suspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ── */}
        <div className="md:hidden">
          <div className="px-4 py-3" style={DARK_HEADER}>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={TH_COLOR}>Users</p>
          </div>
          <div className="bg-card divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            ) : users.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
                  <Users size={22} strokeWidth={1.25} className="text-text-subtle" />
                </div>
                <p className="text-sm font-medium text-text-muted">No users found</p>
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className="px-4 py-4 transition-colors hover:bg-primary/[0.035] cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[11px] font-bold text-primary">
                        {getInitials(u.name, u.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-text text-sm truncate">{u.name ?? '—'}</p>
                        <p className="text-xs text-text-muted truncate">{u.email}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${ACCOUNT_TYPE_STYLE[u.account_type] ?? 'bg-border text-text-muted'}`}>
                      {ACCOUNT_TYPE_LABEL[u.account_type] ?? u.account_type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pl-12">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.suspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.suspended ? 'bg-red-500' : 'bg-green-500'}`} />
                        {u.suspended ? 'Suspended' : 'Active'}
                      </span>
                      <span className="text-[11px] text-text-subtle">{formatDate(u.created_at)}</span>
                    </div>
                    {u.account_type !== 'admin' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); mutation.mutate({ id: u.id, suspended: !u.suspended }) }}
                        disabled={mutation.isPending}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0 ${u.suspended ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}
                      >
                        {u.suspended ? 'Reactivate' : 'Suspend'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border-t border-border">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </div>
      </div>

      <UserDrawer
        userId={selectedId}
        onClose={() => setSelectedId(null)}
        onToggleSuspend={handleToggleSuspend}
        suspendPending={mutation.isPending}
      />
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <Suspense>
      <AdminUsersContent />
    </Suspense>
  )
}
