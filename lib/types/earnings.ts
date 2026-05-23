// lib/types/earnings.ts
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
  total_gross: number            // whole naira (from DB)
  total_fee: number              // whole naira (from DB)
  total_net: number              // whole naira (from DB)
  stripe_available: number       // kobo — divide by 100 to display as ₦
  stripe_pending: number         // kobo — divide by 100 to display as ₦
  next_payout_date: string | null
}

export type EarningsData = {
  summary: EarningsSummary
  orders: EarningsOrder[]
}
