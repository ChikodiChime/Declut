import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { validateUpdateBody } from './utils'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !listing) {
    return Response.json({ error: 'Listing not found' }, { status: 404 })
  }

  return Response.json({ listing })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('seller_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return Response.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (existing.seller_id !== authUser.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const validated = validateUpdateBody(body)

  if ('error' in validated) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .update(validated.data)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !listing) {
    console.error('Update listing error:', error)
    return Response.json({ error: 'Failed to update listing' }, { status: 500 })
  }

  return Response.json({ listing })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('seller_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return Response.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (existing.seller_id !== authUser.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('listings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Delete listing error:', error)
    return Response.json({ error: 'Failed to delete listing' }, { status: 500 })
  }

  return Response.json({ success: true })
}
