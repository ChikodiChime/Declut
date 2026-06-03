import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'

export type Suggestion = {
  id: string
  title: string
  listing_type: 'for_sale' | 'free' | 'donate'
  images: string[]
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) return ok([])

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, listing_type, images')
    .eq('status', 'available')
    .ilike('title', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) {
    console.error('Suggestions error:', error)
    return err('Failed to fetch suggestions', 'SERVER_ERROR', 500)
  }

  return ok(data ?? [])
}
