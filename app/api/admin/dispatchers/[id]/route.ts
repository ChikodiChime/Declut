import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  const [dispatcherRes, ordersRes] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, name, email, phone, suspended, created_at')
      .eq('id', id)
      .eq('account_type', 'dispatcher')
      .single(),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('dispatcher_id', id),
  ])

  if (dispatcherRes.error || !dispatcherRes.data) {
    return err('Dispatcher not found', 'NOT_FOUND', 404)
  }

  return ok({
    dispatcher: dispatcherRes.data,
    deliveriesTotal: ordersRes.count ?? 0,
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { id } = await params

  let body: { name?: unknown; email?: unknown; phone?: unknown; suspended?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : null
    if (!name || name.length < 2) return err('Name must be at least 2 characters', 'VALIDATION_ERROR', 400)
    updates.name = name
  }

  if (body.email !== undefined) {
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : null
    if (!email || !EMAIL_REGEX.test(email)) return err('Valid email is required', 'VALIDATION_ERROR', 400)

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .single()
    if (existing) return err('Email is already in use', 'CONFLICT', 409)
    updates.email = email
  }

  if (body.phone !== undefined) {
    updates.phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null
  }

  if (body.suspended !== undefined) {
    if (typeof body.suspended !== 'boolean') return err('suspended must be a boolean', 'VALIDATION_ERROR', 400)
    updates.suspended = body.suspended
  }

  if (Object.keys(updates).length === 0) return err('No fields to update', 'VALIDATION_ERROR', 400)

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', id)
    .eq('account_type', 'dispatcher')
    .select('id, name, email, phone, suspended, created_at')
    .single()

  if (error || !data) return err('Dispatcher not found', 'NOT_FOUND', 404)
  return ok({ dispatcher: data })
}
