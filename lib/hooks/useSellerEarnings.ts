// lib/hooks/useSellerEarnings.ts
import { useQuery } from '@tanstack/react-query'
import type { EarningsData } from '@/lib/types/earnings'

export type { TransferStatus, EarningsOrder, EarningsSummary, EarningsData } from '@/lib/types/earnings'

export function useSellerEarnings() {
  return useQuery<EarningsData>({
    queryKey: ['seller', 'earnings'],
    queryFn: async () => {
      const res = await fetch('/api/seller/earnings')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to fetch earnings')
      return json.data
    },
    staleTime: 60 * 1000,
  })
}
