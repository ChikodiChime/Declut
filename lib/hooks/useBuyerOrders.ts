'use client'

import { useQuery } from '@tanstack/react-query'

export type BuyerOrder = {
  id: string
  status: string
  delivery_type: 'delivery' | 'pickup'
  total_price: number
  created_at: string
  listing: {
    id: string
    title: string
    images: string[]
  }
}

export type BuyerOrderDetail = BuyerOrder & {
  item_price: number
  delivery_fee: number
  buyer_name: string | null
  buyer_address: string | null
  delivery_code: string | null
  seller: {
    id: string
    name: string | null
    email: string
  } | null
  listing: {
    id: string
    title: string
    images: string[]
    price: number | null
  }
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
