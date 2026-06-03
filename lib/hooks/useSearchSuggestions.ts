import { useState, useEffect, useRef } from 'react'
import type { Suggestion } from '@/types'

export function useSearchSuggestions(query: string, enabled: boolean) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const q = query.trim()
    if (!enabled || q.length < 2) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/listings/suggestions?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const body = await res.json()
          setSuggestions(body.data ?? [])
        }
      } catch {
        // network error — fail silently, suggestions are non-critical
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, enabled])

  return { suggestions, loading }
}
