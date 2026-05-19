// lib/hooks/useSellerOrders.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type SellerOrder = {
  id: string
  listing_id: string
  status: 'paid' | 'confirmed' | 'shipped' | 'delivered'
  delivery_type: 'delivery' | 'pickup'
  item_price: number
  delivery_fee: number
  total_price: number
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  buyer_address: string
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

export function useSellerOrders(status: 'paid' | 'confirmed' | 'shipped' | 'delivered') {
  return useQuery<SellerOrder[]>({
    queryKey: ['orders', 'mine', status],
    queryFn: async () => {
      const json = await apiRequest('GET', `/api/orders/mine?status=${status}`)
      return json.data
    },
  })
}

export function useConfirmOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest('PATCH', `/api/orders/${id}`, { status: 'confirmed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', 'paid'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', 'confirmed'] })
      toast.success('Order confirmed')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useVerifyPickup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) =>
      apiRequest('POST', `/api/orders/${id}/verify`, { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', 'confirmed'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', 'delivered'] })
      toast.success('Pickup confirmed — payout initiated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
