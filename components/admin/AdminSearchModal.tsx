'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Users, Package, ShoppingBag, Truck, Heart, Wallet,
  LayoutDashboard, ArrowUpRight, Navigation,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminSearchUser       { id: string; name: string | null; email: string; account_type: string; suspended: boolean }
interface AdminSearchListing    { id: string; title: string; status: string; listing_type: string }
interface AdminSearchOrder      { id: string; status: string; total_price: number; created_at: string }
interface AdminSearchDispatcher { id: string; name: string | null; email: string }
interface AdminSearchCharity    { id: string; name: string; description: string | null; active: boolean }
interface AdminSearchWithdrawal { id: string; amount: number; status: string; requested_at: string; seller: { name: string | null; email: string } | null }

interface AdminSearchResults {
  users:       AdminSearchUser[]
  listings:    AdminSearchListing[]
  orders:      AdminSearchOrder[]
  dispatchers: AdminSearchDispatcher[]
  charities:   AdminSearchCharity[]
  withdrawals: AdminSearchWithdrawal[]
}

// ─── Navigation items ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Dashboard',   href: '/admin/dashboard',   icon: LayoutDashboard, keywords: ['dashboard', 'home', 'overview', 'stats'] },
  { label: 'Users',       href: '/admin/users',        icon: Users,           keywords: ['users', 'accounts', 'customers', 'sellers', 'buyers'] },
  { label: 'Listings',    href: '/admin/listings',     icon: Package,         keywords: ['listings', 'items', 'products', 'inventory'] },
  { label: 'Orders',      href: '/admin/orders',       icon: ShoppingBag,     keywords: ['orders', 'purchases', 'transactions'] },
  { label: 'Dispatchers', href: '/admin/dispatchers',  icon: Truck,           keywords: ['dispatchers', 'delivery', 'drivers', 'riders'] },
  { label: 'Charities',   href: '/admin/charities',    icon: Heart,           keywords: ['charities', 'donations', 'donate', 'recipients'] },
  { label: 'Withdrawals', href: '/admin/withdrawals',  icon: Wallet,          keywords: ['withdrawals', 'payouts', 'wallet', 'payments'] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LISTING_TYPE_LABEL: Record<string, string> = { for_sale: 'For Sale', free: 'Free', donate: 'Donate' }

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)
}

function matchingNavItems(query: string) {
  const q = query.toLowerCase()
  return NAV_ITEMS.filter((n) => n.keywords.some((k) => k.includes(q)) || n.label.toLowerCase().includes(q))
}

// ─── Search hook ──────────────────────────────────────────────────────────────

function useAdminSearch(query: string) {
  const [results, setResults] = useState<AdminSearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResults(null); return }
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        const json = await res.json()
        setResults(json.data)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResults(null)
      } finally {
        setIsLoading(false)
      }
    }, 300)
    return () => { clearTimeout(timeout); controller.abort() }
  }, [query])

  return { results, isLoading }
}

// ─── Section definition ───────────────────────────────────────────────────────

interface Section<T> {
  key: string
  label: string
  items: T[]
  icon: React.ElementType
  getLabel: (item: T) => string
  getSub:   (item: T) => string
  getHref:  (item: T) => string
}

// ─── AdminSearchModal ─────────────────────────────────────────────────────────

export function AdminSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { results, isLoading } = useAdminSearch(query)

  const navMatches  = query.length >= 1 ? matchingNavItems(query) : []
  const users       = results?.users       ?? []
  const listings    = results?.listings    ?? []
  const orders      = results?.orders      ?? []
  const dispatchers = results?.dispatchers ?? []
  const charities   = results?.charities   ?? []
  const withdrawals = results?.withdrawals ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataSections: Section<any>[] = [
    {
      key: 'users',
      label: 'Users',
      items: users,
      icon: Users,
      getLabel: (u: AdminSearchUser) => u.name ?? u.email,
      getSub:   (u: AdminSearchUser) => `${u.email} · ${u.account_type}${u.suspended ? ' · suspended' : ''}`,
      getHref:  (u: AdminSearchUser) => `/admin/users?q=${encodeURIComponent(u.name ?? u.email)}`,
    },
    {
      key: 'listings',
      label: 'Listings',
      items: listings,
      icon: Package,
      getLabel: (l: AdminSearchListing) => l.title,
      getSub:   (l: AdminSearchListing) => `${LISTING_TYPE_LABEL[l.listing_type] ?? l.listing_type} · ${l.status}`,
      getHref:  (l: AdminSearchListing) => `/admin/listings?q=${encodeURIComponent(l.title)}`,
    },
    {
      key: 'orders',
      label: 'Orders',
      items: orders,
      icon: ShoppingBag,
      getLabel: (o: AdminSearchOrder) => `#${o.id.slice(0, 8).toUpperCase()}`,
      getSub:   (o: AdminSearchOrder) => `${o.status} · ${formatCurrency(o.total_price)}`,
      getHref:  (o: AdminSearchOrder) => `/admin/orders?q=${encodeURIComponent(o.id.slice(0, 8))}`,
    },
    {
      key: 'dispatchers',
      label: 'Dispatchers',
      items: dispatchers,
      icon: Truck,
      getLabel: (d: AdminSearchDispatcher) => d.name ?? d.email,
      getSub:   (d: AdminSearchDispatcher) => d.email,
      getHref:  () => '/admin/dispatchers',
    },
    {
      key: 'charities',
      label: 'Charities',
      items: charities,
      icon: Heart,
      getLabel: (c: AdminSearchCharity) => c.name,
      getSub:   (c: AdminSearchCharity) => c.description ?? (c.active ? 'Active' : 'Inactive'),
      getHref:  () => '/admin/charities',
    },
    {
      key: 'withdrawals',
      label: 'Withdrawals',
      items: withdrawals,
      icon: Wallet,
      getLabel: (w: AdminSearchWithdrawal) => w.seller?.name ?? w.seller?.email ?? 'Unknown seller',
      getSub:   (w: AdminSearchWithdrawal) => `${formatCurrency(w.amount)} · ${w.status}`,
      getHref:  (w: AdminSearchWithdrawal) => `/admin/withdrawals?q=${encodeURIComponent(w.seller?.name ?? w.seller?.email ?? '')}`,
    },
  ]

  const totalNav  = navMatches.length
  const totalData = dataSections.reduce((sum, s) => sum + s.items.length, 0)
  const totalResults = totalNav + totalData

  // Build flat list for keyboard navigation
  const flatHrefs: string[] = [
    ...navMatches.map((n) => n.href),
    ...dataSections.flatMap((s) => s.items.map((item) => s.getHref(item))),
  ]

  useEffect(() => {
    if (open) { setQuery(''); setActiveIndex(0); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => { setActiveIndex(0) }, [query])

  function navigate(href: string) { router.push(href); onClose() }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, totalResults - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter')     { if (totalResults > 0) navigate(flatHrefs[activeIndex]) }
    else if (e.key === 'Escape')    { onClose() }
  }

  let globalIndex = -1

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 backdrop-blur-[2px]"
            style={{ background: 'rgba(0,0,0,0.62)' }}
            onMouseDown={() => onClose()}
          />

          <motion.div
            className="relative w-full mx-4 bg-card overflow-hidden"
            style={{ maxWidth: 560, borderRadius: 18, border: '1px solid var(--color-border)', boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)' }}
            initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-5" style={{ paddingTop: 16, paddingBottom: 16 }}>
              <Search size={18} strokeWidth={2} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search users, listings, orders, charities…"
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 15, color: 'var(--color-text)', fontFamily: 'inherit' }}
              />
              {query.length > 0 ? (
                <button
                  onMouseDown={(e) => { e.preventDefault(); setQuery('') }}
                  className="shrink-0 text-xs px-2 py-1 rounded-md transition-colors"
                  style={{ color: 'var(--color-text-subtle)', background: 'var(--color-surface)' }}
                >
                  Clear
                </button>
              ) : (
                <kbd className="shrink-0 hidden sm:flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
                  style={{ color: 'var(--color-text-subtle)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)' }}>
                  esc
                </kbd>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--color-border)' }} />

            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {query.length < 1 ? (
                <div className="flex flex-col items-center justify-center gap-3" style={{ padding: '40px 20px' }}>
                  <div className="flex items-center justify-center rounded-xl"
                    style={{ width: 40, height: 40, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <Search size={18} strokeWidth={1.75} style={{ color: 'var(--color-text-subtle)' }} />
                  </div>
                  <p className="text-center" style={{ fontSize: 13, color: 'var(--color-text-subtle)', maxWidth: 260 }}>
                    Search across users, listings, orders, dispatchers, charities, and withdrawals — or jump to any section
                  </p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2" style={{ padding: '36px 20px' }}>
                  <div className="rounded-full animate-spin" style={{ width: 14, height: 14, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
                  <span style={{ fontSize: 13, color: 'var(--color-text-subtle)' }}>Searching…</span>
                </div>
              ) : totalResults === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2" style={{ padding: '36px 20px' }}>
                  <p style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>No results for &ldquo;{query}&rdquo;</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>Try a different search term</p>
                </div>
              ) : (
                <ul style={{ paddingTop: 6, paddingBottom: 6 }}>
                  {/* Navigation section */}
                  {navMatches.length > 0 && (
                    <>
                      <li style={{ padding: '8px 20px 4px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Go to
                        </span>
                      </li>
                      {navMatches.map((nav) => {
                        globalIndex++
                        const idx = globalIndex
                        const active = idx === activeIndex
                        const Icon = nav.icon
                        return (
                          <li key={nav.href} style={{ padding: '2px 8px' }}>
                            <button
                              onMouseEnter={() => setActiveIndex(idx)}
                              onClick={() => navigate(nav.href)}
                              className="flex items-center gap-3 w-full transition-colors"
                              style={{ padding: '10px 12px', borderRadius: 10, background: active ? 'rgba(55,48,163,0.07)' : 'transparent', textAlign: 'left' }}
                            >
                              <div className="flex items-center justify-center shrink-0"
                                style={{ width: 30, height: 30, borderRadius: 8, background: active ? 'rgba(55,48,163,0.12)' : 'var(--color-surface)', border: `1px solid ${active ? 'rgba(55,48,163,0.15)' : 'var(--color-border)'}` }}>
                                <Icon size={14} strokeWidth={active ? 2 : 1.75} style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-subtle)' }} />
                              </div>
                              <span className="flex-1 truncate" style={{ fontSize: 13.5, color: active ? 'var(--color-primary)' : 'var(--color-text)', fontWeight: active ? 500 : 400 }}>
                                {nav.label}
                              </span>
                              <Navigation size={11} strokeWidth={2} style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-subtle)', flexShrink: 0, opacity: 0.6 }} />
                              {active && <ArrowUpRight size={14} strokeWidth={2} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                            </button>
                          </li>
                        )
                      })}
                    </>
                  )}

                  {/* Data sections */}
                  {dataSections.map((section) => {
                    if (section.items.length === 0) return null
                    const Icon = section.icon
                    const isFirstData = navMatches.length > 0 || dataSections.findIndex((s) => s.items.length > 0) === dataSections.indexOf(section)
                    return (
                      <div key={section.key}>
                        <li style={{ padding: `${isFirstData && navMatches.length > 0 ? 12 : 8}px 20px 4px` }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            {section.label}
                          </span>
                        </li>
                        {section.items.map((item) => {
                          globalIndex++
                          const idx = globalIndex
                          const active = idx === activeIndex
                          return (
                            <li key={item.id} style={{ padding: '2px 8px' }}>
                              <button
                                onMouseEnter={() => setActiveIndex(idx)}
                                onClick={() => navigate(section.getHref(item))}
                                className="flex items-center gap-3 w-full transition-colors"
                                style={{ padding: '10px 12px', borderRadius: 10, background: active ? 'rgba(55,48,163,0.07)' : 'transparent', textAlign: 'left' }}
                              >
                                <div className="flex items-center justify-center shrink-0"
                                  style={{ width: 30, height: 30, borderRadius: 8, background: active ? 'rgba(55,48,163,0.12)' : 'var(--color-surface)', border: `1px solid ${active ? 'rgba(55,48,163,0.15)' : 'var(--color-border)'}` }}>
                                  <Icon size={14} strokeWidth={active ? 2 : 1.75} style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-subtle)' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="truncate" style={{ fontSize: 13.5, color: active ? 'var(--color-primary)' : 'var(--color-text)', fontWeight: active ? 500 : 400 }}>
                                    {section.getLabel(item)}
                                  </p>
                                  <p className="truncate" style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 1 }}>
                                    {section.getSub(item)}
                                  </p>
                                </div>
                                {active && <ArrowUpRight size={14} strokeWidth={2} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                              </button>
                            </li>
                          )
                        })}
                      </div>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4" style={{ padding: '10px 20px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                {['↑', '↓'].map((key) => (
                  <kbd key={key} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, fontSize: 10, background: 'var(--color-card)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                    {key}
                  </kbd>
                ))}
                Navigate
              </span>
              <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, fontSize: 10, background: 'var(--color-card)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>↵</kbd>
                Open
              </span>
              <span className="ml-auto" style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                Type a section name to jump directly
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
