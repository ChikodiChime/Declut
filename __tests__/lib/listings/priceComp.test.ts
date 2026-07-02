import { describe, it, expect } from 'vitest'
import { computePriceSuggestion } from '@/lib/listings/priceComp'

describe('computePriceSuggestion', () => {
  it('returns null suggestion when fewer than 3 comps exist', () => {
    const result = computePriceSuggestion('good', [
      { price: 1000, condition: 'good' },
      { price: 2000, condition: 'good' },
    ])
    expect(result).toEqual({ suggested_price: null, price_range: null, comp_count: 2 })
  })

  it('ignores comps with null or zero price when counting', () => {
    const result = computePriceSuggestion('good', [
      { price: null, condition: 'good' },
      { price: 0, condition: 'good' },
      { price: 1000, condition: 'good' },
      { price: 2000, condition: 'good' },
      { price: 3000, condition: 'good' },
    ])
    expect(result.comp_count).toBe(3)
  })

  it('returns a price suggestion and min/max range when 3 or more valid comps exist', () => {
    const result = computePriceSuggestion('good', [
      { price: 1000, condition: 'good' },
      { price: 2000, condition: 'good' },
      { price: 3000, condition: 'good' },
    ])
    expect(result.comp_count).toBe(3)
    expect(result.suggested_price).not.toBeNull()
    expect(result.price_range).toEqual({ min: 1000, max: 3000 })
  })

  it('weights comps matching the target condition more heavily in the median', () => {
    // 2 low-priced 'poor' comps vs 1 high-priced 'good' comp (target condition).
    // Without weighting the median would land on the poor price (1000).
    // With the matching-condition comp counted twice, the median shifts to 5000.
    const result = computePriceSuggestion('good', [
      { price: 1000, condition: 'poor' },
      { price: 1000, condition: 'poor' },
      { price: 5000, condition: 'good' },
    ])
    expect(result.suggested_price).toBe(5000)
    expect(result.price_range).toEqual({ min: 1000, max: 5000 })
  })
})
