export type AccountType = 'individual' | 'business' | 'dispatcher' | 'admin'
export type ListingType = 'for_sale' | 'free' | 'donate'
export type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'
export type SizeCategory = 'small' | 'medium' | 'large' | 'extra_large'
export type ListingStatus = 'draft' | 'available' | 'sold' | 'claimed' | 'donated' | 'removed'
export type OrderStatus = 'pending' | 'paid' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
export type DeliveryType = 'delivery' | 'pickup'
export type RequestStatus = 'open' | 'closed'

export interface User {
  id: string
  email: string
  name: string | null
  password_hash: string
  account_type: AccountType
  paystack_recipient_code: string | null
  paystack_bank_code: string | null
  paystack_bank_name: string | null
  paystack_account_number: string | null
  paystack_account_name: string | null
  paystack_onboarding_complete: boolean
  wallet_balance: number
  avatar_url: string | null
  phone: string | null
  created_at: string
  email_verified: boolean
  otp_code: string | null
  otp_expires_at: string | null
  otp_resend_after: string | null
}

export interface UserAddress {
  id: string
  user_id: string
  label: string
  address: string
  address_state: string | null
  is_default: boolean
  created_at: string
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
  size_category: SizeCategory | null
  pickup_address: string | null
  images: string[]
  status: ListingStatus
  request_id: string | null
  created_at: string
}

export interface ItemRequest {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string | null
  listing_type: ListingType | null
  area: string | null
  max_price: number | null
  status: RequestStatus
  created_at: string
  follow_count?: number
  is_following?: boolean
  requester?: {
    id: string
    name: string | null
    avatar_url: string | null
  } | null
}

export interface RequestFollow {
  id: string
  user_id: string
  request_id: string
  created_at: string
}

export interface Order {
  id: string
  listing_id: string
  buyer_id: string | null
  seller_id: string
  dispatcher_id: string | null
  status: OrderStatus
  delivery_type: DeliveryType
  item_price: number
  delivery_fee: number
  total_price: number
  platform_fee: number
  paystack_reference: string | null
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

// Form data shape for the create/edit listing form
export interface ListingFormData {
  listing_type: ListingType
  title: string
  description: string
  category: string
  condition: Condition
  price: number | null   // null for free/donate listings
  area: string
  size_category: SizeCategory
  pickup_address: string
  images: string[]       // Cloudinary public_ids
  request_ids?: string[] // optional links to community requests
}

// Listing detail response includes joined seller info
export interface ListingWithSeller extends Listing {
  seller: {
    id: string
    name: string | null
    account_type: AccountType
    avatar_url: string | null
    created_at: string
    review_count: number
    avg_rating: number | null
    active_listings: number
  } | null
}

// What we embed in the JWT payload
export interface JwtPayload {
  sub: string        // user UUID
  email: string
  account_type: AccountType
  iat?: number       // issued at (set by jose automatically)
  exp?: number       // expiry (set by jose automatically)
}

// Search suggestion for listings
export type Suggestion = {
  id: string
  title: string
  listing_type: ListingType
  images: string[]
}
