'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type OrderItem = {
  id: string
  item_price: number
  listing: {
    id: string
    title: string
    images: string[]
    price?: number | null
  }
}

export type BuyerOrder = {
  id: string
  status: string
  delivery_type: 'delivery' | 'pickup'
  item_price: number
  delivery_fee: number
  total_price: number
  created_at: string
  paystack_reference: string | null
  seller: { id: string; name: string | null } | null
  order_items: OrderItem[]
}

export type BuyerOrderDetail = {
  id: string
  status: string
  delivery_type: 'delivery' | 'pickup'
  item_price: number
  delivery_fee: number
  total_price: number
  buyer_name: string | null
  buyer_address: string | null
  created_at: string
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  delivery_code: string | null
  has_review: boolean
  seller: {
    id: string
    name: string | null
    email: string
  } | null
  order_items: OrderItem[]
}

async function fetchJson(url: string) {
  const res = await fetch(url)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Request failed')
  return json.data
}

export function useBuyerOrders() {
  return useQuery<BuyerOrder[]>({
    queryKey: ['buyer-orders'],
    queryFn: () => fetchJson('/api/buyer/orders'),
  })
}

export function useBuyerOrderDetail(id: string) {
  return useQuery<BuyerOrderDetail>({
    queryKey: ['buyer-orders', id],
    queryFn: () => fetchJson(`/api/buyer/orders/${id}`),
    enabled: !!id,
  })
}

export function useSubmitReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ order_id, rating, comment }: { order_id: string; rating: number; comment?: string }) =>
      fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id, rating, comment }),
      }).then(async r => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error?.message ?? 'Failed to submit review')
        return json.data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] })
    },
  })
}
