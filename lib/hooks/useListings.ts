import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Listing, ListingFormData, ListingStatus } from '@/types'

async function apiRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
  return data
}

export function useMyListings() {
  return useQuery<{ listings: Listing[] }>({
    queryKey: ['listings', 'mine'],
    queryFn: () => apiRequest('GET', '/api/listings/mine'),
  })
}

export function useListing(id: string) {
  return useQuery<{ listing: Listing }>({
    queryKey: ['listings', id],
    queryFn: () => apiRequest('GET', `/api/listings/${id}`),
    enabled: !!id,
  })
}

export function useCreateListing() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ListingFormData) => apiRequest('POST', '/api/listings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
      toast.success('Listing published!')
      router.push('/listings/mine')
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

export function useUploadImage() {
  return useMutation({
    mutationFn: async (blob: Blob): Promise<{ public_id: string }> => {
      const form = new FormData()
      form.append('file', blob, 'image.jpg')
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      return data
    },
    onError: () => toast.error('Upload failed — please try again'),
  })
}
