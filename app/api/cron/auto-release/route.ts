import { supabaseAdmin } from '@/lib/supabase'
import { executePayout } from '@/lib/payout'

const STALE_DAYS = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return new Response('Unauthorized', { status: 401 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const cutoff = new Date(Date.now() - STALE_DAYS * MS_PER_DAY).toISOString()

  const [confirmedResult, shippedResult] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('status', 'confirmed')
      .lt('confirmed_at', cutoff),
    supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('status', 'shipped')
      .lt('shipped_at', cutoff),
  ])

  if (confirmedResult.error || shippedResult.error) {
    console.error('Auto-release fetch error:', confirmedResult.error ?? shippedResult.error)
    return new Response('Internal error', { status: 500 })
  }

  const staleOrders = [...(confirmedResult.data ?? []), ...(shippedResult.data ?? [])]

  if (staleOrders.length === 0) {
    return Response.json({ released: 0 })
  }

  const results = await Promise.allSettled(
    staleOrders.map((order) => executePayout(order.id))
  )

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  const failed = failures.length
  if (failed > 0) {
    failures.forEach((r) => console.error('Auto-release payout failed:', r.reason))
    console.error(`Auto-release: ${failed} of ${staleOrders.length} payouts failed`)
  }

  const released = staleOrders.length - failed
  return Response.json(failed > 0 ? { released, failed } : { released })
}
