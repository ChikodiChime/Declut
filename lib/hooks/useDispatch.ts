'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type DispatchOrder = {
  id: string
  status: string
  delivery_type: 'delivery'
  total_price: number
  buyer_address: string
  buyer_name?: string
  buyer_phone?: string
  created_at: string
  listing: {
    id: string
    title: string
    images: string[]
  }
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

export function useAvailableOrders() {
  return useQuery<DispatchOrder[]>({
    queryKey: ['dispatch', 'available'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/dispatch/orders')
      return json.data
    },
    refetchInterval: 30_000, // poll every 30s for new available orders
  })
}

export function useMyDeliveries() {
  return useQuery<DispatchOrder[]>({
    queryKey: ['dispatch', 'mine'],
    queryFn: async () => {
      const json = await apiRequest('GET', '/api/dispatch/orders/mine')
      return json.data
    },
  })
}

export function useClaimOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/dispatch/orders/${id}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'available'] })
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'mine'] })
      toast.success('Order claimed — go collect it from the seller')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useVerifyDelivery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) =>
      apiRequest('POST', `/api/dispatch/orders/${id}/verify`, { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'mine'] })
      toast.success('Delivery confirmed!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
