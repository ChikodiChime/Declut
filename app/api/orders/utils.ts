import { LAGOS_DELIVERY_FEE, OUTSIDE_LAGOS_DELIVERY_FEE } from '@/lib/constants'

export type CartItemWithListing = {
  id: string
  listing_id: string
  listing: {
    id: string
    title: string
    price: number
    listing_type: string
    status: string
    seller_id: string
    area: string
    images: string[]
  }
}

export type SellerGroup = {
  seller_id: string
  items: CartItemWithListing[]
  subtotal: number
  delivery_fee: number
  total: number
}

export function validateCartItems(
  items: CartItemWithListing[]
): { error: string } | { valid: true } {
  if (items.length === 0) return { error: 'Cart is empty' }
  const unavailable = items.filter(
    (i) => i.listing.status !== 'available' || i.listing.listing_type !== 'for_sale'
  )
  if (unavailable.length > 0) {
    return { error: `Items no longer available: ${unavailable.map((i) => i.listing.title).join(', ')}` }
  }
  return { valid: true }
}

export function calculateDeliveryFee(area: string): number {
  return area.toLowerCase().includes('lagos') ? LAGOS_DELIVERY_FEE : OUTSIDE_LAGOS_DELIVERY_FEE
}

export function groupBySeller(
  items: CartItemWithListing[],
  deliveryType: 'delivery' | 'pickup'
): SellerGroup[] {
  const map = new Map<string, CartItemWithListing[]>()
  for (const item of items) {
    const sid = item.listing.seller_id
    if (!map.has(sid)) map.set(sid, [])
    map.get(sid)!.push(item)
  }
  return Array.from(map.entries()).map(([seller_id, sellerItems]) => {
    const subtotal = sellerItems.reduce((sum, i) => sum + i.listing.price, 0)
    const delivery_fee =
      deliveryType === 'pickup' ? 0 : calculateDeliveryFee(sellerItems[0].listing.area)
    return { seller_id, items: sellerItems, subtotal, delivery_fee, total: subtotal + delivery_fee }
  })
}

export function calculateGrandTotal(groups: SellerGroup[]): number {
  return groups.reduce((sum, g) => sum + g.total, 0)
}
