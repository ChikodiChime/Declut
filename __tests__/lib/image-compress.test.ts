import { describe, it, expect } from 'vitest'
import { computeScaledDimensions, estimateDataUrlBytes } from '@/lib/image-compress'

describe('computeScaledDimensions', () => {
  it('returns the original size when already within maxEdge', () => {
    expect(computeScaledDimensions(800, 600, 1024)).toEqual({ width: 800, height: 600 })
  })

  it('scales down proportionally when width exceeds maxEdge', () => {
    expect(computeScaledDimensions(2048, 1024, 1024)).toEqual({ width: 1024, height: 512 })
  })

  it('scales down proportionally when height exceeds maxEdge', () => {
    expect(computeScaledDimensions(1024, 2048, 1024)).toEqual({ width: 512, height: 1024 })
  })
})

describe('estimateDataUrlBytes', () => {
  it('estimates byte size from the base64 payload length', () => {
    const dataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(100)
    expect(estimateDataUrlBytes(dataUrl)).toBe(75)
  })
})
