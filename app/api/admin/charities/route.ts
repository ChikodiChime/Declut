import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('charities')
    .select('id, name, description, active')
    .order('name', { ascending: true })

  if (error) return err('Failed to fetch charities', 'SERVER_ERROR', 500)
  return ok({ charities: data })
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  let body: { name?: unknown; description?: unknown }
  try {
    body = await req.json()
  } catch {
    return err('Invalid request body', 'BAD_REQUEST', 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : null
  const description = typeof body.description === 'string' ? body.description.trim() : ''

  if (!name || name.length < 2) return err('Name is required', 'VALIDATION_ERROR', 400)

  const { data, error } = await supabaseAdmin
    .from('charities')
    .insert({ name, description, active: true })
    .select('id, name, description, active')
    .single()

  if (error || !data) return err('Failed to create charity', 'SERVER_ERROR', 500)
  return ok({ charity: data }, 201)
}
