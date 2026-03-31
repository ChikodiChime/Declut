export type AccountType = 'individual' | 'business'
export type ListingType = 'for_sale' | 'free' | 'donate'
export type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'
export type ListingStatus = 'available' | 'sold' | 'claimed' | 'donated'
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
export type DeliveryType = 'delivery' | 'pickup'

export interface User {
  id: string
  email: string
  name: string | null
  password_hash: string
  account_type: AccountType
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  avatar_url: string | null
  created_at: string
  email_verified: boolean
  otp_code: string | null
  otp_expires_at: string | null
  otp_resend_after: string | null
}

export interface Listing {
  id: string
  seller_id: string
  title: string
  description: string | null
  price: number | null
  category: string
  condition: Condition
  listing_type: ListingType
  area: string
  images: string[]
  status: ListingStatus
  created_at: string
}

export interface Order {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  status: OrderStatus
  delivery_type: DeliveryType
  item_price: number
  delivery_fee: number
  total_price: number
  stripe_payment_intent_id: string | null
  pickup_address: string | null
  auto_cancel_at: string | null
  created_at: string
}

export interface CartItem {
  id: string
  user_id: string
  listing_id: string
  created_at: string
}

export interface Review {
  id: string
  order_id: string
  reviewer_id: string
  seller_id: string
  rating: number
  comment: string | null
  created_at: string
}

// What we embed in the JWT payload
export interface JwtPayload {
  sub: string        // user UUID
  email: string
  account_type: AccountType
  iat?: number       // issued at (set by jose automatically)
  exp?: number       // expiry (set by jose automatically)
}
