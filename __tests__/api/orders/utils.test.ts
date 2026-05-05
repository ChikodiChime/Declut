import { describe, it, expect } from 'vitest'
import {
  validateCartItems,
  groupBySeller,
  calculateDeliveryFee,
  calculateGrandTotal,
} from '@/app/api/orders/utils'
import { LAGOS_DELIVERY_FEE, OUTSIDE_LAGOS_DELIVERY_FEE } from '@/lib/constants'

const makeListing = (overrides: Record<string, unknown> = {}) => ({
  id: 'listing-1',
  title: 'Test Item',
  price: 5000,
  listing_type: 'for_sale',
  status: 'available',
  seller_id: 'seller-1',
  area: 'Ajah, Lagos',
  images: [],
  ...overrides,
})

const makeCartItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'cart-1',
  listing_id: 'listing-1',
  listing: makeListing(),
  ...overrides,
})

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
  it('returns Lagos fee for Lagos areas', () => {
    expect(calculateDeliveryFee('Lekki, Lagos')).toBe(LAGOS_DELIVERY_FEE)
    expect(calculateDeliveryFee('Ajah, Lagos')).toBe(LAGOS_DELIVERY_FEE)
  })

  it('returns outside Lagos fee for non-Lagos areas', () => {
    expect(calculateDeliveryFee('Kano, Kano')).toBe(OUTSIDE_LAGOS_DELIVERY_FEE)
    expect(calculateDeliveryFee('Port Harcourt, Rivers')).toBe(OUTSIDE_LAGOS_DELIVERY_FEE)
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

  it('sets delivery_fee from listing area', () => {
    const items = [
      makeCartItem({ id: 'c1', listing: makeListing({ seller_id: 'seller-1', area: 'Ajah, Lagos' }) }),
      makeCartItem({ id: 'c2', listing: makeListing({ id: 'l2', seller_id: 'seller-2', area: 'Kano, Kano' }) }),
    ]
    const groups = groupBySeller(items, 'delivery')
    expect(groups.find(g => g.seller_id === 'seller-1')?.delivery_fee).toBe(LAGOS_DELIVERY_FEE)
    expect(groups.find(g => g.seller_id === 'seller-2')?.delivery_fee).toBe(OUTSIDE_LAGOS_DELIVERY_FEE)
  })

  it('sets delivery_fee to 0 for pickup', () => {
    const groups = groupBySeller([makeCartItem()], 'pickup')
    expect(groups[0].delivery_fee).toBe(0)
  })

  it('calculates group total as subtotal + delivery_fee', () => {
    const groups = groupBySeller(
      [makeCartItem({ listing: makeListing({ price: 5000, area: 'Ajah, Lagos' }) })],
      'delivery'
    )
    expect(groups[0].total).toBe(5000 + LAGOS_DELIVERY_FEE)
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
