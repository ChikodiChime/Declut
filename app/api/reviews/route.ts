import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const seller_id = searchParams.get('seller_id')

  if (!seller_id) return err('seller_id is required', 'VALIDATION_ERROR', 400)

  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('rating')
    .eq('seller_id', seller_id)

  const count = reviews?.length ?? 0
  const avg = count > 0
    ? Math.round((reviews!.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
    : null

  return ok({ review_count: count, avg_rating: avg })
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401)

  let body: unknown
  try { body = await req.json() } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const { order_id, rating, comment } = body as Record<string, unknown>

  if (!order_id || typeof order_id !== 'string')
    return err('order_id is required', 'VALIDATION_ERROR', 400)
  if (typeof rating !== 'number' || rating < 1 || rating > 5)
    return err('rating must be 1–5', 'VALIDATION_ERROR', 400)
  if (comment !== undefined && comment !== null && typeof comment !== 'string')
    return err('comment must be a string', 'VALIDATION_ERROR', 400)

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, buyer_id, status')
    .eq('id', order_id)
    .eq('buyer_id', user.id)
    .single()

  if (!order) return err('Order not found', 'NOT_FOUND', 404)
  if (!['delivered', 'completed'].includes(order.status))
    return err('Order must be delivered before reviewing', 'INVALID_STATE', 409)

  const { data: existing } = await supabaseAdmin
    .from('reviews')
    .select('id')
    .eq('order_id', order_id)
    .maybeSingle()

  if (existing) return err('You have already reviewed this order', 'DUPLICATE', 409)

  const { data: review, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      order_id,
      reviewer_id: user.id,
      seller_id: order.seller_id,
      rating: Math.round(rating as number),
      comment: typeof comment === 'string' && comment.trim() ? comment.trim() : null,
    })
    .select()
    .single()

  if (error) {
    console.error('Create review error:', error)
    return err('Failed to create review', 'SERVER_ERROR', 500)
  }

  return ok(review, 201)
}
