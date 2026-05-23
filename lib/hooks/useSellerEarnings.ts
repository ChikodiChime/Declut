// lib/hooks/useSellerEarnings.ts
'use client'

import { useQuery } from '@tanstack/react-query'

export type TransferStatus = 'transferred' | 'processing' | 'pending'

export type EarningsOrder = {
  id: string
  listing_title: string
  listing_image: string | null
  created_at: string
  item_price: number
  fee: number
  net: number
  transfer_status: TransferStatus
}

export type EarningsSummary = {
  total_gross: number
  total_fee: number
  total_net: number
  stripe_available: number
  stripe_pending: number
  next_payout_date: string | null
}

export type EarningsData = {
  summary: EarningsSummary
  orders: EarningsOrder[]
}

export function useSellerEarnings() {
  return useQuery<EarningsData>({
    queryKey: ['seller', 'earnings'],
    queryFn: async () => {
      const res = await fetch('/api/seller/earnings')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to fetch earnings')
      return json.data
    },
  })
}
