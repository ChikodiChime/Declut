import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const SELLER_TRANSITIONS: Record<string, string> = {
  accepted: 'pending',
  cancelled: 'pending',
}

const BUYER_TRANSITIONS: Record<string, string> = {
  completed: 'accepted',
  cancelled: 'pending',
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  const { data: claim, error: fetchError } = await supabaseAdmin
    .from('claims')
    .select('*, listing:listings(seller_id)')
    .eq('id', id)
    .single()

  if (fetchError || !claim) return err('Claim not found', 'NOT_FOUND', 404)

  const isSeller = claim.listing.seller_id === authUser.id
  const isBuyer = claim.buyer_id === authUser.id

  if (!isSeller && !isBuyer) return err('Forbidden', 'FORBIDDEN', 403)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const { status, pickup_address } = body as Record<string, unknown>

  if (!status || typeof status !== 'string') {
    return err('status is required', 'VALIDATION_ERROR', 400)
  }

  const allowedTransitions = isSeller ? SELLER_TRANSITIONS : BUYER_TRANSITIONS

  if (!(status in allowedTransitions)) {
    return err(`Cannot set status to ${status}`, 'VALIDATION_ERROR', 400)
  }

  if (allowedTransitions[status] !== claim.status) {
    return err(
      `Claim must be in '${allowedTransitions[status]}' status to transition to '${status}'`,
      'CONFLICT',
      409
    )
  }

  if (status === 'accepted') {
    if (!pickup_address || typeof pickup_address !== 'string' || !pickup_address.trim()) {
      return err('pickup_address is required when accepting a claim', 'VALIDATION_ERROR', 400)
    }
  }

  const now = new Date().toISOString()
  const timestamps: Record<string, string> = {
    accepted: 'accepted_at',
    completed: 'completed_at',
  }

  const updates: Record<string, unknown> = { status }
  if (timestamps[status]) updates[timestamps[status]] = now
  if (status === 'accepted' && pickup_address) updates.pickup_address = (pickup_address as string).trim()

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('claims')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError || !updated) {
    console.error('Update claim error:', updateError)
    return err('Failed to update claim', 'SERVER_ERROR', 500)
  }

  if (status === 'cancelled') {
    await supabaseAdmin
      .from('listings')
      .update({ status: 'available' })
      .eq('id', claim.listing_id)
  }

  if (status === 'completed') {
    // 'sold' is the closest available terminal status; free items don't have a dedicated 'given' status in MVP
    await supabaseAdmin
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', claim.listing_id)
  }

  return ok(updated)
}
