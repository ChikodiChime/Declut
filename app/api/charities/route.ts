import { supabaseAdmin } from '@/lib/supabase'
import { list, err } from '@/lib/api-response'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('charities')
    .select('id, name, description, logo_url')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) return err('Failed to fetch charities', 'SERVER_ERROR', 500)

  return list(data ?? [], { total: data?.length ?? 0, limit: 100, offset: 0 })
}
