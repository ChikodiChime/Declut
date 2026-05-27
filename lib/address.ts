// NOTE: Expects Nigerian address format "Street, Neighbourhood, LGA, State".
// Returns the second segment as a neighbourhood-level zone label.
export function deriveBuyerArea(address: string | null): string {
  if (!address) return 'Unknown area'
  const parts = address.split(',')
  return parts.length > 1 ? parts[1].trim() : parts[0].trim()
}
