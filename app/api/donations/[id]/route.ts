import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const VALID_HANDOFF_STATUSES = ['pending', 'received'] as const
const VALID_DELIVERY_STATUSES = ['pending', 'delivered'] as const

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const { handoff_status, delivery_status, assigned_charity_id } =
    body as Record<string, unknown>

  if (!handoff_status && !delivery_status && !assigned_charity_id) {
    return err(
      'Provide at least one of: handoff_status, delivery_status, assigned_charity_id',
      'VALIDATION_ERROR',
      400
    )
  }

  if (handoff_status && !VALID_HANDOFF_STATUSES.includes(handoff_status as typeof VALID_HANDOFF_STATUSES[number])) {
    return err('Invalid handoff_status', 'VALIDATION_ERROR', 400)
  }

  if (delivery_status && !VALID_DELIVERY_STATUSES.includes(delivery_status as typeof VALID_DELIVERY_STATUSES[number])) {
    return err('Invalid delivery_status', 'VALIDATION_ERROR', 400)
  }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {}

  if (handoff_status) {
    updates.handoff_status = handoff_status
    if (handoff_status === 'received') updates.received_at = now
  }

  if (delivery_status) {
    updates.delivery_status = delivery_status
    if (delivery_status === 'delivered') updates.delivered_at = now
  }

  if (assigned_charity_id && typeof assigned_charity_id === 'string') {
    updates.assigned_charity_id = assigned_charity_id
  }

  const { data: donation, error: updateError } = await supabaseAdmin
    .from('donations')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError || !donation) {
    console.error('Update donation error:', updateError)
    return err('Failed to update donation', 'SERVER_ERROR', 500)
  }

  if (delivery_status === 'delivered') {
    await supabaseAdmin
      .from('listings')
      .update({ status: 'donated' })
      .eq('id', donation.listing_id)
  }

  return ok(donation)
}
