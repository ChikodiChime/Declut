import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ItemRequest, ListingType } from '@/types'

export interface RequestBrowseParams {
  q?: string
  category?: string
  listing_type?: ListingType | ''
  area?: string
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

export function usePublicRequests(params: RequestBrowseParams = {}) {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.category) query.set('category', params.category)
  if (params.listing_type) query.set('listing_type', params.listing_type)
  if (params.area) query.set('area', params.area)
  if (params.limit) query.set('limit', String(params.limit))
  if (params.offset) query.set('offset', String(params.offset))

  return useQuery<{ requests: ItemRequest[]; total: number; limit: number; offset: number }>({
    queryKey: ['requests', 'browse', params],
    queryFn: async () => {
      const json = await apiRequest('GET', `/api/requests?${query.toString()}`)
      return {
        requests: json.data,
        total: json.meta.total,
        limit: json.meta.limit,
        offset: json.meta.offset,
      }
    },
  })
}

const REQUEST_PAGE_SIZE = 20

export function usePublicRequestsInfinite(params: Omit<RequestBrowseParams, 'limit' | 'offset'> = {}) {
  return useInfiniteQuery<{ requests: ItemRequest[]; total: number; limit: number; offset: number }>({
    queryKey: ['requests', 'browse', 'infinite', params],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const query = new URLSearchParams()
      if (params.q) query.set('q', params.q)
      if (params.category) query.set('category', params.category)
      if (params.listing_type) query.set('listing_type', params.listing_type)
      if (params.area) query.set('area', params.area)
      query.set('limit', String(REQUEST_PAGE_SIZE))
      query.set('offset', String(pageParam))

      const json = await apiRequest('GET', `/api/requests?${query.toString()}`)
      return {
        requests: json.data,
        total: json.meta.total,
        limit: json.meta.limit,
        offset: json.meta.offset,
      }
    },
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.offset + lastPage.requests.length
      return loaded < lastPage.total ? loaded : undefined
    },
  })
}

export function useMyRequests() {
  return useQuery<ItemRequest[]>({
    queryKey: ['requests', 'mine'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/requests/mine')
      return json.data
    },
  })
}

export function useRequest(id: string) {
  return useQuery<ItemRequest>({
    queryKey: ['requests', id],
    queryFn: async () => {
      const json = await apiRequest('GET', `/api/requests/${id}`)
      return json.data
    },
    enabled: !!id,
  })
}

export interface CreateRequestData {
  title: string
  description?: string
  category?: string
  listing_type?: ListingType | ''
  area?: string
  max_price?: number | null
}

export function useCreateRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateRequestData) => apiRequest('POST', '/api/requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', 'browse'] })
      queryClient.invalidateQueries({ queryKey: ['requests', 'mine'] })
      toast.success('Request posted to the community!')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useFollowRequest(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiRequest('POST', `/api/requests/${requestId}/follow`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['requests', 'browse'] })

      // Flip is_following optimistically across all browse cache entries
      queryClient.setQueriesData<{ requests: ItemRequest[]; total: number; limit: number; offset: number }>(
        { queryKey: ['requests', 'browse'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            requests: old.requests.map((r) =>
              r.id === requestId
                ? {
                    ...r,
                    is_following: !r.is_following,
                    follow_count: (r.follow_count ?? 0) + (r.is_following ? -1 : 1),
                  }
                : r
            ),
          }
        }
      )
    },
    onSuccess: (json) => {
      const following: boolean = json.data.following
      toast.success(following ? 'Following this request' : 'Unfollowed')
    },
    onError: (e: Error) => {
      // Roll back on failure
      queryClient.invalidateQueries({ queryKey: ['requests', 'browse'] })
      toast.error(e.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', requestId] })
      queryClient.invalidateQueries({ queryKey: ['requests', 'browse'] })
    },
  })
}

export interface UpdateRequestData {
  title?: string
  description?: string
  category?: string
  listing_type?: ListingType | ''
  area?: string
  max_price?: number | null
  status?: 'open' | 'closed'
}

export function useUpdateRequest(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateRequestData) =>
      apiRequest('PATCH', `/api/requests/${requestId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', requestId] })
      queryClient.invalidateQueries({ queryKey: ['requests', 'browse'] })
      queryClient.invalidateQueries({ queryKey: ['requests', 'mine'] })
      toast.success('Request updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteRequest(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/requests/${requestId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', 'browse'] })
      queryClient.invalidateQueries({ queryKey: ['requests', 'mine'] })
      toast.success('Request deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCloseRequest(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (status: 'open' | 'closed') =>
      apiRequest('PATCH', `/api/requests/${requestId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', requestId] })
      queryClient.invalidateQueries({ queryKey: ['requests', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['requests', 'browse'] })
      toast.success('Request updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
