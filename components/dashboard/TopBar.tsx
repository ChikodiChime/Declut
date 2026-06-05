"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { Search, Bell, User, LogOut, Package, Tag } from "lucide-react";
import { useMe, useSignOut } from "@/lib/hooks/useAuth";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/lib/hooks/useNotifications";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchListing {
  id: string
  title: string
  status: string
}

interface SearchClaim {
  id: string
  status: string
  listing: { id: string; title: string } | null
}

interface SearchResults {
  listings: SearchListing[]
  claims: SearchClaim[]
}

// ─── Search ───────────────────────────────────────────────────────────────────

function useSearch(query: string) {
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      return
    }

    const controller = new AbortController()

    const timeout = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        const json = await res.json()
        setResults(json.data)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResults(null)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  return { results, isLoading }
}

// ─── SearchBox ────────────────────────────────────────────────────────────────

function SearchBox() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { results, isLoading } = useSearch(query)

  const hasResults =
    results &&
    (results.listings.length > 0 || results.claims.length > 0)

  // Ctrl+K / ⌘K global shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === "Escape") {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleSelect(href: string) {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  const showDropdown = open && query.length >= 2

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <div className="relative flex items-center">
        <Search size={15} className="absolute left-3 text-text-subtle pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search listings, orders, claims..."
          className="w-full h-9 pl-9 pr-16 rounded-lg border border-border bg-surface text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors"
        />
        <kbd className="absolute right-3 hidden sm:flex items-center gap-0.5 text-[10px] text-text-subtle font-medium pointer-events-none">
          <span className="text-[11px]">⌘</span>K
        </kbd>
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-text-subtle">Searching...</div>
          )}

          {!isLoading && !hasResults && (
            <div className="px-4 py-3 text-sm text-text-subtle">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!isLoading && hasResults && (
            <div className="py-1.5 max-h-80 overflow-y-auto">
              {results!.listings.length > 0 && (
                <Section label="Listings">
                  {results!.listings.map((l) => (
                    <ResultRow
                      key={l.id}
                      icon={<Package size={14} className="text-text-subtle" />}
                      title={l.title}
                      detail={l.status}
                      onClick={() => handleSelect(`/dashboard/listings/${l.id}`)}
                    />
                  ))}
                </Section>
              )}

              {results!.claims.length > 0 && (
                <Section label="Claims">
                  {results!.claims.map((c) => {
                    const listing = Array.isArray(c.listing) ? c.listing[0] : c.listing
                    return (
                      <ResultRow
                        key={c.id}
                        icon={<Tag size={14} className="text-text-subtle" />}
                        title={listing?.title ?? "Claim"}
                        detail={c.status}
                        onClick={() => handleSelect(`/dashboard/orders`)}
                      />
                    )
                  })}
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
        {label}
      </p>
      {children}
    </div>
  )
}

function ResultRow({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-surface transition-colors"
    >
      {icon}
      <span className="text-sm text-text flex-1 truncate">{title}</span>
      <span className="text-xs text-text-subtle capitalize shrink-0">{detail}</span>
    </button>
  )
}

// ─── NotificationBell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data } = useNotifications()
  const { mutate: markRead } = useMarkRead()
  const { mutate: markAllRead } = useMarkAllRead()

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleOpen() {
    setOpen((v) => !v)
  }

  function handleNotificationClick(id: string, link: string) {
    markRead(id)
    setOpen(false)
    router.push(link)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-text-subtle hover:text-text hover:bg-surface transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-text">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-subtle text-center">
                No notifications yet
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n.id, n.link)}
                  className="flex gap-3 w-full px-4 py-3 text-left hover:bg-surface transition-colors border-b border-border/50 last:border-0"
                >
                  <span
                    className={[
                      "mt-1 w-1 shrink-0 self-stretch rounded-full",
                      n.read ? "bg-transparent" : "bg-primary",
                    ].join(" ")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={["text-sm truncate", n.read ? "text-text-subtle" : "text-text font-medium"].join(" ")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-text-subtle mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-text-subtle mt-1">
                      {new Date(n.created_at).toLocaleString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AvatarMenu ───────────────────────────────────────────────────────────────

function AvatarMenu() {
  const { data: me } = useMe()
  const { mutate: signOut } = useSignOut()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="group flex items-center gap-3 rounded-full px-2 py-1.5 hover:bg-surface transition-colors"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
          {me?.avatar_url ? (
            <CldImage
              src={me.avatar_url}
              width={32}
              height={32}
              alt={me?.name ?? "Avatar"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center">
              <span className="text-xs font-semibold text-white">
                {me?.name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
          )}
        </div>
        <div className="text-left min-w-0 hidden sm:block">
          <p className="text-sm font-medium text-text truncate max-w-[140px]">
            {me?.name ?? "Account"}
          </p>
          <p className="text-xs text-text-subtle truncate max-w-[140px]">
            {me?.email ?? ""}
          </p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-xl z-50">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
                {me?.avatar_url ? (
                  <CldImage
                    src={me.avatar_url}
                    width={40}
                    height={40}
                    alt={me?.name ?? "Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {me?.name?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text truncate">{me?.name ?? "Account"}</p>
                <p className="text-xs text-text-subtle truncate">{me?.email ?? ""}</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="py-1.5">
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-surface transition-colors"
            >
              <User size={16} strokeWidth={1.75} className="text-text-subtle" />
              <span>Profile Settings</span>
            </Link>

            <button
              onClick={() => { setOpen(false); signOut() }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/5 transition-colors"
            >
              <LogOut size={16} strokeWidth={1.75} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar() {
  return (
    <header className="hidden lg:flex items-center gap-4 h-14 px-6 lg:px-8 bg-card border-b border-border shrink-0 sticky top-0 z-20">
      <SearchBox />
      <NotificationBell />
      <AvatarMenu />
    </header>
  )
}
