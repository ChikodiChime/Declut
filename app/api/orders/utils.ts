import {
  DELIVERY_RATES,
  SIZE_ORDER,
  DEFAULT_SIZE_CATEGORY,
  type DeliveryZone,
} from '@/lib/constants'
import type { SizeCategory } from '@/types'

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
    size_category: SizeCategory | null
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

function zoneForArea(area: string): DeliveryZone {
  if (!area) return 'outside'
  return area.toLowerCase().includes('lagos') ? 'lagos' : 'outside'
}

function zoneForState(state: string | null): DeliveryZone {
  if (!state) return 'outside'
  return state.toLowerCase() === 'lagos' ? 'lagos' : 'outside'
}

// The vehicle needed for a group is the one large enough for its biggest item.
function largestSize(items: CartItemWithListing[]): SizeCategory {
  return items.reduce<SizeCategory>((largest, item) => {
    const size = item.listing.size_category ?? DEFAULT_SIZE_CATEGORY
    return SIZE_ORDER.indexOf(size) > SIZE_ORDER.indexOf(largest) ? size : largest
  }, SIZE_ORDER[0])
}

export function calculateDeliveryFee(
  area: string,
  sizeCategory: SizeCategory | null = DEFAULT_SIZE_CATEGORY
): number {
  const zone = zoneForArea(area)
  const size = sizeCategory ?? DEFAULT_SIZE_CATEGORY
  return DELIVERY_RATES[zone][size]
}

export function groupBySeller(
  items: CartItemWithListing[],
  deliveryType: 'delivery' | 'pickup',
  buyerState?: string | null
): SellerGroup[] {
  const map = new Map<string, CartItemWithListing[]>()
  for (const item of items) {
    const sid = item.listing.seller_id
    if (!map.has(sid)) map.set(sid, [])
    map.get(sid)!.push(item)
  }
  return Array.from(map.entries()).map(([seller_id, sellerItems]) => {
    const subtotal = sellerItems.reduce((sum, i) => sum + i.listing.price, 0)
    let delivery_fee = 0
    if (deliveryType === 'delivery') {
      const sellerZone = zoneForArea(sellerItems[0].listing.area)
      // When buyerState is undefined (not provided), only the seller zone matters.
      // When buyerState is null (explicitly unknown), default to outside rate.
      const buyerZone = buyerState !== undefined ? zoneForState(buyerState) : sellerZone
      const effectiveZone: DeliveryZone =
        sellerZone === 'outside' || buyerZone === 'outside' ? 'outside' : 'lagos'
      delivery_fee = DELIVERY_RATES[effectiveZone][largestSize(sellerItems)]
    }
    return { seller_id, items: sellerItems, subtotal, delivery_fee, total: subtotal + delivery_fee }
  })
}

export function calculateGrandTotal(groups: SellerGroup[]): number {
  return groups.reduce((sum, g) => sum + g.total, 0)
}
