import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'
import { VALID_CATEGORIES } from '@/app/api/listings/utils'
import type { ListingType } from '@/types'

const VALID_LISTING_TYPES: ListingType[] = ['for_sale', 'free', 'donate']

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authUser = await getAuthUser()

  const { data: request, error } = await supabaseAdmin
    .from('item_requests')
    .select('*, requester:users!item_requests_user_id_fkey(id, name, avatar_url), follow_count:request_follows(count)')
    .eq('id', id)
    .single()

  if (error || !request) return err('Request not found', 'NOT_FOUND', 404)

  let is_following = false
  if (authUser) {
    const { data } = await supabaseAdmin
      .from('request_follows')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('request_id', id)
      .maybeSingle()
    is_following = !!data
  }

  return ok({
    ...request,
    follow_count: (request.follow_count as unknown as { count: number }[])?.[0]?.count ?? 0,
    is_following,
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data: existing } = await supabaseAdmin
    .from('item_requests')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing) return err('Request not found', 'NOT_FOUND', 404)
  if (existing.user_id !== authUser.id) return err('Forbidden', 'FORBIDDEN', 403)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const b = body as Record<string, unknown>
  const updates: Record<string, unknown> = {}

  // Status toggle (open/close)
  if (b.status !== undefined) {
    if (b.status !== 'open' && b.status !== 'closed') {
      return err('status must be open or closed', 'VALIDATION_ERROR', 400)
    }
    updates.status = b.status
  }

  // Full edit fields
  if (b.title !== undefined) {
    if (typeof b.title !== 'string' || b.title.trim().length < 3) {
      return err('title must be at least 3 characters', 'VALIDATION_ERROR', 400)
    }
    if ((b.title as string).length > 100) {
      return err('title must be 100 characters or fewer', 'VALIDATION_ERROR', 400)
    }
    updates.title = (b.title as string).trim()
  }

  if (b.description !== undefined) {
    if (b.description && typeof b.description === 'string' && b.description.length > 500) {
      return err('description must be 500 characters or fewer', 'VALIDATION_ERROR', 400)
    }
    updates.description = typeof b.description === 'string' && b.description.trim() ? b.description.trim() : null
  }

  if (b.category !== undefined) {
    if (b.category && !VALID_CATEGORIES.includes(b.category as string)) {
      return err('Invalid category', 'VALIDATION_ERROR', 400)
    }
    updates.category = (b.category as string) || null
  }

  if (b.listing_type !== undefined) {
    if (b.listing_type && !VALID_LISTING_TYPES.includes(b.listing_type as ListingType)) {
      return err('Invalid listing_type', 'VALIDATION_ERROR', 400)
    }
    updates.listing_type = (b.listing_type as string) || null
  }

  if (b.area !== undefined) {
    updates.area = typeof b.area === 'string' && b.area.trim() ? b.area.trim() : null
  }

  if (b.max_price !== undefined) {
    if (b.max_price !== null) {
      const price = Number(b.max_price)
      if (isNaN(price) || price <= 0) {
        return err('max_price must be a positive number', 'VALIDATION_ERROR', 400)
      }
      updates.max_price = price
    } else {
      updates.max_price = null
    }
  }

  if (Object.keys(updates).length === 0) {
    return err('No valid fields to update', 'VALIDATION_ERROR', 400)
  }

  const { data: updated, error } = await supabaseAdmin
    .from('item_requests')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !updated) return err('Failed to update request', 'SERVER_ERROR', 500)

  return ok(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data: existing } = await supabaseAdmin
    .from('item_requests')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing) return err('Request not found', 'NOT_FOUND', 404)
  if (existing.user_id !== authUser.id) return err('Forbidden', 'FORBIDDEN', 403)

  const { error } = await supabaseAdmin
    .from('item_requests')
    .delete()
    .eq('id', id)

  if (error) return err('Failed to delete request', 'SERVER_ERROR', 500)

  return ok({ deleted: true })
}
