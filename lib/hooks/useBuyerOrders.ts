'use client'

import { useQuery } from '@tanstack/react-query'

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
  stripe_payment_intent_id: string | null
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
  delivery_code: string | null
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
