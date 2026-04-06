import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { validateListingBody } from './utils'

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const validated = validateListingBody(body)

  if ('error' in validated) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .insert({ ...validated.data, seller_id: authUser.id })
    .select('*')
    .single()

  if (error || !listing) {
    console.error('Create listing error:', error)
    return Response.json({ error: 'Failed to create listing' }, { status: 500 })
  }

  return Response.json({ listing }, { status: 201 })
}
