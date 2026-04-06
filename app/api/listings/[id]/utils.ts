import type { Listing, ListingStatus, Condition } from '@/types'
import { VALID_CATEGORIES, VALID_CONDITIONS } from '../utils'

const VALID_STATUSES: ListingStatus[] = ['available', 'sold', 'claimed', 'donated']

interface UpdateBody {
  title?: unknown
  description?: unknown
  category?: unknown
  condition?: unknown
  price?: unknown
  area?: unknown
  images?: unknown
  status?: unknown
}

export function validateUpdateBody(body: UpdateBody):
  | { valid: true; data: Partial<Listing> }
  | { error: string } {

  const data: Record<string, unknown> = {}

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return { error: 'title must be a non-empty string' }
    }
    if (body.title.length > 100) return { error: 'title must be 100 characters or fewer' }
    data.title = body.title.trim()
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') return { error: 'description must be a string' }
    if (body.description.length > 1000) return { error: 'description must be 1000 characters or fewer' }
    data.description = body.description.trim()
  }
  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category as string)) return { error: 'category is invalid' }
    data.category = body.category
  }
  if (body.condition !== undefined) {
    if (!VALID_CONDITIONS.includes(body.condition as Condition)) return { error: 'condition is invalid' }
    data.condition = body.condition
  }
  if (body.price !== undefined) {
    if (typeof body.price !== 'number' || body.price <= 0) {
      return { error: 'price must be a number greater than 0' }
    }
    data.price = body.price
  }
  if (body.area !== undefined) {
    if (typeof body.area !== 'string' || body.area.trim().length === 0) {
      return { error: 'area must be a non-empty string' }
    }
    data.area = body.area.trim()
  }
  if (body.images !== undefined) {
    if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 5) {
      return { error: 'between 1 and 5 images are required' }
    }
    if (!(body.images as unknown[]).every((img) => typeof img === 'string')) {
      return { error: 'images must be strings' }
    }
    data.images = body.images
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as ListingStatus)) {
      return { error: 'status must be available, sold, claimed, or donated' }
    }
    data.status = body.status
  }

  if (Object.keys(data).length === 0) {
    return { error: 'no valid fields to update' }
  }

  return { valid: true, data: data as Partial<Listing> }
}
