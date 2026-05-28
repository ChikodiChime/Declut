import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  // Count active listings per seller, return top 100 sorted by listing count
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('seller_id, users!inner(id, name)')
    .eq('status', 'available')

  if (error) return err('Failed to fetch sellers', 'SERVER_ERROR', 500)

  // Aggregate by seller and count listings
  const countMap = new Map<string, { id: string; name: string | null; count: number }>()
  for (const row of data ?? []) {
    const u = row.users as { id: string; name: string | null } | { id: string; name: string | null }[] | null
    const user = Array.isArray(u) ? u[0] : u
    if (!user) continue
    const existing = countMap.get(user.id)
    if (existing) {
      existing.count++
    } else {
      countMap.set(user.id, { id: user.id, name: user.name, count: 1 })
    }
  }

  const sellers = [...countMap.values()]
    .sort((a, b) => b.count - a.count || (a.name ?? '').localeCompare(b.name ?? ''))
    .slice(0, 100)
    .map(({ id, name }) => ({ id, name }))

  return ok(sellers)
}
