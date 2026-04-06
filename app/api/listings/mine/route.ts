import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('seller_id', authUser.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get my listings error:', error)
    return Response.json({ error: 'Failed to fetch listings' }, { status: 500 })
  }

  return Response.json({ listings: listings ?? [] })
}
