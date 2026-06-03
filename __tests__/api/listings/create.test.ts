import { describe, it, expect } from 'vitest'
import { validateListingBody } from '@/app/api/listings/utils'

describe('validateListingBody', () => {
  const valid = {
    listing_type: 'for_sale',
    title: 'Blue Nike shoes',
    description: 'Barely worn',
    category: 'Clothing & Accessories',
    condition: 'like_new',
    price: 15000,
    area: 'Ajah, Lagos',
    size_category: 'small',
    pickup_address: '15 Admiralty Way, Lekki Phase 1',
    images: ['listings/abc123'],
  }

  it('returns valid:true for a correct for_sale body', () => {
    const result = validateListingBody(valid)
    expect(result).toHaveProperty('valid', true)
  })

  it('returns error when listing_type is missing', () => {
    const result = validateListingBody({ ...valid, listing_type: undefined })
    expect(result).toHaveProperty('error')
  })

  it('returns error when listing_type is invalid', () => {
    const result = validateListingBody({ ...valid, listing_type: 'auction' })
    expect(result).toHaveProperty('error')
  })

  it('returns error when title is missing', () => {
    const result = validateListingBody({ ...valid, title: undefined })
    expect(result).toHaveProperty('error')
  })

  it('returns error when title exceeds 100 chars', () => {
    const result = validateListingBody({ ...valid, title: 'a'.repeat(101) })
    expect(result).toHaveProperty('error')
  })

  it('returns error when category is invalid', () => {
    const result = validateListingBody({ ...valid, category: 'Weapons' })
    expect(result).toHaveProperty('error')
  })

  it('returns error when condition is invalid', () => {
    const result = validateListingBody({ ...valid, condition: 'perfect' })
    expect(result).toHaveProperty('error')
  })

  it('returns error when for_sale has no price', () => {
    const result = validateListingBody({ ...valid, price: undefined })
    expect(result).toHaveProperty('error')
  })

  it('returns error when for_sale price is 0', () => {
    const result = validateListingBody({ ...valid, price: 0 })
    expect(result).toHaveProperty('error')
  })

  it('does not require price for free listings', () => {
    const result = validateListingBody({ ...valid, listing_type: 'free', price: undefined })
    expect(result).toHaveProperty('valid', true)
  })

  it('returns error when images array is empty', () => {
    const result = validateListingBody({ ...valid, images: [] })
    expect(result).toHaveProperty('error')
  })

  it('returns error when images array has more than 5 items', () => {
    const result = validateListingBody({ ...valid, images: ['a', 'b', 'c', 'd', 'e', 'f'] })
    expect(result).toHaveProperty('error')
  })

  it('returns error when area is missing', () => {
    const result = validateListingBody({ ...valid, area: undefined })
    expect(result).toHaveProperty('error')
  })

  it('sets price to null for free listings', () => {
    const result = validateListingBody({ ...valid, listing_type: 'free', price: undefined })
    if ('valid' in result) {
      expect(result.data.price).toBeNull()
    }
  })
})
