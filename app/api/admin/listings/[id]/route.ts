import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select(`
      id, title, description, price, category, condition, listing_type,
      area, images, status, size_category, pickup_address, created_at,
      seller:users!seller_id(id, name, email, account_type, suspended)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return err('Listing not found', 'NOT_FOUND', 404)
  return ok({ listing: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('listings')
    .select('id')
    .eq('id', id)
    .single()

  if (!existing) return err('Listing not found', 'NOT_FOUND', 404)

  const { error } = await supabaseAdmin
    .from('listings')
    .update({ status: 'removed' })
    .eq('id', id)

  if (error) return err('Failed to remove listing', 'SERVER_ERROR', 500)
  return ok({ ok: true })
}
