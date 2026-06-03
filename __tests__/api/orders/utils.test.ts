import { describe, it, expect } from 'vitest'
import {
  validateCartItems,
  groupBySeller,
  calculateDeliveryFee,
  calculateGrandTotal,
  type CartItemWithListing,
} from '@/app/api/orders/utils'
import { DELIVERY_RATES } from '@/lib/constants'

const makeListing = (overrides: Record<string, unknown> = {}): CartItemWithListing['listing'] => ({
  id: 'listing-1',
  title: 'Test Item',
  price: 5000,
  listing_type: 'for_sale',
  status: 'available',
  seller_id: 'seller-1',
  area: 'Ajah, Lagos',
  size_category: 'small',
  images: [],
  ...overrides,
} as CartItemWithListing['listing'])

const makeCartItem = (overrides: Record<string, unknown> = {}): CartItemWithListing => ({
  id: 'cart-1',
  listing_id: 'listing-1',
  listing: makeListing(),
  ...overrides,
} as CartItemWithListing)

describe('validateCartItems', () => {
  it('returns error when cart is empty', () => {
    expect(validateCartItems([])).toHaveProperty('error', 'Cart is empty')
  })

  it('returns error when a listing is sold', () => {
    const item = makeCartItem({ listing: makeListing({ status: 'sold' }) })
    expect(validateCartItems([item])).toHaveProperty('error')
  })

  it('returns error when a listing is not for_sale', () => {
    const item = makeCartItem({ listing: makeListing({ listing_type: 'free' }) })
    expect(validateCartItems([item])).toHaveProperty('error')
  })

  it('returns valid:true for a valid cart', () => {
    expect(validateCartItems([makeCartItem()])).toHaveProperty('valid', true)
  })
})

describe('calculateDeliveryFee', () => {
  it('returns Lagos rate for Lagos areas by size', () => {
    expect(calculateDeliveryFee('Lekki, Lagos', 'small')).toBe(DELIVERY_RATES.lagos.small)
    expect(calculateDeliveryFee('Ajah, Lagos', 'large')).toBe(DELIVERY_RATES.lagos.large)
  })

  it('returns outside-Lagos rate for non-Lagos areas by size', () => {
    expect(calculateDeliveryFee('Kano, Kano', 'small')).toBe(DELIVERY_RATES.outside.small)
    expect(calculateDeliveryFee('Port Harcourt, Rivers', 'extra_large')).toBe(DELIVERY_RATES.outside.extra_large)
  })

  it('charges more for larger vehicles in the same zone', () => {
    expect(calculateDeliveryFee('Lekki, Lagos', 'extra_large')).toBeGreaterThan(
      calculateDeliveryFee('Lekki, Lagos', 'small')
    )
  })

  it('falls back to the medium tier when size is null', () => {
    expect(calculateDeliveryFee('Lekki, Lagos', null)).toBe(DELIVERY_RATES.lagos.medium)
  })
})

describe('groupBySeller', () => {
  it('creates one group per seller', () => {
    const items = [
      makeCartItem({ id: 'c1', listing: makeListing({ seller_id: 'seller-1', price: 5000 }) }),
      makeCartItem({ id: 'c2', listing: makeListing({ id: 'listing-2', seller_id: 'seller-2', price: 3000, area: 'Kano, Kano' }) }),
    ]
    const groups = groupBySeller(items, 'delivery')
    expect(groups).toHaveLength(2)
  })

  it('sets delivery_fee from listing area and size', () => {
    const items = [
      makeCartItem({ id: 'c1', listing: makeListing({ seller_id: 'seller-1', area: 'Ajah, Lagos', size_category: 'small' }) }),
      makeCartItem({ id: 'c2', listing: makeListing({ id: 'l2', seller_id: 'seller-2', area: 'Kano, Kano', size_category: 'small' }) }),
    ]
    const groups = groupBySeller(items, 'delivery')
    expect(groups.find(g => g.seller_id === 'seller-1')?.delivery_fee).toBe(DELIVERY_RATES.lagos.small)
    expect(groups.find(g => g.seller_id === 'seller-2')?.delivery_fee).toBe(DELIVERY_RATES.outside.small)
  })

  it('uses the largest item vehicle for a mixed-size seller group', () => {
    const items = [
      makeCartItem({ id: 'c1', listing: makeListing({ seller_id: 'seller-1', area: 'Ajah, Lagos', size_category: 'small' }) }),
      makeCartItem({ id: 'c2', listing: makeListing({ id: 'l2', seller_id: 'seller-1', area: 'Ajah, Lagos', size_category: 'large' }) }),
    ]
    const groups = groupBySeller(items, 'delivery')
    expect(groups[0].delivery_fee).toBe(DELIVERY_RATES.lagos.large)
  })

  it('charges outside rate when buyer state is outside Lagos, seller is in Lagos', () => {
    const items = [
      makeCartItem({ listing: makeListing({ seller_id: 'seller-1', area: 'Ajah, Lagos', size_category: 'small' }) }),
    ]
    const groups = groupBySeller(items, 'delivery', 'FCT')
    expect(groups[0].delivery_fee).toBe(DELIVERY_RATES.outside.small)
  })

  it('charges Lagos rate when both buyer and seller are in Lagos', () => {
    const items = [
      makeCartItem({ listing: makeListing({ seller_id: 'seller-1', area: 'Ajah, Lagos', size_category: 'small' }) }),
    ]
    const groups = groupBySeller(items, 'delivery', 'Lagos')
    expect(groups[0].delivery_fee).toBe(DELIVERY_RATES.lagos.small)
  })

  it('charges outside rate when buyer state is null', () => {
    const items = [
      makeCartItem({ listing: makeListing({ seller_id: 'seller-1', area: 'Ajah, Lagos', size_category: 'small' }) }),
    ]
    const groups = groupBySeller(items, 'delivery', null)
    expect(groups[0].delivery_fee).toBe(DELIVERY_RATES.outside.small)
  })

  it('sets delivery_fee to 0 for pickup', () => {
    const groups = groupBySeller([makeCartItem()], 'pickup')
    expect(groups[0].delivery_fee).toBe(0)
  })

  it('calculates group total as subtotal + delivery_fee', () => {
    const groups = groupBySeller(
      [makeCartItem({ listing: makeListing({ price: 5000, area: 'Ajah, Lagos', size_category: 'small' }) })],
      'delivery'
    )
    expect(groups[0].total).toBe(5000 + DELIVERY_RATES.lagos.small)
  })
})

describe('calculateGrandTotal', () => {
  it('sums all group totals', () => {
    const groups = [
      { seller_id: 's1', items: [], subtotal: 5000, delivery_fee: 1500, total: 6500 },
      { seller_id: 's2', items: [], subtotal: 3000, delivery_fee: 3500, total: 6500 },
    ]
    expect(calculateGrandTotal(groups)).toBe(13000)
  })
})
