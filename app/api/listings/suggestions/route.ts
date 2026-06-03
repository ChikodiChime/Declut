import type { Suggestion } from '@/types'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'

const SUGGESTIONS_LIMIT = 6
const MAX_Q_LENGTH = 100

export type { Suggestion }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim().slice(0, MAX_Q_LENGTH)

  if (!q || q.length < 2) return ok([])

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, listing_type, images')
    .eq('status', 'available')
    .ilike('title', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(SUGGESTIONS_LIMIT)

  if (error) {
    console.error('Suggestions error:', error)
    return err('Failed to fetch suggestions', 'SERVER_ERROR', 500)
  }

  return ok(data ?? [])
}
