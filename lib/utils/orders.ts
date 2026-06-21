import type { BuyerOrder } from '@/lib/hooks/useBuyerOrders'

export type CheckoutGroup = {
  paystackReference: string | null
  orders: BuyerOrder[]
  createdAt: string
}

export function groupByCheckout(orders: BuyerOrder[]): CheckoutGroup[] {
  const map = new Map<string, BuyerOrder[]>()
  for (const order of orders) {
    const key = order.paystack_reference ?? order.id
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(order)
  }
  return Array.from(map.entries()).map(([, group]) => ({
    paystackReference: group[0].paystack_reference,
    orders: group,
    createdAt: group[0].created_at,
  }))
}
