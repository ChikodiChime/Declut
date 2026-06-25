const KEY = 'declutter_guest_refs'
const MAX_REFS = 5

export function saveGuestRef(ref: string): void {
  try {
    const existing = readGuestRefs()
    const updated = [ref, ...existing.filter((r) => r !== ref)].slice(0, MAX_REFS)
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {}
}

export function readGuestRefs(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = JSON.parse(raw ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function removeGuestRef(ref: string): void {
  try {
    const updated = readGuestRefs().filter((r) => r !== ref)
    if (updated.length === 0) {
      localStorage.removeItem(KEY)
    } else {
      localStorage.setItem(KEY, JSON.stringify(updated))
    }
  } catch {}
}

export function clearGuestRefs(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}
