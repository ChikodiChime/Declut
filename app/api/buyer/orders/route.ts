import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/api-response'
import { headers } from 'next/headers'

export async function GET() {
  const headersList = await headers()
  const buyerId = headersList.get('x-user-id')
  const accountType = headersList.get('x-user-account-type')

  if (!buyerId || accountType !== 'buyer') {
    return err('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, delivery_type, total_price, created_at,
      listing:listings(id, title, images)
    `)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Buyer orders fetch error:', error)
    return err('Failed to fetch orders', 'SERVER_ERROR', 500)
  }

  return ok(orders ?? [])
}
