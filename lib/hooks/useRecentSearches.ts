import { useState, useCallback } from 'react'

const KEY = 'unstash:recent-searches'
const MAX = 5

function load(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(items: string[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>(load)

  const add = useCallback((query: string) => {
    const q = query.trim()
    if (!q) return
    setRecents((prev) => {
      const next = [q, ...prev.filter((r) => r !== q)].slice(0, MAX)
      save(next)
      return next
    })
  }, [])

  const remove = useCallback((query: string) => {
    setRecents((prev) => {
      const next = prev.filter((r) => r !== query)
      save(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    save([])
    setRecents([])
  }, [])

  return { recents, add, remove, clear }
}
