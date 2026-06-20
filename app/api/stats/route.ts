import { supabaseAdmin } from '@/lib/supabase'
import { ok } from '@/lib/api-response'

export const revalidate = 300 // Cache for 5 minutes

export async function GET() {
  const [
    { count: totalListings },
    { count: totalSellers },
    { count: totalOrders },
  ] = await Promise.all([
    supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available'),
    supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('account_type', ['individual', 'business'])
      .eq('paystack_onboarding_complete', true),
    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
  ])

  return ok({
    totalListings: totalListings ?? 0,
    totalSellers: totalSellers ?? 0,
    totalOrders: totalOrders ?? 0,
  })
}
