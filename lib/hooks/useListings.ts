import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Listing, ListingFormData, ListingStatus, ListingType, Condition } from '@/types'

export interface BrowseParams {
  q?: string
  category?: string
  listing_type?: ListingType | ''
  condition?: Condition | ''
  area?: string
  seller_id?: string
  sort?: 'newest' | 'price_asc' | 'price_desc'
  limit?: number
  offset?: number
}

async function apiRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Something went wrong')
  return json
}

export function usePublicListings(params: BrowseParams = {}) {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.category) query.set('category', params.category)
  if (params.listing_type) query.set('listing_type', params.listing_type)
  if (params.condition) query.set('condition', params.condition)
  if (params.area) query.set('area', params.area)
  if (params.seller_id) query.set('seller_id', params.seller_id)
  if (params.sort) query.set('sort', params.sort)
  if (params.limit) query.set('limit', String(params.limit))
  if (params.offset) query.set('offset', String(params.offset))

  return useQuery<{ listings: Listing[]; total: number; limit: number; offset: number }>({
    queryKey: ['listings', 'browse', params],
    queryFn: async () => {
      const json = await apiRequest('GET', `/api/listings?${query.toString()}`)
      return {
        listings: json.data,
        total: json.meta.total,
        limit: json.meta.limit,
        offset: json.meta.offset,
      }
    },
  })
}

export function useMyListings() {
  return useQuery<{ listings: Listing[] }>({
    queryKey: ['listings', 'mine'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/listings/mine')
      return { listings: json.data }
    },
  })
}

export function useListing(id: string) {
  return useQuery<{ listing: Listing }>({
    queryKey: ['listings', id],
    queryFn: async () => {
      const json = await apiRequest('GET', `/api/listings/${id}`)
      return { listing: json.data }
    },
    enabled: !!id,
  })
}

export function useCreateListing() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ListingFormData) => apiRequest('POST', '/api/listings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'dashboard'] })
      toast.success('Listing published!')
      router.push('/dashboard/listings')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateListing(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<ListingFormData & { status: ListingStatus }>) =>
      apiRequest('PATCH', `/api/listings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['listings', id] })
      toast.success('Listing updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/listings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
      toast.success('Listing deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export interface BusinessSeller {
  id: string
  name: string | null
}

export function useBusinessSellers() {
  return useQuery<BusinessSeller[]>({
    queryKey: ['sellers', 'business'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/sellers')
      return json.data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (blob: Blob): Promise<{ public_id: string }> => {
      const form = new FormData()
      form.append('file', blob, 'image.jpg')

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Upload failed')
      return json.data
    },
    onError: () => toast.error('Upload failed — please try again'),
  })
}
