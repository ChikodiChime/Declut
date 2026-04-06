import { describe, it, expect } from 'vitest'
import { validateUpdateBody } from '@/app/api/listings/[id]/utils'

describe('validateUpdateBody', () => {
  it('accepts a partial price-only update', () => {
    const result = validateUpdateBody({ price: 5000 })
    expect(result).toHaveProperty('valid', true)
  })

  it('accepts a status-only update', () => {
    const result = validateUpdateBody({ status: 'sold' })
    expect(result).toHaveProperty('valid', true)
  })

  it('returns error when price is 0', () => {
    const result = validateUpdateBody({ price: 0 })
    expect(result).toHaveProperty('error')
  })

  it('returns error when price is negative', () => {
    const result = validateUpdateBody({ price: -100 })
    expect(result).toHaveProperty('error')
  })

  it('returns error when status is invalid', () => {
    const result = validateUpdateBody({ status: 'pending' })
    expect(result).toHaveProperty('error')
  })

  it('returns error when title exceeds 100 chars', () => {
    const result = validateUpdateBody({ title: 'a'.repeat(101) })
    expect(result).toHaveProperty('error')
  })

  it('returns error when images array is empty', () => {
    const result = validateUpdateBody({ images: [] })
    expect(result).toHaveProperty('error')
  })

  it('returns error when body has no recognised fields', () => {
    const result = validateUpdateBody({})
    expect(result).toHaveProperty('error')
  })

  it('accepts a full update with multiple fields', () => {
    const result = validateUpdateBody({
      title: 'Updated title',
      price: 8000,
      area: 'Lekki, Lagos',
      status: 'available',
    })
    expect(result).toHaveProperty('valid', true)
  })
})
