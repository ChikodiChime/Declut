import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { ok, err } from '@/lib/api-response'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.account_type !== 'admin') {
    return err('Forbidden', 'FORBIDDEN', 403)
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: totalListings },
    { count: activeOrders },
    { count: completedOrders },
    { data: completedOrderData },
    { data: platformRevenueData },
    { count: newUsersThisWeek },
    { count: listingsThisWeek },
    { count: ordersThisWeek },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).neq('status', 'removed'),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'paid', 'confirmed', 'shipped', 'delivered']),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabaseAdmin.from('orders').select('total_price.sum()').eq('status', 'completed').single(),
    supabaseAdmin.from('orders').select('platform_fee.sum()').eq('status', 'completed').single(),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo).neq('status', 'removed'),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true })
      .eq('status', 'completed').gte('created_at', weekAgo),
  ])

  const gmv = (completedOrderData as { total_price: number | null } | null)?.total_price ?? 0
  const platformRevenue = (platformRevenueData as { platform_fee: number | null } | null)?.platform_fee ?? 0

  return ok({
    totalUsers: totalUsers ?? 0,
    totalListings: totalListings ?? 0,
    activeOrders: activeOrders ?? 0,
    completedOrders: completedOrders ?? 0,
    gmv,
    platformRevenue,
    newUsersThisWeek: newUsersThisWeek ?? 0,
    listingsThisWeek: listingsThisWeek ?? 0,
    ordersThisWeek: ordersThisWeek ?? 0,
  })
}
