import { supabaseAdmin } from '@/lib/supabase'
import { executePayout } from '@/lib/payout'

const STALE_DAYS = 14

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: staleOrders, error } = await supabaseAdmin
    .from('orders')
    .select('id, status')
    .in('status', ['confirmed', 'shipped'])
    .lt('created_at', cutoff)

  if (error) {
    console.error('Auto-release fetch error:', error)
    return new Response('Internal error', { status: 500 })
  }

  if (!staleOrders || staleOrders.length === 0) {
    return Response.json({ released: 0 })
  }

  const results = await Promise.allSettled(
    staleOrders.map((order) => executePayout(order.id))
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.error(`Auto-release: ${failed} of ${staleOrders.length} payouts failed`)
  }

  const released = staleOrders.length - failed
  return Response.json(failed > 0 ? { released, failed } : { released })
}
