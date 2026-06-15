// lib/types/earnings.ts
export type TransferStatus = 'transferred' | 'processing' | 'in_wallet' | 'pending'

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
}

export type EarningsData = {
  summary: EarningsSummary
  orders: EarningsOrder[]
}
