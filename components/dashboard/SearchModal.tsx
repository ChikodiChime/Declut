"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Tag, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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

// ─── Search hook ──────────────────────────────────────────────────────────────

function useSearch(query: string) {
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResults(null); return }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        const json = await res.json()
        setResults(json.data)
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults(null)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => { clearTimeout(timeout); controller.abort() }
  }, [query])

  return { results, isLoading }
}

// ─── SearchModal ──────────────────────────────────────────────────────────────

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const router = useRouter()
  const { results, isLoading } = useSearch(query)

  const listings = results?.listings ?? []
  const claims = results?.claims ?? []
  const totalResults = listings.length + claims.length

  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setActiveIndex(0) }, [query])

  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  function getHref(index: number): string {
    if (index < listings.length) return `/dashboard/listings/${listings[index].id}`
    return "/dashboard/orders"
  }

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, totalResults - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === "Enter") { if (totalResults > 0) navigate(getHref(activeIndex)) }
    else if (e.key === "Escape") { onClose() }
  }

  let globalIndex = -1

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop — owns the outside-click */}
          <div
            className="absolute inset-0 backdrop-blur-[2px]"
            style={{ background: "rgba(0,0,0,0.62)" }}
            onMouseDown={() => onClose()}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full mx-4 bg-card overflow-hidden"
            style={{
              maxWidth: 560,
              borderRadius: 18,
              border: "1px solid var(--color-border)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            }}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Search input row */}
            <div className="flex items-center gap-3 px-5" style={{ paddingTop: 16, paddingBottom: 16 }}>
              <Search
                size={18}
                strokeWidth={2}
                style={{ color: "var(--color-primary)", flexShrink: 0 }}
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search listings and claims..."
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: 15, color: "var(--color-text)", fontFamily: "inherit" }}
              />
              {query.length > 0 ? (
                <button
                  onMouseDown={(e) => { e.preventDefault(); setQuery("") }}
                  className="shrink-0 text-xs px-2 py-1 rounded-md transition-colors"
                  style={{ color: "var(--color-text-subtle)", background: "var(--color-surface)" }}
                >
                  Clear
                </button>
              ) : (
                <kbd
                  className="shrink-0 hidden sm:flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
                  style={{
                    color: "var(--color-text-subtle)",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  esc
                </kbd>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "var(--color-border)" }} />

            {/* Results body */}
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {query.length < 2 ? (
                <div className="flex flex-col items-center justify-center gap-3" style={{ padding: "40px 20px" }}>
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 40, height: 40, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    <Search size={18} strokeWidth={1.75} style={{ color: "var(--color-text-subtle)" }} />
                  </div>
                  <p className="text-center" style={{ fontSize: 13, color: "var(--color-text-subtle)", maxWidth: 220 }}>
                    Search across your listings and claims
                  </p>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2" style={{ padding: "36px 20px" }}>
                  <div
                    className="rounded-full animate-spin"
                    style={{ width: 14, height: 14, border: "2px solid var(--color-border)", borderTopColor: "var(--color-primary)" }}
                  />
                  <span style={{ fontSize: 13, color: "var(--color-text-subtle)" }}>Searching...</span>
                </div>
              ) : totalResults === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2" style={{ padding: "36px 20px" }}>
                  <p style={{ fontSize: 14, color: "var(--color-text)", fontWeight: 500 }}>
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  <p style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>Try a different search term</p>
                </div>
              ) : (
                <ul ref={listRef} style={{ paddingTop: 6, paddingBottom: 6 }}>
                  {listings.length > 0 && (
                    <>
                      <li style={{ padding: "8px 20px 4px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-subtle)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          Listings
                        </span>
                      </li>
                      {listings.map((l) => {
                        globalIndex++
                        const idx = globalIndex
                        const active = idx === activeIndex
                        return (
                          <li key={l.id} style={{ padding: "2px 8px" }}>
                            <button
                              onMouseEnter={() => setActiveIndex(idx)}
                              onClick={() => navigate(`/dashboard/listings/${l.id}`)}
                              className="flex items-center gap-3 w-full transition-colors"
                              style={{
                                padding: "10px 12px",
                                borderRadius: 10,
                                background: active ? "rgba(55,48,163,0.07)" : "transparent",
                                textAlign: "left",
                              }}
                            >
                              <div
                                className="flex items-center justify-center shrink-0"
                                style={{
                                  width: 30, height: 30, borderRadius: 8,
                                  background: active ? "rgba(55,48,163,0.12)" : "var(--color-surface)",
                                  border: `1px solid ${active ? "rgba(55,48,163,0.15)" : "var(--color-border)"}`,
                                }}
                              >
                                <Package size={14} strokeWidth={active ? 2 : 1.75} style={{ color: active ? "var(--color-primary)" : "var(--color-text-subtle)" }} />
                              </div>
                              <span className="flex-1 truncate" style={{ fontSize: 14, color: active ? "var(--color-primary)" : "var(--color-text)", fontWeight: active ? 500 : 400 }}>
                                {l.title}
                              </span>
                              <span className="shrink-0 capitalize" style={{ fontSize: 11, color: "var(--color-text-subtle)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 5, padding: "2px 7px" }}>
                                {l.status}
                              </span>
                              {active && <ArrowUpRight size={14} strokeWidth={2} style={{ color: "var(--color-primary)", flexShrink: 0 }} />}
                            </button>
                          </li>
                        )
                      })}
                    </>
                  )}

                  {claims.length > 0 && (
                    <>
                      <li style={{ padding: listings.length > 0 ? "12px 20px 4px" : "8px 20px 4px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-subtle)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          Claims
                        </span>
                      </li>
                      {claims.map((c) => {
                        globalIndex++
                        const idx = globalIndex
                        const active = idx === activeIndex
                        const listing = Array.isArray(c.listing) ? c.listing[0] : c.listing
                        return (
                          <li key={c.id} style={{ padding: "2px 8px" }}>
                            <button
                              onMouseEnter={() => setActiveIndex(idx)}
                              onClick={() => navigate("/dashboard/orders")}
                              className="flex items-center gap-3 w-full transition-colors"
                              style={{
                                padding: "10px 12px",
                                borderRadius: 10,
                                background: active ? "rgba(55,48,163,0.07)" : "transparent",
                                textAlign: "left",
                              }}
                            >
                              <div
                                className="flex items-center justify-center shrink-0"
                                style={{
                                  width: 30, height: 30, borderRadius: 8,
                                  background: active ? "rgba(55,48,163,0.12)" : "var(--color-surface)",
                                  border: `1px solid ${active ? "rgba(55,48,163,0.15)" : "var(--color-border)"}`,
                                }}
                              >
                                <Tag size={14} strokeWidth={active ? 2 : 1.75} style={{ color: active ? "var(--color-primary)" : "var(--color-text-subtle)" }} />
                              </div>
                              <span className="flex-1 truncate" style={{ fontSize: 14, color: active ? "var(--color-primary)" : "var(--color-text)", fontWeight: active ? 500 : 400 }}>
                                {listing?.title ?? "Claim"}
                              </span>
                              <span className="shrink-0 capitalize" style={{ fontSize: 11, color: "var(--color-text-subtle)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 5, padding: "2px 7px" }}>
                                {c.status}
                              </span>
                              {active && <ArrowUpRight size={14} strokeWidth={2} style={{ color: "var(--color-primary)", flexShrink: 0 }} />}
                            </button>
                          </li>
                        )
                      })}
                    </>
                  )}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center gap-4"
              style={{ padding: "10px 20px", borderTop: "1px solid var(--color-border)", background: "var(--color-surface)" }}
            >
              {(["↑", "↓"] as const).map((k, i) => (
                i === 0 ? (
                  <span key="nav" className="flex items-center gap-1.5" style={{ fontSize: 11, color: "var(--color-text-subtle)" }}>
                    {["↑", "↓"].map((key) => (
                      <kbd key={key} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 4, fontSize: 10, background: "var(--color-card)", border: "1px solid var(--color-border)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>{key}</kbd>
                    ))}
                    Navigate
                  </span>
                ) : null
              ))}
              <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: "var(--color-text-subtle)" }}>
                <kbd style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 4, fontSize: 10, background: "var(--color-card)", border: "1px solid var(--color-border)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>↵</kbd>
                Open
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
