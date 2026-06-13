import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { validateUpdateBody } from './utils'
import { ok, err } from '@/lib/api-response'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('*, seller:users(id, name, account_type, avatar_url)')
    .eq('id', id)
    .single()

  if (error || !listing) {
    return err('Listing not found', 'NOT_FOUND', 404)
  }

  return ok(listing)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { id } = await params

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('seller_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return err('Listing not found', 'NOT_FOUND', 404)
  }

  if (existing.seller_id !== authUser.id) {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }
  const validated = validateUpdateBody(body as Record<string, unknown>)

  if ('error' in validated) {
    return err(validated.error, 'VALIDATION_ERROR', 400)
  }

  if (validated.data.status === 'available') {
    const { data: seller } = await supabaseAdmin
      .from('users')
      .select('paystack_onboarding_complete')
      .eq('id', authUser.id)
      .single()

    if (!seller?.paystack_onboarding_complete) {
      return err(
        'Connect your Paystack account to publish this listing',
        'PAYSTACK_NOT_CONNECTED',
        403
      )
    }
  }

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .update(validated.data)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !listing) {
    console.error('Update listing error:', error)
    return err('Failed to update listing', 'SERVER_ERROR', 500)
  }

  return ok(listing)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { id } = await params

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('seller_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return err('Listing not found', 'NOT_FOUND', 404)
  }

  if (existing.seller_id !== authUser.id) {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { error } = await supabaseAdmin
    .from('listings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Delete listing error:', error)
    return err('Failed to delete listing', 'SERVER_ERROR', 500)
  }

  return ok({ ok: true })
}
