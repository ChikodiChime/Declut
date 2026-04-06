import type { ListingFormData, ListingType, Condition } from '@/types'

export const VALID_LISTING_TYPES: ListingType[] = ['for_sale', 'free', 'donate']
export const VALID_CONDITIONS: Condition[] = ['new', 'like_new', 'good', 'fair', 'poor']
export const VALID_CATEGORIES = [
  'Electronics',
  'Furniture & Home',
  'Clothing & Accessories',
  'Appliances',
  'Books & Stationery',
  'Kids & Baby',
  'Sports & Outdoors',
  'Vehicles & Parts',
  'Other',
]

interface ListingBody {
  listing_type?: unknown
  title?: unknown
  description?: unknown
  category?: unknown
  condition?: unknown
  price?: unknown
  area?: unknown
  images?: unknown
}

export function validateListingBody(body: ListingBody):
  | { valid: true; data: ListingFormData }
  | { error: string } {

  if (!body.listing_type || !VALID_LISTING_TYPES.includes(body.listing_type as ListingType)) {
    return { error: 'listing_type must be for_sale, free, or donate' }
  }
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    return { error: 'title is required' }
  }
  if ((body.title as string).length > 100) {
    return { error: 'title must be 100 characters or fewer' }
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return { error: 'description must be a string' }
  }
  if (body.description && (body.description as string).length > 1000) {
    return { error: 'description must be 1000 characters or fewer' }
  }
  if (!body.category || !VALID_CATEGORIES.includes(body.category as string)) {
    return { error: 'category is required and must be one of the valid categories' }
  }
  if (!body.condition || !VALID_CONDITIONS.includes(body.condition as Condition)) {
    return { error: 'condition must be new, like_new, good, fair, or poor' }
  }
  if (body.listing_type === 'for_sale') {
    if (body.price === undefined || body.price === null || typeof body.price !== 'number' || body.price <= 0) {
      return { error: 'price is required and must be greater than 0 for for_sale listings' }
    }
  }
  if (!body.area || typeof body.area !== 'string' || body.area.trim().length === 0) {
    return { error: 'area is required' }
  }
  if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 5) {
    return { error: 'between 1 and 5 images are required' }
  }
  if (!(body.images as unknown[]).every((img) => typeof img === 'string')) {
    return { error: 'images must be an array of strings' }
  }

  return {
    valid: true,
    data: {
      listing_type: body.listing_type as ListingType,
      title: (body.title as string).trim(),
      description: typeof body.description === 'string' ? body.description.trim() : '',
      category: body.category as string,
      condition: body.condition as Condition,
      price: body.listing_type === 'for_sale' ? (body.price as number) : null,
      area: (body.area as string).trim(),
      images: body.images as string[],
    },
  }
}
