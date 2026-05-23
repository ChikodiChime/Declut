import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { list, err } from '@/lib/api-response'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data, error } = await supabaseAdmin
    .from('claims')
    .select('*, listing:listings(id, title, images, area, seller:users(id, name, avatar_url))')
    .eq('buyer_id', authUser.id)
    .order('claimed_at', { ascending: false })

  if (error) {
    console.error('Fetch buyer claims error:', error)
    return err('Failed to fetch claims', 'SERVER_ERROR', 500)
  }

  return list(data ?? [], { total: data?.length ?? 0, limit: 100, offset: 0 })
}
