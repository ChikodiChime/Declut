// app/api/user/addresses/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

const MAX_ADDRESSES = 10

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  const { data, error } = await supabaseAdmin
    .from('user_addresses')
    .select('*')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: true })

  if (error) return err('Failed to fetch addresses', 'DB_ERROR', 500)

  return ok(data ?? [])
}

export async function POST(req: Request) {
  const authUser = await getAuthUser()
  if (!authUser) return err('Unauthorized', 'UNAUTHORIZED', 401)

  let body: { label?: unknown; address?: unknown; address_state?: unknown; is_default?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'PARSE_ERROR', 400)
  }

  const { label, address, address_state, is_default } = body

  if (!label || typeof label !== 'string' || label.trim().length === 0 || label.trim().length > 30) {
    return err('Label must be 1–30 characters', 'VALIDATION_ERROR', 400)
  }
  if (!address || typeof address !== 'string' || address.trim().length === 0 || address.trim().length > 300) {
    return err('Address must be 1–300 characters', 'VALIDATION_ERROR', 400)
  }
  if (address_state !== undefined && address_state !== null && typeof address_state !== 'string') {
    return err('Invalid address_state', 'VALIDATION_ERROR', 400)
  }

  // Enforce 10-address limit
  const { count } = await supabaseAdmin
    .from('user_addresses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authUser.id)

  if ((count ?? 0) >= MAX_ADDRESSES) {
    return err('Address limit reached (max 10)', 'LIMIT_EXCEEDED', 422)
  }

  // If setting as default, clear existing default first
  if (is_default) {
    await supabaseAdmin
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', authUser.id)
  }

  const { data, error } = await supabaseAdmin
    .from('user_addresses')
    .insert({
      user_id: authUser.id,
      label: label.trim(),
      address: address.trim(),
      address_state: typeof address_state === 'string' ? address_state.trim() || null : null,
      is_default: Boolean(is_default),
    })
    .select('*')
    .single()

  if (error || !data) return err('Failed to create address', 'DB_ERROR', 500)

  return ok(data, 201)
}
