import type { SizeCategory } from '@/types'

export const PLATFORM_FEE_PERCENT = 0.10

// Delivery zone derived from the listing's display area
export type DeliveryZone = 'lagos' | 'outside'

// Vehicle tier ordered smallest -> largest, used to pick the right vehicle
// when a single seller's order contains items of different sizes.
export const SIZE_ORDER: SizeCategory[] = ['small', 'medium', 'large', 'extra_large']

// Fallback used for legacy listings created before size_category existed.
export const DEFAULT_SIZE_CATEGORY: SizeCategory = 'medium'

// Flat delivery fee tiers (Naira), indexed by zone then vehicle size.
// small = motorbike, medium = car, large = van, extra_large = large van.
export const DELIVERY_RATES: Record<DeliveryZone, Record<SizeCategory, number>> = {
  lagos: {
    small: 1500,
    medium: 3000,
    large: 7000,
    extra_large: 12000,
  },
  outside: {
    small: 3500,
    medium: 6000,
    large: 12000,
    extra_large: 20000,
  },
}
