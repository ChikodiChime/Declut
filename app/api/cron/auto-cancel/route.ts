import { supabaseAdmin } from '@/lib/supabase'
import { executeAutoCancel } from '@/lib/auto-cancel'

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

  const { data: staleOrders, error } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('status', 'paid')
    .lt('auto_cancel_at', new Date().toISOString())

  if (error) {
    console.error('Auto-cancel fetch error:', error)
    return new Response('Internal error', { status: 500 })
  }

  if (!staleOrders || staleOrders.length === 0) {
    return Response.json({ cancelled: 0 })
  }

  const results = await Promise.allSettled(
    staleOrders.map((order) => executeAutoCancel(order.id))
  )

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  const failed = failures.length
  if (failed > 0) {
    failures.forEach((r) => console.error('Auto-cancel failed:', r.reason))
    console.error(`Auto-cancel: ${failed} of ${staleOrders.length} cancellations failed`)
  }

  const cancelled = staleOrders.length - failed
  return Response.json(failed > 0 ? { cancelled, failed } : { cancelled })
}
