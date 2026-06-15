import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  const [profileRes, listingsRes, purchasesRes, salesRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, name, email, account_type, suspended, created_at, phone, avatar_url, wallet_balance, paystack_onboarding_complete')
      .eq('id', id)
      .single(),

    supabaseAdmin
      .from('listings')
      .select('id, title, status, listing_type, created_at', { count: 'exact' })
      .eq('seller_id', id)
      .order('created_at', { ascending: false })
      .limit(5),

    supabaseAdmin
      .from('orders')
      .select('id, status, total_price, created_at', { count: 'exact' })
      .eq('buyer_id', id)
      .order('created_at', { ascending: false })
      .limit(5),

    supabaseAdmin
      .from('orders')
      .select('id, status, total_price, created_at', { count: 'exact' })
      .eq('seller_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (profileRes.error || !profileRes.data) return err('User not found', 'NOT_FOUND', 404)

  return ok({
    user:           profileRes.data,
    listings:       listingsRes.data    ?? [],
    listingsTotal:  listingsRes.count   ?? 0,
    purchases:      purchasesRes.data   ?? [],
    purchasesTotal: purchasesRes.count  ?? 0,
    sales:          salesRes.data       ?? [],
    salesTotal:     salesRes.count      ?? 0,
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthUser()
  if (!authUser || authUser.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  let body: { suspended?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  if (typeof body.suspended !== 'boolean') {
    return err('suspended must be a boolean', 'VALIDATION_ERROR', 400)
  }

  if (id === authUser.id) {
    return err('Cannot suspend your own account', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ suspended: body.suspended })
    .eq('id', id)
    .select('id, name, email, suspended')
    .single()

  if (error || !data) return err('User not found', 'NOT_FOUND', 404)
  return ok({ user: data })
}
